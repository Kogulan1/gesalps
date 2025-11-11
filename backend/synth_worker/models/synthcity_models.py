"""SynthCity model wrappers."""

from typing import Any, Dict, Optional
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
    "dp-ctgan": ["dpctgan", "ctgan_dp", "ctgan_privacy"],
    "pategan": ["pategan"],
    "dpgan": ["dpgan"],
    # Add more mappings as needed
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
            metadata: SDV metadata (may not be fully used by all plugins)
            method: Method name (e.g., "dp-ctgan", "pategan")
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
    
    def fit(self, data: pd.DataFrame) -> None:
        """Train SynthCity plugin."""
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

