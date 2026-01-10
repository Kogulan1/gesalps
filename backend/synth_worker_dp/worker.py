"""
DP-enabled synthetic data worker with auto-optimization and retry logic.
Focuses on achieving "all green" metrics with differential privacy.
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import from synth_worker
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Import the main worker implementation
from synth_worker import worker as worker_module

# Import optimizer
from synth_worker.optimizer import (
    get_optimizer,
    FailureType,
    OptimizationResult,
)

import pandas as pd
from typing import Any, Dict, Optional
import time
import json


def execute_pipeline_with_retry(
    run: Dict[str, Any],
    max_retries: int = 3,
    cancellation_checker=None,
) -> Dict[str, Any]:
    """
    Execute pipeline with auto-optimization and retry logic.
    
    Features:
    - Automatic hyperparameter tuning based on failures
    - Adaptive n_iter for TabDDPM
    - Epsilon grid search for DP methods
    - Root cause analysis
    """
    optimizer = get_optimizer()
    
    # Use worker module functions
    supabase = worker_module.supabase
    _thresholds_status = worker_module._thresholds_status
    _make_artifacts = worker_module._make_artifacts
    _prepare_synthcity_loader = worker_module._prepare_synthcity_loader
    _clean_df_for_sdv = worker_module._clean_df_for_sdv
    _download_csv_from_storage = worker_module._download_csv_from_storage
    _enforce_schema_dtypes = worker_module._enforce_schema_dtypes
    _apply_defaults = worker_module._apply_defaults
    _attempt_train = worker_module._attempt_train
    resolve_dp_backend = worker_module.resolve_dp_backend
    SAMPLE_MULTIPLIER = worker_module.SAMPLE_MULTIPLIER
    MAX_SYNTH_ROWS = worker_module.MAX_SYNTH_ROWS
    KS_MAX = worker_module.KS_MAX
    CORR_MAX = worker_module.CORR_MAX
    MIA_MAX = worker_module.MIA_MAX
    
    # Load dataset
    ds = supabase.table("datasets").select(
        "file_url,rows_count,name,schema_json"
    ).eq("id", run["dataset_id"]).single().execute()
    
    file_url = (ds.data or {}).get("file_url")
    if not file_url:
        raise RuntimeError("Dataset file not found")
    
    real = _download_csv_from_storage(file_url)
    
    # MANDATORY: Smart preprocessing via OpenRouter LLM (before model training)
    # Uses SyntheticDataSpecialist's preprocessing_agent.py implementation
    try:
        from synth_worker.preprocessing_agent import get_preprocessing_plan
        PREPROCESSING_AVAILABLE = True
    except ImportError:
        PREPROCESSING_AVAILABLE = False
        get_preprocessing_plan = None
    
    preprocessing_metadata = {}
    if PREPROCESSING_AVAILABLE and get_preprocessing_plan:
        try:
            cfg = run.get("config_json") or {}
            enable_smart_preprocess = cfg.get("enable_smart_preprocess", True)
            if "smart_preprocess" in cfg:
                enable_smart_preprocess = cfg.get("smart_preprocess", True)
            
            if enable_smart_preprocess:
                try:
                    print("[worker_dp][preprocessing] Applying mandatory smart preprocessing via OpenRouter LLM...")
                except Exception:
                    pass
                
                # Call preprocessing agent
                preprocessed_df, preprocessing_metadata = get_preprocessing_plan(real, previous_ks=None)
                
                if preprocessed_df is not None and preprocessing_metadata:
                    real = preprocessed_df
                    try:
                        applied_steps = preprocessing_metadata.get("metadata", {}).get("applied_steps", [])
                        print(f"[worker_dp][preprocessing] Applied {len(applied_steps)} preprocessing steps")
                    except Exception:
                        pass
        except Exception as e:
            try:
                print(f"[worker_dp][preprocessing] Preprocessing failed, continuing with original data: {type(e).__name__}")
            except Exception:
                pass
            preprocessing_metadata = {"error": str(e), "preprocessing_method": "failed"}
    
    real_clean = _clean_df_for_sdv(real)
    
    n_rows = len(real_clean)
    n_cols = len(real_clean.columns)
    dataset_size = (n_rows, n_cols)
    
    # Prepare metadata
    synthcity_loader = _prepare_synthcity_loader(real_clean)
    
    from sdv.metadata import SingleTableMetadata
    metadata = SingleTableMetadata()
    metadata.detect_from_dataframe(real_clean)
    
    # Get method from run config
    method = (run.get("method") or "").lower()
    if not method:
        method = "ddpm"  # Default to TabDDPM for best results
    
    # Get DP config
    cfg = run.get("config_json") or {}
    dp_raw = cfg.get("dp")
    dp_backend, dp_strict, dp_epsilon = resolve_dp_backend(
        dp_raw if (dp_raw is True or isinstance(dp_raw, dict)) else None
    )
    dp_requested = dp_backend != "none"
    
    # Initial hyperparameters
    previous_metrics = None
    best_result: Optional[Dict[str, Any]] = None
    best_score = float('inf')
    
    for attempt in range(1, max_retries + 1):
        # Check for cancellation
        if cancellation_checker and cancellation_checker(run["id"]):
            raise RuntimeError("Run cancelled by user")
        
        try:
            # Get suggested hyperparameters
            hyperparams = optimizer.suggest_hyperparameters(
                method=method,
                dataset_size=dataset_size,
                previous_metrics=previous_metrics,
                dp_requested=dp_requested,
            )
            
            # Apply defaults if needed
            hyperparams = _apply_defaults(method, hyperparams)
            
            # Log attempt
            try:
                print(f"[worker_dp][retry] Attempt {attempt}/{max_retries} with method={method}, hyperparams={json.dumps(hyperparams)}")
            except Exception:
                pass
            
            # Train and generate
            result = _attempt_train(
                plan_item={
                    "method": method,
                    "hyperparams": hyperparams,
                },
                real_df=real_clean,
                metadata=metadata,
                default_sample_multiplier=SAMPLE_MULTIPLIER,
                default_max_rows=MAX_SYNTH_ROWS,
                synthcity_loader=synthcity_loader,
            )
            
            synth = _enforce_schema_dtypes(real_clean, result["synth"])
            metrics = result["metrics"]
            
            # Check thresholds
            overall_ok, reasons = _thresholds_status(metrics)
            
            # Score metrics (lower is better)
            score = _score_metrics(metrics)
            
            # Track best result
            if score < best_score:
                best_score = score
                best_result = {
                    "synth": synth,
                    "metrics": metrics,
                    "method": method,
                    "hyperparams": hyperparams,
                    "attempt": attempt,
                }
            
            # Log metrics
            try:
                print(f"[worker_dp][retry] Attempt {attempt}: ok={overall_ok}, score={score:.3f}, reasons={'; '.join(reasons)}")
            except Exception:
                pass
            
            # If all thresholds passed, return success
            if overall_ok:
                final_metrics = metrics.copy()
                final_metrics.setdefault("meta", {}).update({
                    "model": method,
                    "attempt": attempt,
                    "dp_effective": dp_requested and dp_backend != "none",
                    "n_real": n_rows,
                    "n_synth": len(synth),
                    "optimization_used": True,
                })
                
                artifacts = _make_artifacts(run["id"], synth, final_metrics)
                return {"metrics": final_metrics, "artifacts": artifacts}
            
            # Analyze failure for next attempt
            failure_type, root_cause, suggestions = optimizer.analyze_failure(
                metrics=metrics,
                hyperparams=hyperparams,
                method=method,
                dataset_size=dataset_size,
            )
            
            try:
                print(f"[worker_dp][retry] Failure analysis: {root_cause}")
                print(f"[worker_dp][retry] Suggestions: {suggestions}")
            except Exception:
                pass
            
            # Store metrics for adaptive tuning
            previous_metrics = metrics
            
            # If last attempt, return best result
            if attempt == max_retries:
                break
            
            # ENHANCED: If preprocessing was applied and KS is still high, try different model
            # This addresses cases where preprocessing alone wasn't enough
            if preprocessing_metadata and preprocessing_metadata.get("metadata"):
                utility = metrics.get("utility", {})
                ks_mean = utility.get("ks_mean", 0.0)
                KS_MAX = worker_module.KS_MAX
                
                if ks_mean > KS_MAX and attempt == 1:
                    # First attempt after preprocessing still has high KS - try CTGAN
                    if method != "ctgan":
                        try:
                            print(f"[worker_dp][retry] High KS ({ks_mean:.3f}) after preprocessing, switching to CTGAN")
                        except Exception:
                            pass
                        method = "ctgan"
                        hyperparams = optimizer.suggest_hyperparameters(
                            method="ctgan",
                            dataset_size=dataset_size,
                            previous_metrics=previous_metrics,
                            dp_requested=dp_requested,
                        )
                        hyperparams = _apply_defaults("ctgan", hyperparams)
                        time.sleep(1.0)
                        continue
            
            # Adaptive: adjust hyperparameters based on failure
            if failure_type == FailureType.HIGH_KS or failure_type == FailureType.HIGH_CORR_DELTA:
                # Utility failure - increase training
                if method == "ddpm":
                    hyperparams["n_iter"] = min(500, hyperparams.get("n_iter", 300) + 100)
                elif method in ("ctgan", "tvae"):
                    hyperparams["epochs"] = min(500, hyperparams.get("epochs", 300) + 100)
            
            elif failure_type == FailureType.HIGH_MIA:
                # Privacy failure - enable DP or switch method
                if not dp_requested and method != "ddpm":
                    # Try TabDDPM which has better privacy
                    method = "ddpm"
                    hyperparams = optimizer.suggest_hyperparameters(
                        method="ddpm",
                        dataset_size=dataset_size,
                        previous_metrics=previous_metrics,
                    )
                elif dp_requested and dp_epsilon:
                    # Increase epsilon slightly for better utility (if privacy allows)
                    dp_epsilon = min(10.0, dp_epsilon * 1.5)
            
            # Small delay between retries
            time.sleep(1.0)
        
        except Exception as e:
            try:
                print(f"[worker_dp][retry] Attempt {attempt} failed: {type(e).__name__}: {e}")
            except Exception:
                pass
            
            # If last attempt, re-raise
            if attempt == max_retries:
                raise
            
            # Try fallback method
            if method != "gc":
                method = "gc"
                hyperparams = {}
            else:
                method = "ddpm"
                hyperparams = optimizer.suggest_hyperparameters(
                    method="ddpm",
                    dataset_size=dataset_size,
                )
            
            time.sleep(1.0)
    
    # Return best result if we have one
    if best_result:
        final_metrics = best_result["metrics"].copy()
        final_metrics.setdefault("meta", {}).update({
            "model": best_result["method"],
            "attempt": best_result["attempt"],
            "dp_effective": dp_requested and dp_backend != "none",
            "n_real": n_rows,
            "n_synth": len(best_result["synth"]),
            "optimization_used": True,
            "all_thresholds_passed": False,
        })
        
        artifacts = _make_artifacts(run["id"], best_result["synth"], final_metrics)
        return {"metrics": final_metrics, "artifacts": artifacts}
    
    # Fallback to standard pipeline
    return worker_module.execute_pipeline(run, cancellation_checker)


def _score_metrics(metrics: Dict[str, Any]) -> float:
    """Score metrics (lower is better)."""
    try:
        utility = metrics.get("utility", {})
        privacy = metrics.get("privacy", {})
        
        ks = utility.get("ks_mean", 0.0)
        corr_delta = utility.get("corr_delta", 0.0)
        mia = privacy.get("mia_auc", 0.0)
        dup_rate = privacy.get("dup_rate", 0.0)
        
        # Use thresholds from worker module
        KS_MAX = worker_module.KS_MAX
        CORR_MAX = worker_module.CORR_MAX
        MIA_MAX = worker_module.MIA_MAX
        DUP_MAX = 0.05
        
        # Penalty for exceeding thresholds
        def penalty(val, threshold):
            if val > threshold:
                return (val - threshold) / threshold
            return 0.0
        
        score = (
            penalty(ks, KS_MAX) +
            penalty(corr_delta, CORR_MAX) +
            penalty(mia, MIA_MAX) +
            penalty(dup_rate, DUP_MAX)
        )
        
        return score
    except Exception:
        return float('inf')


# Use retry-enabled pipeline by default
def worker_loop_with_retry():
    """Worker loop with auto-optimization and retry logic."""
    # Override execute_pipeline to use retry version
    import synth_worker.worker as worker_module
    original_execute = worker_module.execute_pipeline
    worker_module.execute_pipeline = execute_pipeline_with_retry
    
    try:
        worker_loop()
    finally:
        # Restore original
        worker_module.execute_pipeline = original_execute


if __name__ == "__main__":
    # Use retry-enabled worker loop
    worker_loop_with_retry()
