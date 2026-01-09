#!/bin/bash
# Quick script to check pending handoffs for an agent
# Usage: ./scripts/check_handoffs.sh [AGENT_NAME]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

if [ -z "$1" ]; then
    # List all pending handoffs
    python3 scripts/agent_handoff_parser.py --list
else
    # List handoffs for specific agent
    python3 scripts/agent_handoff_parser.py --agent "$1"
fi

