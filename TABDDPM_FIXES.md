# TabDDPM Training Fixes

## Issues Found

### 1. **TabDDPM was being converted to GC**
   - **Location**: `backend/synth_worker/worker.py` line 2075-2076
   - **Problem**: `_attempt_train()` had an `else: method = "gc"` clause that converted ANY method that wasn't "ctgan" or "tvae" to GC
   - **Impact**: TabDDPM (ddpm) was silently converted to GC, explaining why metrics showed `"model": "gc"`

### 2. **Hyperparameters not applied in plan-driven execution**
   - **Location**: `backend/synth_worker/worker.py` line 1305
   - **Problem**: When user explicitly selected a method, hyperparams were set to `{}`, and `_defaults()` wasn't called
   - **Impact**: TabDDPM was initialized with default SynthCity hyperparameters (likely n_iter=10-20), causing 1.5s training time instead of ~12s for n_iter=200

### 3. **Missing hyperparameter handling for ddpm in _attempt_train**
   - **Location**: `backend/synth_worker/worker.py` line 2070-2076
   - **Problem**: Only "ctgan" and "tvae" had explicit hyperparameter extraction; ddpm fell through to the `else: method = "gc"` clause
   - **Impact**: TabDDPM hyperparameters (n_iter, batch_size) were never passed to the synthesizer

## Fixes Applied

### 1. Fixed `_attempt_train()` to handle ddpm correctly
```python
# Before:
else:
    method = "gc"  # ❌ This converted ddpm to gc!

# After:
elif method in ("ddpm", "tabddpm", "diffusion"):
    # TabDDPM hyperparameters: n_iter, batch_size
    base_hp = {k: v for k, v in hp_all.items() if k in ("n_iter", "batch_size")}
    # Also check for method-specific nested hyperparams
    if "ddpm" in hp_all:
        base_hp.update({k: v for k, v in hp_all.get("ddpm", {}).items() if k in ("n_iter", "batch_size")})
elif method == "gc":
    # GC doesn't need hyperparameters, but keep method as-is
    base_hp = {}
else:
    # For other methods (e.g., SynthCity methods), pass hyperparams as-is
    base_hp = {k: v for k, v in hp_all.items() if k not in ("sample_multiplier", "max_synth_rows")}
```

### 2. Moved `_defaults()` function earlier and applied it in plan-driven execution
```python
# Moved _defaults() definition BEFORE plan-driven execution (line ~1288)
# Added _apply_defaults() helper to apply defaults to plan items

# When user explicitly selects method:
first = {"method": user_explicit_method, "hyperparams": _apply_defaults(user_explicit_method)}

# When normalizing plan items:
def _norm(x):
    # ... existing logic ...
    return {"method": method, "hyperparams": _apply_defaults(method, existing_hp)}
```

### 3. Added debug logging for TabDDPM
```python
# In synthcity_models.py __init__:
if self.method == "ddpm" or chosen == "ddpm":
    n_iter = (hyperparams or {}).get("n_iter")
    batch_size = (hyperparams or {}).get("batch_size")
    print(f"[factory][TabDDPM] Initializing with n_iter={n_iter}, batch_size={batch_size}")

# In synthcity_models.py fit():
if self.method == "ddpm" or self._plugin_name == "ddpm":
    n_iter = getattr(self._plugin, 'n_iter', None) or (self.hyperparams or {}).get('n_iter', 300)
    print(f"[worker][TabDDPM] Starting training with n_iter={n_iter} (this may take 5-15 minutes)")
```

## Expected Behavior After Fixes

1. **TabDDPM will NOT be converted to GC** - The method will remain "ddpm" throughout execution
2. **Hyperparameters will be applied** - For 302 rows, n_iter=200 and batch_size=64 will be used
3. **Training time will be correct** - ~12-15 seconds for n_iter=200 (not 1.5s)
4. **Metrics will reflect TabDDPM** - MIA AUC should be ~0.003-0.05 (not 0.818 like GC)

## Testing

To verify the fixes:
1. Deploy the updated code to production
2. Run a new TabDDPM run with the same dataset (heart.csv, 302 rows)
3. Check logs for:
   - `[factory][TabDDPM] Initializing with n_iter=200, batch_size=64`
   - `[worker][TabDDPM] Starting training with n_iter=200`
   - `[worker][training] ddpm training completed in ~12-15s` (not 1.5s)
4. Verify metrics show:
   - `"model": "ddpm"` (not "gc")
   - `MIA AUC: ~0.003-0.05` (not 0.818)
   - `"n_iter": 200` in meta

## Files Changed

1. `backend/synth_worker/worker.py`
   - Moved `_defaults()` function earlier
   - Added `_apply_defaults()` helper
   - Fixed `_attempt_train()` to handle ddpm
   - Applied defaults in plan-driven execution

2. `backend/synth_worker/models/synthcity_models.py`
   - Added debug logging for TabDDPM initialization
   - Added verification of hyperparameters

