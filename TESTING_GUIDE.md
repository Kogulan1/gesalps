# Local Testing Guide - Real-Time Run Progress & Cancellation

## Prerequisites

1. **Backend services running**:
   ```bash
   cd backend
   docker compose up -d
   ```

2. **Frontend running**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Database schema updated**:
   - The schema update should run automatically
   - If needed, manually run `backend/sql/schema.sql` in Supabase SQL editor
   - Make sure the `run_status` enum includes 'cancelled'

## Testing Steps

### 1. Test Cancel Endpoint (Backend)

Test the cancel endpoint directly:

```bash
# First, get a run ID that's queued or running
# Then test cancel:
curl -X POST http://localhost:8000/v1/runs/{run_id}/cancel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{"ok": true, "status": "cancelled"}
```

### 2. Test in Frontend - Run Execution Modal

1. **Start a new run**:
   - Go to Datasets page
   - Click play button on a dataset
   - Configure and start the run

2. **Verify real-time updates**:
   - ✅ Modal should show "LIVE" badge (green pulsing dot)
   - ✅ Progress bar should update as steps complete
   - ✅ Execution timeline should show steps in real-time
   - ✅ Current step should be displayed

3. **Test cancellation**:
   - ✅ Click "Cancel" button (red, top-right)
   - ✅ Confirmation dialog should appear
   - ✅ Click "Yes, Cancel Run"
   - ✅ Run status should update to "cancelled"
   - ✅ Modal should show cancelled state
   - ✅ Polling should stop

### 3. Test in Frontend - Runs List

1. **View runs list**:
   - Go to Runs page
   - Find a running or queued run

2. **Verify progress indicators**:
   - ✅ Progress bar should be visible (blue gradient, top of card)
   - ✅ Spinning loader icon (blue) should show
   - ✅ "LIVE" badge should be visible (green pulsing)
   - ✅ Current step info should display below card

3. **Test cancellation**:
   - ✅ Click "Cancel" button (red, next to view button)
   - ✅ Confirm cancellation
   - ✅ Run status should update to "cancelled"
   - ✅ Progress bar should disappear
   - ✅ LIVE badge should disappear
   - ✅ Cancel button should disappear

### 4. Test Real-Time Polling

1. **Start a run** and watch the runs list:
   - ✅ Status should update automatically (every 2 seconds)
   - ✅ Steps should update automatically
   - ✅ Progress bar should grow as steps complete

2. **Check browser console**:
   - ✅ Should see polling requests every 1-2 seconds
   - ✅ No errors in console

### 5. Test Worker Cancellation

1. **Start a run** that will take time
2. **Cancel it** while it's running
3. **Check worker logs**:
   ```bash
   docker compose logs synth-worker | grep -i cancel
   ```
   - ✅ Should see "Run {id} cancelled, stopping execution"
   - ✅ Should see cancellation step logged

## Expected Behaviors

### ✅ Success Indicators

- Cancel button appears for queued/running runs
- Confirmation dialog appears before cancellation
- Run status updates to "cancelled" immediately
- Progress bars show for running runs
- LIVE badges show for active runs
- Real-time updates work (1-2 second polling)
- Worker stops gracefully when cancelled
- No errors in console or logs

### ❌ Things to Check If Not Working

1. **Cancel button not showing**:
   - Check run status is "running" or "queued"
   - Check browser console for errors
   - Verify frontend code is updated

2. **Cancellation not working**:
   - Check backend logs: `docker compose logs api`
   - Verify database schema has 'cancelled' status
   - Check authentication token is valid

3. **Progress not updating**:
   - Check polling is active (browser network tab)
   - Verify steps endpoint returns data
   - Check browser console for errors

4. **Worker not stopping**:
   - Check worker logs: `docker compose logs synth-worker`
   - Verify cancellation check is working
   - Check run status in database

## Database Check

Verify the schema update:

```sql
-- In Supabase SQL editor
SELECT enum_range(NULL::run_status);
-- Should include: queued, running, succeeded, failed, cancelled
```

## Troubleshooting

### Backend not responding
```bash
cd backend
docker compose restart api
docker compose logs api
```

### Frontend not updating
- Clear browser cache
- Restart frontend: `npm run dev`
- Check `NEXT_PUBLIC_BACKEND_API_BASE` is set correctly

### Worker not picking up cancellation
```bash
cd backend
docker compose restart synth-worker
docker compose logs synth-worker --tail=50
```

## Next Steps After Testing

Once everything works locally:

1. ✅ Commit any fixes
2. ✅ Push to GitHub
3. ✅ Pull on VPS
4. ✅ Rebuild containers on VPS
5. ✅ Test on production

