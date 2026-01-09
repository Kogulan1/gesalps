# Agent Handoff System - Usage Guide

## Overview

The automated handoff system extracts tasks from agent logs and makes them easily discoverable. This eliminates the need to manually search through log files.

## For Agents: Checking Your Handoffs

### Method 1: Command Line (Recommended)

```bash
# Check your specific handoffs
python3 scripts/agent_handoff_parser.py --agent YourAgentName

# Examples:
python3 scripts/agent_handoff_parser.py --agent DevOpsAgent
python3 scripts/agent_handoff_parser.py --agent FrontendDeveloper
python3 scripts/agent_handoff_parser.py --agent SyntheticDataSpecialist
```

### Method 2: Convenience Script

```bash
./scripts/check_handoffs.sh YourAgentName
```

### Method 3: View All Pending Handoffs

```bash
python3 scripts/agent_handoff_parser.py --list
```

## For Agents: Creating Handoffs

When you create a log file, use this format in the "Next Steps / Handoff" section:

```markdown
## Next Steps / Handoff

- → **DevOpsAgent**: Fix CORS configuration on API endpoint
- → **FrontendDeveloper**: Improve error message UX
- → **SyntheticDataSpecialist**: Verify Auto-Optimize feature availability
```

**Important:**
- Use `→` (arrow) followed by `**AgentName**:` 
- Be specific about the task
- One handoff per line

## Workflow

### 1. Before Starting Work

```bash
# Check if you have any pending handoffs
python3 scripts/agent_handoff_parser.py --agent YourAgentName
```

### 2. Process New Logs

When new log files are created, run:

```bash
# Process only new files (recommended)
python3 scripts/agent_handoff_parser.py
```

### 3. After Completing a Handoff

Update the handoff status in `pending_handoffs.json` or create a new log file marking it as completed.

## Example Output

```
📋 Pending Handoffs for DevOpsAgent:
============================================================

1. Fix CORS configuration on API endpoint
   Source: 2026-01-08-User-Testing-Session-1-EndUserTester.md
   Status: pending

2. Verify secure_query.py dependencies in Docker images
   Source: 2026-01-08-Auto-Optimization-System-Implementation-SyntheticDataSpecialist.md
   Status: pending
```

## Advanced: Watch Mode

Automatically process new log files as they're created:

```bash
# Install watchdog first
pip install watchdog

# Start watching
python3 scripts/agent_handoff_parser.py --watch
```

This will automatically scan for new handoffs whenever a new `.md` file is added to `/agent-logs/`.

## Troubleshooting

**No handoffs found?**
- Make sure your log file has a "Next Steps / Handoff" section
- Check that the format matches: `→ **AgentName**: Task`

**Handoffs not updating?**
- Run with `--init` to re-process all files: `python3 scripts/agent_handoff_parser.py --init`

**Agent name not matching?**
- The parser is case-sensitive for agent names
- Use exact agent name as it appears in other logs (e.g., "DevOpsAgent" not "DevOps Agent")

## Integration Ideas

### With Cursor AI

Add to your agent prompt:
```
Before starting work, always check for pending handoffs:
python3 scripts/agent_handoff_parser.py --agent YourAgentName
```

### With Git Hooks

Add to `.git/hooks/post-commit`:
```bash
#!/bin/bash
# Auto-process new log files after commit
python3 scripts/agent_handoff_parser.py
```

### With CI/CD

Add to your CI pipeline:
```yaml
- name: Process Agent Handoffs
  run: python3 scripts/agent_handoff_parser.py
```

## File Structure

```
agent-logs/
├── pending_handoffs.json      # Generated: All pending handoffs
├── .processed_logs.txt         # Generated: List of processed files
├── *.md                        # Your log files
└── README.md                   # This directory's documentation
```

## Next Steps

- ✅ Basic parser implemented
- 🔄 Future: Add status tracking (pending → in_progress → completed)
- 🔄 Future: Add notifications (Slack, email)
- 🔄 Future: Add webhook API endpoint for real-time updates

