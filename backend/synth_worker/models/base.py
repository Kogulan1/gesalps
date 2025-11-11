"""Base interface for all synthesizers."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import pandas as pd


class SynthesizerResult:
    """Result of synthesis operation."""
    
    def __init__(
        self,
        synthetic_df: pd.DataFrame,
        utility_metrics: Dict[str, Any],
        privacy_metrics: Dict[str, Any],
        fairness_metrics: Dict[str, Any],
        method: str,
        hyperparams: Dict[str, Any],
    ):
        self.synthetic_df = synthetic_df
        self.utility_metrics = utility_metrics
        self.privacy_metrics = privacy_metrics
        self.fairness_metrics = fairness_metrics
        self.method = method
        self.hyperparams = hyperparams
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format."""
        return {
            "synth": self.synthetic_df,
            "metrics": {
                "utility": self.utility_metrics,
                "privacy": self.privacy_metrics,
                "fairness": self.fairness_metrics,
            },
            "method": self.method,
            "n": len(self.synthetic_df),
        }


class BaseSynthesizer(ABC):
    """Base class for all synthesizers.
    
    All synthesizers must implement:
    - fit(data): Train on real data
    - sample(num_rows): Generate synthetic data
    """
    
    def __init__(self, metadata, hyperparams: Optional[Dict[str, Any]] = None):
        """Initialize synthesizer.
        
        Args:
            metadata: SDV metadata object
            hyperparams: Model-specific hyperparameters (optional)
        """
        self.metadata = metadata
        self.hyperparams = hyperparams or {}
        self._model = None
    
    @abstractmethod
    def fit(self, data: pd.DataFrame) -> None:
        """Train the synthesizer on real data."""
        raise NotImplementedError
    
    @abstractmethod
    def sample(self, num_rows: int) -> pd.DataFrame:
        """Generate synthetic data.
        
        Args:
            num_rows: Number of rows to generate
            
        Returns:
            DataFrame with synthetic data matching original schema
        """
        raise NotImplementedError
    
    def get_supported_hyperparams(self) -> list[str]:
        """Return list of supported hyperparameter names."""
        return []

