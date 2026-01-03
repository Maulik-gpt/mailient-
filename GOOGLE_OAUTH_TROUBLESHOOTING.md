# Google OAuth Troubleshooting Guide

## Issue: OAuth Flow Hangs at Gmail Permissions Screen

### Symptoms
- User clicks "Continue with Google"
- Redirected to Google OAuth consent screen
- Grants permissions successfully
- Screen shows continuous loading, never redirects back to app
- Browser console shows: "Deprecated feature used: Unload event listeners are deprecated"

### Root Causes & Solutions

#### 1. Incorrect Redirect URI in Google Cloud Console
**Most Common Cause**

**Check:**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Navigate to "APIs & Services" → "Credentials"
- Find your OAuth 2.0 Client ID
- Under "Authorized redirect URIs", ensure you have:
  ```
  http://localhost:3000/api/auth/callback/google
  ```

**Fix:**
- Add the correct redirect URI if missing
- Remove any incorrect/old URIs
- Save changes

#### 2. NextAuth Configuration Issues
**Changes Made:**
- Removed `trustHost: true` (can cause redirect issues)
- Removed `prompt: "consent"` (forces consent screen every time)
- Added comprehensive logging for debugging

#### 3. Browser/Cache Issues
**Try:**
- Clear browser cache and cookies
- Try incognito/private browsing mode
- Use a different browser

#### 4. Development Server Issues
**Check:**
- Ensure app is running on `http://localhost:3000`
- No port conflicts
- Firewall not blocking localhost

## Issue: Deprecated Unload Event Listeners Warning

### Cause
This warning originates from Google's internal JavaScript code in their OAuth consent pages. It cannot be fixed by app developers.

### Status
- **Not fixable** - Google's internal code
- **Harmless** - Just a deprecation warning
- **Will be removed** by Google in future updates

## Debugging Tools Added

### 1. Enhanced Callback Logging
The `/api/auth/callback/google` route now logs:
- Full callback URL
- Query parameters received
- Response status and headers

### 2. Debug Endpoint
Visit `http://localhost:3000/api/debug/oauth-callback` to test callback URL handling.

### 3. JWT Callback Logging
Added detailed logging of OAuth account data received.

## Testing the Fix

1. **Restart your development server** after applying changes
2. **Clear browser cache**
3. **Try the OAuth flow again**
4. **Check server logs** for detailed debugging information

## Additional Scopes Added

The OAuth configuration now requests these scopes:
- `openid email profile` - Basic user info
- `https://www.googleapis.com/auth/gmail.modify` - Full Gmail access
- `https://www.googleapis.com/auth/gmail.readonly` - Gmail read access
- `https://www.googleapis.com/auth/gmail.send` - Send emails
- `https://www.googleapis.com/auth/calendar` - Calendar access
- `https://www.googleapis.com/auth/calendar.events` - Calendar events

## Still Having Issues?

If the OAuth flow still hangs:

1. **Check Google Cloud Console redirect URIs again**
2. **Verify your OAuth client configuration**
3. **Test with the debug endpoint**: `http://localhost:3000/api/debug/oauth-callback?code=test&state=test`
4. **Check server logs** for any error messages
5. **Try adding yourself as a test user** in OAuth consent screen

## Logs to Check

When attempting OAuth, look for these log messages:
- `🔄 Google OAuth callback received` - Callback hit
- `🚀 GOOGLE AUTH SUCCESS:` - Authentication successful
- `📋 Account data:` - Token details
- `✅ Auth DB storage complete` - Database storage successful</content>
</xai:function_call"> 

<xai:function_call name="update_todo_list">
<parameter name="todos">[x] Add additional Gmail scopes\n[x] Fix OAuth callback hanging issue\n[x] Investigate unload event listeners warning