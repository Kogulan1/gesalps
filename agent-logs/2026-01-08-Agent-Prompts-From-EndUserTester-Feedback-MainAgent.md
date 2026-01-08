# 2026-01-08 - Agent Prompts from EndUserTester Feedback - MainAgent

## Status
✅ Prompts Created

## Summary
Clear, actionable prompts for each agent based on EndUserTester feedback. Each prompt includes context, specific tasks, expected outcomes, and priority level.

---

## 🔴 DevOpsAgent - P0 CRITICAL

### Prompt:

```
**CRITICAL CORS ERROR - P0 PRIORITY**

EndUserTester identified a blocking CORS error preventing project detail page access. This will prevent hospital adoption.

**Problem:**
- API at `https://api.gesalpai.ch` is blocking requests from `https://www.gesalpai.ch`
- Error: `Access to fetch at 'https://api.gesalpai.ch/v1/projects/{id}' from origin 'https://www.gesalpai.ch' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present`
- Impact: Users cannot view project details - essential functionality blocked
- Trust Impact: HIGH - Hospital IT departments will reject platforms with CORS errors

**Tasks:**
1. Locate CORS configuration in backend API (likely in FastAPI middleware or nginx config)
2. Verify current CORS settings
3. Add `https://www.gesalpai.ch` to allowed origins
4. Consider allowing both `www.gesalpai.ch` and `gesalpai.ch` (without www)
5. Test project detail endpoint: `/v1/projects/{id}`
6. Verify all API endpoints have proper CORS headers
7. Deploy fix to production
8. Verify fix works by testing project detail page access

**Expected Outcome:**
- Project detail page loads without CORS errors
- All API endpoints accessible from frontend
- CORS headers properly configured

**Files to Check:**
- Backend API CORS middleware (likely in `backend/api/main.py`)
- Nginx configuration (if used)
- Docker compose environment variables

**Priority:** P0 - Fix immediately
**Timeline:** Today

**Log Response:** Create log file: `2026-01-08-CORS-Fix-DevOpsAgent.md`
```

---

## ⚠️ FrontendDeveloper - High Priority

### Prompt:

```
**ENDUSER FEEDBACK - UX IMPROVEMENTS - HIGH PRIORITY**

EndUserTester identified several UX issues that reduce user trust and clarity. Fix these to improve hospital adoption.

**Issues to Fix:**

1. **Error Messages (High Priority)**
   - Current: Technical "Failed to fetch" message
   - Problem: Users don't understand technical errors
   - Fix: Replace with user-friendly messages
   - Example: "Unable to connect to server. Please check your connection or try again later."
   - Location: Error handling components (likely in `components/common/StateComponents.tsx` or similar)
   - Also: Add retry logic for network errors
   - Consider: Add connection status indicator

2. **Status Clarity (High Priority)**
   - Problem: Runs with 0 rows generated show status "Completed" instead of "Failed"
   - Fix: If run completes with 0 rows, status should be "Failed"
   - Location: Run status display logic (likely in `components/runs/RunsContent.tsx`)
   - Also: Add clearer failure explanations with actionable recommendations

3. **Auto-Optimize Visibility (High Priority)**
   - Problem: Auto-Optimize feature not found in UI during testing
   - Fix: If implemented, make it visible/prominent for failed runs
   - Actions:
     - Add button in run details modal for failed runs
     - Consider adding "Retry with Auto-Optimize" option
     - Make it clear when Auto-Optimize is available
   - Location: Run details modal (likely in `components/runs/` directory)

4. **Loading States (Medium Priority)**
   - Problem: Extended loading times (30+ seconds) with no feedback
   - Fix: Add progress indicators or skeleton screens
   - Priority: Especially for datasets page (currently 10-15 seconds)
   - Location: Loading states in various components

5. **Language Switching (Medium Priority)**
   - Problem: Language switcher not easily discoverable
   - Fix: Add visible language selector in header
   - Location: Header/navbar component

**Expected Outcome:**
- User-friendly error messages
- Accurate run status (Failed for 0 rows)
- Auto-Optimize button visible for failed runs
- Better loading feedback
- Discoverable language switcher

**Files to Check:**
- `frontend/components/common/StateComponents.tsx` (error messages)
- `frontend/components/runs/RunsContent.tsx` (run status)
- `frontend/components/runs/` (run details modal, Auto-Optimize)
- `frontend/components/layout/Navbar.tsx` (language switcher)
- Loading components

**Priority:** High (Error messages, Status clarity, Auto-Optimize) / Medium (Loading, Language)
**Timeline:** This week

**Log Response:** Create log file: `2026-01-08-UX-Improvements-FrontendDeveloper.md`
```

---

## ⚠️ SyntheticDataSpecialist - High Priority

### Prompt:

```
**ENDUSER FEEDBACK - RUN FAILURES & AUTO-OPTIMIZE - HIGH PRIORITY**

EndUserTester identified run failures and questions about Auto-Optimize feature. Analyze and provide recommendations.

**Issues to Address:**

1. **Run Failure Analysis (High Priority)**
   - Problem: Both test runs failed with poor utility metrics
   - Metrics Observed:
     - Privacy: Excellent (MIA AUC: 0.003, Dup Rate: 0) ✅
     - Utility: Poor (KS Mean: 0.73) ❌
   - Questions:
     - Why is KS Mean so high (0.73)?
     - Is this expected for TabDDPM with current hyperparameters?
     - What can be done to improve utility while maintaining privacy?
   - Tasks:
     - Analyze the failed runs
     - Identify root cause of high KS Mean
     - Provide recommendations for improvement
     - Consider if hyperparameter adjustments would help

2. **Auto-Optimize Feature Status (High Priority)**
   - Problem: Auto-Optimize feature not found in UI during testing
   - Questions:
     - Is Auto-Optimize implemented in backend? (We integrated it in `worker.py`)
     - Is it exposed in frontend?
     - Where should users access it?
     - How should it be triggered?
   - Tasks:
     - Verify Auto-Optimize is working in backend
     - Check if it's being called correctly
     - Provide guidance on where users should access it
     - Recommend UI placement for Auto-Optimize button
     - Consider: Should it be automatic or manual trigger?

3. **Zero Rows Generated (High Priority)**
   - Problem: Runs complete with 0 rows generated
   - Question: Why did runs complete with 0 rows? Is this expected?
   - Tasks:
     - Investigate why 0 rows were generated
     - Check if this is a bug or expected behavior
     - If bug, identify root cause

4. **Failure Recommendations (Medium Priority)**
   - Problem: Users see failed runs but unclear guidance on how to improve
   - Task: Add recommendations in run details for failed runs
   - Suggestions:
     - "Try Auto-Optimize" option
     - "Adjust hyperparameters" guidance
     - Clear explanation of what failed and why

**Expected Outcome:**
- Analysis of run failures with root cause
- Auto-Optimize implementation status verified
- Recommendations for improving utility metrics
- Guidance on where/how users should access Auto-Optimize
- Explanation of zero rows issue

**Files to Check:**
- `backend/synth_worker/worker.py` (Auto-Optimize integration)
- `backend/synth_worker/optimizer.py` (Auto-Optimize logic)
- Run logs and metrics from failed runs
- Frontend components for Auto-Optimize (if any)

**Priority:** High
**Timeline:** This week

**Log Response:** Create log file: `2026-01-08-Run-Failure-Analysis-AutoOptimize-Status-SyntheticDataSpecialist.md`
```

---

## 📋 Summary for All Agents

### Priority Order:
1. **P0**: DevOpsAgent - CORS fix (blocking)
2. **High**: FrontendDeveloper - Error messages, Status clarity, Auto-Optimize visibility
3. **High**: SyntheticDataSpecialist - Run failure analysis, Auto-Optimize verification
4. **Medium**: FrontendDeveloper - Loading states, Language switcher

### Communication:
- All agents should create log files in `/agent-logs/` with their responses
- Use standard log format
- Include implementation details, fixes applied, and verification steps
- Tag MainAgent when complete for coordination

### Testing:
- After fixes, EndUserTester will retest
- MainAgent will coordinate retest session
- Verify all issues are resolved

---

Agent: MainAgent  
Date: 2026-01-08  
Prompts Created: 2026-01-08T19:15:00

