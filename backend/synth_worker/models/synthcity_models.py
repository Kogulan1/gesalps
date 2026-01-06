"""SynthCity model wrappers."""

from typing import Any, Dict, Optional, Union
import pandas as pd
from sdv.metadata import SingleTableMetadata

from .base import BaseSynthesizer


def _try_import_synthcity():
    """Try importing SynthCity plugins."""
    try:
        from synthcity.plugins import Plugins  # type: ignore
        return Plugins
    except ImportError:
        return None


# Mapping from method names to SynthCity plugin names
SYNTHCITY_METHOD_MAP: Dict[str, list[str]] = {
    # Core methods (preferred over SDV)
    "gc": ["gaussian_copula", "gaussiancopula"],
    "gaussian-copula": ["gaussian_copula", "gaussiancopula"],
    "gaussiancopula": ["gaussian_copula", "gaussiancopula"],
    "ctgan": ["ctgan"],
    "ct": ["ctgan"],
    "ctgansynthesizer": ["ctgan"],
    "tvae": ["tvae"],
    "tv": ["tvae"],
    "tvaesynthesizer": ["tvae"],
    # Diffusion models (high priority for mixed/high-dim data)
    "ddpm": ["ddpm", "tabddpm", "diffusion"],
    "tabddpm": ["ddpm", "tabddpm", "diffusion"],
    "diffusion": ["ddpm", "tabddpm", "diffusion"],
    # Differential privacy methods
    "dp-ctgan": ["dpctgan", "ctgan_dp", "ctgan_privacy"],
    "pategan": ["pategan"],
    "dpgan": ["dpgan"],
    # Additional SynthCity plugins (optional)
    # "timegan": ["timegan"],
    # "adsgan": ["adsgan"],
}


class SynthcitySynthesizer(BaseSynthesizer):
    """SynthCity plugin wrapper.
    
    Automatically discovers and wraps SynthCity plugins.
    Supports DP models (DP-CTGAN, PATE-GAN, DP-GAN) and others.
    """
    
    def __init__(
        self,
        metadata: SingleTableMetadata,
        method: str,
        hyperparams: Optional[Dict[str, Any]] = None,
    ):
        """Initialize SynthCity synthesizer.
        
        Args:
            metadata: SDV metadata (legacy, kept for compatibility)
            method: Method name (e.g., "dp-ctgan", "pategan", "gc", "ctgan", "tvae")
            hyperparams: Plugin-specific hyperparameters
        """
        super().__init__(metadata, hyperparams)
        self.method = method.lower()
        
        Plugins = _try_import_synthcity()
        if not Plugins:
            raise ImportError("synthcity not installed. Install with: pip install synthcity")
        
        # Find plugin name
        candidates = SYNTHCITY_METHOD_MAP.get(self.method, [self.method])
        available = set(Plugins().list())
        
        chosen = None
        for name in candidates:
            if name in available:
                chosen = name
                break
        
        if not chosen:
            available_list = sorted(list(available))[:20]
            raise NotImplementedError(
                f"SynthCity plugin for '{method}' not found. "
                f"Available plugins: {available_list}"
            )
        
        # Initialize plugin
        try:
            self._plugin = Plugins().get(chosen, **(hyperparams or {}))
            self._plugin_name = chosen
        except Exception as e:
            raise RuntimeError(f"Failed to initialize SynthCity plugin '{chosen}': {e}")
        
        self._columns: list[str] = []
        self._data_loader: Optional[Any] = None  # Will hold SynthCity DataLoader if used
    
    def fit(self, data: Union[pd.DataFrame, Any]) -> None:
        """Train SynthCity plugin.
        
        Args:
            data: Either a pandas DataFrame or a SynthCity DataLoader
        """
        # Check if data is a SynthCity DataLoader
        if hasattr(data, 'dataframe') or (hasattr(data, '__class__') and 'DataLoader' in str(type(data))):
            # It's a DataLoader - use it directly
            self._data_loader = data
            try:
                self._columns = list(data.dataframe().columns) if hasattr(data, 'dataframe') else list(data.columns)
            except Exception:
                # Fallback: try to get columns from the loader
                try:
                    self._columns = list(data.columns)
                except Exception:
                    self._columns = []
            try:
                self._plugin.fit(data)
            except Exception as e:
                raise RuntimeError(f"SynthCity plugin fit failed with DataLoader: {e}")
        else:
            # It's a DataFrame - use as before
            self._columns = list(data.columns)
            try:
                self._plugin.fit(data)
            except Exception as e:
                raise RuntimeError(f"SynthCity plugin fit failed: {e}")
    
    def sample(self, num_rows: int) -> pd.DataFrame:
        """Generate synthetic data."""
        try:
            # Try generate() first (common in SynthCity)
            out = self._plugin.generate(num_rows)
        except Exception:
            # Fallback to sample() if available
            if hasattr(self._plugin, "sample"):
                out = self._plugin.sample(num_rows)
            else:
                raise RuntimeError("SynthCity plugin does not expose generate() or sample()")
        
        # Ensure DataFrame output
        if isinstance(out, pd.DataFrame):
            return out.head(num_rows).reset_index(drop=True)
        
        # Convert array to DataFrame
        import numpy as np
        arr = np.asarray(out)
        if arr.ndim == 2 and self._columns and arr.shape[1] == len(self._columns):
            return pd.DataFrame(arr[:num_rows], columns=self._columns)
        
        # Last resort
        return pd.DataFrame(arr[:num_rows], columns=self._columns[:arr.shape[1]] if arr.ndim == 2 else [])
    
    def get_supported_hyperparams(self) -> list[str]:
        """Return plugin-specific hyperparameters.
        
        Note: SynthCity plugins have varying hyperparameters.
        Check plugin documentation for specifics.
        """
        return []  # Plugin-specific, too variable to list
    
    @staticmethod
    def list_available_plugins() -> list[str]:
        """List all available SynthCity plugins."""
        Plugins = _try_import_synthcity()
        if not Plugins:
            return []
        try:
            return sorted(Plugins().list())
        except Exception:
            return []

