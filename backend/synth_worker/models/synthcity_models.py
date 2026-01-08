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
            # Log hyperparameters for TabDDPM debugging
            if self.method == "ddpm" or chosen == "ddpm":
                n_iter = (hyperparams or {}).get("n_iter")
                batch_size = (hyperparams or {}).get("batch_size")
                try:
                    print(f"[factory][TabDDPM] Initializing with n_iter={n_iter}, batch_size={batch_size}, hyperparams={hyperparams}")
                except Exception:
                    pass
            self._plugin = Plugins().get(chosen, **(hyperparams or {}))
            self._plugin_name = chosen
            # Verify hyperparameters were applied for TabDDPM
            if self.method == "ddpm" or chosen == "ddpm":
                try:
                    # Check if n_iter was actually set (SynthCity plugins store params differently)
                    plugin_params = getattr(self._plugin, '_params', {}) or getattr(self._plugin, 'args', {}) or {}
                    actual_n_iter = plugin_params.get('n_iter') or (hyperparams or {}).get('n_iter')
                    print(f"[factory][TabDDPM] Plugin initialized, n_iter={actual_n_iter}")
                except Exception:
                    pass
        except Exception as e:
            raise RuntimeError(f"Failed to initialize SynthCity plugin '{chosen}': {e}")
        
        self._columns: list[str] = []
        self._data_loader: Optional[Any] = None  # Will hold SynthCity DataLoader if used
    
    def fit(self, data: Union[pd.DataFrame, Any]) -> None:
        """Train SynthCity plugin.
        
        Args:
            data: Either a pandas DataFrame or a SynthCity DataLoader
        """
        # Log TabDDPM training start with expected time
        if self.method == "ddpm" or self._plugin_name == "ddpm":
            n_iter = getattr(self._plugin, 'n_iter', None) or (self.hyperparams or {}).get('n_iter', 300)
            try:
                print(f"[worker][TabDDPM] Starting training with n_iter={n_iter} (this may take 5-15 minutes depending on dataset size)")
            except Exception:
                pass
        
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
        
        # Log TabDDPM training completion
        if self.method == "ddpm" or self._plugin_name == "ddpm":
            try:
                print(f"[worker][TabDDPM] Training completed successfully")
            except Exception:
                pass
    
    def sample(self, num_rows: int) -> pd.DataFrame:
        """Generate synthetic data."""
        import numpy as np
        
        try:
            # Try generate() first (common in SynthCity)
            out = self._plugin.generate(num_rows)
        except Exception as e:
            # Fallback to sample() if available
            if hasattr(self._plugin, "sample"):
                try:
                    out = self._plugin.sample(num_rows)
                except Exception as e2:
                    raise RuntimeError(f"SynthCity plugin generate() and sample() both failed: {e}, {e2}")
            else:
                raise RuntimeError(f"SynthCity plugin does not expose generate() or sample(). Error: {e}")
        
        # Handle None or empty output
        if out is None:
            raise ValueError("SynthCity plugin returned None. Training may have failed.")
        
        # Handle SynthCity DataLoader (common for TabDDPM and other plugins)
        if hasattr(out, 'dataframe'):
            # It's a DataLoader - extract DataFrame
            try:
                df = out.dataframe()
                if df is None or len(df) == 0:
                    raise ValueError("SynthCity DataLoader returned empty DataFrame")
                return df.head(num_rows).reset_index(drop=True)
            except Exception as e:
                raise ValueError(f"Failed to extract DataFrame from SynthCity DataLoader: {e}")
        
        # Ensure DataFrame output
        if isinstance(out, pd.DataFrame):
            if len(out) == 0:
                raise ValueError("SynthCity plugin returned empty DataFrame")
            return out.head(num_rows).reset_index(drop=True)
        
        # Convert array to DataFrame
        try:
            arr = np.asarray(out)
        except Exception as e:
            raise ValueError(f"Failed to convert plugin output to array: {e}. Output type: {type(out)}")
        
        # Handle different array dimensions
        if arr.ndim == 0:
            # Scalar - this shouldn't happen for tabular data, but handle it
            raise ValueError(f"SynthCity plugin returned scalar value instead of array. This indicates a plugin error.")
        elif arr.ndim == 1:
            # 1D array - reshape to 2D (single column)
            if len(arr) == 0:
                raise ValueError("SynthCity plugin returned empty array")
            arr = arr.reshape(-1, 1)
            cols = self._columns[:1] if self._columns and len(self._columns) > 0 else [f"col_0"]
            return pd.DataFrame(arr[:num_rows], columns=cols)
        elif arr.ndim == 2:
            # 2D array - normal case
            if arr.shape[0] == 0:
                raise ValueError("SynthCity plugin returned empty 2D array")
            if self._columns and arr.shape[1] == len(self._columns):
                return pd.DataFrame(arr[:num_rows], columns=self._columns)
            # Handle mismatched column count
            num_cols = arr.shape[1]
            if self._columns and len(self._columns) >= num_cols:
                return pd.DataFrame(arr[:num_rows], columns=self._columns[:num_cols])
            else:
                # Generate column names if we don't have enough
                cols = self._columns + [f"col_{i}" for i in range(len(self._columns), num_cols)] if self._columns else [f"col_{i}" for i in range(num_cols)]
                return pd.DataFrame(arr[:num_rows], columns=cols)
        else:
            # Higher dimensions - flatten first dimension
            raise ValueError(f"Unexpected array dimension {arr.ndim} from SynthCity plugin. Expected 1 or 2 dimensions.")
    
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

