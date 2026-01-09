# Using Grok (xAI) Models for Free/Cost-Effective Synthetic Data Generation

## Overview

Grok models from xAI are available on OpenRouter and offer **FREE or very low cost** options for synthetic data generation. This is perfect for:
- Development and testing
- Cost optimization
- High-volume usage
- Learning and experimentation

## Available Grok Models

Check OpenRouter for the latest Grok models. Common options include:
- **`xai/grok-4.1-fast`** ⭐ **RECOMMENDED** - Latest, best quality, very low cost (~$0.10 per 1K selections)
- `xai/grok-beta` - Beta version, often free
- `xai/grok-2-1212` - Grok 2 model
- `xai/grok-2-vision-1212` - Vision-capable version

**Note**: Model names and availability may change. Check https://openrouter.ai/models for latest options.

### Grok 4.1 Fast Highlights
- **Top-ranked** on LM Arena (1483 Elo score)
- **Superior** to Gemini 2.5 Pro
- **Very fast** responses (1-3 seconds)
- **Excellent** reasoning and structured output
- **Very low cost**: $0.20/$0.50 per 1M tokens (input/output)

## Setup

### 1. Get OpenRouter API Key
1. Sign up at https://openrouter.ai
2. Get your API key from https://openrouter.ai/keys
3. Add credits if needed (some Grok models may require minimal credits)

### 2. Configure Environment

Add to your `.env` file:

```bash
OPENROUTER_API_KEY=your-openrouter-api-key-here
# Recommended: Grok 4.1 Fast (best value)
OPENROUTER_MODEL=xai/grok-4.1-fast
```

Or for free option:

```bash
OPENROUTER_MODEL=xai/grok-beta
```

### 3. Restart Services

```bash
# Docker Compose
docker-compose restart api

# Or if running directly
# Restart your Python service
```

## Cost Comparison

| Model | Cost per 1K Selections | Speed | Quality |
|-------|------------------------|-------|---------|
| `xai/grok-4.1-fast` | **~$0.10** | Very Fast | **Excellent** ⭐ |
| `xai/grok-beta` | **FREE** or very low | Very Fast | Good |
| `gpt-4o-mini` | ~$0.30 | Very Fast | Good |
| `claude-3.5-sonnet` | ~$7.50 | Fast | Excellent |

## Testing Grok

### Quick Test

```bash
# Set environment variable
export OPENROUTER_API_KEY=your-key
export OPENROUTER_MODEL=xai/grok-beta

# Run a test
python -c "
from backend.libs.model_selector import select_model_for_dataset
import pandas as pd

# Test with sample data
df = pd.DataFrame({'age': [25, 30, 35], 'income': [50000, 60000, 70000]})
result = select_model_for_dataset(df)
print(result)
"
```

### Verify It's Working

Check your logs - you should see:
```
[INFO] ClinicalModelSelector using OpenRouter with model: xai/grok-beta
```

## Advantages of Grok

1. **FREE or Very Low Cost** - Perfect for development
2. **Fast Responses** - Typically 1-3 seconds
3. **Good JSON Support** - Works well with structured outputs
4. **No Infrastructure** - Cloud-based, no local setup needed

## Limitations

1. **Model Availability** - May vary by region/time
2. **Rate Limits** - Check OpenRouter for limits
3. **Quality** - May be slightly lower than Claude/GPT for complex tasks
4. **JSON Mode** - May need more prompt engineering than Claude

## Recommendations

### For Development/Testing
✅ Use `xai/grok-4.1-fast` - Best value, excellent quality, very low cost

### For Production ⭐ RECOMMENDED
- **Best Value**: `xai/grok-4.1-fast` - Excellent quality at ~$0.10 per 1K selections
- If cost is primary concern: `xai/grok-beta` (free or very low)
- If quality is priority: `anthropic/claude-3.5-sonnet` (slightly better but 75x more expensive)
- If balance needed: `openai/gpt-4o` (good quality, moderate cost)

## Troubleshooting

### Model Not Found
- Check OpenRouter models page for latest names
- Model names may have changed
- Try `xai/grok-beta` as fallback

### API Errors
- Verify API key is correct
- Check OpenRouter account has credits (if required)
- Check rate limits

### JSON Parsing Issues
- Grok may need more explicit JSON instructions
- Check logs for response format
- May need to adjust prompts

## Next Steps

1. Set `OPENROUTER_MODEL=xai/grok-4.1-fast` in your environment (recommended)
2. Test with a small dataset
3. Monitor costs and quality
4. Adjust model if needed

**Recommended Configuration**:
```bash
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=xai/grok-4.1-fast
```

For latest Grok models and pricing, visit: https://openrouter.ai/models?order=newest&query=grok
