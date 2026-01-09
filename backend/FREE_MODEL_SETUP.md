# Free Model Setup - Mistral Small 3 (Free)

## Overview

We're using **Mistral Small 3 (Free)** as the default model for synthetic data generation. This is a completely free model available on OpenRouter, optimized for low-latency performance.

## Model Details

- **Model ID**: `mistralai/mistral-small-24b-instruct:free`
- **Cost**: **FREE** (no charges)
- **Performance**: Optimized for low-latency across common AI tasks
- **Quality**: Good quality for structured JSON generation
- **Speed**: Fast responses

## Why This Model?

1. **Completely Free** - No API costs
2. **Low Latency** - Optimized for fast responses
3. **Good Quality** - Suitable for model selection and JSON generation
4. **Reliable** - Available through OpenRouter's free tier

## Setup

### 1. Get OpenRouter API Key

1. Sign up at https://openrouter.ai
2. Get your API key from https://openrouter.ai/keys
3. No credits needed for free models!

### 2. Configure Environment

Add to your `.env` file:

```bash
OPENROUTER_API_KEY=your-openrouter-api-key-here
OPENROUTER_MODEL=mistralai/mistral-small-24b-instruct:free
```

### 3. Verify Configuration

The model is already set as default in:
- `backend/libs/model_selector.py`
- `backend/api/main.py`
- `backend/ENV_TEMPLATE.txt`

## Usage

The model will be used automatically when:
- `ClinicalModelSelector` selects models for datasets
- `agent_suggest` endpoint is called
- Any LLM-powered model selection happens

## Cost Comparison

| Model | Cost | Speed | Quality |
|-------|------|-------|---------|
| **Mistral Small 3 (Free)** | **FREE** | Fast | Good |
| Grok 4.1 Fast | ~$0.10 per 1K | Very Fast | Excellent |
| Claude 3.5 Sonnet | ~$7.50 per 1K | Fast | Excellent |
| GPT-4o | ~$5.00 per 1K | Fast | Excellent |

## Testing

### Quick Test

```bash
# Set environment variable
export OPENROUTER_API_KEY=your-key
export OPENROUTER_MODEL=mistralai/mistral-small-24b-instruct:free

# Test model selection
python -c "
from backend.libs.model_selector import select_model_for_dataset
import pandas as pd

df = pd.DataFrame({'age': [25, 30, 35], 'income': [50000, 60000, 70000]})
result = select_model_for_dataset(df)
print('Selected model:', result.get('choice', {}).get('method'))
print('Rationale:', result.get('rationale'))
"
```

### Verify It's Working

Check your logs - you should see:
```
[INFO] ClinicalModelSelector using OpenRouter with model: mistralai/mistral-small-24b-instruct:free
```

## Advantages

1. **Zero Cost** - Perfect for development and testing
2. **Fast** - Low-latency optimized
3. **Reliable** - Available through OpenRouter
4. **Good Quality** - Suitable for most synthetic data generation tasks

## Limitations

1. **Quality** - May be slightly lower than paid models (Claude, GPT-4)
2. **JSON Mode** - May need more prompt engineering than premium models
3. **Rate Limits** - Check OpenRouter for free tier limits

## Upgrading Later

If you need better quality, you can easily switch to:
- `xai/grok-4.1-fast` - Best value (~$0.10 per 1K)
- `anthropic/claude-3.5-sonnet` - Best quality (~$7.50 per 1K)

Just change the `OPENROUTER_MODEL` environment variable.

## References

- OpenRouter Free Models: https://openrouter.ai/models?max_price=0
- Mistral Small 3: https://openrouter.ai/mistralai/mistral-small-24b-instruct-2501:free
- OpenRouter Docs: https://openrouter.ai/docs/features/variants/free
