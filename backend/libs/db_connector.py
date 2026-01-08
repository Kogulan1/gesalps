"""
On-Premise Database Connector for Gesalp AI
Secure SQLAlchemy-based connections for hospital integrations.
"""

import os
import logging
from typing import Dict, Any, Optional, List
from contextlib import contextmanager
from urllib.parse import quote_plus

try:
    from sqlalchemy import create_engine, text, MetaData, Table, inspect
    from sqlalchemy.orm import sessionmaker, Session
    from sqlalchemy.pool import QueuePool
    from sqlalchemy.exc import SQLAlchemyError, OperationalError
    SQLALCHEMY_AVAILABLE = True
except ImportError:
    SQLALCHEMY_AVAILABLE = False
    logging.warning("SQLAlchemy not available. Install with: pip install sqlalchemy")

import pandas as pd

logger = logging.getLogger(__name__)


class DatabaseConnector:
    """Secure database connector for on-premise hospital databases."""
    
    def __init__(
        self,
        connection_string: Optional[str] = None,
        db_type: str = "postgresql",
        host: Optional[str] = None,
        port: Optional[int] = None,
        database: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        ssl_mode: str = "require",
        pool_size: int = 5,
        max_overflow: int = 10,
        pool_timeout: int = 30,
        pool_recycle: int = 3600,
    ):
        """Initialize database connector.
        
        Args:
            connection_string: Full SQLAlchemy connection string (overrides other params).
            db_type: Database type ('postgresql', 'mysql', 'mssql', 'oracle').
            host: Database host.
            port: Database port.
            database: Database name.
            username: Database username.
            password: Database password.
            ssl_mode: SSL mode ('require', 'prefer', 'disable').
            pool_size: Connection pool size.
            max_overflow: Maximum overflow connections.
            pool_timeout: Connection timeout in seconds.
            pool_recycle: Connection recycle time in seconds.
        """
        if not SQLALCHEMY_AVAILABLE:
            raise RuntimeError("SQLAlchemy is required for database connections. Install with: pip install sqlalchemy")
        
        self.db_type = db_type.lower()
        self.engine = None
        self.SessionLocal = None
        
        if connection_string:
            conn_str = connection_string
        else:
            # Build connection string from components
            if not all([host, database, username, password]):
                raise ValueError("Must provide either connection_string or (host, database, username, password)")
            
            # Build connection string based on database type
            if self.db_type == "postgresql":
                ssl_param = f"?sslmode={ssl_mode}" if ssl_mode != "disable" else ""
                port = port or 5432
                conn_str = f"postgresql://{quote_plus(username)}:{quote_plus(password)}@{host}:{port}/{database}{ssl_param}"
            elif self.db_type == "mysql":
                port = port or 3306
                ssl_param = "?ssl_mode=REQUIRED" if ssl_mode == "require" else ""
                conn_str = f"mysql+pymysql://{quote_plus(username)}:{quote_plus(password)}@{host}:{port}/{database}{ssl_param}"
            elif self.db_type == "mssql":
                port = port or 1433
                conn_str = f"mssql+pyodbc://{quote_plus(username)}:{quote_plus(password)}@{host}:{port}/{database}?driver=ODBC+Driver+17+for+SQL+Server"
            elif self.db_type == "oracle":
                port = port or 1521
                conn_str = f"oracle+cx_oracle://{quote_plus(username)}:{quote_plus(password)}@{host}:{port}/{database}"
            else:
                raise ValueError(f"Unsupported database type: {db_type}")
        
        try:
            # Create engine with connection pooling
            self.engine = create_engine(
                conn_str,
                poolclass=QueuePool,
                pool_size=pool_size,
                max_overflow=max_overflow,
                pool_timeout=pool_timeout,
                pool_recycle=pool_recycle,
                echo=False,  # Set to True for SQL debugging
                connect_args={
                    "connect_timeout": pool_timeout,
                } if self.db_type == "postgresql" else {},
            )
            
            # Create session factory
            self.SessionLocal = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
            
            logger.info(f"Database connector initialized for {self.db_type}")
        except Exception as e:
            logger.error(f"Failed to initialize database connector: {e}")
            raise
    
    @contextmanager
    def get_session(self):
        """Get database session context manager.
        
        Usage:
            with connector.get_session() as session:
                result = session.execute(text("SELECT * FROM table"))
        """
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    def test_connection(self) -> bool:
        """Test database connection.
        
        Returns:
            True if connection successful, False otherwise.
        """
        try:
            with self.engine.connect() as conn:
                if self.db_type == "postgresql":
                    conn.execute(text("SELECT 1"))
                elif self.db_type == "mysql":
                    conn.execute(text("SELECT 1"))
                elif self.db_type == "mssql":
                    conn.execute(text("SELECT 1"))
                elif self.db_type == "oracle":
                    conn.execute(text("SELECT 1 FROM DUAL"))
                return True
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False
    
    def execute_query(self, query: str, params: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
        """Execute SQL query and return results as DataFrame.
        
        Args:
            query: SQL query string.
            params: Optional query parameters for parameterized queries.
            
        Returns:
            DataFrame with query results.
        """
        try:
            with self.engine.connect() as conn:
                if params:
                    result = conn.execute(text(query), params)
                else:
                    result = conn.execute(text(query))
                
                # Fetch all rows
                rows = result.fetchall()
                columns = result.keys()
                
                # Convert to DataFrame
                df = pd.DataFrame(rows, columns=columns)
                return df
        except SQLAlchemyError as e:
            logger.error(f"Query execution failed: {e}")
            raise
    
    def get_table_schema(self, table_name: str, schema: Optional[str] = None) -> Dict[str, Any]:
        """Get table schema information.
        
        Args:
            table_name: Name of the table.
            schema: Optional schema name (for databases that support schemas).
            
        Returns:
            Dictionary with column information.
        """
        try:
            inspector = inspect(self.engine)
            columns = inspector.get_columns(table_name, schema=schema)
            
            schema_info = {
                "table_name": table_name,
                "schema": schema,
                "columns": [],
            }
            
            for col in columns:
                schema_info["columns"].append({
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col.get("nullable", True),
                    "default": str(col.get("default", "")),
                })
            
            return schema_info
        except Exception as e:
            logger.error(f"Failed to get table schema: {e}")
            raise
    
    def list_tables(self, schema: Optional[str] = None) -> List[str]:
        """List all tables in the database.
        
        Args:
            schema: Optional schema name.
            
        Returns:
            List of table names.
        """
        try:
            inspector = inspect(self.engine)
            return inspector.get_table_names(schema=schema)
        except Exception as e:
            logger.error(f"Failed to list tables: {e}")
            raise
    
    def pull_table(
        self,
        table_name: str,
        schema: Optional[str] = None,
        columns: Optional[List[str]] = None,
        where_clause: Optional[str] = None,
        limit: Optional[int] = None,
        sample: Optional[float] = None,
    ) -> pd.DataFrame:
        """Pull data from a table with optional filtering and sampling.
        
        Args:
            table_name: Name of the table.
            schema: Optional schema name.
            columns: Optional list of column names to select.
            where_clause: Optional WHERE clause (without 'WHERE' keyword).
            limit: Optional row limit.
            sample: Optional sampling fraction (0.0-1.0).
            
        Returns:
            DataFrame with table data.
        """
        # Build query
        table_ref = f'"{schema}"."{table_name}"' if schema else f'"{table_name}"'
        if self.db_type == "mysql":
            table_ref = f"`{schema}`.`{table_name}`" if schema else f"`{table_name}`"
        elif self.db_type == "mssql":
            table_ref = f"[{schema}].[{table_name}]" if schema else f"[{table_name}]"
        
        col_list = ", ".join([f'"{c}"' for c in columns]) if columns else "*"
        if self.db_type == "mysql":
            col_list = ", ".join([f"`{c}`" for c in columns]) if columns else "*"
        elif self.db_type == "mssql":
            col_list = ", ".join([f"[{c}]" for c in columns]) if columns else "*"
        
        query = f"SELECT {col_list} FROM {table_ref}"
        
        if where_clause:
            query += f" WHERE {where_clause}"
        
        # Add sampling if requested (database-specific)
        if sample and 0 < sample < 1:
            if self.db_type == "postgresql":
                query = f"SELECT {col_list} FROM {table_ref} TABLESAMPLE SYSTEM ({sample * 100})"
                if where_clause:
                    query += f" WHERE {where_clause}"
            elif self.db_type == "mysql":
                # MySQL doesn't support TABLESAMPLE, use ORDER BY RAND() instead
                query += f" ORDER BY RAND() LIMIT {int(limit or 10000 * sample)}"
            elif self.db_type == "mssql":
                query = f"SELECT TOP {int(100 * sample)} PERCENT {col_list} FROM {table_ref}"
                if where_clause:
                    query += f" WHERE {where_clause}"
        
        if limit and not sample:
            if self.db_type == "mssql":
                query = query.replace("SELECT", f"SELECT TOP {limit}")
            else:
                query += f" LIMIT {limit}"
        
        logger.info(f"Executing query: {query[:200]}...")
        return self.execute_query(query)
    
    def close(self):
        """Close database connections."""
        if self.engine:
            self.engine.dispose()
            logger.info("Database connections closed")


def create_connector_from_env() -> Optional[DatabaseConnector]:
    """Create database connector from environment variables.
    
    Environment variables:
        DB_TYPE: Database type (postgresql, mysql, mssql, oracle)
        DB_HOST: Database host
        DB_PORT: Database port
        DB_NAME: Database name
        DB_USER: Database username
        DB_PASSWORD: Database password
        DB_SSL_MODE: SSL mode (default: require)
        DB_CONNECTION_STRING: Full connection string (overrides other vars)
    
    Returns:
        DatabaseConnector instance or None if not configured.
    """
    conn_str = os.getenv("DB_CONNECTION_STRING")
    if conn_str:
        try:
            return DatabaseConnector(connection_string=conn_str)
        except Exception as e:
            logger.error(f"Failed to create connector from connection string: {e}")
            return None
    
    db_type = os.getenv("DB_TYPE", "postgresql")
    host = os.getenv("DB_HOST")
    database = os.getenv("DB_NAME")
    username = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    
    if not all([host, database, username, password]):
        logger.warning("Database environment variables not fully configured")
        return None
    
    port = int(os.getenv("DB_PORT", "5432")) if os.getenv("DB_PORT") else None
    ssl_mode = os.getenv("DB_SSL_MODE", "require")
    
    try:
        return DatabaseConnector(
            db_type=db_type,
            host=host,
            port=port,
            database=database,
            username=username,
            password=password,
            ssl_mode=ssl_mode,
        )
    except Exception as e:
        logger.error(f"Failed to create database connector: {e}")
        return None

