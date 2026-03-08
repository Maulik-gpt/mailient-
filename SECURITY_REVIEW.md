# Security Review Report - Mailient
**Date:** 2025-01-27  
**Status:** ⚠️ **CRITICAL ISSUES FOUND**

## Executive Summary

This security review identified **multiple critical and high-severity vulnerabilities** in the Mailient codebase that require immediate attention. The most severe issues include hardcoded credentials, insecure session management, and exposed debug endpoints.

---

## 🔴 CRITICAL SEVERITY ISSUES

### 1. Hardcoded Supabase Credentials
**File:** `mailient/lib/supabase.js` (Lines 4-6)

**Issue:**
```javascript
const supabaseUrl = process.env.SUPABASE_URL || 'https://nelscyaohnrnekscprxq.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**Risk:** 
- Service role key grants full database access (bypasses Row Level Security)
- Credentials are exposed in source code and version control
- Anyone with access to the code can access/modify all user data

**Impact:** Complete database compromise, data breach, unauthorized access to all user accounts

**Recommendation:**
- **IMMEDIATELY** rotate all Supabase keys
- Remove all hardcoded credentials
- Use environment variables only (no fallbacks)
- Add validation to fail if env vars are missing
- Review git history and remove credentials from all commits

**Fix:**
```javascript
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables');
}

// Service role key should NEVER have a fallback
if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}
```

---

### 2. Insecure Cookie Configuration
**File:** `mailient/lib/auth.js` (Lines 36-84)

**Issue:**
```javascript
secure: false, // Disabled for HTTP localhost
```

**Risk:**
- Cookies can be intercepted over HTTP
- Session tokens exposed to man-in-the-middle attacks
- CSRF tokens not properly protected

**Impact:** Session hijacking, unauthorized access to user accounts

**Recommendation:**
- Use `secure: true` in production (HTTPS required)
- Set `sameSite: "strict"` for better CSRF protection
- Use environment-based configuration:
  ```javascript
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  ```

---

### 3. Sensitive Tokens Exposed in Client Session
**File:** `mailient/lib/auth.js` (Lines 170-176)

**Issue:**
```javascript
async session({ session, token }) {
  if (token) {
    session.accessToken = token.accessToken;
    session.refreshToken = token.refreshToken;
  }
  return session;
}
```

**Risk:**
- OAuth tokens accessible to client-side JavaScript
- Tokens can be stolen via XSS attacks
- Tokens logged in browser dev tools

**Impact:** Unauthorized Gmail/Calendar access, account compromise

**Recommendation:**
- **Never** expose tokens in client session
- Store tokens only server-side (database)
- Use server-side API routes to access Gmail/Calendar
- Remove token exposure from session callback

---

### 4. Debug Endpoints Expose Sensitive Information
**Files:** 
- `mailient/app/api/debug/env/route.js`
- `mailient/app/api/debug/user/route.js`
- `mailient/app/api/debug/db/route.js`

**Issues:**
1. `/api/debug/env` - Exposes environment variable status
2. `/api/debug/user` - No authentication, allows querying any user's token status
3. `/api/debug/db` - Exposes database schema and user data

**Risk:**
- Information disclosure
- Unauthorized access to user data
- Database schema exposure

**Impact:** Attackers can enumerate users, check token status, understand database structure

**Recommendation:**
- **Remove or disable** all debug endpoints in production
- Add authentication to debug routes if needed for development
- Use environment-based guards:
  ```javascript
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  ```
- Consider using a separate debug-only route with IP whitelist

---

## 🟠 HIGH SEVERITY ISSUES

### 5. Weak Encryption Implementation
**File:** `mailient/lib/crypto.js`

**Issues:**
1. **Fixed IV** (Line 5): Uses the same IV for all encryptions
   ```javascript
   const iv = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
   ```
2. **Weak key derivation** (Line 4): Uses scrypt with fixed salt
   ```javascript
   const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
   ```
3. **Default encryption key**: Falls back to 'default-key' if env var missing

**Risk:**
- Fixed IV makes encryption deterministic (same plaintext = same ciphertext)
- Weak key derivation reduces security
- Default key allows decryption if env var missing

**Impact:** Encrypted data can be analyzed, potentially decrypted

**Recommendation:**
- Generate random IV for each encryption
- Store IV with encrypted data (prepend to ciphertext)
- Use proper key derivation (PBKDF2 or Argon2)
- Fail if ENCRYPTION_KEY is missing (no fallback)
- Use authenticated encryption (AES-GCM) instead of AES-CBC

**Fix:**
```javascript
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const keyLength = 32;
const ivLength = 16;
const tagLength = 16;

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  return crypto.scryptSync(key, 'salt', keyLength);
}

export function encrypt(text) {
  if (text === null || text === undefined) return text;
  if (typeof text !== 'string') text = String(text);
  if (text.startsWith('enc:')) return text;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();
  
  // Format: enc:iv:tag:ciphertext (all hex encoded)
  return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(text) {
  if (!text || typeof text !== 'string' || !text.startsWith('enc:')) return text;

  try {
    const parts = text.substring(4).split(':');
    if (parts.length !== 3) return text; // Invalid format
    
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const ciphertext = Buffer.from(parts[2], 'hex');
    
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return text;
  }
}
```

---

### 6. Middleware Doesn't Enforce Authentication
**File:** `mailient/middleware.js`

**Issue:**
```javascript
export async function middleware(request) {
  // ... skips auth routes
  // All other routes pass through - auth checks happen at page level
  return NextResponse.next();
}
```

**Risk:**
- No centralized authentication enforcement
- Relies on individual routes to check auth (inconsistent)
- Some routes may forget to add auth checks

**Impact:** Unauthorized access to protected routes

**Recommendation:**
- Add authentication check in middleware
- Redirect unauthenticated users to sign-in
- Use NextAuth's middleware helper:
  ```javascript
  import { auth } from '@/lib/auth';
  
  export async function middleware(request) {
    const session = await auth();
    const { pathname } = request.nextUrl;
    
    // Public routes
    if (pathname.startsWith('/api') || 
        pathname.startsWith('/auth') || 
        pathname === '/') {
      return NextResponse.next();
    }
    
    // Protected routes
    if (!session?.user) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
    
    return NextResponse.next();
  }
  ```

---

### 7. SQL Injection Risk in Query Building
**Files:** Multiple API routes using `.or()` and `.ilike()` with user input

**Examples:**
- `mailient/app/api/agent-talk/notes-search/route.js` (Line 51)
- `mailient/app/api/contacts/route.js` (Line 35)

**Issue:**
```javascript
searchQuery = searchQuery.or(`subject.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
```

**Risk:**
- While Supabase PostgREST should sanitize, string interpolation in query builders can be risky
- If Supabase client has bugs, could lead to injection

**Impact:** Potential database compromise, data exfiltration

**Recommendation:**
- Use parameterized queries (Supabase's `.or()` with proper syntax)
- Validate and sanitize all user input
- Use Supabase's built-in methods instead of string interpolation:
  ```javascript
  // Better approach
  searchQuery = searchQuery
    .or(`subject.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
    // But validate searchTerm first
  ```
- Add input validation:
  ```javascript
  const searchTerm = query.toLowerCase().trim();
  if (searchTerm.length > 100) {
    return NextResponse.json({ error: 'Search term too long' }, { status: 400 });
  }
  // Remove special characters that could break queries
  const sanitized = searchTerm.replace(/[^a-z0-9\s]/gi, '');
  ```

---

## 🟡 MEDIUM SEVERITY ISSUES

### 8. No Rate Limiting
**Issue:** API routes don't implement rate limiting

**Risk:**
- Brute force attacks on authentication
- API abuse and DoS
- Resource exhaustion

**Impact:** Service disruption, increased costs, potential account compromise

**Recommendation:**
- Implement rate limiting using:
  - Next.js middleware with Redis
  - Vercel Edge Config
  - Upstash Redis
- Example:
  ```javascript
  import { Ratelimit } from '@upstash/ratelimit';
  import { Redis } from '@upstash/redis';
  
  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '10 s'),
  });
  
  export async function POST(request) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    // ... rest of handler
  }
  ```

---

### 9. Missing Input Validation
**Issue:** Many API routes don't validate input properly

**Examples:**
- `mailient/app/api/notes/route.ts` - No validation on note content length
- `mailient/app/api/agent-talk/chat/route.ts` - No message length limits

**Risk:**
- DoS via large payloads
- Memory exhaustion
- Database errors

**Recommendation:**
- Add input validation middleware
- Use libraries like `zod` or `yup` for schema validation
- Set reasonable limits:
  ```typescript
  import { z } from 'zod';
  
  const noteSchema = z.object({
    subject: z.string().max(200),
    content: z.string().max(10000),
    tags: z.array(z.string()).max(10)
  });
  ```

---

### 10. No CORS Configuration
**File:** `mailient/next.config.ts`

**Issue:** No explicit CORS headers configured

**Risk:**
- Unintended cross-origin access
- CSRF vulnerabilities

**Recommendation:**
- Configure CORS explicitly in Next.js config or middleware
- Use environment-based allowed origins
- Add proper headers:
  ```typescript
  const nextConfig: NextConfig = {
    async headers() {
      return [
        {
          source: '/api/:path*',
          headers: [
            { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN || '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
            { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          ],
        },
      ];
    },
  };
  ```

---

### 11. Error Messages May Leak Information
**Issue:** Some error responses include stack traces or internal details

**Risk:**
- Information disclosure
- Attackers can understand system internals

**Recommendation:**
- Use generic error messages in production
- Log detailed errors server-side only
- Example:
  ```javascript
  catch (error) {
    console.error('Internal error:', error); // Log full error
    return NextResponse.json(
      { error: 'An error occurred' }, // Generic message
      { status: 500 }
    );
  }
  ```

---

### 12. No Content Security Policy (CSP)
**Issue:** No CSP headers configured

**Risk:**
- XSS attacks
- Data exfiltration

**Recommendation:**
- Add CSP headers in Next.js config
- Use strict CSP policy
- Example:
  ```typescript
  headers: [
    {
      key: 'Content-Security-Policy',
      value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    }
  ]
  ```

---

## 🟢 LOW SEVERITY / BEST PRACTICES

### 13. TypeScript Build Errors Ignored
**File:** `mailient/next.config.ts`

**Issue:**
```typescript
typescript: {
  ignoreBuildErrors: true,
}
```

**Risk:**
- Type safety issues may hide bugs
- Runtime errors in production

**Recommendation:**
- Fix TypeScript errors
- Enable type checking in CI/CD
- Remove `ignoreBuildErrors` flag

---

### 14. ESLint Errors Ignored
**File:** `mailient/next.config.ts`

**Issue:**
```typescript
eslint: {
  ignoreDuringBuilds: true,
}
```

**Risk:**
- Code quality issues
- Potential bugs not caught

**Recommendation:**
- Fix linting errors
- Enable ESLint in builds
- Use strict linting rules

---

## Priority Action Items

### Immediate (Fix Today)
1. ✅ **Remove hardcoded Supabase credentials** - Rotate all keys
2. ✅ **Disable/secure debug endpoints** - Add auth or remove
3. ✅ **Remove tokens from client session** - Store server-side only
4. ✅ **Fix cookie security** - Enable secure flag in production

### This Week
5. ✅ **Fix encryption implementation** - Use proper IV and authenticated encryption
6. ✅ **Add authentication middleware** - Centralize auth checks
7. ✅ **Add input validation** - Validate all user inputs
8. ✅ **Implement rate limiting** - Protect against abuse

### This Month
9. ✅ **Add CORS configuration** - Explicit CORS headers
10. ✅ **Add CSP headers** - XSS protection
11. ✅ **Review all API routes** - Ensure consistent security
12. ✅ **Add security headers** - HSTS, X-Frame-Options, etc.

---

## Security Checklist

- [ ] All environment variables moved to secure storage (no hardcoded values)
- [ ] All Supabase keys rotated
- [ ] Debug endpoints disabled/removed in production
- [ ] Tokens removed from client-accessible session
- [ ] Secure cookies enabled in production
- [ ] Encryption uses random IVs and authenticated encryption
- [ ] Authentication middleware implemented
- [ ] Rate limiting added to all API routes
- [ ] Input validation on all user inputs
- [ ] CORS properly configured
- [ ] CSP headers added
- [ ] Error messages sanitized
- [ ] Security headers configured (HSTS, X-Frame-Options, etc.)
- [ ] Regular security audits scheduled
- [ ] Dependency vulnerabilities scanned (use `npm audit`)

---

## Additional Recommendations

1. **Security Monitoring:**
   - Set up logging and alerting for suspicious activities
   - Monitor failed authentication attempts
   - Track unusual API usage patterns

2. **Dependency Management:**
   - Regularly update dependencies
   - Use `npm audit` to find vulnerabilities
   - Consider using Dependabot or Snyk

3. **Code Review:**
   - Implement mandatory security reviews for sensitive changes
   - Use static analysis tools (SonarQube, Snyk Code)

4. **Testing:**
   - Add security tests
   - Test authentication and authorization
   - Test input validation

5. **Documentation:**
   - Document security architecture
   - Create incident response plan
   - Document security procedures

---

## Conclusion

The Mailient application has **critical security vulnerabilities** that must be addressed immediately. The most urgent issues are hardcoded credentials and exposed sensitive data. Once these are fixed, the application should follow a systematic approach to address the remaining high and medium severity issues.

**Estimated Time to Fix Critical Issues:** 1-2 days  
**Estimated Time to Fix All Issues:** 1-2 weeks

---

*This security review was conducted on 2025-01-27. Please address critical issues immediately.*

