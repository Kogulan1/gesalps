# Real-Time Run Progress & Cancellation Feature Plan

## 🎯 Goal
Display detailed backend process information during run execution and allow users to cancel runs in progress.

## 📋 Current State Analysis

### What Exists:
- ✅ `RunExecutionModal` - Shows basic progress, steps, agent plan
- ✅ `RealTimeRunStatus` - Polls for status updates (WebSocket commented out)
- ✅ `ExecutionLogTab` - Displays step-by-step execution log
- ✅ Backend WebSocket support (`backend/api/websocket.py`)
- ✅ Backend logs steps to `run_steps` table
- ✅ Polling fallback (every 2 seconds)

### What's Missing:
- ❌ Cancel/Stop run endpoint
- ❌ Real-time step updates in runs list
- ❌ Visual progress indicators in runs list
- ❌ Cancel button in UI
- ❌ WebSocket integration (currently commented out)
- ❌ Progress percentage calculation
- ❌ Estimated time remaining

## 🎨 UI/UX Design Plan

### 1. **Runs List View - Enhanced Status Display**

#### Location: `frontend/components/runs/RunsContent.tsx`

**Visual Design:**
- **Queued Status**: 
  - Badge: `bg-gray-100 text-gray-800` (Gray)
  - Icon: `Clock` (gray)
  - Text: "Queued"
  
- **Running Status** (NEW - Enhanced):
  - Badge: `bg-blue-100 text-blue-800` (Blue) with pulsing animation
  - Icon: `Loader2` (blue, spinning)
  - Text: "Running" + current step name
  - **Progress Bar**: Thin horizontal bar below the run card
    - Color: `bg-blue-500` (Blue gradient)
    - Height: 2px
    - Shows step progress (e.g., "Step 3 of 8")
  - **Live Indicator**: Small pulsing dot `bg-green-500` (Green) with "LIVE" text
  - **Cancel Button**: Small red button with `X` icon
    - Color: `bg-red-500 hover:bg-red-600` (Red)
    - Size: Small, positioned in top-right of card
    - Confirmation: Modal before canceling

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Run Name                    [Running] 🔵 LIVE │
│ Dataset: X                                   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ← Progress bar
│ Step 3/8: Training CTGAN model...      [X]  │ ← Cancel button
│ Started: 2m ago | ETA: 5m                    │
└─────────────────────────────────────────────┘
```

### 2. **Run Execution Modal - Enhanced Real-Time View**

#### Location: `frontend/components/datasets/RunExecutionModal.tsx`

**Enhanced Sections:**

#### A. **Header Section** (Top)
- **Status Badge**: Large, prominent
  - Running: `bg-blue-500 text-white` (Blue) with pulsing
  - Success: `bg-green-500 text-white` (Green)
  - Failed: `bg-red-500 text-white` (Red)
- **Cancel Button**: Top-right corner
  - Icon: `X` or `StopCircle`
  - Color: `bg-red-500 hover:bg-red-600` (Red)
  - Size: Medium
  - Confirmation: Inline dialog

#### B. **Progress Section** (Enhanced)
- **Main Progress Bar**: 
  - Color: `bg-gradient-to-r from-blue-500 to-blue-600` (Blue gradient)
  - Height: 8px
  - Shows: Overall progress percentage
  - Animation: Smooth transitions
- **Step Progress**: 
  - Text: "Step 3 of 8: Training CTGAN model"
  - Color: `text-blue-700` (Dark blue)
  - Icon: `Loader2` (spinning, blue)

#### C. **Real-Time Activity Feed** (NEW)
- **Location**: Left side, scrollable
- **Design**: Timeline-style with colored indicators
- **Colors**:
  - **Planned**: `bg-purple-100 border-purple-300` (Purple) - Agent planning
  - **Training**: `bg-blue-100 border-blue-300` (Blue) - Model training
  - **Metrics**: `bg-green-100 border-green-300` (Green) - Metrics evaluation
  - **Error**: `bg-red-100 border-red-300` (Red) - Errors
  - **Backup**: `bg-orange-100 border-orange-300` (Orange) - Backup attempts
- **Icons**:
  - Planning: `Brain` (purple)
  - Training: `Database` (blue)
  - Metrics: `BarChart3` (green)
  - Error: `AlertCircle` (red)
  - Backup: `RefreshCw` (orange)
- **Auto-scroll**: Automatically scrolls to latest step
- **Timestamps**: Show relative time (e.g., "2 seconds ago")

#### D. **Metrics Preview** (Right Side)
- **Live Metrics**: Update in real-time as they become available
- **Color Coding**:
  - Passing: `text-green-600` (Green)
  - Warning: `text-yellow-600` (Yellow)
  - Failing: `text-red-600` (Red)
- **Progress Indicators**: Small circular progress for each metric

#### E. **Time & Stats Card**
- **Elapsed Time**: Large, prominent
  - Color: `text-gray-900` (Dark)
  - Format: "2m 34s"
- **Estimated Time Remaining**: 
  - Color: `text-blue-600` (Blue)
  - Format: "~5m remaining"
- **Steps Completed**: 
  - Color: `text-gray-600` (Gray)
  - Format: "3/8 steps"

### 3. **Cancel Confirmation Dialog**

**Design:**
- **Background**: Semi-transparent overlay `bg-black/50`
- **Dialog**: Centered, white background, rounded corners
- **Title**: "Cancel Run?"
- **Message**: "Are you sure you want to cancel this run? This action cannot be undone."
- **Buttons**:
  - Cancel (dismiss): `bg-gray-200 hover:bg-gray-300` (Gray)
  - Confirm Cancel: `bg-red-500 hover:bg-red-600` (Red)
- **Warning Icon**: `AlertTriangle` (orange/yellow)

## 🔧 Technical Implementation Plan

### Phase 1: Backend - Cancel Endpoint

**File**: `backend/api/main.py`

**New Endpoint**: `POST /v1/runs/{run_id}/cancel`
```python
@app.post("/v1/runs/{run_id}/cancel")
def cancel_run(run_id: str, user: Dict[str, Any] = Depends(require_user)):
    # 1. Verify ownership
    # 2. Check if run is cancellable (queued or running)
    # 3. Update run status to 'cancelled'
    # 4. Signal worker to stop (if running)
    # 5. Log cancellation step
    return {"ok": True, "status": "cancelled"}
```

**Worker Integration**:
- Add cancellation check in worker loop
- Gracefully stop training if in progress
- Clean up resources
- Log cancellation

### Phase 2: Enhanced Polling/WebSocket

**Option A: Enhanced Polling** (Easier, works immediately)
- Poll `/v1/runs/{runId}/status` every 1 second (faster)
- Poll `/v1/runs/{runId}/steps` every 2 seconds
- Calculate progress from step count
- Update UI reactively

**Option B: WebSocket** (Better UX, requires setup)
- Enable WebSocket connection in `RealTimeRunStatus`
- Connect to `wss://api.gesalpai.ch/ws/{runId}`
- Receive real-time updates
- Fallback to polling if WebSocket fails

**Recommendation**: Start with Option A, add Option B later

### Phase 3: Progress Calculation

**Algorithm**:
```typescript
// Estimate progress based on steps
const totalExpectedSteps = 8; // Based on method/plan
const currentStep = runSteps.length;
const progress = Math.min(95, (currentStep / totalExpectedSteps) * 100);

// If metrics available, use actual progress
if (hasMetrics) {
  progress = 100;
}
```

### Phase 4: UI Components

**New Components**:
1. `RunProgressIndicator.tsx` - Progress bar with step info
2. `CancelRunButton.tsx` - Cancel button with confirmation
3. `LiveActivityFeed.tsx` - Real-time step timeline
4. `RunMetricsPreview.tsx` - Live metrics display

**Enhanced Components**:
1. `RunsContent.tsx` - Add progress bars and cancel buttons
2. `RunExecutionModal.tsx` - Enhanced real-time display
3. `RealTimeRunStatus.tsx` - Enable WebSocket or faster polling

## 🎨 Color Palette

### Status Colors:
- **Queued**: `gray-100` / `gray-800` (Gray)
- **Running**: `blue-100` / `blue-800` (Blue) - Primary action color
- **Succeeded**: `green-100` / `green-800` (Green) - Success
- **Failed**: `red-100` / `red-800` (Red) - Error
- **Cancelled**: `yellow-100` / `yellow-800` (Yellow) - Warning

### Progress Colors:
- **Progress Bar**: `blue-500` to `blue-600` (Blue gradient)
- **Progress Background**: `gray-200` (Light gray)

### Step Type Colors:
- **Planned**: `purple-100` / `purple-300` (Purple) - Agent decisions
- **Training**: `blue-100` / `blue-300` (Blue) - Active work
- **Metrics**: `green-100` / `green-300` (Green) - Evaluation
- **Error**: `red-100` / `red-300` (Red) - Problems
- **Backup**: `orange-100` / `orange-300` (Orange) - Fallbacks

### Action Colors:
- **Cancel Button**: `red-500` / `red-600` (Red) - Destructive
- **Primary Actions**: `blue-500` / `blue-600` (Blue)
- **Secondary Actions**: `gray-200` / `gray-300` (Gray)

## 📱 Responsive Design

### Desktop (> 1024px):
- Full-width modal with side-by-side layout
- Activity feed on left (40%), metrics on right (60%)
- Large progress bars and clear typography

### Tablet (768px - 1024px):
- Stacked layout
- Activity feed on top, metrics below
- Medium-sized progress bars

### Mobile (< 768px):
- Single column layout
- Compact progress indicators
- Swipeable activity feed
- Bottom sheet for cancel confirmation

## ⚡ Performance Considerations

1. **Polling Frequency**:
   - Status: Every 1 second (lightweight)
   - Steps: Every 2 seconds (heavier)
   - Stop polling when run completes

2. **WebSocket**:
   - Reconnect on disconnect
   - Heartbeat every 30 seconds
   - Fallback to polling if WebSocket unavailable

3. **Optimistic Updates**:
   - Update UI immediately on cancel
   - Show "Cancelling..." state
   - Revert if API call fails

## 🔄 User Flow

### Starting a Run:
1. User clicks "Start Run"
2. Modal opens with configuration
3. User submits → Run starts
4. Modal transitions to "Running" state
5. Real-time updates begin

### During Execution:
1. Progress bar updates
2. Steps appear in activity feed
3. Metrics update as available
4. User can see exactly what's happening
5. User can cancel at any time

### Cancelling:
1. User clicks cancel button
2. Confirmation dialog appears
3. User confirms
4. API call to cancel endpoint
5. Status updates to "Cancelled"
6. Polling stops

## 📊 Metrics to Display

### During Execution:
- Current step number and name
- Elapsed time
- Estimated time remaining
- Steps completed/total

### As Available:
- Utility metrics (KS mean, Corr delta)
- Privacy metrics (MIA AUC, Dup rate)
- Method being used
- Agent decisions (if agent mode)

## 🚀 Implementation Priority

1. **Phase 1** (High Priority):
   - Cancel endpoint in backend
   - Cancel button in UI
   - Enhanced progress display in modal

2. **Phase 2** (Medium Priority):
   - Progress indicators in runs list
   - Faster polling
   - Better step visualization

3. **Phase 3** (Nice to Have):
   - WebSocket integration
   - Estimated time calculation
   - Advanced metrics preview

## ✅ Success Criteria

- Users can see what's happening during run execution
- Users can cancel runs in progress
- Progress is clearly visible
- UI updates in real-time (or near real-time)
- No confusion about run status
- Smooth, professional user experience

---

**Ready for Review**: This plan covers UI/UX, colors, technical implementation, and user flows. Please review and let me know if you'd like any changes before we start implementation!

