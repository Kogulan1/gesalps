#!/usr/bin/env python3
"""
Agent Handoff Parser
Monitors agent-logs/ directory for new log files and extracts handoffs.

Usage:
    python scripts/agent_handoff_parser.py [--init] [--watch] [--agent AGENT_NAME]
"""

import os
import re
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

# Configuration
AGENT_LOGS_DIR = Path(__file__).parent.parent / "agent-logs"
HANDOFFS_FILE = AGENT_LOGS_DIR / "pending_handoffs.json"
PROCESSED_FILE = AGENT_LOGS_DIR / ".processed_logs.txt"


def parse_handoffs_from_log(log_file: Path) -> List[Dict]:
    """
    Extract handoffs from a markdown log file.
    
    Looks for patterns like:
    - → AgentName: Task description
    - → **AgentName**: Task description
    """
    try:
        content = log_file.read_text(encoding='utf-8')
    except Exception as e:
        print(f"Error reading {log_file}: {e}")
        return []
    
    handoffs = []
    
    # Find "Next Steps / Handoff" section
    # Match section header and content until next ## or end of file
    handoff_match = re.search(
        r'##\s+Next Steps\s*/\s*Handoff\s*\n(.*?)(?=\n##\s+|\Z)',
        content,
        re.DOTALL | re.IGNORECASE
    )
    
    if not handoff_match:
        return []
    
    handoff_text = handoff_match.group(1)
    
    # Pattern to match handoffs:
    # → AgentName: Task description
    # → **AgentName**: Task description
    # → **AgentName**: Task description (with multiple lines)
    pattern = r'→\s*\*\*?([^*:]+?)\*\*?:\s*(.+?)(?=\n\s*-?\s*→|\n\s*$|\Z)'
    
    for match in re.finditer(pattern, handoff_text, re.MULTILINE | re.DOTALL):
        agent = match.group(1).strip()
        task = match.group(2).strip()
        
        # Clean up task text (remove extra whitespace, markdown formatting)
        task = re.sub(r'\s+', ' ', task)  # Normalize whitespace
        task = re.sub(r'\*\*([^*]+)\*\*', r'\1', task)  # Remove bold
        task = re.sub(r'\*([^*]+)\*', r'\1', task)  # Remove italic
        task = task.strip()
        
        if agent and task:
            handoffs.append({
                "agent": agent,
                "task": task,
                "source_log": log_file.name,
                "source_path": str(log_file.relative_to(AGENT_LOGS_DIR.parent)),
                "timestamp": datetime.now().isoformat(),
                "status": "pending"
            })
    
    return handoffs


def get_processed_logs() -> set:
    """Get set of already processed log files."""
    if PROCESSED_FILE.exists():
        try:
            return set(PROCESSED_FILE.read_text(encoding='utf-8').strip().split('\n'))
        except Exception:
            return set()
    return set()


def save_processed_log(log_file: Path):
    """Mark a log file as processed."""
    processed = get_processed_logs()
    processed.add(log_file.name)
    PROCESSED_FILE.write_text('\n'.join(sorted(processed)), encoding='utf-8')


def load_pending_handoffs() -> Dict:
    """Load existing pending handoffs from JSON file."""
    if HANDOFFS_FILE.exists():
        try:
            with open(HANDOFFS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading handoffs file: {e}")
            return {"pending": {}, "processed_files": []}
    return {"pending": {}, "processed_files": []}


def save_pending_handoffs(data: Dict):
    """Save pending handoffs to JSON file."""
    # Ensure directory exists
    HANDOFFS_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    with open(HANDOFFS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Saved handoffs to {HANDOFFS_FILE}")


def process_log_file(log_file: Path, existing_data: Dict) -> int:
    """Process a single log file and extract handoffs."""
    handoffs = parse_handoffs_from_log(log_file)
    
    if not handoffs:
        return 0
    
    # Group handoffs by agent
    for handoff in handoffs:
        agent = handoff["agent"]
        if agent not in existing_data["pending"]:
            existing_data["pending"][agent] = []
        
        # Check if this handoff already exists (avoid duplicates)
        existing_tasks = [h["task"] for h in existing_data["pending"][agent]]
        if handoff["task"] not in existing_tasks:
            existing_data["pending"][agent].append(handoff)
            print(f"  📋 Found handoff: {agent} ← {log_file.name}")
    
    return len(handoffs)


def scan_all_logs(init_mode: bool = False) -> Dict:
    """Scan all log files in agent-logs directory."""
    print(f"📂 Scanning {AGENT_LOGS_DIR} for handoffs...")
    
    if not AGENT_LOGS_DIR.exists():
        print(f"❌ Directory {AGENT_LOGS_DIR} does not exist!")
        return {}
    
    existing_data = load_pending_handoffs()
    processed_logs = get_processed_logs() if not init_mode else set()
    
    log_files = sorted(AGENT_LOGS_DIR.glob("*.md"))
    new_handoffs_count = 0
    
    for log_file in log_files:
        # Skip template and README
        if log_file.name in ["TEMPLATE.md", "README.md", "AGENT_AUTOMATION_PROPOSAL.md"]:
            continue
        
        # Skip already processed files (unless init mode)
        if not init_mode and log_file.name in processed_logs:
            continue
        
        handoffs_count = process_log_file(log_file, existing_data)
        if handoffs_count > 0:
            new_handoffs_count += handoffs_count
            if not init_mode:
                save_processed_log(log_file)
    
    # Update processed files list
    existing_data["processed_files"] = sorted(list(processed_logs | {f.name for f in log_files}))
    
    if new_handoffs_count > 0 or init_mode:
        save_pending_handoffs(existing_data)
        print(f"\n✅ Processed {new_handoffs_count} new handoffs from {len(log_files)} log files")
    else:
        print("ℹ️  No new handoffs found")
    
    return existing_data


def get_pending_for_agent(agent_name: str) -> List[Dict]:
    """Get all pending handoffs for a specific agent."""
    data = load_pending_handoffs()
    return data["pending"].get(agent_name, [])


def list_all_pending() -> Dict:
    """List all pending handoffs grouped by agent."""
    data = load_pending_handoffs()
    return data["pending"]


def print_pending_handoffs(agent_name: Optional[str] = None):
    """Print pending handoffs in a readable format."""
    if agent_name:
        handoffs = get_pending_for_agent(agent_name)
        if not handoffs:
            print(f"✅ No pending handoffs for {agent_name}")
            return
        
        print(f"\n📋 Pending Handoffs for {agent_name}:")
        print("=" * 60)
        for i, handoff in enumerate(handoffs, 1):
            print(f"\n{i}. {handoff['task']}")
            print(f"   Source: {handoff['source_log']}")
            print(f"   Status: {handoff['status']}")
    else:
        all_pending = list_all_pending()
        if not all_pending:
            print("✅ No pending handoffs")
            return
        
        print("\n📋 All Pending Handoffs:")
        print("=" * 60)
        for agent, handoffs in sorted(all_pending.items()):
            print(f"\n👤 {agent} ({len(handoffs)} pending):")
            for i, handoff in enumerate(handoffs, 1):
                print(f"  {i}. {handoff['task'][:80]}...")
                print(f"     Source: {handoff['source_log']}")


def main():
    parser = argparse.ArgumentParser(
        description="Parse agent handoffs from log files",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Initialize from all existing logs
  python scripts/agent_handoff_parser.py --init
  
  # Scan for new handoffs
  python scripts/agent_handoff_parser.py
  
  # List pending handoffs for an agent
  python scripts/agent_handoff_parser.py --agent DevOpsAgent
  
  # List all pending handoffs
  python scripts/agent_handoff_parser.py --list
        """
    )
    
    parser.add_argument(
        "--init",
        action="store_true",
        help="Initialize by processing all log files (ignores processed list)"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all pending handoffs"
    )
    parser.add_argument(
        "--agent",
        type=str,
        help="Show pending handoffs for a specific agent"
    )
    parser.add_argument(
        "--watch",
        action="store_true",
        help="Watch for new log files (requires watchdog package)"
    )
    
    args = parser.parse_args()
    
    if args.list:
        print_pending_handoffs()
    elif args.agent:
        print_pending_handoffs(args.agent)
    elif args.watch:
        try:
            from watchdog.observers import Observer
            from watchdog.events import FileSystemEventHandler
            
            class LogHandler(FileSystemEventHandler):
                def on_created(self, event):
                    if event.is_directory:
                        return
                    if event.src_path.endswith('.md'):
                        print(f"\n📝 New log file detected: {Path(event.src_path).name}")
                        scan_all_logs()
            
            print(f"👀 Watching {AGENT_LOGS_DIR} for new log files...")
            print("Press Ctrl+C to stop")
            
            event_handler = LogHandler()
            observer = Observer()
            observer.schedule(event_handler, str(AGENT_LOGS_DIR), recursive=False)
            observer.start()
            
            try:
                while True:
                    import time
                    time.sleep(1)
            except KeyboardInterrupt:
                observer.stop()
            observer.join()
            
        except ImportError:
            print("❌ Watch mode requires 'watchdog' package. Install with: pip install watchdog")
            print("   Falling back to one-time scan...")
            scan_all_logs(args.init)
    else:
        scan_all_logs(args.init)


if __name__ == "__main__":
    main()

