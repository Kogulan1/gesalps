#!/bin/bash
# Setup script for agent handoff automation
# This configures automatic processing of handoffs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "🚀 Setting up Agent Handoff Automation..."
echo ""

# 1. Check if git hooks directory exists
if [ ! -d ".git/hooks" ]; then
    echo "❌ Error: .git/hooks directory not found. Are you in a git repository?"
    exit 1
fi

# 2. Install post-commit hook
echo "📝 Installing git post-commit hook..."
cat > .git/hooks/post-commit << 'HOOK_EOF'
#!/bin/bash
# Git hook to automatically process agent handoffs after commit
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"
if git diff-tree --no-commit-id --name-only -r HEAD | grep -q "^agent-logs/.*\.md$"; then
    echo "📋 Processing agent handoffs from new log files..."
    python3 scripts/agent_handoff_parser.py 2>/dev/null || true
fi
HOOK_EOF

chmod +x .git/hooks/post-commit
echo "✅ Git hook installed"

# 3. Initialize handoff parser
echo ""
echo "📂 Initializing handoff parser from existing logs..."
python3 scripts/agent_handoff_parser.py --init

# 4. Verify setup
echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Quick test - checking handoffs:"
python3 scripts/agent_handoff_parser.py --list | head -20

echo ""
echo "🎉 Agent handoff automation is now active!"
echo ""
echo "How it works:"
echo "  1. When you commit log files with handoffs, they're automatically processed"
echo "  2. Agents check pending_handoffs.json before starting work (via Cursor rule)"
echo "  3. You can manually process with: python3 scripts/agent_handoff_parser.py"
echo ""
echo "Next steps:"
echo "  - Agents will automatically check for handoffs (Cursor rule installed)"
echo "  - New log files are processed on commit (git hook installed)"
echo "  - Check pending handoffs: python3 scripts/agent_handoff_parser.py --list"

