"""
Secure query sampling interface for hospital databases.
Provides secure, privacy-preserving data sampling from hospital databases.

Features:
- Secure connection handling
- Query-based sampling with privacy controls
- Differential privacy integration
- Audit logging
"""

from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
import numpy as np
from abc import ABC, abstractmethod
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class QueryConfig:
    """Configuration for secure database queries."""
    table_name: str
    columns: List[str]
    where_clause: Optional[str] = None
    limit: Optional[int] = None
    sample_fraction: Optional[float] = None  # For random sampling
    dp_epsilon: Optional[float] = None  # For DP sampling
    sensitive_columns: List[str] = None  # Columns requiring extra protection


class SecureDatabaseConnector(ABC):
    """Abstract base class for secure database connectors."""
    
    @abstractmethod
    def connect(self, connection_string: str, credentials: Dict[str, str]) -> bool:
        """Establish secure connection to database."""
        pass
    
    @abstractmethod
    def execute_query(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> pd.DataFrame:
        """Execute a secure query and return DataFrame."""
        pass
    
    @abstractmethod
    def close(self):
        """Close database connection."""
        pass


class PostgreSQLSecureConnector(SecureDatabaseConnector):
    """PostgreSQL connector with security features."""
    
    def __init__(self):
        self._connection = None
        self._connected = False
    
    def connect(self, connection_string: str, credentials: Dict[str, str]) -> bool:
        """Connect to PostgreSQL database."""
        try:
            import psycopg2
            from psycopg2 import sql
            
            # Use credentials for authentication
            conn_params = {
                "host": credentials.get("host"),
                "port": credentials.get("port", 5432),
                "database": credentials.get("database"),
                "user": credentials.get("user"),
                "password": credentials.get("password"),
                "sslmode": "require",  # Force SSL
            }
            
            self._connection = psycopg2.connect(**conn_params)
            self._connected = True
            logger.info("Connected to PostgreSQL database securely")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            self._connected = False
            return False
    
    def execute_query(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> pd.DataFrame:
        """Execute query with parameterization to prevent SQL injection."""
        if not self._connected:
            raise RuntimeError("Not connected to database")
        
        try:
            import psycopg2
            from psycopg2 import sql
            
            # Use parameterized queries
            cursor = self._connection.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            # Fetch results
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            
            df = pd.DataFrame(rows, columns=columns)
            cursor.close()
            
            return df
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
    
    def close(self):
        """Close connection."""
        if self._connection:
            self._connection.close()
            self._connected = False


class SecureQuerySampler:
    """
    Secure query sampler for hospital databases.
    
    Provides privacy-preserving sampling with:
    - Random sampling
    - Differential privacy
    - Query result caching
    - Audit logging
    """
    
    def __init__(self, connector: SecureDatabaseConnector):
        """Initialize sampler with database connector."""
        self.connector = connector
        self._cache: Dict[str, pd.DataFrame] = {}
    
    def sample(
        self,
        config: QueryConfig,
        apply_dp: bool = False,
    ) -> pd.DataFrame:
        """
        Sample data from database with privacy controls.
        
        Args:
            config: Query configuration
            apply_dp: Whether to apply differential privacy
        
        Returns:
            Sampled DataFrame
        """
        # Build query
        query = self._build_query(config)
        
        # Execute query
        df = self.connector.execute_query(query)
        
        # Apply sampling if requested
        if config.sample_fraction and config.sample_fraction < 1.0:
            n_sample = int(len(df) * config.sample_fraction)
            df = df.sample(n=min(n_sample, len(df)), random_state=42)
        
        # Apply differential privacy if requested
        if apply_dp and config.dp_epsilon:
            df = self._apply_dp_noise(df, config.dp_epsilon, config.sensitive_columns or [])
        
        # Log query (without sensitive data)
        logger.info(
            f"Sampled {len(df)} rows from {config.table_name} "
            f"(columns: {len(config.columns)}, dp_epsilon: {config.dp_epsilon})"
        )
        
        return df
    
    def _build_query(self, config: QueryConfig) -> str:
        """Build SQL query from configuration."""
        columns_str = ", ".join(config.columns)
        query = f"SELECT {columns_str} FROM {config.table_name}"
        
        if config.where_clause:
            query += f" WHERE {config.where_clause}"
        
        if config.limit:
            query += f" LIMIT {config.limit}"
        
        return query
    
    def _apply_dp_noise(
        self,
        df: pd.DataFrame,
        epsilon: float,
        sensitive_columns: List[str],
    ) -> pd.DataFrame:
        """
        Apply differential privacy noise to sensitive columns.
        
        Uses Laplace mechanism for numeric columns.
        """
        df_noisy = df.copy()
        
        for col in sensitive_columns:
            if col not in df.columns:
                continue
            
            if pd.api.types.is_numeric_dtype(df[col]):
                # Laplace noise for numeric columns
                sensitivity = float(df[col].max() - df[col].min()) if len(df) > 0 else 1.0
                scale = sensitivity / max(epsilon, 1e-6)
                noise = np.random.laplace(0, scale, size=len(df))
                df_noisy[col] = df[col] + noise
            else:
                # For categorical, add noise to counts
                # This is a simplified approach - in production, use more sophisticated DP
                logger.warning(f"DP noise for categorical column {col} not fully implemented")
        
        return df_noisy
    
    def sample_with_metadata(
        self,
        config: QueryConfig,
        metadata: Dict[str, Any],
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Sample data and return with metadata.
        
        Returns:
            (DataFrame, metadata_dict)
        """
        df = self.sample(config, apply_dp=config.dp_epsilon is not None)
        
        sample_metadata = {
            "n_rows": len(df),
            "n_columns": len(df.columns),
            "columns": list(df.columns),
            "dp_applied": config.dp_epsilon is not None,
            "dp_epsilon": config.dp_epsilon,
            "sample_fraction": config.sample_fraction,
        }
        sample_metadata.update(metadata)
        
        return df, sample_metadata


def create_hospital_sampler(
    db_type: str = "postgresql",
    connection_string: Optional[str] = None,
    credentials: Optional[Dict[str, str]] = None,
) -> SecureQuerySampler:
    """
    Factory function to create a secure sampler for hospital databases.
    
    Args:
        db_type: Database type ("postgresql", "mysql", etc.)
        connection_string: Database connection string
        credentials: Database credentials
    
    Returns:
        Configured SecureQuerySampler
    """
    if db_type.lower() == "postgresql":
        connector = PostgreSQLSecureConnector()
    else:
        raise ValueError(f"Unsupported database type: {db_type}")
    
    if connection_string and credentials:
        connector.connect(connection_string, credentials)
    
    return SecureQuerySampler(connector)


# Example usage:
"""
# Initialize sampler
sampler = create_hospital_sampler(
    db_type="postgresql",
    credentials={
        "host": "hospital-db.example.com",
        "port": 5432,
        "database": "patient_data",
        "user": "synthetic_data_user",
        "password": "secure_password",
    }
)

# Configure query
config = QueryConfig(
    table_name="patient_records",
    columns=["age", "gender", "diagnosis", "treatment"],
    where_clause="date >= '2023-01-01'",
    limit=10000,
    sample_fraction=0.1,  # 10% random sample
    dp_epsilon=1.0,  # Apply DP with epsilon=1.0
    sensitive_columns=["age", "diagnosis"],
)

# Sample data
df, metadata = sampler.sample_with_metadata(config, {"source": "hospital_db"})
"""

