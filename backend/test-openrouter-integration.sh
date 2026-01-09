#!/bin/bash
# Test script to verify OpenRouter integration in agent mode
# This script checks configuration and provides instructions for testing

set -e

echo "🔍 Testing OpenRouter Integration in Agent Mode"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Run from backend directory."
    exit 1
fi

echo "Step 1: Checking OpenRouter Configuration..."
echo "--------------------------------------------"

# Check environment variables in container
docker compose -f docker-compose.yml exec -T synth-worker python3 -c "
import os
import sys
sys.path.insert(0, '/app')

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL') or 'mistralai/mistral-small-24b-instruct:free'
OPENROUTER_BASE = os.getenv('OPENROUTER_BASE', 'https://openrouter.ai/api/v1')
USE_OPENROUTER = bool(OPENROUTER_API_KEY)

print(f'OPENROUTER_API_KEY: {\"✅ SET\" if OPENROUTER_API_KEY else \"❌ NOT SET\"}')
if OPENROUTER_API_KEY:
    print(f'  Key length: {len(OPENROUTER_API_KEY)} characters')
print(f'OPENROUTER_MODEL: {OPENROUTER_MODEL}')
print(f'OPENROUTER_BASE: {OPENROUTER_BASE}')
print(f'USE_OPENROUTER: {USE_OPENROUTER}')
" 2>&1

echo ""
echo "Step 2: Checking Module Imports..."
echo "-----------------------------------"

docker compose -f docker-compose.yml exec -T synth-worker python3 -c "
import sys
sys.path.insert(0, '/app')

try:
    import httpx
    print('✅ httpx module available')
except ImportError as e:
    print(f'❌ httpx module NOT available: {e}')

try:
    from worker import _agent_plan_ollama, USE_OPENROUTER, OPENROUTER_API_KEY
    print('✅ _agent_plan_ollama function importable')
    print(f'✅ USE_OPENROUTER: {USE_OPENROUTER}')
except ImportError as e:
    print(f'❌ Error importing worker functions: {e}')
" 2>&1

echo ""
echo "Step 3: Checking Recent Logs for OpenRouter Usage..."
echo "------------------------------------------------------"

RECENT_LOGS=$(docker compose -f docker-compose.yml logs synth-worker --tail=200 2>&1 | grep -i "openrouter\|agent.*re-plan\|re-planning" | tail -10)

if [ -z "$RECENT_LOGS" ]; then
    echo "ℹ️  No recent OpenRouter usage found in logs"
    echo "   This is normal if no agent mode runs have been executed recently"
else
    echo "Recent OpenRouter activity:"
    echo "$RECENT_LOGS"
fi

echo ""
echo "Step 4: Testing Instructions..."
echo "--------------------------------"

echo "To test OpenRouter integration in agent mode:"
echo ""
echo "1. Create a new run in agent mode (without specifying a method)"
echo "2. Or trigger a re-planning event by:"
echo "   - Starting a run that fails"
echo "   - System will automatically re-plan using OpenRouter"
echo ""
echo "3. Monitor logs for OpenRouter usage:"
echo "   docker compose -f docker-compose.yml logs -f synth-worker | grep -i openrouter"
echo ""
echo "4. Look for these log messages:"
echo "   - '[worker][agent][openrouter] Re-planning with OpenRouter model: ...'"
echo "   - '[worker][agent][openrouter] OpenRouter failed, falling back to Ollama: ...'"
echo ""
echo "5. Check OpenRouter dashboard for API usage:"
echo "   https://openrouter.ai/activity"
echo ""

echo "✅ Configuration check complete!"
echo ""
echo "Next Steps:"
echo "- If OPENROUTER_API_KEY is not set, add it to .env file"
echo "- Restart synth-worker container after updating .env"
echo "- Create a test run in agent mode to verify integration"
