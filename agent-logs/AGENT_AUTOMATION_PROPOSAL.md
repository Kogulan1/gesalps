# Agent Communication Automation Proposal

## Current State
- **Communication Method**: Manual via markdown logs in `/agent-logs/`
- **Handoff Process**: Agents read logs, identify handoffs in "Next Steps / Handoff" section, then act
- **No Automation**: No triggers, webhooks, or automated notifications

## Automation Options (Ranked by Complexity)

### Option 1: Log Parser + Agent Notification Script (Simplest) ⭐ Recommended for Start

**How it works:**
- Python script monitors `/agent-logs/` for new files
- Parses "Next Steps / Handoff" sections using regex/markdown parser
- Extracts agent names and tasks
- Sends notifications (email, Slack, or creates task files)

**Implementation:**
```python
# scripts/agent_notifier.py
import os
import re
from pathlib import Path
from datetime import datetime
import json

AGENT_LOGS_DIR = Path("agent-logs")
HANDOFFS_FILE = "agent-logs/pending_handoffs.json"

def parse_handoffs(log_file):
    """Extract handoffs from log file"""
    content = log_file.read_text()
    
    # Find "Next Steps / Handoff" section
    handoff_match = re.search(
        r'## Next Steps / Handoff\s*\n(.*?)(?=\n##|\Z)',
        content,
        re.DOTALL
    )
    
    if not handoff_match:
        return []
    
    handoffs = []
    handoff_text = handoff_match.group(1)
    
    # Extract → AgentName: Task patterns
    pattern = r'→\s*\*\*?([^:]+)\*\*?:\s*(.+?)(?=\n-|$)'
    for match in re.finditer(pattern, handoff_text, re.MULTILINE):
        agent = match.group(1).strip()
        task = match.group(2).strip()
        handoffs.append({
            "agent": agent,
            "task": task,
            "source_log": log_file.name,
            "timestamp": datetime.now().isoformat()
        })
    
    return handoffs

def monitor_logs():
    """Monitor for new log files and extract handoffs"""
    processed = set()
    if HANDOFFS_FILE.exists():
        with open(HANDOFFS_FILE) as f:
            data = json.load(f)
            processed = set(data.get("processed_files", []))
    
    new_handoffs = []
    for log_file in AGENT_LOGS_DIR.glob("*.md"):
        if log_file.name not in processed:
            handoffs = parse_handoffs(log_file)
            if handoffs:
                new_handoffs.extend(handoffs)
            processed.add(log_file.name)
    
    # Save pending handoffs
    if new_handoffs:
        pending = {}
        if HANDOFFS_FILE.exists():
            with open(HANDOFFS_FILE) as f:
                pending = json.load(f)
        
        for handoff in new_handoffs:
            agent = handoff["agent"]
            if agent not in pending:
                pending[agent] = []
            pending[agent].append(handoff)
        
        with open(HANDOFFS_FILE, "w") as f:
            json.dump({"processed_files": list(processed), "pending": pending}, f, indent=2)
        
        print(f"Found {len(new_handoffs)} new handoffs")
        return new_handoffs
    
    return []

if __name__ == "__main__":
    monitor_logs()
```

**Usage:**
```bash
# Run manually or via cron
python scripts/agent_notifier.py

# Or watch for changes
watchmedo auto-restart --patterns="*.md" --recursive --directory=agent-logs -- python scripts/agent_notifier.py
```

**Pros:**
- ✅ Simple, no infrastructure changes
- ✅ Works with existing log format
- ✅ Easy to test and debug
- ✅ Can be extended with notifications

**Cons:**
- ❌ Still requires agents to check for handoffs
- ❌ No real-time notifications

---

### Option 2: GitHub Issues Integration (Medium Complexity)

**How it works:**
- Script parses handoffs from logs
- Creates GitHub Issues automatically
- Agents can subscribe to issue notifications
- Issues can be linked back to logs

**Implementation:**
```python
# scripts/create_agent_issues.py
import os
import re
from github import Github
from pathlib import Path

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO_NAME = "your-org/gesalps"

def create_issue_from_handoff(handoff, log_file):
    g = Github(GITHUB_TOKEN)
    repo = g.get_repo(REPO_NAME)
    
    title = f"[{handoff['agent']}] {handoff['task'][:100]}"
    body = f"""
## Handoff from {log_file}

**Agent**: {handoff['agent']}
**Task**: {handoff['task']}
**Source Log**: `{log_file}`

---
*Auto-generated from agent log handoff*
"""
    
    labels = [handoff['agent'], "agent-handoff"]
    issue = repo.create_issue(title=title, body=body, labels=labels)
    return issue
```

**Pros:**
- ✅ Uses existing GitHub notification system
- ✅ Agents get email/Slack notifications
- ✅ Can track completion status
- ✅ Integrates with project management

**Cons:**
- ❌ Requires GitHub token setup
- ❌ Creates external dependencies
- ❌ May create too many issues

---

### Option 3: Webhook API Endpoint (More Complex)

**How it works:**
- Add API endpoint: `POST /v1/agent/handoff`
- Agents call this when creating logs with handoffs
- Backend stores handoffs in database
- Other agents can poll or subscribe via WebSocket

**Implementation:**
```python
# backend/api/main.py addition
@app.post("/v1/agent/handoff")
def create_handoff(handoff: AgentHandoff, user: Dict = Depends(require_user)):
    """Create a handoff notification"""
    handoff_record = {
        "from_agent": handoff.from_agent,
        "to_agent": handoff.to_agent,
        "task": handoff.task,
        "log_file": handoff.log_file,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Store in database
    result = supabase.table("agent_handoffs").insert(handoff_record).execute()
    
    # Notify via WebSocket if agent is "online"
    # (would need agent presence tracking)
    
    return {"handoff_id": result.data[0]["id"]}

@app.get("/v1/agent/handoffs/pending")
def get_pending_handoffs(agent_name: str, user: Dict = Depends(require_user)):
    """Get pending handoffs for an agent"""
    result = supabase.table("agent_handoffs")\
        .select("*")\
        .eq("to_agent", agent_name)\
        .eq("status", "pending")\
        .execute()
    
    return {"handoffs": result.data}
```

**Database Schema:**
```sql
CREATE TABLE agent_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_agent TEXT NOT NULL,
    to_agent TEXT NOT NULL,
    task TEXT NOT NULL,
    log_file TEXT,
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB
);
```

**Pros:**
- ✅ Real-time notifications possible
- ✅ Can track handoff status
- ✅ Queryable, searchable
- ✅ Can integrate with WebSocket for live updates

**Cons:**
- ❌ Requires database schema changes
- ❌ More complex implementation
- ❌ Agents need to call API (or script needs to parse logs)

---

### Option 4: Cursor AI Agent Integration (Most Advanced)

**How it works:**
- Use Cursor's agent system to automatically read logs
- Agents can be "triggered" by mentioning them in handoffs
- Cursor can parse logs and route tasks automatically

**Implementation:**
- Configure Cursor rules to watch `/agent-logs/`
- Use agent prompts that include "Check for handoffs to your agent name"
- Agents automatically scan logs at start of session

**Example Cursor Rule:**
```markdown
# Agent Handoff Automation

When starting a new task:
1. Check `/agent-logs/` for files with handoffs to your agent name
2. Parse "Next Steps / Handoff" sections
3. Prioritize tasks marked as P0 or CRITICAL
4. Report found handoffs before starting new work
```

**Pros:**
- ✅ Leverages existing Cursor infrastructure
- ✅ Agents can be "aware" of handoffs automatically
- ✅ No external systems needed

**Cons:**
- ❌ Depends on Cursor's agent system
- ❌ Less control over notification timing

---

## Recommended Approach: Hybrid (Option 1 + Option 4)

1. **Start with Option 1** (Log Parser Script)
   - Quick to implement
   - Creates `pending_handoffs.json` file
   - Agents can check this file at start of session

2. **Enhance with Cursor Rules** (Option 4)
   - Add rule: "Before starting work, check `agent-logs/pending_handoffs.json`"
   - Agents automatically see pending tasks

3. **Future: Add Option 3** (Webhook API)
   - If you need real-time notifications
   - If multiple people are working simultaneously
   - If you want status tracking

---

## Quick Start: Implement Option 1

I can create the log parser script right now. It would:
- Monitor `/agent-logs/` for new files
- Extract handoffs automatically
- Create `pending_handoffs.json` for easy querying
- Optionally send notifications (if you configure Slack/email)

Would you like me to implement Option 1 now?

