#!/bin/bash
# Run Frontend Locally on Port 3000
# Backend CORS is already configured to allow localhost:3000

cd "$(dirname "$0")/frontend"

echo "🚀 Starting Frontend on http://localhost:3000"
echo "   Backend API: https://api.gesalpai.ch (configured in CORS)"
echo ""
echo "Press Ctrl+C to stop"
echo ""

npm run dev
