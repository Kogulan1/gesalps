# Agent Handoff Automation - Setup Guide

## 🎯 What This Does

The automation system ensures agents are **automatically notified** of pending tasks without manual checking. It works in three ways:

1. **Git Hook**: Automatically processes handoffs when you commit log files
2. **Cursor Rule**: Agents automatically check for handoffs before starting work
3. **Manual Processing**: You can manually process anytime

## 🚀 Quick Setup (One-Time)

Run this once to set everything up:

```bash
./scripts/setup_handoff_automation.sh
```

This will:
- ✅ Install git hook (auto-processes on commit)
- ✅ Initialize handoff parser from existing logs
- ✅ Verify everything works

## 📋 How It Works

### 1. Automatic Processing (Git Hook)

**When**: Every time you commit a `.md` file in `agent-logs/`

**What happens**:
- Git hook detects new log files
- Automatically runs the parser
- Updates `pending_handoffs.json`
- Other agents can immediately see new handoffs

**No action needed** - it just works!

### 2. Automatic Checking (Cursor Rule)

**When**: Every time an agent starts a new task in Cursor

**What happens**:
- Cursor rule triggers automatically
- Agent checks `pending_handoffs.json` for their name
- Agent sees pending tasks before starting work
- Agent prioritizes handoffs over new tasks

**No action needed** - Cursor handles it!

### 3. Manual Processing (Optional)

If you want to process handoffs manually:

```bash
# Process new log files
python3 scripts/agent_handoff_parser.py

# Re-process all files
python3 scripts/agent_handoff_parser.py --init
```

## ⏰ Time Intervals

| Event | Frequency | Automatic? |
|-------|-----------|------------|
| **Git commit** | On every commit | ✅ Yes (git hook) |
| **Agent start** | Every Cursor session | ✅ Yes (Cursor rule) |
| **Manual check** | Anytime | ⚠️ Manual |

**No scheduled intervals needed** - it's event-driven:
- Commits trigger processing
- Agent sessions trigger checking

## 🔔 How Agents Are Notified

### Method 1: Cursor Rule (Automatic) ✅

Agents automatically check when they start work. No notification needed - they just see pending tasks.

**Location**: `.cursor/rules/agent-handoffs.mdc`

### Method 2: Check Pending File (Manual)

Agents can check anytime:
```bash
python3 scripts/agent_handoff_parser.py --agent YourAgentName
```

### Method 3: View All Handoffs

See everything at once:
```bash
python3 scripts/agent_handoff_parser.py --list
```

## 📝 Workflow Example

### Scenario: EndUserTester creates a log with handoff

1. **EndUserTester creates log**:
   ```markdown
   ## Next Steps / Handoff
   - → **DevOpsAgent**: Fix CORS configuration
   ```

2. **EndUserTester commits**:
   ```bash
   git add agent-logs/2026-01-09-*.md
   git commit -m "User testing session"
   ```
   
   **Git hook automatically runs** → Processes handoff → Updates `pending_handoffs.json`

3. **DevOpsAgent starts work**:
   - Cursor rule triggers
   - Checks `pending_handoffs.json`
   - Sees: "Fix CORS configuration"
   - Works on that first

**No manual notification needed!**

## 🔧 Troubleshooting

### Git hook not running?

```bash
# Check if hook exists
ls -la .git/hooks/post-commit

# Re-run setup
./scripts/setup_handoff_automation.sh
```

### Cursor rule not working?

1. Check if rule file exists: `.cursor/rules/agent-handoffs.mdc`
2. Restart Cursor to reload rules
3. Check Cursor settings → Rules → Ensure "alwaysApply: true"

### Handoffs not updating?

```bash
# Force re-process all files
python3 scripts/agent_handoff_parser.py --init
```

## 📊 Current Status

After setup, you can check:

```bash
# See all pending handoffs
python3 scripts/agent_handoff_parser.py --list

# See handoffs for specific agent
python3 scripts/agent_handoff_parser.py --agent DevOpsAgent
```

## 🎯 Summary

**What you need to do:**
1. ✅ Run setup once: `./scripts/setup_handoff_automation.sh`
2. ✅ That's it!

**What happens automatically:**
- ✅ New log files → Auto-processed on commit
- ✅ Agents → Auto-check before starting work
- ✅ No manual steps needed

**Time intervals:**
- ⚡ **Instant**: Git hook processes on commit
- ⚡ **Instant**: Cursor rule checks on agent start
- 🔄 **No scheduled intervals** - event-driven only

## 🚨 Important Notes

1. **Git hook only works if you commit log files** - if you just create files without committing, run the parser manually
2. **Cursor rule only works in Cursor** - if using other editors, check manually
3. **Agent names must match exactly** - check existing logs for exact format

## 📚 Related Files

- Parser script: `scripts/agent_handoff_parser.py`
- Usage guide: `agent-logs/USAGE_GUIDE.md`
- Cursor rule: `.cursor/rules/agent-handoffs.mdc`
- Git hook: `.git/hooks/post-commit`
- Handoffs file: `agent-logs/pending_handoffs.json`

