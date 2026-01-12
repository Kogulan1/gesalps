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
            batch_size = getattr(self._plugin, 'batch_size', None) or (self.hyperparams or {}).get('batch_size', 128)
            
            # IMPROVED: Validate n_iter is sufficient for quality results
            if n_iter < 300:
                try:
                    print(f"[worker][TabDDPM] WARNING: n_iter={n_iter} is below recommended minimum (300). This may result in poor utility metrics (high KS Mean).")
                except Exception:
                    pass
            
            try:
                # Estimate training time based on n_iter
                estimated_minutes = max(2, int(n_iter / 100))  # Rough estimate: ~1 min per 100 iterations
                print(f"[worker][TabDDPM] Starting training with n_iter={n_iter}, batch_size={batch_size}")
                print(f"[worker][TabDDPM] Estimated training time: {estimated_minutes}-{estimated_minutes + 5} minutes")
            except Exception:
                pass
        
        # CRITICAL: Verify n_iter is actually set before training (for TabDDPM)
        if self.method == "ddpm" or self._plugin_name == "ddpm":
            try:
                # Try multiple ways to get n_iter from SynthCity plugin
                plugin_n_iter = (
                    getattr(self._plugin, 'n_iter', None) or
                    getattr(self._plugin, '_params', {}).get('n_iter') or
                    getattr(self._plugin, 'args', {}).get('n_iter') or
                    (self.hyperparams or {}).get('n_iter')
                )
                if plugin_n_iter:
                    print(f"[worker][TabDDPM] VERIFIED: Plugin n_iter={plugin_n_iter} before training")
                    if plugin_n_iter < 300:
                        print(f"[worker][TabDDPM] WARNING: n_iter={plugin_n_iter} is very low - training may produce poor results")
                else:
                    print(f"[worker][TabDDPM] ERROR: Could not verify n_iter in plugin! Training may fail or use defaults.")
            except Exception as e:
                try:
                    print(f"[worker][TabDDPM] Could not verify n_iter: {type(e).__name__}")
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
                # DEBUG: Inspect input scales
                if isinstance(data, pd.DataFrame):
                    print(f"[synthcity-debug] Fitting {self.method} on data head:\n{data.iloc[:3, :5]}")
                self._plugin.fit(data)
            except Exception as e:
                raise RuntimeError(f"SynthCity plugin fit failed: {e}")
        
        # Log TabDDPM training completion with validation
        if self.method == "ddpm" or self._plugin_name == "ddpm":
            try:
                # IMPROVED: Verify training actually completed
                n_iter = getattr(self._plugin, 'n_iter', None) or (self.hyperparams or {}).get('n_iter', 300)
                # Check if plugin has training state (some plugins track this)
                if hasattr(self._plugin, 'is_fitted') and not self._plugin.is_fitted:
                    print(f"[worker][TabDDPM] WARNING: Training may not have completed. Plugin reports is_fitted=False")
                else:
                    print(f"[worker][TabDDPM] Training completed successfully (n_iter={n_iter})")
            except Exception:
                pass
    
    def sample(self, num_rows: int) -> pd.DataFrame:
        """Generate synthetic data."""
        import numpy as np
        
        try:
            # Try generate() first (common in SynthCity)
            out = self._plugin.generate(num_rows)
            # Debug: log output type for TabDDPM
            if self.method in ("ddpm", "tabddpm", "diffusion"):
                print(f"[SynthcitySynthesizer][TabDDPM] generate() returned type: {type(out)}, hasattr dataframe: {hasattr(out, 'dataframe') if out is not None else 'N/A'}")
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
        # Check for DataLoader by class name or dataframe method
        is_dataloader = (
            hasattr(out, 'dataframe') or 
            (hasattr(out, '__class__') and 'DataLoader' in str(type(out))) or
            (hasattr(out, '__class__') and 'GenericDataLoader' in str(type(out)))
        )
        if is_dataloader:
            # It's a DataLoader - extract DataFrame
            try:
                if hasattr(out, 'dataframe'):
                    df = out.dataframe()
                elif hasattr(out, 'to_pandas'):
                    df = out.to_pandas()
                elif hasattr(out, 'data'):
                    df = out.data
                else:
                    # Try to convert directly
                    df = pd.DataFrame(out)
                
                if df is None or (isinstance(df, pd.DataFrame) and len(df) == 0):
                    raise ValueError("SynthCity DataLoader returned empty DataFrame")
                if not isinstance(df, pd.DataFrame):
                    df = pd.DataFrame(df)
                
                # DEBUG: Inspect scales
                try:
                    print(f"[synthcity-debug] Sampled {self.method} head (DataLoader branch):\n{df.iloc[:3, :5]}")
                except Exception:
                    pass
                    
                return df.head(num_rows).reset_index(drop=True)
            except Exception as e:
                raise ValueError(f"Failed to extract DataFrame from SynthCity DataLoader (type: {type(out)}): {e}")
        
        # Ensure DataFrame output
        if isinstance(out, pd.DataFrame):
            if len(out) == 0:
                raise ValueError("SynthCity plugin returned empty DataFrame")
            
            # DEBUG: Inspect scales
            try:
                print(f"[synthcity-debug] Sampled {self.method} head (DataFrame branch):\n{out.iloc[:3, :5]}")
            except Exception:
                pass
                
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

