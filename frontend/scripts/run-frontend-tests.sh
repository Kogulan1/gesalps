#!/bin/bash
# Run frontend tests
# Usage: ./scripts/run-frontend-tests.sh

set -e

echo "🧪 Running Frontend Tests"
echo "========================="
echo ""

cd "$(dirname "$0")/.." || exit 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if jest is installed
if ! npm list jest &> /dev/null; then
    echo "📦 Installing test dependencies..."
    npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/jest
fi

echo ""
echo "Running tests..."
npm test -- --passWithNoTests

echo ""
echo "✅ Tests completed!"

