"""SDV model wrappers."""

from typing import Any, Dict, Optional
import pandas as pd
from sdv.metadata import SingleTableMetadata
from sdv.single_table import (
    GaussianCopulaSynthesizer as SDVGaussianCopula,
    CTGANSynthesizer as SDVCTGAN,
    TVAESynthesizer as SDVTVAE,
)

from .base import BaseSynthesizer


class GCSynthesizer(BaseSynthesizer):
    """Gaussian Copula synthesizer wrapper."""
    
    def __init__(self, metadata: SingleTableMetadata, hyperparams: Optional[Dict[str, Any]] = None):
        super().__init__(metadata, hyperparams)
        # GC has no hyperparameters, ignore them
        self._model = SDVGaussianCopula(metadata)
    
    def fit(self, data: pd.DataFrame) -> None:
        """Train Gaussian Copula model."""
        self._model.fit(data)
    
    def sample(self, num_rows: int) -> pd.DataFrame:
        """Generate synthetic data."""
        return self._model.sample(num_rows=num_rows)


class CTGANSynthesizer(BaseSynthesizer):
    """CTGAN synthesizer wrapper."""
    
    SUPPORTED_HPARAMS = {
        "epochs", "batch_size", "embedding_dim",
        "generator_lr", "discriminator_lr",
        "generator_decay", "discriminator_decay",
        "pac", "verbose",
    }
    
    def __init__(self, metadata: SingleTableMetadata, hyperparams: Optional[Dict[str, Any]] = None):
        super().__init__(metadata, hyperparams)
        # Filter and sanitize hyperparameters
        hparams = self._sanitize_hyperparams(hyperparams or {})
        self._model = SDVCTGAN(metadata, **hparams)
    
    def _sanitize_hyperparams(self, hparams: Dict[str, Any]) -> Dict[str, Any]:
        """Filter and cast hyperparameters."""
        out: Dict[str, Any] = {}
        for k in self.SUPPORTED_HPARAMS:
            if k in hparams and hparams[k] is not None:
                v = hparams[k]
                if k in {"epochs", "batch_size", "embedding_dim", "pac"}:
                    try:
                        out[k] = int(float(v))
                        if out[k] <= 0:
                            continue
                    except Exception:
                        continue
                else:
                    out[k] = v
        return out
    
    def fit(self, data: pd.DataFrame) -> None:
        """Train CTGAN model."""
        self._model.fit(data)
    
    def sample(self, num_rows: int) -> pd.DataFrame:
        """Generate synthetic data."""
        return self._model.sample(num_rows=num_rows)
    
    def get_supported_hyperparams(self) -> list[str]:
        """Return supported hyperparameters."""
        return list(self.SUPPORTED_HPARAMS)


class TVAESynthesizer(BaseSynthesizer):
    """TVAE synthesizer wrapper."""
    
    SUPPORTED_HPARAMS = {
        "epochs", "batch_size", "embedding_dim",
        "compress_dims", "decompress_dims",
        "loss_factor", "verbose",
    }
    
    def __init__(self, metadata: SingleTableMetadata, hyperparams: Optional[Dict[str, Any]] = None):
        super().__init__(metadata, hyperparams)
        # Filter and sanitize hyperparameters
        hparams = self._sanitize_hyperparams(hyperparams or {})
        self._model = SDVTVAE(metadata, **hparams)
    
    def _sanitize_hyperparams(self, hparams: Dict[str, Any]) -> Dict[str, Any]:
        """Filter and cast hyperparameters."""
        out: Dict[str, Any] = {}
        for k in self.SUPPORTED_HPARAMS:
            if k in hparams and hparams[k] is not None:
                v = hparams[k]
                if k in {"epochs", "batch_size", "embedding_dim"}:
                    try:
                        out[k] = int(float(v))
                        if out[k] <= 0:
                            continue
                    except Exception:
                        continue
                else:
                    out[k] = v
        return out
    
    def fit(self, data: pd.DataFrame) -> None:
        """Train TVAE model."""
        self._model.fit(data)
    
    def sample(self, num_rows: int) -> pd.DataFrame:
        """Generate synthetic data."""
        return self._model.sample(num_rows=num_rows)
    
    def get_supported_hyperparams(self) -> list[str]:
        """Return supported hyperparameters."""
        return list(self.SUPPORTED_HPARAMS)

