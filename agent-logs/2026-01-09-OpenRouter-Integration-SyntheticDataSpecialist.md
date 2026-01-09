# 2026-01-09 - OpenRouter Integration for Enhanced LLM Performance - SyntheticDataSpecialist

## Status
✅ Completed

## Summary
Integrated OpenRouter API to replace local Ollama LLM for improved agent performance in synthetic data generation. OpenRouter provides access to state-of-the-art models (Claude 3.5 Sonnet) with better JSON structure generation, faster response times, and more reliable outputs. The system automatically uses OpenRouter when API key is configured, with graceful fallback to Ollama for local development.

## Key Findings / Decisions

### Why OpenRouter?
- **Better Performance**: Access to Claude 3.5 Sonnet, GPT-4, and other SOTA models
- **Structured JSON**: Native JSON mode support for reliable model selection plans
- **Faster Response**: Cloud-based, no local model loading time
- **More Reliable**: Better at following JSON schema requirements
- **Cost-Effective**: Pay-per-use, no infrastructure to maintain

### Implementation Strategy
- **Automatic Detection**: Uses OpenRouter if `OPENROUTER_API_KEY` is set
- **Graceful Fallback**: Falls back to Ollama if OpenRouter unavailable
- **Backward Compatible**: Existing Ollama setups continue to work
- **Configuration**: Environment variable-based, easy to switch

## Code Changes Proposed/Applied

### File: `backend/libs/model_selector.py`
- **Line ~26-35**: Added OpenRouter configuration
  - `OPENROUTER_API_KEY`: API key from environment
  - `OPENROUTER_BASE`: API endpoint (default: https://openrouter.ai/api/v1)
  - `OPENROUTER_MODEL`: Model to use (default: anthropic/claude-3.5-sonnet)
  - Automatic provider selection based on API key availability

- **Line ~262-350**: Enhanced `_call_llm()` method
  - Split into `_call_openrouter()` and `_call_ollama()`
  - OpenRouter uses OpenAI-compatible chat API format
  - Native JSON mode support (`response_format: {"type": "json_object"}`)
  - Better error handling and logging

**Key Changes**:
```python
# Automatic provider selection
USE_OPENROUTER = bool(OPENROUTER_API_KEY)
AGENT_PROVIDER = "openrouter" if USE_OPENROUTER else "ollama"

# OpenRouter API call
def _call_openrouter(self, system_prompt: str, user_prompt: str):
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 2000,
        "response_format": {"type": "json_object"},  # Native JSON mode
    }
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
```

### File: `backend/api/main.py`
- **Line ~47-55**: Added OpenRouter configuration (same as model_selector.py)
- **Line ~1941-1976**: Updated `_agent_plan_internal()` to use OpenRouter
  - Tries OpenRouter first if API key available
  - Falls back to Ollama if OpenRouter fails
  - Better error handling and logging

**Key Changes**:
```python
# Use OpenRouter if available
if USE_OPENROUTER:
    # OpenRouter API call with JSON mode
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [...],
        "response_format": {"type": "json_object"},
    }
    # ... make API call
else:
    # Fallback to Ollama
    # ... existing Ollama code
```

### File: `backend/ENV_TEMPLATE.txt`
- **Line ~25-35**: Added OpenRouter configuration section
  - `OPENROUTER_API_KEY`: Required API key
  - `OPENROUTER_BASE`: API endpoint (optional, has default)
  - `OPENROUTER_MODEL`: Model selection (default: claude-3.5-sonnet)
  - `OPENROUTER_REFERER`: Optional referer for analytics

## Configuration

### Environment Variables

**Required for OpenRouter**:
```bash
OPENROUTER_API_KEY=your-api-key-here
```

**Optional (with defaults)**:
```bash
OPENROUTER_BASE=https://openrouter.ai/api/v1
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_REFERER=https://gesalp.ai
```

**Ollama (fallback)**:
```bash
OLLAMA_BASE=http://ollama:11434
OLLAMA_MODEL=llama3.1:8b
```

### Where to Put OpenRouter Key

1. **Local Development**: Add to `.env` file in `backend/` directory
   ```bash
   cd backend
   echo "OPENROUTER_API_KEY=your-key-here" >> .env
   ```

2. **Docker**: Add to `docker-compose.yml` environment section
   ```yaml
   environment:
     - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
   ```

3. **Production**: Add to production environment variables (VPS, cloud, etc.)
   - Contabo VPS: Add to `.env` file or systemd service
   - Cloud platforms: Use their environment variable management

4. **Docker Compose**: Update `backend/docker-compose.yml`
   ```yaml
   services:
     api:
       environment:
         - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
   ```

## Expected Results

### Before (Ollama)
- **Model**: llama3.1:8b (local)
- **Response Time**: 5-15 seconds (depending on hardware)
- **JSON Reliability**: ~80% (may need retries)
- **Quality**: Good, but may need JSON cleanup

### After (OpenRouter)
- **Model**: Claude 3.5 Sonnet (cloud)
- **Response Time**: 2-5 seconds (faster)
- **JSON Reliability**: ~95% (native JSON mode)
- **Quality**: Excellent, better at following schema

### Performance Improvements
- **Faster Model Selection**: 2-5s vs 5-15s
- **Better JSON Structure**: Native JSON mode reduces parsing errors
- **More Reliable**: Better at following complex prompts
- **Better Clinical Data Understanding**: Claude 3.5 Sonnet better understands healthcare context

## Testing Recommendations

### Test Scenarios
1. **OpenRouter Enabled**:
   - Set `OPENROUTER_API_KEY` in environment
   - Verify ClinicalModelSelector uses OpenRouter
   - Test model selection with various datasets
   - Verify JSON response is valid
   - Check response time (should be 2-5s)

2. **OpenRouter Fallback**:
   - Set invalid `OPENROUTER_API_KEY`
   - Verify system falls back to Ollama
   - Verify model selection still works
   - Check error logging

3. **Ollama Only**:
   - Don't set `OPENROUTER_API_KEY`
   - Verify system uses Ollama
   - Verify model selection works
   - Check response time (5-15s expected)

4. **Model Selection Quality**:
   - Test with clinical datasets
   - Test with high-cardinality data
   - Test with mixed-type data
   - Verify selected models are appropriate
   - Verify hyperparameters are reasonable

## Next Steps / Handoff

- → **DevOps Agent**: 
  - Add `OPENROUTER_API_KEY` to production environment
  - Update Docker Compose to include OpenRouter env vars
  - Test OpenRouter integration in production
  - Monitor API usage and costs
- → **QA Tester**: 
  - Test OpenRouter integration with various datasets
  - Test fallback to Ollama when OpenRouter unavailable
  - Verify JSON response quality improved
  - Test response times
- → **CTO**: 
  - Review OpenRouter API costs
  - Approve OpenRouter integration
  - Consider rate limiting if needed
  - Monitor usage patterns

## Open Questions

- Should we add rate limiting for OpenRouter API calls?
- Should we cache model selection results to reduce API calls?
- Should we add metrics tracking for API usage?
- Should we support multiple OpenRouter models (user-selectable)?

## Cost Considerations

- **OpenRouter Pricing**: Pay-per-use, varies by model
  - Claude 3.5 Sonnet: ~$0.003 per 1K tokens (input), ~$0.015 per 1K tokens (output)
  - Typical model selection: ~500-1000 tokens total
  - Cost per selection: ~$0.01-0.02
- **Ollama**: Free (local infrastructure)
- **Recommendation**: Use OpenRouter for production, Ollama for local development

## Security Notes

- **API Key Storage**: Store in environment variables, never commit to git
- **API Key Rotation**: Rotate keys periodically
- **Rate Limiting**: OpenRouter has built-in rate limits
- **Data Privacy**: OpenRouter processes prompts, ensure no sensitive data in prompts

Agent: SyntheticDataSpecialist  
Date: 2026-01-09
