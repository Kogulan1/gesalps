# OpenRouter Model Options for Synthetic Data Generation

## Current Default
**`anthropic/claude-3.5-sonnet`** - Best balance of quality, speed, and cost

## Recommended Models for Synthetic Data Generation

### Top Recommendations

1. **`xai/grok-4.1-fast`** or **`xai/grok-beta`** (Best Free/Low-Cost Option) ⭐ RECOMMENDED
   - **Best for**: Cost optimization, fast responses, excellent quality
   - **Speed**: Very fast (1-3s)
   - **Cost**: Very low - $0.20/$0.50 per 1M tokens (input/output) - ~$0.10 per 1K selections
   - **JSON Mode**: ✅ Supported
   - **Why**: Top-ranked model on LM Arena (1483 Elo), excellent reasoning, very fast
   - **Performance**: Superior to Gemini 2.5 Pro, excellent for structured outputs
   - **Note**: Model name may be `xai/grok-4.1-fast` or similar - check OpenRouter for latest

2. **`anthropic/claude-3.5-sonnet`** (Current Default) ⭐
   - **Best for**: Structured JSON, clinical data understanding
   - **Speed**: Fast (2-5s)
   - **Cost**: ~$0.003/$0.015 per 1K tokens (input/output)
   - **JSON Mode**: ✅ Native support
   - **Why**: Excellent at following complex schemas, understands healthcare context

2. **`anthropic/claude-3-opus`**
   - **Best for**: Maximum quality, complex reasoning
   - **Speed**: Slower (5-10s)
   - **Cost**: ~$0.015/$0.075 per 1K tokens (more expensive)
   - **JSON Mode**: ✅ Native support
   - **Why**: Highest quality, best for very complex datasets

3. **`openai/gpt-4o`**
   - **Best for**: Balanced quality and speed
   - **Speed**: Fast (2-4s)
   - **Cost**: ~$0.0025/$0.01 per 1K tokens
   - **JSON Mode**: ✅ Native support
   - **Why**: Great quality, slightly faster than Claude

4. **`openai/gpt-4o-mini`**
   - **Best for**: Cost-effective, fast responses
   - **Speed**: Very fast (1-3s)
   - **Cost**: ~$0.00015/$0.0006 per 1K tokens (cheapest)
   - **JSON Mode**: ✅ Native support
   - **Why**: Good quality at very low cost

5. **`google/gemini-pro-1.5`**
   - **Best for**: Alternative to Claude/GPT
   - **Speed**: Fast (2-5s)
   - **Cost**: ~$0.00125/$0.005 per 1K tokens
   - **JSON Mode**: ✅ Native support
   - **Why**: Good quality, competitive pricing

## Cost Comparison (per 1000 model selections)

Assuming ~500 tokens per selection:

| Model | Cost per 1K Selections | Speed | Quality |
|-------|------------------------|-------|---------|
| `xai/grok-4.1-fast` | **~$0.10** | Very Fast | Excellent ⭐ |
| `xai/grok-beta` | **FREE** or very low | Very Fast | Good |
| `gpt-4o-mini` | ~$0.30 | Very Fast | Good |
| `gpt-4o` | ~$5.00 | Fast | Excellent |
| `claude-3.5-sonnet` | ~$7.50 | Fast | Excellent |
| `gemini-pro-1.5` | ~$3.00 | Fast | Good |
| `claude-3-opus` | ~$37.50 | Slower | Best |

**Note**: Grok 4.1 Fast offers excellent quality at very low cost - best value option!

## How to Change the Model

### Option 1: Environment Variable (Recommended)
```bash
# For FREE Grok model
export OPENROUTER_MODEL="xai/grok-beta"

# Or for latest Grok
export OPENROUTER_MODEL="xai/grok-2-1212"

# Or other models
export OPENROUTER_MODEL="openai/gpt-4o"
```

### Option 2: Docker Compose
```yaml
environment:
  - OPENROUTER_MODEL=openai/gpt-4o
```

### Option 3: System Environment
```bash
# Set before starting the service
export OPENROUTER_MODEL="anthropic/claude-3-opus"
```

## Model Selection Guide

### For Free/Cost Optimization (Best Value) ⭐ RECOMMENDED
- **`xai/grok-4.1-fast`** - Best value! Excellent quality at ~$0.10 per 1K selections
- **`xai/grok-beta`** - FREE or very low cost alternative
- **`openai/gpt-4o-mini`** - Very cheap (~$0.30 per 1K selections)

### For Production (Recommended)
- **`anthropic/claude-3.5-sonnet`** - Best balance
- **`openai/gpt-4o`** - Alternative with similar quality

### For Maximum Quality
- **`anthropic/claude-3-opus`** - Best quality, slower and more expensive

### For Speed
- **`xai/grok-beta`** - Very fast, free
- **`openai/gpt-4o-mini`** - Fastest paid option
- **`openai/gpt-4o`** - Fast with good quality

## Testing Different Models

To test different models, you can temporarily set the environment variable:

```bash
# Test Grok (FREE)
OPENROUTER_MODEL=xai/grok-beta python -m backend.api.main

# Test GPT-4o
OPENROUTER_MODEL=openai/gpt-4o python -m backend.api.main

# Test Claude 3 Opus
OPENROUTER_MODEL=anthropic/claude-3-opus python -m backend.api.main

# Test GPT-4o-mini (cheapest paid)
OPENROUTER_MODEL=openai/gpt-4o-mini python -m backend.api.main
```

## Notes

- All recommended models support native JSON mode
- Model selection affects both `ClinicalModelSelector` and `agent_suggest` endpoint
- Response times vary by model and API load
- Costs are approximate and may vary
- Check OpenRouter pricing page for latest rates: https://openrouter.ai/models
