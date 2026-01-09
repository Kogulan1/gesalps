# Synthetic Data Auto-Optimization Guide

## Overview

The auto-optimization system for Gesalp AI's synthetic data generation focuses on achieving "all green" metrics (passing all DCR/MIA/DP thresholds) with optimal utility.

## Key Components

### 1. Auto-Optimization Module (`optimizer.py`)

**Features:**
- Root cause analysis for run failures
- Adaptive hyperparameter suggestions
- Grid search for epsilon and n_iter
- Parameter suggestion tables

**Usage:**
```python
from synth_worker.optimizer import get_optimizer

optimizer = get_optimizer()

# Analyze failure
failure_type, root_cause, suggestions = optimizer.analyze_failure(
    metrics=metrics,
    hyperparams=hyperparams,
    method="ddpm",
    dataset_size=(n_rows, n_cols),
)

# Get suggested parameters
hyperparams = optimizer.suggest_hyperparameters(
    method="ddpm",
    dataset_size=(n_rows, n_cols),
    previous_metrics=previous_metrics,
    dp_requested=True,
)
```

### 2. Retry Loop with Adaptive Parameters (`synth_worker_dp/worker.py`)

**Features:**
- Automatic retry with parameter adjustment
- Failure-based hyperparameter tuning
- Best result tracking
- Integration with optimizer

**Usage:**
The retry loop is automatically used when running the DP worker:
```bash
python -m synth_worker_dp.worker
```

### 3. Secure Query Sampling (`secure_query.py`)

**Features:**
- Secure database connections
- Privacy-preserving sampling
- Differential privacy at query level
- Audit logging

**Usage:**
```python
from synth_worker.secure_query import QueryConfig, create_hospital_sampler

sampler = create_hospital_sampler(
    db_type="postgresql",
    credentials={
        "host": "db.example.com",
        "database": "hospital_db",
        "user": "user",
        "password": "pass",
    }
)

config = QueryConfig(
    table_name="patient_records",
    columns=["age", "gender", "diagnosis"],
    limit=10000,
    sample_fraction=0.1,
    dp_epsilon=1.0,
    sensitive_columns=["age"],
)

df, metadata = sampler.sample_with_metadata(config, {})
```

## Workflow

### Standard Run (No Optimization)

1. User uploads dataset
2. Worker selects method (TabDDPM recommended)
3. Uses default hyperparameters
4. Generates synthetic data
5. Computes metrics

### Optimized Run (With Auto-Optimization)

1. User uploads dataset
2. Worker selects method
3. **Optimizer suggests initial hyperparameters** based on dataset size
4. Train and generate
5. **If metrics fail thresholds:**
   - Analyze failure (root cause)
   - Adjust hyperparameters automatically
   - Retry with new parameters
   - Track best result
6. Return best result (even if not all green)

## Failure Analysis

The optimizer analyzes failures and provides:

1. **Failure Type**: HIGH_KS, HIGH_MIA, HIGH_CORR_DELTA, HIGH_DUP_RATE
2. **Root Cause**: Human-readable explanation
3. **Suggestions**: Specific parameter adjustments

### Example Failure Analysis

```
Failure Type: HIGH_KS
Root Cause: Utility failure: KS statistic too high. Model not capturing distribution well. TabDDPM n_iter=200 may be too low.
Suggestions:
  - Increase n_iter from 200 to 300
  - Try increasing batch_size for better gradient estimates
```

## Parameter Optimization Strategies

### TabDDPM Optimization

| Issue | Action | Expected Result |
|-------|--------|----------------|
| High KS | Increase n_iter by 100 | KS improvement by 0.02-0.05 |
| High Corr Delta | Increase batch_size | Better correlation learning |
| High MIA | Verify training completed | MIA should be < 0.05 for TabDDPM |

### CTGAN/TVAE Optimization

| Issue | Action | Expected Result |
|-------|--------|----------------|
| High KS | Increase epochs by 100 | KS improvement by 0.01-0.03 |
| High MIA | Enable DP or switch to TabDDPM | MIA improvement |
| High Corr Delta | Increase embedding_dim | Better relationship capture |

### DP Optimization

| Issue | Action | Expected Result |
|-------|--------|----------------|
| High MIA with DP | Increase epsilon (1.0 → 2.0) | MIA improvement, slight utility loss |
| Low utility with DP | Decrease epsilon (5.0 → 2.0) | Utility improvement, privacy maintained |

## Integration Points

### Main Worker (`worker.py`)

The optimizer can be integrated into the main worker for automatic optimization:

```python
from synth_worker.optimizer import get_optimizer

# In execute_pipeline or _attempt_train:
optimizer = get_optimizer()
hyperparams = optimizer.suggest_hyperparameters(
    method=method,
    dataset_size=(len(real_df), len(real_df.columns)),
    previous_metrics=previous_metrics,
)
```

### API Endpoint

The API can expose optimization features:

```python
@app.post("/api/runs/{run_id}/optimize")
def optimize_run(run_id: str):
    """Trigger auto-optimization for a failed run."""
    # Load run and metrics
    # Analyze failure
    # Suggest new parameters
    # Create new run with optimized parameters
    pass
```

## Best Practices

1. **Always use TabDDPM** for best results (all green metrics)
2. **Start with suggested parameters** from optimizer
3. **Enable retry loop** for automatic optimization
4. **Monitor metrics** and adjust if needed
5. **Use DP** when privacy is required (epsilon=1.0-2.0)

## Expected Results

### TabDDPM (Optimal)

- KS Mean: 0.05-0.08 (passes ≤ 0.10)
- Corr Delta: 0.08-0.12 (may slightly exceed ≤ 0.10)
- MIA AUC: 0.003-0.05 (excellent, passes ≤ 0.60)
- Dup Rate: 0.0-0.01 (excellent, passes ≤ 0.05)

### CTGAN/TVAE

- KS Mean: 0.08-0.12 (may need tuning)
- Corr Delta: 0.10-0.15 (may exceed threshold)
- MIA AUC: 0.40-0.70 (may fail, enable DP)
- Dup Rate: < 0.05 (usually passes)

## Troubleshooting

### All Metrics Fail

**Solution**: Switch to TabDDPM with n_iter=400-500

### Only Privacy Fails

**Solution**: Enable DP with epsilon=1.0-2.0, or switch to TabDDPM

### Only Utility Fails

**Solution**: Increase n_iter (TabDDPM) or epochs (CTGAN/TVAE) by 100-200

### Training Too Slow

**Solution**: Reduce n_iter/epochs, increase batch_size, or use smaller sample

## Future Enhancements

1. **Bayesian Optimization**: More sophisticated hyperparameter search
2. **Multi-objective Optimization**: Balance privacy and utility
3. **Transfer Learning**: Use previous run results to initialize
4. **Ensemble Methods**: Combine multiple models for better results
5. **Real-time Monitoring**: Adjust parameters during training

