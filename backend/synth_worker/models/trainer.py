"""Unified training helper for all synthesizers."""

from typing import Any, Dict
import pandas as pd
from sdv.metadata import SingleTableMetadata

from .factory import create_synthesizer
from .base import SynthesizerResult


def train_synthesizer(
    method: str,
    real_df: pd.DataFrame,
    metadata: SingleTableMetadata,
    hyperparams: Dict[str, Any],
    num_rows: int,
    utility_fn,
    privacy_fn,
    fairness_fn,
    dp_options: Dict[str, Any] = None,
) -> SynthesizerResult:
    """Train a synthesizer and compute metrics.
    
    This is a unified training function that replaces the old
    _train_gc(), _train_ctgan(), _train_tvae() functions.
    
    Args:
        method: Method name (e.g., "gc", "ctgan", "tvae", "dp-ctgan")
        real_df: Real training data
        metadata: SDV metadata object
        hyperparams: Model-specific hyperparameters
        num_rows: Number of synthetic rows to generate
        utility_fn: Function to compute utility metrics (real, synth) -> dict
        privacy_fn: Function to compute privacy metrics (real, synth) -> dict
        fairness_fn: Function to compute fairness metrics (real, synth) -> dict
        dp_options: Differential privacy options
    
    Returns:
        SynthesizerResult with synthetic data and all metrics
    """
    # Create synthesizer
    synthesizer, is_dp = create_synthesizer(
        method=method,
        metadata=metadata,
        hyperparams=hyperparams,
        dp_options=dp_options,
    )
    
    # Train
    synthesizer.fit(real_df)
    
    # Generate
    synthetic_df = synthesizer.sample(num_rows)
    
    # Compute metrics
    utility_metrics = utility_fn(real_df, synthetic_df)
    privacy_metrics = privacy_fn(real_df, synthetic_df)
    fairness_metrics = fairness_fn(real_df, synthetic_df)
    
    return SynthesizerResult(
        synthetic_df=synthetic_df,
        utility_metrics=utility_metrics,
        privacy_metrics=privacy_metrics,
        fairness_metrics=fairness_metrics,
        method=method,
        hyperparams=hyperparams,
    )

