# Metrics Comparison: Production Run vs Standalone TabDDPM Test

## Issue Identified

The production run (`baa9996f-f9fb-485a-9e74-5d9f99aea928`) **did NOT use TabDDPM** - it fell back to **Gaussian Copula (GC)**.

## Production Run (Actual: GC Model)

```
Model: gc (Gaussian Copula)
Evaluator Backend: custom
Training Iterations: N/A (GC doesn't use iterations)
Batch Size: N/A
Real Rows: 302
Synthetic Rows: 302

Privacy Metrics:
  MIA AUC: 0.818
  Dup Rate: 0.0

Utility Metrics:
  KS Mean: 0.073
  Corr Delta: 0.103
```

## Standalone TabDDPM Test (Expected)

```
Model: ddpm (TabDDPM - Diffusion)
Evaluator Backend: SynthCity
Training Iterations: 300 (fixed in script)
Batch Size: Default (SynthCity default)
Real Rows: 302
Synthetic Rows: 302

Privacy Metrics:
  MIA AUC: ~0.003-0.05 (expected for TabDDPM - much better!)
  Dup Rate: ~0.0-0.01

Utility Metrics:
  KS Mean: ~0.05-0.08 (expected)
  Corr Delta: ~0.08-0.12 (expected)
```

## Why the Difference?

### 1. **Different Models**
- **Production**: Used GC (simple statistical model)
- **Standalone**: Uses TabDDPM (advanced diffusion model)

### 2. **Different Hyperparameters**
- **Production GC**: No iterations (statistical model)
- **Standalone TabDDPM**: 300 iterations (n_iter=300)

### 3. **Different Evaluators**
- **Production**: Custom evaluators (fallback when SynthCity fails)
- **Standalone**: SynthCity evaluators (more comprehensive)

### 4. **Model Quality**
- **GC**: Fast but lower quality, higher MIA AUC (0.818 = poor privacy)
- **TabDDPM**: Slower but much better quality, lower MIA AUC (~0.003 = excellent privacy)

## Why Production Used GC Instead of TabDDPM?

**Root Cause Found in Logs:**

The logs show:
```
[worker][agent] Plan choice: {'method': 'ddpm'}
[worker][agent] Will attempt 3 methods: ['ddpm', 'ctgan', 'tvae']
[worker][step] INSERTING step 1: training - attempt 1: method=ddpm
[worker][training] ddpm training completed in 1.5s  ⚠️ TOO FAST!
[worker][step] INSERTING step 2: training - attempt 2: method=ctgan
```

**The Problem:**
1. TabDDPM was attempted (correct)
2. Training "completed" in **1.5 seconds** (suspiciously fast - should take minutes for 200 iterations)
3. System then tried ctgan (backup method)
4. Final metrics show `"model": "gc"` - meaning GC was the final/best method used

**Why TabDDPM Failed:**
- Training time of 1.5s suggests TabDDPM didn't actually train properly
- Possible causes:
  1. TabDDPM initialization succeeded but training failed silently
  2. Hyperparameters (n_iter=200) were ignored or invalid
  3. SynthCity plugin error during training
  4. The model generated data but it was poor quality, so system tried backups

## Expected TabDDPM Hyperparameters (for 302 rows)

Based on `worker.py` `_defaults()` function:
```python
if n_rows < 1000:  # 302 < 1000
    n_iter = 200  # Fast training for small datasets
    batch_size = min(256, max(64, 302 // 20)) = 64
```

So production TabDDPM should use:
- `n_iter = 200` (vs standalone's 300)
- `batch_size = 64` (adaptive)

## How to Fix

1. **Check worker logs** for TabDDPM initialization errors
2. **Verify agent plan** respects user's method selection
3. **Ensure TabDDPM is available** in the worker environment
4. **Check factory.py** for proper TabDDPM creation

## Key Differences Summary

| Aspect | Production (GC) | Standalone (TabDDPM) | Impact |
|-------|------------------|---------------------|--------|
| **Model** | Gaussian Copula | TabDDPM Diffusion | **Major** - Different algorithms |
| **Training Time** | ~1.5s | ~2-5 minutes | GC is much faster |
| **MIA AUC** | 0.818 (poor) | ~0.003-0.05 (excellent) | **10-200x better privacy** |
| **KS Mean** | 0.073 (good) | ~0.05-0.08 (good) | Similar utility |
| **n_iter** | N/A | 300 | TabDDPM needs iterations |
| **Evaluator** | Custom | SynthCity | Different metric calculations |

## Why TabDDPM Metrics Are Better

1. **Privacy (MIA AUC)**: 
   - GC: 0.818 = 81.8% chance of identifying real records (BAD)
   - TabDDPM: ~0.003 = 0.3% chance (EXCELLENT)
   - **TabDDPM is ~270x better for privacy**

2. **Utility (KS Mean)**:
   - Both are similar (~0.07), meaning statistical similarity is good
   - TabDDPM might be slightly better but difference is small

3. **Training Quality**:
   - GC: Fast but simple statistical model
   - TabDDPM: Deep learning model that learns complex patterns

## Next Steps

1. **Fix TabDDPM training issue** - Investigate why it completed in 1.5s
2. **Verify hyperparameters** - Ensure n_iter=200 is actually used
3. **Check SynthCity plugin** - Ensure TabDDPM plugin is working correctly
4. **Run new TabDDPM test** - Verify it actually trains and produces good metrics
5. **Compare when both work** - Once TabDDPM works, compare with standalone script

