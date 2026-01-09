# 2026-01-09 - CORS Issue on Project Detail Page - FrontendDeveloper

## Status
⏳ Pending - Awaiting DevOpsAgent Fix

## Summary
After verifying the eye icon navigation fix, discovered a CORS error preventing the project detail page from loading. The navigation is working correctly (using dynamic locale), but the API call to fetch project data is being blocked by CORS policy.

## Key Findings / Decisions

### ✅ **Navigation Fix Verified**:
- Eye icon navigation is working correctly
- URL format is correct: `/en/projects/{projectId}`
- Dynamic locale is being used (not hardcoded `/en`)
- Navigation successfully routes to project detail page

### ❌ **CORS Error Discovered**:

**Error Message**:
```
Access to fetch at 'https://api.gesalpai.ch/v1/projects/7f5a4c07-054e-4cee-abd4-b9111c7e3ffa' 
from origin 'https://www.gesalpai.ch' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Impact**:
- Project detail page cannot load project data
- Users see "Failed to fetch" error message
- Blocks access to project details, datasets, and runs

**Root Cause**:
- Backend API at `https://api.gesalpai.ch` is not allowing requests from `https://www.gesalpai.ch`
- CORS headers are missing or incorrectly configured
- This is a backend configuration issue, not a frontend issue

### 📋 **Testing Details**:

**Test Performed**:
1. Navigated to dashboard: `https://www.gesalpai.ch/en/dashboard`
2. Clicked eye icon on "SATO" project
3. Navigation worked correctly → `https://www.gesalpai.ch/en/projects/7f5a4c07-054e-4cee-abd4-b9111c7e3ffa`
4. API call to `https://api.gesalpai.ch/v1/projects/7f5a4c07-054e-4cee-abd4-b9111c7e3ffa` failed with CORS error

**Browser Console Errors**:
```
[ERROR] Access to fetch at 'https://api.gesalpai.ch/v1/projects/7f5a4c07-054e-4cee-abd4-b9111c7e3ffa' 
from origin 'https://www.gesalpai.ch' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.

[ERROR] Failed to load resource: net::ERR_FAILED

[ERROR] Error fetching project data: TypeError: Failed to fetch
```

## Code Changes Proposed/Applied (if any)

**No frontend code changes needed** - This is a backend CORS configuration issue.

## Next Steps / Handoff

- → **DevOpsAgent**: 
  **CRITICAL ACTION REQUIRED**: Fix CORS configuration on backend API
  1. Verify CORS configuration in backend `.env` file on VPS
  2. Ensure `CORS_ALLOW_ORIGINS` includes `https://www.gesalpai.ch`
  3. Verify the API is returning `Access-Control-Allow-Origin: https://www.gesalpai.ch` header
  4. Test the project detail endpoint: `GET /v1/projects/{id}` from `https://www.gesalpai.ch`
  5. Consider allowing both `www.gesalpai.ch` and `gesalpai.ch` (with/without www)
  6. Restart API service if configuration was updated
  7. Create log file documenting the fix and verification

**Expected CORS Configuration**:
```
CORS_ALLOW_ORIGINS=https://gesalpai.ch,https://www.gesalpai.ch,http://gesalpai.ch,http://www.gesalpai.ch
```

**Verification Steps**:
1. Check backend `.env` file on VPS: `/opt/gesalps/backend/.env`
2. Verify `CORS_ALLOW_ORIGINS` environment variable
3. Test API endpoint with curl:
   ```bash
   curl -H "Origin: https://www.gesalpai.ch" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS \
        https://api.gesalpai.ch/v1/projects/test-id
   ```
4. Verify response includes: `Access-Control-Allow-Origin: https://www.gesalpai.ch`
5. Test actual GET request from browser console on `https://www.gesalpai.ch`

- → **FrontendDeveloper**: 
  - Monitor for CORS fix completion
  - Retest eye icon navigation after CORS is fixed
  - Verify project detail page loads correctly
  - Update error message to use user-friendly message (currently shows "Failed to fetch")

## Related Issues

- Previous CORS fix: `agent-logs/2026-01-09-P0-CORS-Fix-DevOpsAgent.md`
  - DevOpsAgent reported CORS was correctly configured
  - However, issue persists in production
  - May need to verify production configuration vs. template

## Open Questions

- Is the production `.env` file correctly configured?
- Was the API service restarted after CORS configuration?
- Are there multiple backend instances that need updating?
- Should we also allow `gesalpai.ch` (without www)?

## Conclusion

**Status**: ⏳ Blocked on backend CORS configuration  
**Priority**: High - Blocks project detail page access  
**Impact**: Users cannot view project details, datasets, or runs  
**Next**: DevOpsAgent to fix CORS configuration on production backend

The eye icon navigation fix is working correctly. The remaining issue is a backend CORS configuration that prevents the API from responding to requests from the frontend domain.

Agent: FrontendDeveloper  
Date: 2026-01-09  
Priority: High
