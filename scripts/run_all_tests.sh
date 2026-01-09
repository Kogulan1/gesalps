#!/bin/bash
# Run all QA tests
# Usage: ./scripts/run_all_tests.sh

set -e  # Exit on error

echo "🧪 Running QA Test Suite"
echo "========================="
echo ""

cd "$(dirname "$0")/../backend" || exit 1

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}❌ pytest not found. Installing...${NC}"
    pip install pytest pytest-asyncio httpx
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Some tests may be skipped.${NC}"
fi

echo -e "${GREEN}1. Running Unit Tests...${NC}"
echo "----------------------------"
pytest tests/test_api_unit.py -v --tb=short || {
    echo -e "${RED}❌ Unit tests failed${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}2. Running Integration Tests...${NC}"
echo "----------------------------"
pytest tests/test_integration.py -v --tb=short || {
    echo -e "${YELLOW}⚠️  Integration tests failed (may require Supabase setup)${NC}"
}

echo ""
echo -e "${GREEN}3. Running Edge Case Tests...${NC}"
echo "----------------------------"
pytest tests/test_edge_cases.py -v --tb=short || {
    echo -e "${RED}❌ Edge case tests failed${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}4. Running Metric Regression Tests...${NC}"
echo "----------------------------"
pytest tests/test_metric_regression.py -v --tb=short || {
    echo -e "${RED}❌ Regression tests failed${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "To run with coverage:"
echo "  pytest --cov=api --cov=synth_worker --cov-report=html"

