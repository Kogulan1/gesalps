# Fix: Invalid Refresh Token Error

## Quick Fix (Recommended)

**Clear browser storage and sign in again:**

1. **Open Browser DevTools** (F12)
2. **Go to Application/Storage tab**
3. **Clear all cookies and localStorage:**
   - Click "Clear site data" or
   - Manually delete cookies for `localhost:3000` (or your domain)
   - Clear localStorage items related to Supabase

4. **Refresh the page** and sign in again

## Alternative: Use Browser Console

Run this in your browser console:

```javascript
// Clear all Supabase-related storage
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
location.reload();
```

## What We Fixed

I've added error handling to:
1. **AuthProvider** - Gracefully handles refresh token errors
2. **authedFetch** - Catches auth errors and redirects to sign in

The app will now automatically sign you out and redirect to the sign-in page if the refresh token is invalid.

## After Fixing

1. Sign in again
2. Test the real-time run progress features
3. The error should not appear again

