"""Synthetic data model wrappers and factories.

This module provides a unified interface for all synthesis models:
- SDV models (GaussianCopula, CTGAN, TVAE)
- SynthCity plugins
- Experimental models (TabDDPM, TabTransformer)
"""

from .base import BaseSynthesizer, SynthesizerResult
from .sdv_models import (
    GCSynthesizer,
    CTGANSynthesizer,
    TVAESynthesizer,
)
from .synthcity_models import SynthcitySynthesizer
from .factory import create_synthesizer, get_available_models
from .trainer import train_synthesizer

__all__ = [
    "BaseSynthesizer",
    "SynthesizerResult",
    "GCSynthesizer",
    "CTGANSynthesizer",
    "TVAESynthesizer",
    "SynthcitySynthesizer",
    "create_synthesizer",
    "get_available_models",
    "train_synthesizer",
]

