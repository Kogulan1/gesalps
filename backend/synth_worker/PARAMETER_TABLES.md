# Parameter Suggestion Tables for Synthetic Data Generation

This document provides comprehensive parameter suggestions for achieving "all green" metrics (passing all DCR/MIA/DP thresholds) with optimal utility.

## TabDDPM (Diffusion Model) - Recommended for Best Results

### Parameter Table by Dataset Size

| Dataset Size | n_iter | batch_size | Expected Training Time | Use Case |
|-------------|--------|------------|----------------------|----------|
| Small (< 1,000 rows) | 300 | 32-64 | 3-6 min | Quality-focused, small datasets |
| Medium (1,000-5,000 rows) | 400 | 128-256* | 6-12 min | Standard clinical datasets |
| Large (5,000-20,000 rows) | 500 | 128-256* | 12-20 min | Large hospital datasets |
| X-Large (> 20,000 rows) | 600 | 256-512* | 20-30 min | Enterprise datasets |

*Batch size increases with column count: >20 cols use 256, >30 cols use 256-512

### Adaptive n_iter Based on Metrics

| Previous KS Mean | Previous MIA | Recommended n_iter | Reason |
|-----------------|--------------|-------------------|--------|
| > 0.50 (Critical) | Any | +200 from base, min 500 | Severe training failure - aggressive increase |
| 0.20-0.50 (Severe) | Any | +200 from base, min 500 | Significant underfitting - large increase |
| > 0.10 (Failure) | Any | +100 from base | Utility failure - need more training |
| 0.08-0.10 (Near threshold) | Any | +50 from base | Preventive increase when close to threshold |
| ≤ 0.10 | > 0.60 | Base value | Privacy issue - check DP settings |
| ≤ 0.10 | ≤ 0.60 | Base value | All green - maintain settings |

### Expected Metrics (TabDDPM)

| Metric | Expected Range | Threshold | Notes |
|--------|---------------|-----------|-------|
| KS Mean | 0.05-0.08 | ≤ 0.10 | Excellent distribution matching |
| Corr Delta | 0.08-0.12 | ≤ 0.10 | Good correlation preservation |
| MIA AUC | 0.003-0.05 | ≤ 0.60 | Excellent privacy (best in class) |
| Dup Rate | 0.0-0.01 | ≤ 0.05 | Very low duplication |

## CTGAN Parameters

### Parameter Table by Dataset Size

| Dataset Size | epochs | batch_size | embedding_dim | pac | generator_lr | discriminator_lr |
|-------------|--------|------------|---------------|-----|--------------|------------------|
| Small (< 1,000) | 300 | 32-64 | 128 | 10 | 2e-4 | 2e-4 |
| Medium (1,000-10,000) | 400 | 128 | 256 | 10 | 2e-4 | 2e-4 |
| Large (> 10,000) | 500 | 256 | 512 | 10 | 2e-4 | 2e-4 |

### Adaptive Parameters Based on Column Count

| Columns | embedding_dim | Reason |
|---------|---------------|--------|
| < 10 | 128 | Small schema - lower capacity needed |
| 10-30 | 256 | Medium schema - balanced capacity |
| > 30 | 512 | Large schema - higher capacity needed |

### Expected Metrics (CTGAN)

| Metric | Expected Range | Threshold | Notes |
|--------|---------------|-----------|-------|
| KS Mean | 0.08-0.12 | ≤ 0.10 | May need tuning for complex distributions |
| Corr Delta | 0.10-0.15 | ≤ 0.10 | May exceed threshold - consider TabDDPM |
| MIA AUC | 0.40-0.70 | ≤ 0.60 | May fail - enable DP or use TabDDPM |
| Dup Rate | < 0.05 | ≤ 0.05 | Usually passes |

## TVAE Parameters

### Parameter Table by Dataset Size

| Dataset Size | epochs | batch_size | embedding_dim |
|-------------|--------|------------|---------------|
| Small (< 1,000) | 250 | 32-64 | 64 |
| Medium (1,000-10,000) | 350 | 128 | 128 |
| Large (> 10,000) | 450 | 256 | 256 |

### Expected Metrics (TVAE)

| Metric | Expected Range | Threshold | Notes |
|--------|---------------|-----------|-------|
| KS Mean | 0.08-0.12 | ≤ 0.10 | Similar to CTGAN |
| Corr Delta | 0.10-0.15 | ≤ 0.10 | May exceed threshold |
| MIA AUC | 0.45-0.75 | ≤ 0.60 | May fail - enable DP |
| Dup Rate | < 0.05 | ≤ 0.05 | Usually passes |

## Differential Privacy (DP) Parameters

### Epsilon Grid Search Values

| Epsilon | Privacy Level | Utility Impact | Use Case |
|---------|--------------|---------------|----------|
| 0.5 | Very High | High impact | Maximum privacy required |
| 1.0 | High | Moderate impact | Standard DP requirement |
| 2.0 | Medium-High | Low impact | Balanced privacy/utility |
| 5.0 | Medium | Minimal impact | Good utility with DP |
| 10.0 | Low | Negligible impact | Minimal privacy, max utility |

### DP Parameter Selection Guide

| Privacy Requirement | Recommended Epsilon | Expected MIA Impact | Expected Utility Impact |
|---------------------|---------------------|---------------------|------------------------|
| Maximum (HIPAA++) | 0.5-1.0 | MIA < 0.30 | KS may increase by 0.02-0.05 |
| Standard (HIPAA) | 1.0-2.0 | MIA < 0.50 | KS may increase by 0.01-0.03 |
| Moderate | 2.0-5.0 | MIA < 0.55 | KS may increase by 0.005-0.02 |
| Minimal | 5.0-10.0 | MIA < 0.60 | KS impact < 0.01 |

## Failure Analysis and Auto-Optimization

### Root Cause → Parameter Adjustment

| Failure Type | Root Cause | Auto-Optimization Action |
|-------------|------------|-------------------------|
| HIGH_KS | Distribution mismatch | Increase n_iter (TabDDPM) or epochs (CTGAN/TVAE) by 100 |
| HIGH_CORR_DELTA | Correlation not preserved | Increase embedding_dim or n_iter |
| HIGH_MIA | Privacy failure | Switch to TabDDPM or enable DP with epsilon=1.0-2.0 |
| HIGH_DUP_RATE | Underfitting | Increase sample_multiplier or verify training completed |

### Retry Strategy

| Attempt | Action | Expected Improvement |
|---------|--------|---------------------|
| 1 | Initial suggested params | Baseline metrics |
| 2 | +100 n_iter/epochs if utility fails | KS/Corr improvement |
| 3 | Switch method or enable DP if privacy fails | MIA improvement |

## Method Selection Guide

### Recommended Method by Dataset Characteristics

| Dataset Size | Column Count | Data Type Mix | Recommended Method | Reason |
|-------------|--------------|---------------|-------------------|--------|
| Any | > 20 | Mixed | TabDDPM | Best for high-dimensional mixed data |
| < 2,000 | Any | Any | GC | Fast, simple datasets |
| > 2,000 | < 10 | Mostly categorical | CTGAN | Good for categorical data |
| > 2,000 | < 10 | Mostly numeric | TVAE | Good for numeric data |
| > 2,000 | > 10 | Mixed | TabDDPM | Best overall performance |

## Quick Reference: All Green Parameters

### TabDDPM (Recommended)
```python
{
    "n_iter": 300,  # 200-500 based on dataset size
    "batch_size": 128,  # 64-256 based on dataset size
}
```

### CTGAN (If TabDDPM unavailable)
```python
{
    "epochs": 400,  # 300-500 based on dataset size
    "batch_size": 128,  # 64-256 based on dataset size
    "embedding_dim": 256,  # 128-512 based on column count
    "pac": 10,
    "generator_lr": 2e-4,
    "discriminator_lr": 2e-4,
}
```

### TVAE (Alternative)
```python
{
    "epochs": 350,  # 250-450 based on dataset size
    "batch_size": 128,  # 64-256 based on dataset size
    "embedding_dim": 128,  # 64-256 based on column count
}
```

### With DP
```python
{
    "dp": {
        "enabled": True,
        "epsilon": 1.0,  # 0.5-10.0 based on privacy needs
        "strict": False,  # Allow fallback if DP fails
    }
}
```

## Integration with Hospital Databases

When sampling from hospital databases, use the secure query interface:

```python
from synth_worker.secure_query import QueryConfig, create_hospital_sampler

# Initialize sampler
sampler = create_hospital_sampler(
    db_type="postgresql",
    credentials={...}
)

# Configure query with DP
config = QueryConfig(
    table_name="patient_records",
    columns=["age", "gender", "diagnosis"],
    limit=10000,
    sample_fraction=0.1,  # 10% sample
    dp_epsilon=1.0,  # Apply DP at query level
    sensitive_columns=["age", "diagnosis"],
)

# Sample and generate
df, metadata = sampler.sample_with_metadata(config, {...})
```

## Notes

1. **TabDDPM is recommended** for best results (all green metrics)
2. **Adaptive parameters** adjust based on previous run metrics
3. **DP epsilon** should be selected based on privacy requirements
4. **Retry logic** automatically optimizes parameters on failure
5. **Hospital DB integration** provides secure, privacy-preserving sampling

