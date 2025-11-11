# Agent UI/UX Enhancements Documentation

## Overview

This document describes the new UI/UX enhancements that make agent decision-making and execution details visible to users in the synthetic data generation pipeline.

## Features Implemented

### 1. Agent Plan Tab (`AgentPlanTab.tsx`)

**Location:** `frontend/components/runs/AgentPlanTab.tsx`

**Purpose:** Displays the agent's initial planning decisions including method choice, backup methods, and rationale.

**Displays:**
- **Summary Card:** Primary method, final method used, and agent intervention status
- **Rationale Card:** Agent's explanation for method selection (human-readable)
- **Primary Choice:** Method selected with hyperparameters
- **Backup Methods:** List of fallback methods with indicators showing which was used
- **Differential Privacy:** DP configuration if enabled

**API Data Source:**
- `GET /v1/runs/{run_id}` → `config_json.plan`
- `agent_interventions` object for method source analysis

**Example Display:**
```
Agent Planning Summary
├── Primary Method: GC (Gaussian Copula)
├── Method Used: CTGAN (Backup)
└── Agent Intervention: Backup Used

Rationale: "CTGAN chosen due to continuous-heavy dataset with 
complex correlations. TVAE recommended as backup for high-dimensional 
data..."

Primary Choice
├── GC
└── Hyperparameters: {}

Backup Methods
├── CTGAN ✓ (Used)
└── TVAE
```

### 2. Execution Log Tab (`ExecutionLogTab.tsx`)

**Location:** `frontend/components/runs/ExecutionLogTab.tsx`

**Purpose:** Shows step-by-step execution timeline with expandable metrics.

**Displays:**
- **Timeline View:** Visual timeline with colored dots for different step types
- **Step Cards:** Each step shows title, detail, timestamp, and badges
- **Expandable Metrics:** Click to expand and see detailed metrics for each step
- **Step Types:**
  - 🔵 Training (blue)
  - 🟢 Metrics (green)
  - 🟣 Agent Actions (purple)
  - 🟠 Backup Attempts (orange)
  - 🔴 Errors (red)

**API Data Source:**
- `GET /v1/runs/{run_id}/steps` → Array of step objects with enhanced flags

**Enhanced Step Flags:**
- `is_agent_action`: True if agent made a decision
- `is_backup_attempt`: True if this was a backup method attempt
- `is_error`: True if step represents an error
- `is_training`: True if step is training phase
- `is_metrics`: True if step contains metrics
- `method_hint`: Extracted method name from detail text

**Example Display:**
```
Execution Timeline (12 steps)

Step 0: planned
  method=gc
  [2024-01-15 10:30:00]

Step 1: training
  attempt 1: method=GC
  [2024-01-15 10:30:05]
  ▼ Metrics
    Utility: ks_mean=0.12, corr_delta=0.18
    Privacy: mia_auc=0.62, dup_rate=0.04

Step 2: Agent suggestion
  method=CTGAN; hparams={epochs: 100}
  🧠 Agent | 🔄 Backup
  [2024-01-15 10:31:00]
```

### 3. Agent Timeline (`AgentTimeline.tsx`)

**Location:** `frontend/components/runs/AgentTimeline.tsx`

**Purpose:** Visualizes agent decision progression and how metrics evolved to achieve "all green" status.

**Displays:**
- **Overall Progress Card:** Shows if all metrics passed (utility, privacy, fairness)
- **Agent Decision Timeline:** Visual flow of agent decisions from initial plan to final outcome
- **Metric Progression:** History of metric checks showing which passed/failed at each step

**Features:**
- Color-coded status: Green (passed), Yellow (partial), Red (failed)
- Shows agent interventions (backup used, replanned)
- Explains why metrics passed or what needs improvement

**Example Display:**
```
Metrics Progress to "All Green"
├── ✅ Utility ✓
├── ✅ Privacy ✓
└── ✅ Fairness ✓
All Metrics Passed! ✓

Agent Decision Timeline
├── Initial Plan → Primary: GC | Backups: 2
├── Step 1: Agent suggestion → method=CTGAN (Backup triggered)
└── Final Outcome → Success | Method: Backup

Metric Progression
├── After Step 1: Utility ✗, Privacy ✓, Fairness ✗
├── After Step 2: Utility ✓, Privacy ✓, Fairness ✓
└── Final: All Passed ✓
```

### 4. Enhanced Results Modal

**Location:** `frontend/components/runs/ResultsModal.tsx`

**Changes:**
- Added 3 new tabs: "Agent Plan", "Execution", "Timeline"
- Fetches run details from `GET /v1/runs/{run_id}` (new endpoint)
- Fetches steps from `GET /v1/runs/{run_id}/steps`
- Integrates all three new components

**Tab Structure:**
1. **Overview** - Run details, scores, download buttons (existing)
2. **Metrics** - Privacy & Utility audits (existing)
3. **Privacy** - Detailed privacy metrics (existing)
4. **Utility** - Detailed utility metrics (existing)
5. **Agent Plan** ⭐ NEW - Agent planning decisions
6. **Execution** ⭐ NEW - Step-by-step execution log
7. **Timeline** ⭐ NEW - Agent decision progression

### 5. Enhanced Real-Time Run Status

**Location:** `frontend/components/runs/RealTimeRunStatus.tsx`

**Enhancements:**
- Fetches latest steps during polling
- Shows "Latest Step" section with:
  - Current step number and title
  - Step detail/description
  - Agent action badges
  - Backup attempt indicators
  - Method hint (GC/CTGAN/TVAE)

**Displays for Running Runs:**
```
Latest Step
Step 3: Agent suggestion
🧠 Agent | 🔄 Backup
Method: CTGAN; hparams={"epochs": 100}; Switching to backup due to 
utility threshold breach
Method: CTGAN
```

### 6. Run List Indicators

**Location:** `frontend/components/runs/RunsContent.tsx`

**Enhancements:**
- Shows badges for runs with agent intervention:
  - "🔄 Backup" - Agent used a backup method
  - "🧠 Replanned" - Agent replanned during execution
- Fetches agent intervention data for each run

**Display:**
```
Synthesis Run Alpha
[Completed] [🔄 Backup]
```

## Backend API Enhancements

### New Endpoint: `GET /v1/runs/{run_id}`

**Purpose:** Returns full run details including config_json with plan and agent intervention analysis.

**Response Structure:**
```json
{
  "id": "uuid",
  "name": "Run name",
  "method": "ctgan",
  "status": "succeeded",
  "config_json": {
    "plan": {
      "choice": {
        "method": "gc",
        "hyperparams": {}
      },
      "backup": [
        {"method": "ctgan", "hyperparams": {}},
        {"method": "tvae", "hyperparams": {}}
      ],
      "rationale": "Explanation text..."
    }
  },
  "agent_interventions": {
    "used_backup": true,
    "replanned": false,
    "method_source": "backup",
    "method_index": 1,
    "final_method": "ctgan",
    "primary_method": "gc"
  }
}
```

### Enhanced Endpoint: `GET /v1/runs/{run_id}/steps`

**Enhancements:**
- Adds agent intervention flags to each step:
  - `is_agent_action`: Boolean
  - `is_backup_attempt`: Boolean
  - `is_error`: Boolean
  - `is_training`: Boolean
  - `is_metrics`: Boolean
  - `is_planned`: Boolean
  - `method_hint`: Extracted method name (GC/CTGAN/TVAE)

**Response Example:**
```json
[
  {
    "step_no": 0,
    "title": "planned",
    "detail": "method=gc",
    "metrics_json": null,
    "created_at": "2024-01-15T10:30:00Z",
    "is_planned": true,
    "method_hint": "GC"
  },
  {
    "step_no": 1,
    "title": "Agent suggestion",
    "detail": "method=ctgan; hparams={...}; Switching to backup",
    "metrics_json": {...},
    "created_at": "2024-01-15T10:31:00Z",
    "is_agent_action": true,
    "is_backup_attempt": true,
    "method_hint": "CTGAN"
  }
]
```

## Data Flow

```
User Opens Run Details
  ↓
ResultsModal.loadResults()
  ├─→ GET /v1/runs/{run_id} → runData (plan + interventions)
  ├─→ GET /v1/runs/{run_id}/metrics → metrics
  └─→ GET /v1/runs/{run_id}/steps → steps (enhanced)
  ↓
Tabs Render:
  ├─→ AgentPlanTab(plan, interventions, method)
  ├─→ ExecutionLogTab(steps)
  └─→ AgentTimeline(plan, steps, metrics, interventions)
```

## Usage Examples

### For Developers

**Querying Agent Plan:**
```typescript
const response = await fetch(`${base}/v1/runs/${runId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const run = await response.json();
const plan = run.config_json?.plan;
const interventions = run.agent_interventions;
```

**Displaying Steps:**
```typescript
const stepsResponse = await fetch(`${base}/v1/runs/${runId}/steps`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const steps = await stepsResponse.json();
// Steps now include is_agent_action, is_backup_attempt, method_hint, etc.
```

**Checking for Agent Intervention:**
```typescript
if (run.agent_interventions?.used_backup) {
  // Show "Backup Used" badge
}
if (run.agent_interventions?.replanned) {
  // Show "Replanned" badge
}
```

### For Users

**Viewing Agent Reasoning:**
1. Open a completed run
2. Click "Agent Plan" tab
3. See why agent chose the method and which backup was used

**Understanding Execution:**
1. Click "Execution" tab
2. See step-by-step timeline
3. Expand steps to see metrics at each phase
4. Identify where agent intervened or backups were used

**Tracking Metric Progress:**
1. Click "Timeline" tab
2. See how agent decisions led to final metrics
3. Understand which thresholds passed/failed at each step

## File Structure

```
frontend/components/runs/
├── AgentPlanTab.tsx          # NEW: Agent planning display
├── ExecutionLogTab.tsx       # NEW: Step-by-step execution log
├── AgentTimeline.tsx          # NEW: Agent decision progression
├── ResultsModal.tsx           # UPDATED: Added 3 new tabs
├── RealTimeRunStatus.tsx      # UPDATED: Shows latest step
└── RunsContent.tsx            # UPDATED: Shows intervention badges

backend/api/
└── main.py                    # UPDATED: New GET /v1/runs/{run_id} endpoint
                               # UPDATED: Enhanced /v1/runs/{run_id}/steps
```

## Future Enhancements

1. **WebSocket Integration:** Real-time step updates for running runs
2. **Metric Comparison:** Compare metrics across backup attempts
3. **Agent Insights Panel:** AI-generated summary of decision-making
4. **Export Agent Log:** Download agent reasoning as PDF
5. **Interactive Method Selection:** Allow users to see "what-if" scenarios

## Testing

To test the new features:

1. **Create a run** with agent mode
2. **View completed run** → Check "Agent Plan" tab shows rationale
3. **Check "Execution" tab** → Verify steps show agent actions
4. **Review "Timeline" tab** → Confirm metric progression is visible
5. **For running runs** → Check RealTimeRunStatus shows latest step
6. **Run list** → Verify intervention badges appear for relevant runs

## Troubleshooting

**Issue:** Agent Plan tab shows "No plan available"
- **Solution:** Check `config_json.plan` exists in database for the run

**Issue:** Steps not showing agent flags
- **Solution:** Ensure backend endpoint `/v1/runs/{run_id}/steps` includes enhancement logic

**Issue:** Intervention badges not appearing
- **Solution:** Verify `/v1/runs/{run_id}` returns `agent_interventions` object

## Summary

These enhancements make the agent's decision-making process transparent to users, showing:
- ✅ Why methods were chosen (rationale)
- ✅ Which methods were tried (primary vs backup)
- ✅ When agent intervened (step-by-step log)
- ✅ How metrics progressed (timeline visualization)
- ✅ What led to success (all-green achievement path)

Users can now understand and trust the agent's automated decision-making process.

