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

