"""Factory for creating synthesizers."""

import logging
from typing import Any, Dict, Optional
from sdv.metadata import SingleTableMetadata

from .base import BaseSynthesizer
from .sdv_models import GCSynthesizer, CTGANSynthesizer, TVAESynthesizer
from .synthcity_models import SynthcitySynthesizer, SYNTHCITY_METHOD_MAP

logger = logging.getLogger(__name__)


def create_synthesizer(
    method: str,
    metadata: SingleTableMetadata,
    hyperparams: Optional[Dict[str, Any]] = None,
    dp_options: Optional[Dict[str, Any]] = None,
) -> tuple[BaseSynthesizer, bool]:
    """Create a synthesizer instance.
    
    PREFERS SynthCity for all methods, falls back to SDV if SynthCity unavailable.
    
    Args:
        method: Method name (e.g., "gc", "ctgan", "tvae", "ddpm", "dp-ctgan", "pategan")
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
    
    # Try SynthCity FIRST for all methods (preferred backend)
    # This includes: gc, ctgan, tvae, ddpm, and all DP methods
    if method in SYNTHCITY_METHOD_MAP or dp_requested:
        try:
            synthesizer = SynthcitySynthesizer(
                metadata=metadata,
                method=method,
                hyperparams=hyperparams,
            )
            is_dp = method.startswith("dp-") or method in {"pategan", "dpgan"} or dp_requested
            logger.info(f"[factory] Using SynthCity backend for method '{method}' (plugin: {synthesizer._plugin_name})")
            return synthesizer, is_dp
        except ImportError as e:
            # SynthCity not installed - fallback to SDV
            logger.warning(f"[factory] SynthCity not available for '{method}': {e}. Falling back to SDV.")
            if isinstance(dp_options, dict) and dp_options.get("strict", False):
                raise RuntimeError(f"DP requested but SynthCity unavailable: {e}")
            # Continue to SDV fallback below
        except (NotImplementedError, RuntimeError) as e:
            # SynthCity plugin not found or initialization failed
            logger.warning(f"[factory] SynthCity plugin failed for '{method}': {e}. Falling back to SDV.")
            if isinstance(dp_options, dict) and dp_options.get("strict", False):
                raise
            # For DP methods, try to fallback to non-DP equivalent
            if method.startswith("dp-") or method in {"pategan", "dpgan"}:
                method = method.replace("dp-", "").replace("dp", "").strip() or "gc"
                logger.info(f"[factory] Falling back to non-DP method: '{method}'")
    
    # SDV fallback (only if SynthCity unavailable or failed)
    # Note: ddpm/diffusion methods have no SDV equivalent, so will fail here
    if method in {"gc", "gaussian-copula", "gaussiancopula"}:
        logger.info(f"[factory] Using SDV backend for method '{method}' (GaussianCopula)")
        return GCSynthesizer(metadata, hyperparams), False
    
    if method in {"ctgan", "ct", "ctgansynthesizer"}:
        logger.info(f"[factory] Using SDV backend for method '{method}' (CTGAN)")
        return CTGANSynthesizer(metadata, hyperparams), False
    
    if method in {"tvae", "tv", "tvaesynthesizer"}:
        logger.info(f"[factory] Using SDV backend for method '{method}' (TVAE)")
        return TVAESynthesizer(metadata, hyperparams), False
    
    # Unknown method - try SynthCity with method name as-is, then default to GC
    if method not in SYNTHCITY_METHOD_MAP:
        try:
            synthesizer = SynthcitySynthesizer(
                metadata=metadata,
                method=method,
                hyperparams=hyperparams,
            )
            logger.info(f"[factory] Using SynthCity backend for unknown method '{method}' (plugin: {synthesizer._plugin_name})")
            return synthesizer, False
        except Exception:
            pass
    
    # Last resort: default to GC (SDV)
    logger.warning(f"[factory] Unknown method '{method}', defaulting to SDV GaussianCopula")
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

