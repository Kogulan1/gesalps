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
            # Handle SynthCity naming compatibility (num_epochs -> epochs)
            val = hparams.get(k)
            if k == "epochs" and val is None:
                val = hparams.get("num_epochs")
                
            if val is not None:
                if k in {"epochs", "batch_size", "embedding_dim"}:
                    try:
                        out[k] = int(float(val))
                        if out[k] <= 0:
                            continue
                    except Exception:
                        continue
                else:
                    out[k] = val
        return out
    
    def fit(self, data: pd.DataFrame) -> None:
        """Train TVAE model."""
        self._real_columns = list(data.columns) # Store columns for alignment
        try:
            print(f"[sdv-debug] Fitting TVAE on data head:\n{data.iloc[:3, :5]}")
            # Log training start with hyperparameters
            epochs = getattr(self._model, '_epochs', None) or getattr(self._model, 'epochs', None) or 'unknown'
            batch_size = getattr(self._model, '_batch_size', None) or getattr(self._model, 'batch_size', None) or 'unknown'
            print(f"[worker][TVAE] Starting training: epochs={epochs}, batch_size={batch_size}, rows={len(data)}")
        except Exception:
            pass
        
        import time
        training_start = time.time()
        self._model.fit(data)
        training_elapsed = time.time() - training_start
        print(f"[worker][TVAE] Training completed in {training_elapsed:.1f}s ({training_elapsed/60:.1f} minutes)")
    
    def sample(self, num_rows: int) -> pd.DataFrame:
        """Generate synthetic data."""
        out = self._model.sample(num_rows=num_rows)
        
        # SOTA FIX: Structural Alignment & Binary Thresholding
        # 1. Column Reindexing: Ensure exact ordering to prevent KS mismatch
        if hasattr(self, '_real_columns') and self._real_columns:
            out = out.reindex(columns=self._real_columns)
            
        # 2. Binary Thresholding: Fix "Binary Collapse" where 0/1 columns become noise
        # We iterate over columns and detect if they should be binary
        for col in out.columns:
            # Check sdtype from metadata if available
            is_categorical = False
            try:
                col_meta = self._metadata.columns.get(col, {})
                if col_meta.get('sdtype') in ['categorical', 'boolean']:
                    is_categorical = True
            except Exception:
                pass
            
            # If categorical/target, apply rounding/thresholding to [0, 1]
            if is_categorical or col == 'target':
                try:
                    # Threshold at 0.5 to restore binary fidelity
                    out[col] = (out[col] > 0.5).astype(int)
                except Exception:
                    pass

        try:
            print(f"[sdv-debug] Sampled TVAE head:\n{out.iloc[:3, :5]}")
            if 'target' in out.columns:
                print(f"[sdv-debug] Sampled target distribution (post-threshold):\n{out['target'].value_counts(normalize=True)}")
            print(f"[sdv-debug] Sampled columns: {list(out.columns)}")
        except Exception:
            pass
        return out
    
    def get_supported_hyperparams(self) -> list[str]:
        """Return supported hyperparameters."""
        return list(self.SUPPORTED_HPARAMS)

