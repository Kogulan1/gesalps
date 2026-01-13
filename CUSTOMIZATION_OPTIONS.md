# Customization Options - Override Default "All Green" Configuration

## Overview

The default configuration uses the proven "All Green" setup that achieved success across Breast Cancer, Pima Diabetes, and Heart Disease datasets. However, users can customize any aspect via `config_json` if needed.

## Default Configuration (Applied Automatically)

```python
{
    "method": "tvae",  # or auto-selected by agent
    "config_json": {
        "clinical_preprocessing": true,  # Enabled by default
        "hyperparams": {
            "tvae": {
                "num_epochs": 2000,
                "batch_size": 32,
                "embedding_dim": 512,
                "compress_dims": [256, 256],
                "decompress_dims": [256, 256]
            }
        }
    }
}
```

## Customization Examples

### 1. Disable Clinical Preprocessor

If you want to use raw data without preprocessing:

```json
{
    "config_json": {
        "clinical_preprocessing": false
    }
}
```

### 2. Increase Epochs for Large Datasets

For datasets with >5000 rows:

```json
{
    "config_json": {
        "hyperparams": {
            "tvae": {
                "num_epochs": 3000,
                "batch_size": 32,
                "embedding_dim": 512,
                "compress_dims": [256, 256],
                "decompress_dims": [256, 256]
            }
        }
    }
}
```

### 3. Use Different Architecture

For high-dimensional data (>50 columns):

```json
{
    "config_json": {
        "hyperparams": {
            "tvae": {
                "num_epochs": 2000,
                "batch_size": 32,
                "embedding_dim": 1024,
                "compress_dims": [512, 512],
                "decompress_dims": [512, 512]
            }
        }
    }
}
```

### 4. Use TabDDPM Instead

```json
{
    "method": "ddpm",
    "config_json": {
        "clinical_preprocessing": true,
        "hyperparams": {
            "ddpm": {
                "n_iter": 1000,
                "batch_size": 128
            }
        }
    }
}
```

### 5. Faster Training (Lower Quality)

For quick testing or non-critical use cases:

```json
{
    "config_json": {
        "hyperparams": {
            "tvae": {
                "num_epochs": 500,
                "batch_size": 64,
                "embedding_dim": 256
            }
        }
    }
}
```

### 6. Maximum Quality (Slower)

For critical clinical data requiring best quality:

```json
{
    "config_json": {
        "hyperparams": {
            "tvae": {
                "num_epochs": 5000,
                "batch_size": 16,
                "embedding_dim": 1024,
                "compress_dims": [512, 512],
                "decompress_dims": [512, 512]
            }
        }
    }
}
```

## When to Customize

### Use Default (Recommended)
- ✅ Clinical datasets (<5000 rows)
- ✅ Standard quality requirements
- ✅ Want "all green" metrics guaranteed
- ✅ No specific performance constraints

### Customize Epochs
- ⚙️ Very large datasets (>10000 rows): Increase to 3000-5000
- ⚙️ Very small datasets (<200 rows): May reduce to 1000-1500
- ⚙️ Time constraints: Reduce to 500-1000 (lower quality)

### Customize Architecture
- ⚙️ High-dimensional data (>50 cols): Increase embedding_dim to 1024
- ⚙️ Low-dimensional data (<10 cols): May reduce to 256
- ⚙️ Memory constraints: Reduce embedding_dim and compress_dims

### Disable Clinical Preprocessor
- ⚙️ Non-clinical data (no medical codes)
- ⚙️ Already preprocessed data
- ⚙️ Testing/comparison purposes

## API Usage

### Via Frontend (QuickConfigCard)

The QuickConfigCard uses defaults automatically. To customize:

1. Expand "Advanced Settings (Expert Mode)"
2. Adjust "Max Training Iterations" (maps to num_epochs)
3. Clinical Preprocessing toggle (enabled by default)

### Via API Directly

```bash
POST /v1/runs
{
    "dataset_id": "...",
    "method": "tvae",
    "mode": "agent",
    "name": "Custom Run",
    "config_json": {
        "clinical_preprocessing": true,
        "hyperparams": {
            "tvae": {
                "num_epochs": 3000,
                "batch_size": 64,
                "embedding_dim": 1024
            }
        }
    }
}
```

## Default vs Custom Comparison

| Aspect | Default | Custom Example |
|--------|---------|----------------|
| Epochs | 2000 | 3000 (large dataset) |
| Batch Size | 32 | 64 (faster) |
| Embedding Dim | 512 | 1024 (high-dim) |
| Architecture | [256,256] | [512,512] (high-dim) |
| Clinical Preprocessor | ✅ Enabled | ❌ Disabled (if needed) |
| Expected Quality | All Green | Varies |

## Recommendations

1. **Start with defaults** - They're proven to work
2. **Only customize if needed** - Defaults achieve "all green" metrics
3. **Test customizations** - Verify metrics still meet requirements
4. **Document custom configs** - Keep track of what works for your datasets

## Support

If you need help choosing customizations:
- Check `DEFAULT_ALL_GREEN_CONFIGURATION.md` for default details
- Review `PRODUCTION_ALL_GREEN_CONFIGURATION.md` for deployment info
- Test with a small dataset first before applying to production
