# Execution Steps and Agent Decisions Logging

## Summary

Added comprehensive logging throughout the backend to track:
1. **Agent planning decisions** - What the agent chooses and why
2. **Execution steps** - Every training attempt, metrics evaluation, and error
3. **Step insertion** - Success/failure of writing steps to database

## What Was Added

### 1. Backend API Logging (`backend/api/main.py`)
- Logs when the "planned" step (step_no=0) is inserted
- Logs agent rationale and backup methods when agent mode is enabled
- Format: `[api][step]` and `[api][agent]`

### 2. Worker Logging (`backend/synth_worker/worker.py`)
- **Agent Plan Execution**: Logs when agent plan is being executed
  - Plan choice (primary method)
  - Rationale
  - Number of backup methods
  - List of methods to attempt
  - Format: `[worker][agent]`

- **Step Insertion**: Logs every step insertion attempt
  - Training steps: `[worker][step] INSERTING step {i}: training`
  - Metrics steps: `[worker][step] INSERTING step {i}: metrics`
  - Error steps: `[worker][step] INSERTING step {i}: error`
  - Success/failure of each insertion
  - Format: `[worker][step]`

- **Metrics Logging**: Logs key metric values for each attempt
  - Format: `[worker][metrics] Run {run_id} attempt {i}: KS={...}, Corr={...}, MIA={...}`

## How to Verify Steps Are Real

### Method 1: Check Docker Logs
```bash
cd backend
# Watch live logs as a run executes
docker compose logs -f synth-worker | grep -E "\[worker\]\[step\]|\[worker\]\[agent\]|\[worker\]\[metrics\]"

# Check API logs for planned step
docker compose logs -f api | grep -E "\[api\]\[step\]|\[api\]\[agent\]"
```

### Method 2: Check Database Directly
```sql
-- View all steps for a specific run
SELECT step_no, title, detail, created_at 
FROM run_steps 
WHERE run_id = '<your-run-id>' 
ORDER BY step_no, created_at;

-- View agent plan
SELECT id, config_json->'plan' as agent_plan 
FROM runs 
WHERE id = '<your-run-id>';
```

### Method 3: Check Run Details UI
- The execution timeline in the run details shows:
  - **Real timestamps** - Actual execution times
  - **Real errors** - Actual error messages (e.g., "AssertionError: ...")
  - **Real metrics** - Actual metric values with pass/fail indicators
  - **Method attempts** - Actual methods tried (GC, CTGAN, TVAE)
  - **Backup triggers** - When backup methods were used

## Step Types

1. **Step 0: "planned"** - Inserted by API when run starts (if agent plan exists)
2. **Step N: "training"** - Inserted before each training attempt
3. **Step N: "metrics"** - Inserted after metrics are computed, includes metric values
4. **Step N: "error"** - Inserted when an exception occurs during training

## Example Log Output

```
[api][step] INSERTING planned step for run abc123: method=gc
[api][agent] Agent rationale: GC chosen due to continuous-heavy dataset
[api][agent] Backup methods: ['ctgan', 'tvae']
[api][step] SUCCESS: planned step inserted for run abc123

[worker][agent] EXECUTING agent plan for run abc123
[worker][agent] Plan choice: {'method': 'gc'}
[worker][agent] Plan rationale: GC chosen due to continuous-heavy dataset
[worker][agent] Plan backups: 2 backup methods
[worker][agent] Will attempt 3 methods: ['gc', 'ctgan', 'tvae']

[worker][step] INSERTING step 1: training - attempt 1: method=gc
[worker][step] SUCCESS: step 1 inserted

[worker][step] INSERTING step 1: metrics - KS mean 0.320 > 0.10 (fail); Corr Δ 0.112 > 0.10 (fail); ...
[worker][metrics] Run abc123 attempt 1: KS=0.320, Corr=0.112, MIA=0.974
[worker][step] SUCCESS: metrics step 1 inserted

[worker][step] INSERTING step 2: training - attempt 2: method=ctgan
[worker][step] SUCCESS: step 2 inserted

[worker][step] INSERTING step 2: error - AssertionError: ...
[worker][step] SUCCESS: error step 2 inserted
```

## Verifying Steps Are Real (Not Dummy)

The steps are **REAL** because:
1. They include **actual error messages** from exceptions
2. They have **real timestamps** showing execution sequence
3. They include **actual metric values** computed from real synthetic data
4. They show **actual method failures** (e.g., CTGAN assertion errors)
5. They reflect **real agent decisions** based on dataset characteristics

If steps were dummy, they would:
- Have generic placeholder values
- Not include specific error messages
- Not show real-time execution progression
- Not reflect actual metric computations

## Troubleshooting

If steps aren't appearing in the UI:
1. Check if steps are being inserted: `docker compose logs synth-worker | grep "INSERTING step"`
2. Check for insertion errors: `docker compose logs synth-worker | grep "ERROR inserting"`
3. Verify database connection: Check Supabase connection in worker logs
4. Check frontend polling: Open browser console and check network requests to `/v1/runs/{runId}/steps`

