# Agent Logs Directory

This directory contains centralized logs from all specialized agents working on the Gesalps project.

## Purpose
- **Transparency**: All agents can see what others have done
- **Auditability**: Track decisions, changes, and handoffs
- **Collision Prevention**: Agents check logs before starting work
- **Context Preservation**: Maintain knowledge across sessions

## Naming Convention
`YYYY-MM-DD-Task-Short-Description-AgentName.md`

Examples:
- `2026-01-08-Failed-Runs-Auto-Optimize-SyntheticDataSpecialist.md`
- `2026-01-08-TabDDPM-DataLoader-Fix-MainAgent.md`
- `2026-01-08-Docker-Build-Optimization-DevOpsAgent.md`

## Template
See `TEMPLATE.md` for the standard log file format.

## Agents
- **MainAgent**: Central coordinator, task prioritization, conflict resolution
- **CTO**: Architecture, roadmap, sign-off
- **FrontendDeveloperAgent**: Next.js UI, metrics visualization, real-time features
- **DevOpsAgent**: Docker, Contabo VPS, zero-downtime deploys
- **SyntheticDataSpecialist**: TabDDPM/CTGAN tuning, auto-optimization
- **ClinicalGradeDataScientist**: Privacy proofs, hospital DB integration
- **DiagnosticAnalyst**: Issue diagnosis and root cause analysis
- **FixArchitect**: Solution design and implementation planning
- **QATester**: Testing and validation
- **DeploymentCoordinator**: Deployment orchestration

## Best Practices
1. **Before starting work**: Check recent logs in this directory
2. **After meaningful steps**: Create a new log file
3. **Use the template**: Ensure consistency and completeness
4. **Link related logs**: Reference previous logs when continuing work
5. **Update status**: Mark tasks as Completed/In Progress/Blocked

## Automated Handoff System

The project includes an automated handoff parser that extracts tasks from log files.

### Quick Start

**Check your pending handoffs:**
```bash
# List all pending handoffs
python3 scripts/agent_handoff_parser.py --list

# Check handoffs for a specific agent
python3 scripts/agent_handoff_parser.py --agent DevOpsAgent

# Or use the convenience script
./scripts/check_handoffs.sh DevOpsAgent
```

**Process new log files:**
```bash
# Scan for new handoffs (only processes new files)
python3 scripts/agent_handoff_parser.py

# Re-initialize from all logs (ignores processed list)
python3 scripts/agent_handoff_parser.py --init
```

**Watch for new files (requires `watchdog` package):**
```bash
pip install watchdog
python3 scripts/agent_handoff_parser.py --watch
```

### How It Works

1. The parser scans all `.md` files in `/agent-logs/`
2. Extracts handoffs from "Next Steps / Handoff" sections
3. Creates `pending_handoffs.json` with tasks grouped by agent
4. Tracks processed files to avoid duplicates

### Handoff Format

The parser recognizes this format in your logs:
```markdown
## Next Steps / Handoff
- → **AgentName**: Specific task description
- → **AnotherAgent**: Another task
```

### Generated Files

- `pending_handoffs.json` - All pending handoffs grouped by agent
- `.processed_logs.txt` - List of processed log files (to avoid duplicates)

### Integration with Cursor

Add this to your Cursor rules or agent prompt:
```
Before starting any task, check for pending handoffs:
1. Run: python3 scripts/agent_handoff_parser.py --agent YourAgentName
2. Review pending tasks and prioritize them
3. Update handoff status when tasks are completed
```

