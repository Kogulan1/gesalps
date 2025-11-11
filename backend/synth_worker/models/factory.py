"""Factory for creating synthesizers."""

from typing import Any, Dict, Optional
from sdv.metadata import SingleTableMetadata

from .base import BaseSynthesizer
from .sdv_models import GCSynthesizer, CTGANSynthesizer, TVAESynthesizer
from .synthcity_models import SynthcitySynthesizer, SYNTHCITY_METHOD_MAP


def create_synthesizer(
    method: str,
    metadata: SingleTableMetadata,
    hyperparams: Optional[Dict[str, Any]] = None,
    dp_options: Optional[Dict[str, Any]] = None,
) -> tuple[BaseSynthesizer, bool]:
    """Create a synthesizer instance.
    
    Args:
        method: Method name (e.g., "gc", "ctgan", "tvae", "dp-ctgan", "pategan")
        metadata: SDV metadata object
        hyperparams: Model-specific hyperparameters
        dp_options: Differential privacy options (if method supports DP)
    
    Returns:
        Tuple of (synthesizer_instance, is_dp_enabled)
    """
    method = method.lower().strip()
    hyperparams = hyperparams or {}
    dp_options = dp_options or {}
    
    # Check if DP is requested
    dp_requested = (
        dp_options is True or
        (isinstance(dp_options, dict) and dp_options.get("dp", False))
    )
    
    # SynthCity methods (DP and others)
    if method in SYNTHCITY_METHOD_MAP or dp_requested:
        try:
            # Try SynthCity first if method is known or DP requested
            if method in SYNTHCITY_METHOD_MAP or dp_requested:
                synthesizer = SynthcitySynthesizer(
                    metadata=metadata,
                    method=method,
                    hyperparams=hyperparams,
                )
                return synthesizer, True
        except (ImportError, NotImplementedError, RuntimeError):
            # If DP is strict, re-raise; otherwise fallback
            if isinstance(dp_options, dict) and dp_options.get("strict", False):
                raise
            # Fallback to non-DP method
            if method.startswith("dp-") or method in {"pategan", "dpgan"}:
                method = method.replace("dp-", "").replace("dp", "").strip() or "gc"
    
    # SDV methods
    if method in {"gc", "gaussian-copula", "gaussiancopula"}:
        return GCSynthesizer(metadata, hyperparams), False
    
    if method in {"ctgan", "ct", "ctgansynthesizer"}:
        return CTGANSynthesizer(metadata, hyperparams), False
    
    if method in {"tvae", "tv", "tvaesynthesizer"}:
        return TVAESynthesizer(metadata, hyperparams), False
    
    # Unknown method - default to GC
    return GCSynthesizer(metadata), False


def get_available_models() -> Dict[str, list[str]]:
    """Get list of available models grouped by category.
    
    Returns:
        Dictionary with keys: "sdv", "synthcity", "experimental"
    """
    available = {
        "sdv": ["gc", "ctgan", "tvae"],
        "synthcity": [],
        "experimental": [],
    }
    
    # Check SynthCity availability
    try:
        from .synthcity_models import SynthcitySynthesizer
        plugins = SynthcitySynthesizer.list_available_plugins()
        available["synthcity"] = plugins
    except Exception:
        pass
    
    # Add experimental models if available
    # (TabDDPM, TabTransformer, etc.)
    
    return available

