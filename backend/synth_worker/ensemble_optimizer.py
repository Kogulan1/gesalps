"""
Ensemble optimization for achieving "all green" metrics on all dataset types.
Combines multiple methods and selects best result based on compliance thresholds.
"""

from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
from dataclasses import dataclass

from optimizer import get_optimizer, FailureType, SyntheticDataOptimizer
from models.factory import create_synthesizer
from sdv.metadata import SingleTableMetadata


@dataclass
class EnsembleResult:
    """Result from ensemble optimization."""
    method: str
    synthetic_df: pd.DataFrame
    metrics: Dict[str, Any]
    hyperparams: Dict[str, Any]
    score: float
    all_green: bool


class EnsembleOptimizer:
    """
    Ensemble optimizer that tries multiple methods and selects best result.
    
    Strategy:
    1. Try TabDDPM first (best for most datasets)
    2. If fails, try CTGAN/TVAE based on dataset characteristics
    3. If still fails, try GC as fallback
    4. Select best result based on compliance score
    """
    
    def __init__(self, compliance_level: Optional[str] = None):
        """Initialize ensemble optimizer.
        
        Args:
            compliance_level: Compliance level for threshold-aware selection
        """
        self.optimizer = get_optimizer(compliance_level=compliance_level)
        self.compliance_level = compliance_level
    
    def optimize_ensemble(
        self,
        real_df: pd.DataFrame,
        metadata: SingleTableMetadata,
        max_methods: int = 3,
        utility_fn=None,
        privacy_fn=None,
    ) -> EnsembleResult:
        """
        Try multiple methods and return best result.
        
        Args:
            real_df: Real training data
            metadata: SDV metadata
            max_methods: Maximum number of methods to try
            utility_fn: Utility metrics function
            privacy_fn: Privacy metrics function
        
        Returns:
            Best ensemble result
        """
        n_rows = len(real_df)
        n_cols = len(real_df.columns)
        dataset_size = (n_rows, n_cols)
        
        # Determine method order based on dataset characteristics
        methods = self._select_method_order(real_df, n_rows, n_cols)
        
        results: List[EnsembleResult] = []
        
        for method in methods[:max_methods]:
            try:
                # Get optimized hyperparameters
                hyperparams = self.optimizer.suggest_hyperparameters(
                    method=method,
                    dataset_size=dataset_size,
                    previous_metrics=None,
                    dp_requested=False,
                )
                
                # Create and train synthesizer
                synthesizer, _ = create_synthesizer(
                    method=method,
                    metadata=metadata,
                    hyperparams=hyperparams,
                )
                
                synthesizer.fit(real_df)
                synthetic_df = synthesizer.sample(num_rows=n_rows)
                
                # Compute metrics
                utility = utility_fn(real_df, synthetic_df) if utility_fn else {}
                privacy = privacy_fn(real_df, synthetic_df) if privacy_fn else {}
                
                metrics = {"utility": utility, "privacy": privacy}
                
                # Check if all green
                all_green = self._check_all_green(metrics)
                
                # Compute score (lower is better)
                score = self._compute_score(metrics)
                
                result = EnsembleResult(
                    method=method,
                    synthetic_df=synthetic_df,
                    metrics=metrics,
                    hyperparams=hyperparams,
                    score=score,
                    all_green=all_green,
                )
                
                results.append(result)
                
                # If we got all green, return immediately
                if all_green:
                    return result
                
            except Exception as e:
                # Method failed, try next
                continue
        
        # Return best result (lowest score)
        if results:
            return min(results, key=lambda r: r.score)
        
        # All methods failed - return error
        raise RuntimeError("All ensemble methods failed")
    
    def _select_method_order(
        self,
        df: pd.DataFrame,
        n_rows: int,
        n_cols: int,
    ) -> List[str]:
        """Select method order based on dataset characteristics."""
        # TabDDPM is best for most cases
        methods = ["ddpm"]
        
        # Add alternatives based on characteristics
        num_cols = len(df.select_dtypes(include=["number"]).columns)
        num_ratio = num_cols / max(1, n_cols)
        
        if num_ratio > 0.7:
            methods.append("tvae")  # Good for numeric-heavy data
        elif num_ratio < 0.3:
            methods.append("ctgan")  # Good for categorical-heavy data
        else:
            methods.append("tvae")  # Balanced
        
        # Always include GC as fallback
        methods.append("gc")
        
        return methods
    
    def _check_all_green(self, metrics: Dict[str, Any]) -> bool:
        """Check if metrics pass all thresholds."""
        utility = metrics.get("utility", {})
        privacy = metrics.get("privacy", {})
        
        ks = utility.get("ks_mean", 1.0)
        corr_delta = utility.get("corr_delta", 1.0)
        mia = privacy.get("mia_auc", 1.0)
        dup_rate = privacy.get("dup_rate", 1.0)
        
        return (
            ks <= self.optimizer.KS_MAX and
            corr_delta <= self.optimizer.CORR_MAX and
            mia <= self.optimizer.MIA_MAX and
            dup_rate <= self.optimizer.DUP_MAX
        )
    
    def _compute_score(self, metrics: Dict[str, Any]) -> float:
        """Compute overall score (lower is better)."""
        utility = metrics.get("utility", {})
        privacy = metrics.get("privacy", {})
        
        ks = utility.get("ks_mean", 1.0)
        corr_delta = utility.get("corr_delta", 1.0)
        mia = privacy.get("mia_auc", 1.0)
        dup_rate = privacy.get("dup_rate", 1.0)
        
        # Penalty for exceeding thresholds
        def penalty(val, threshold):
            if val > threshold:
                return (val - threshold) / threshold
            return 0.0
        
        score = (
            penalty(ks, self.optimizer.KS_MAX) +
            penalty(corr_delta, self.optimizer.CORR_MAX) +
            penalty(mia, self.optimizer.MIA_MAX) +
            penalty(dup_rate, self.optimizer.DUP_MAX)
        )
        
        return score
