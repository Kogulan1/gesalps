"""
Auto-optimization module for synthetic data generation.
Focuses on achieving "all green" metrics (passing DCR/MIA/DP thresholds) with best utility.

Key Features:
- Grid search for hyperparameters (n_iter, batch_size, epsilon)
- Adaptive n_iter based on dataset characteristics
- Epsilon optimization for DP methods
- Root cause analysis for failures
- Parameter suggestion tables
"""

from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from dataclasses import dataclass
from enum import Enum


class FailureType(Enum):
    """Types of run failures."""
    HYPERPARAM_MISMATCH = "hyperparam_mismatch"
    INSUFFICIENT_ITERATIONS = "insufficient_iterations"
    HIGH_MIA = "high_mia"
    HIGH_DUP_RATE = "high_dup_rate"
    HIGH_KS = "high_ks"
    HIGH_CORR_DELTA = "high_corr_delta"
    DP_EPSILON_TOO_LOW = "dp_epsilon_too_low"
    DP_EPSILON_TOO_HIGH = "dp_epsilon_too_high"
    TIMEOUT = "timeout"
    MEMORY_ERROR = "memory_error"
    UNKNOWN = "unknown"


@dataclass
class OptimizationResult:
    """Result of an optimization attempt."""
    success: bool
    metrics: Dict[str, Any]
    hyperparams: Dict[str, Any]
    failure_type: Optional[FailureType] = None
    root_cause: Optional[str] = None
    suggestions: List[str] = None


@dataclass
class ParameterGrid:
    """Grid of hyperparameters to search."""
    n_iter: List[int] = None
    batch_size: List[int] = None
    epochs: List[int] = None
    embedding_dim: List[int] = None
    epsilon: List[float] = None
    generator_lr: List[float] = None
    discriminator_lr: List[float] = None


class SyntheticDataOptimizer:
    """
    Auto-optimization engine for synthetic data generation.
    
    Provides:
    - Grid search for hyperparameters
    - Adaptive parameter selection
    - Root cause analysis
    - Parameter suggestions based on dataset characteristics
    """
    
    # Thresholds for "all green" metrics
    KS_MAX = 0.10
    CORR_MAX = 0.10
    MIA_MAX = 0.60
    DUP_MAX = 0.05  # 5%
    
    def __init__(self):
        """Initialize optimizer."""
        pass
    
    def analyze_failure(
        self,
        metrics: Dict[str, Any],
        hyperparams: Dict[str, Any],
        method: str,
        dataset_size: Tuple[int, int],  # (rows, cols)
    ) -> Tuple[FailureType, str, List[str]]:
        """
        Analyze run failure and determine root cause.
        
        Args:
            metrics: Computed metrics (utility, privacy)
            hyperparams: Hyperparameters used
            method: Method name (ddpm, ctgan, tvae, gc)
            dataset_size: (n_rows, n_cols)
        
        Returns:
            (failure_type, root_cause, suggestions)
        """
        utility = metrics.get("utility", {})
        privacy = metrics.get("privacy", {})
        
        ks = utility.get("ks_mean")
        corr_delta = utility.get("corr_delta")
        mia = privacy.get("mia_auc")
        dup_rate = privacy.get("dup_rate")
        
        n_rows, n_cols = dataset_size
        
        # Check each threshold
        failures = []
        if ks is not None and ks > self.KS_MAX:
            failures.append((FailureType.HIGH_KS, f"KS mean {ks:.3f} > {self.KS_MAX}"))
        if corr_delta is not None and corr_delta > self.CORR_MAX:
            failures.append((FailureType.HIGH_CORR_DELTA, f"Corr Δ {corr_delta:.3f} > {self.CORR_MAX}"))
        if mia is not None and mia > self.MIA_MAX:
            failures.append((FailureType.HIGH_MIA, f"MIA AUC {mia:.3f} > {self.MIA_MAX}"))
        if dup_rate is not None and dup_rate > self.DUP_MAX:
            failures.append((FailureType.HIGH_DUP_RATE, f"Dup rate {dup_rate:.3f} > {self.DUP_MAX}"))
        
        if not failures:
            return (FailureType.UNKNOWN, "No clear failure", [])
        
        # Primary failure (most severe)
        primary_type, primary_msg = failures[0]
        
        # Generate root cause and suggestions
        root_cause = primary_msg
        suggestions = []
        
        if primary_type == FailureType.HIGH_KS:
            root_cause = f"Utility failure: KS statistic too high. Model not capturing distribution well."
            if method == "ddpm":
                n_iter = hyperparams.get("n_iter", 300)
                if n_iter < 400:
                    suggestions.append(f"Increase n_iter from {n_iter} to {min(500, n_iter + 100)}")
                suggestions.append("Try increasing batch_size for better gradient estimates")
            elif method in ("ctgan", "tvae"):
                epochs = hyperparams.get("epochs", 300)
                if epochs < 400:
                    suggestions.append(f"Increase epochs from {epochs} to {min(500, epochs + 100)}")
                suggestions.append("Consider using TabDDPM (ddpm) for better distribution matching")
        
        elif primary_type == FailureType.HIGH_CORR_DELTA:
            root_cause = f"Utility failure: Correlation structure not preserved."
            if method == "ddpm":
                suggestions.append("Increase n_iter for better correlation learning")
                suggestions.append("Try batch_size=128 or 256 for stable training")
            elif method in ("ctgan", "tvae"):
                suggestions.append("Increase embedding_dim to capture more complex relationships")
                suggestions.append("Increase epochs for better convergence")
        
        elif primary_type == FailureType.HIGH_MIA:
            root_cause = f"Privacy failure: Membership inference attack too successful."
            if method == "ddpm":
                suggestions.append("TabDDPM should have low MIA - check if training completed properly")
                suggestions.append("Verify n_iter >= 300 for proper training")
            elif method in ("ctgan", "tvae"):
                suggestions.append("Enable DP with epsilon=1.0-5.0 for privacy protection")
                suggestions.append("Consider switching to TabDDPM which has better privacy by default")
            else:
                suggestions.append("Switch to TabDDPM or enable DP for better privacy")
        
        elif primary_type == FailureType.HIGH_DUP_RATE:
            root_cause = f"Privacy failure: Too many duplicate rows in synthetic data."
            suggestions.append("Increase sample_multiplier to generate more diverse samples")
            suggestions.append("Check if training completed - duplicates suggest underfitting")
            if method == "ddpm":
                suggestions.append("Verify n_iter >= 300 for TabDDPM")
        
        # Add method-specific hyperparameter checks
        if method == "ddpm":
            n_iter = hyperparams.get("n_iter")
            if n_iter is None or n_iter < 200:
                root_cause += f" TabDDPM n_iter={n_iter} may be too low."
                suggestions.append(f"Set n_iter to at least 300 (current: {n_iter})")
        
        return (primary_type, root_cause, suggestions)
    
    def suggest_hyperparameters(
        self,
        method: str,
        dataset_size: Tuple[int, int],
        previous_metrics: Optional[Dict[str, Any]] = None,
        dp_requested: bool = False,
    ) -> Dict[str, Any]:
        """
        Suggest hyperparameters based on dataset characteristics and previous results.
        
        Args:
            method: Method name (ddpm, ctgan, tvae, gc)
            dataset_size: (n_rows, n_cols)
            previous_metrics: Previous run metrics (for adaptive tuning)
            dp_requested: Whether DP is requested
        
        Returns:
            Suggested hyperparameters
        """
        n_rows, n_cols = dataset_size
        
        if method == "ddpm" or method == "tabddpm":
            return self._suggest_tabddpm_params(n_rows, n_cols, previous_metrics)
        elif method == "ctgan":
            return self._suggest_ctgan_params(n_rows, n_cols, previous_metrics, dp_requested)
        elif method == "tvae":
            return self._suggest_tvae_params(n_rows, n_cols, previous_metrics)
        elif method == "gc":
            return {}  # GC has no hyperparameters
        else:
            return {}
    
    def _suggest_tabddpm_params(
        self,
        n_rows: int,
        n_cols: int,
        previous_metrics: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Suggest TabDDPM hyperparameters."""
        # Base n_iter on dataset size
        if n_rows < 1000:
            n_iter = 200
        elif n_rows < 5000:
            n_iter = 300
        elif n_rows < 20000:
            n_iter = 400
        else:
            n_iter = 500
        
        # Adaptive: increase if previous run had high KS
        if previous_metrics:
            utility = previous_metrics.get("utility", {})
            ks = utility.get("ks_mean")
            if ks and ks > self.KS_MAX:
                n_iter = min(500, n_iter + 100)
        
        # Batch size: adaptive to dataset size
        if n_rows < 500:
            batch_size = max(32, min(64, n_rows // 10))
        elif n_rows < 5000:
            batch_size = 128
        else:
            batch_size = min(256, max(128, n_rows // 20))
        
        return {
            "n_iter": n_iter,
            "batch_size": batch_size,
        }
    
    def _suggest_ctgan_params(
        self,
        n_rows: int,
        n_cols: int,
        previous_metrics: Optional[Dict[str, Any]] = None,
        dp_requested: bool = False,
    ) -> Dict[str, Any]:
        """Suggest CTGAN hyperparameters."""
        # Adaptive epochs
        if n_rows < 1000:
            epochs = 300
        elif n_rows < 10000:
            epochs = 400
        else:
            epochs = 500
        
        # Adaptive batch size
        if n_rows < 500:
            batch_size = max(32, min(64, n_rows // 10))
        elif n_rows < 5000:
            batch_size = 128
        else:
            batch_size = 256
        
        # Adaptive embedding dimension
        if n_cols < 10:
            embedding_dim = 128
        elif n_cols < 30:
            embedding_dim = 256
        else:
            embedding_dim = 512
        
        # Adaptive based on previous metrics
        if previous_metrics:
            utility = previous_metrics.get("utility", {})
            if utility.get("ks_mean", 0) > self.KS_MAX:
                epochs = min(500, epochs + 100)
                embedding_dim = min(512, embedding_dim + 64)
        
        params = {
            "epochs": epochs,
            "batch_size": batch_size,
            "embedding_dim": embedding_dim,
            "pac": 10,
            "generator_lr": 2e-4,
            "discriminator_lr": 2e-4,
        }
        
        if dp_requested:
            params["dp_epsilon"] = 1.0  # Default DP epsilon
        
        return params
    
    def _suggest_tvae_params(
        self,
        n_rows: int,
        n_cols: int,
        previous_metrics: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Suggest TVAE hyperparameters."""
        # Adaptive epochs
        if n_rows < 1000:
            epochs = 250
        elif n_rows < 10000:
            epochs = 350
        else:
            epochs = 450
        
        # Adaptive batch size
        if n_rows < 500:
            batch_size = max(32, min(64, n_rows // 10))
        elif n_rows < 5000:
            batch_size = 128
        else:
            batch_size = 256
        
        # Adaptive embedding dimension
        if n_cols < 10:
            embedding_dim = 64
        elif n_cols < 30:
            embedding_dim = 128
        else:
            embedding_dim = 256
        
        # Adaptive based on previous metrics
        if previous_metrics:
            utility = previous_metrics.get("utility", {})
            if utility.get("ks_mean", 0) > self.KS_MAX:
                epochs = min(450, epochs + 100)
        
        return {
            "epochs": epochs,
            "batch_size": batch_size,
            "embedding_dim": embedding_dim,
        }
    
    def grid_search_epsilon(
        self,
        epsilon_candidates: Optional[List[float]] = None,
    ) -> List[float]:
        """
        Generate epsilon candidates for DP grid search.
        
        Args:
            epsilon_candidates: Custom list (if None, uses default grid)
        
        Returns:
            List of epsilon values to try
        """
        if epsilon_candidates:
            return epsilon_candidates
        
        # Default grid: balance privacy and utility
        return [0.5, 1.0, 2.0, 5.0, 10.0]
    
    def grid_search_n_iter(
        self,
        base_n_iter: int = 300,
        dataset_size: Optional[Tuple[int, int]] = None,
    ) -> List[int]:
        """
        Generate n_iter candidates for TabDDPM grid search.
        
        Args:
            base_n_iter: Base value to start from
            dataset_size: (n_rows, n_cols) for adaptive selection
        
        Returns:
            List of n_iter values to try
        """
        if dataset_size:
            n_rows, _ = dataset_size
            if n_rows < 1000:
                return [200, 300, 400]
            elif n_rows < 5000:
                return [300, 400, 500]
            else:
                return [400, 500, 600]
        
        # Default grid around base value
        return [
            max(200, base_n_iter - 100),
            base_n_iter,
            min(500, base_n_iter + 100),
        ]
    
    def create_parameter_table(self, method: str) -> Dict[str, Any]:
        """
        Create parameter suggestion table for a method.
        
        Returns:
            Table with parameter suggestions by dataset size
        """
        if method == "ddpm":
            return {
                "small": {"n_rows": "< 1000", "n_iter": 200, "batch_size": "32-64"},
                "medium": {"n_rows": "1000-5000", "n_iter": 300, "batch_size": "128"},
                "large": {"n_rows": "5000-20000", "n_iter": 400, "batch_size": "128-256"},
                "xlarge": {"n_rows": "> 20000", "n_iter": 500, "batch_size": "256"},
            }
        elif method == "ctgan":
            return {
                "small": {
                    "n_rows": "< 1000",
                    "epochs": 300,
                    "batch_size": "32-64",
                    "embedding_dim": 128,
                },
                "medium": {
                    "n_rows": "1000-10000",
                    "epochs": 400,
                    "batch_size": 128,
                    "embedding_dim": 256,
                },
                "large": {
                    "n_rows": "> 10000",
                    "epochs": 500,
                    "batch_size": 256,
                    "embedding_dim": 512,
                },
            }
        elif method == "tvae":
            return {
                "small": {
                    "n_rows": "< 1000",
                    "epochs": 250,
                    "batch_size": "32-64",
                    "embedding_dim": 64,
                },
                "medium": {
                    "n_rows": "1000-10000",
                    "epochs": 350,
                    "batch_size": 128,
                    "embedding_dim": 128,
                },
                "large": {
                    "n_rows": "> 10000",
                    "epochs": 450,
                    "batch_size": 256,
                    "embedding_dim": 256,
                },
            }
        else:
            return {}


# Global optimizer instance
_optimizer = SyntheticDataOptimizer()


def get_optimizer() -> SyntheticDataOptimizer:
    """Get global optimizer instance."""
    return _optimizer

