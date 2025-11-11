# Synthetic Data Generator Performance Improvements

## Goal
Achieve "all green" metrics (passing all privacy, utility, and fairness thresholds) for any uploaded dataset.

## Current Thresholds

### Utility Metrics (Must Pass)
- **KS Mean**: ≤ 0.10 (lower is better)
- **Corr Delta**: ≤ 0.10-0.15 (lower is better)
- **AUROC**: ≥ 0.80 (higher is better)
- **C-Index**: ≥ 0.70 (higher is better)

### Privacy Metrics (Must Pass)
- **MIA AUC**: ≤ 0.60 (lower is better)
- **Dup Rate**: ≤ 0.05 (5%) (lower is better)

### Fairness Metrics (Optional but Desired)
- **Rare Coverage**: ≥ 0.70 (higher is better)
- **Freq Skew**: ≤ 0.30 (lower is better)

## Improvement Strategy

### 1. Adaptive Hyperparameter Tuning
**Current Issues:**
- Fixed epochs (300 for CTGAN, 250 for TVAE) regardless of dataset size
- Conservative batch sizes that may not be optimal
- No learning rate tuning

**Improvements:**
- **Adaptive Epochs**: Scale based on dataset size and complexity
  - Small datasets (< 1000 rows): 200-300 epochs
  - Medium (1000-10000): 300-500 epochs
  - Large (> 10000): 400-600 epochs
- **Smart Batch Sizing**: 
  - For small datasets: batch_size = min(64, dataset_size / 10)
  - For medium: 128-256
  - For large: 256-512
- **Learning Rate Tuning**:
  - CTGAN: generator_lr=2e-4, discriminator_lr=2e-4 (current defaults)
  - TVAE: lr=1e-3 (if configurable)
- **Embedding Dimensions**: Scale with number of columns
  - Small schema (< 10 cols): 64
  - Medium (10-30): 128
  - Large (> 30): 256

### 2. Enhanced Post-Processing
**Current:** Basic quantile matching and jitter

**Improvements:**
- **Improved Quantile Matching**: Better handling of edge cases
- **Adaptive Noise Injection**: Only when needed to improve privacy
- **Correlation Preservation**: Post-process to maintain correlation structure
- **Outlier Handling**: Better treatment of extreme values

### 3. Better Method Selection
**Current:** Simple heuristics based on categorical/continuous ratio

**Improvements:**
- **Multi-Factor Analysis**:
  - Dataset size
  - Column count and types
  - Missing value patterns
  - Correlation structure
  - Distribution characteristics
- **Meta-Learning**: Use historical performance data
- **Ensemble Approach**: Try multiple methods and select best

### 4. Progressive Training Strategy
**New Feature:**
- Start with conservative hyperparameters
- Evaluate metrics after initial training
- If metrics fail, progressively increase:
  - Epochs (up to max)
  - Model complexity (embedding_dim)
  - Training time
- Early stopping if metrics pass early

### 5. Enhanced Agent Planning
**Improvements:**
- Better hyperparameter suggestions based on dataset analysis
- More sophisticated backup strategies
- Adaptive retry logic with parameter adjustments

### 6. Metrics Optimization
**Improvements:**
- Better utility metric calculation (handle edge cases)
- Improved privacy metric computation
- Fairness-aware generation

## Implementation Priority

1. **Phase 1 (High Impact, Low Risk)**: Adaptive hyperparameters
2. **Phase 2 (High Impact, Medium Risk)**: Enhanced post-processing
3. **Phase 3 (Medium Impact, Low Risk)**: Better method selection
4. **Phase 4 (Medium Impact, Medium Risk)**: Progressive training
5. **Phase 5 (Low Impact, High Risk)**: Ensemble methods

## Testing Strategy

1. Test on diverse datasets:
   - Small (< 1000 rows)
   - Medium (1000-10000 rows)
   - Large (> 10000 rows)
   - High categorical ratio
   - High continuous ratio
   - Mixed types
2. Measure improvement:
   - % of runs achieving "all green"
   - Average metric scores
   - Training time impact
3. A/B testing: Compare old vs new approach

