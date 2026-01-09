# Local Testing Checklist

**Date:** 2025-01-27  
**Server:** http://localhost:3000

---

## 🧪 Testing Steps

### 1. Basic Navigation ✅
- [ ] Open http://localhost:3000
- [ ] Verify homepage loads without errors
- [ ] Check browser console (F12) - should see minimal/no debug logs
- [ ] Navigate to `/en/dashboard`
- [ ] Verify no console errors

### 2. Runs Page Testing ✅
- [ ] Navigate to `/en/runs`
- [ ] Verify runs list displays correctly
- [ ] Check browser console - no debug logs
- [ ] Click "View" on a completed run
- [ ] Verify Results Modal opens
- [ ] Check "Execution" tab - should show steps without debug text
- [ ] Verify no "Debug: ..." text appears anywhere

### 3. Run Execution Modal Testing ✅
- [ ] Navigate to `/en/datasets`
- [ ] Click "Start Run" on a dataset
- [ ] Verify Run Execution Modal opens
- [ ] Check execution timeline (if run is active)
- [ ] Verify no debug text in UI
- [ ] Check browser console - minimal logging

### 4. Metrics Display Testing ✅
- [ ] View a completed run
- [ ] Check metrics display
- [ ] Verify no "None" or "undefined" values
- [ ] Verify metrics show "N/A" for missing values
- [ ] Check metric bars render correctly

### 5. Activity Page Testing ✅
- [ ] Navigate to `/en/activity`
- [ ] Verify activity list displays
- [ ] Check for any console errors

### 6. Console Verification ✅
- [ ] Open browser DevTools (F12)
- [ ] Go to Console tab
- [ ] Verify minimal debug logging
- [ ] Check for any errors (red text)
- [ ] Verify no "Debug: ..." or "[ExecutionLogTab] ..." logs

---

## ✅ Pass Criteria

All tests should pass:
- ✅ No debug text in UI
- ✅ Minimal console logging
- ✅ No console errors
- ✅ Metrics display correctly
- ✅ All modals work properly
- ✅ Navigation works smoothly

---

## 🐛 If Issues Found

1. **Debug text still visible:**
   - Check which component shows it
   - Report the file and line number

2. **Console errors:**
   - Copy the error message
   - Note which page/action triggers it

3. **Metrics not displaying:**
   - Check if run has metrics
   - Verify API response

---

## 📝 Notes

- Server runs on: http://localhost:3000
- Default locale: `/en`
- Test with both completed and running runs if available

