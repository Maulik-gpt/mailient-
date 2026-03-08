# 🔒 Subscription Protection Implementation Guide

## Overview
This document explains how subscription protection is implemented in Mailient and how to use it correctly.

---

## Architecture

### Why Page-Level Instead of Middleware?

**Problem:** Next.js Edge Middleware runs in a lightweight Edge Runtime that doesn't support Node.js modules like `crypto`.

**Our Solution:** 
- Subscription-service.js uses Node crypto for encryption
- Therefore, subscription checks MUST happen at:
  - ✅ Page level (Server Components)
  - ✅ API route level (Node runtime)
  - ❌ NOT in middleware (Edge runtime)

---

## Protected Routes

### ✅ Fully Protected (Subscription Required)

#### Gmail API Routes
All users must have active subscription to access:
- `/api/gmail/emails` - Email listing
- `/api/gmail/messages` - Message batch retrieval
- `/api/gmail/messages/[messageId]` - Single message
- `/api/gmail/threads/[threadId]` - Email threads
- `/api/gmail/search` - Email search (POST & GET)

**Response for non-subscribers:**
```json
{
  "error": "subscription_required",
  "message": "An active subscription is required to access your emails.",
  "upgradeUrl": "/pricing",
  "status": 403
}
```

#### AI Feature Routes
Feature-gated with usage limits:

| Route | Feature | Starter Limit | Pro Limit |
|-------|---------|--------------|-----------|
| `/api/email/draft-reply` | Draft Reply | 30/month | Unlimited |
| `/api/home-feed/insights` | Sift Analysis | 5/day | Unlimited |
| `/api/agent-talk/chat` | Arcus AI | 10/day | Unlimited |
| `/api/notes` | AI Notes | 20/month | Unlimited |
| `/api/calendar/schedule` | Schedule Call | 30/month | Unlimited |

**Response when limit reached:**
```json
{
  "error": "limit_reached",
  "message": "Sorry, but you've exhausted all the credits of the day.",
  "usage": 5,
  "limit": 5,
  "period": "daily",
  "planType": "starter",
  "upgradeUrl": "/pricing",
  "status": 403
}
```

---

## How to Protect Routes

### 1. API Routes (Recommended Method)

Add subscription check at the start of your route handler:

```javascript
import { subscriptionService } from '@/lib/subscription-service';
import { auth } from '@/lib/auth';

export async function GET(request) {
    // 1. Check authentication
    const session = await auth();
    if (!session?.user?.email) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check subscription
    const hasSubscription = await subscriptionService.isSubscriptionActive(session.user.email);
    if (!hasSubscription) {
        return Response.json({
            error: 'subscription_required',
            message: 'An active subscription is required.',
            upgradeUrl: '/pricing'
        }, { status: 403 });
    }

    // 3. Your route logic here
    // ...
}
```

### 2. Feature-Gated API Routes

For features with usage limits:

```javascript
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service';
import { auth } from '@/lib/auth';

export async function POST(request) {
    const session = await auth();
    if (!session?.user?.email) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can use feature
    const canUse = await subscriptionService.canUseFeature(
        session.user.email, 
        FEATURE_TYPES.DRAFT_REPLY
    );
    
    if (!canUse) {
        const usage = await subscriptionService.getFeatureUsage(
            session.user.email, 
            FEATURE_TYPES.DRAFT_REPLY
        );
        return Response.json({
            error: 'limit_reached',
            message: `Credits exhausted for ${usage.period === 'daily' ? 'the day' : 'the month'}.`,
            usage: usage.usage,
            limit: usage.limit,
            period: usage.period,
            planType: usage.planType,
            upgradeUrl: '/pricing'
        }, { status: 403 });
    }

    // Your feature logic here
    // ...

    // Increment usage AFTER successful execution
    await subscriptionService.incrementFeatureUsage(
        session.user.email,
        FEATURE_TYPES.DRAFT_REPLY
    );

    return Response.json({ success: true });
}
```

### 3. Pages (Server Components)

Use the subscription protection helper:

```javascript
import { requireSubscription } from '@/lib/subscription-protection';

export default async function DashboardPage() {
    const { session, subscription } = await requireSubscription();
    
    // User is guaranteed to have active subscription here
    return (
        <div>
            <h1>Welcome {session.user.name}</h1>
            <p>Plan: {subscription.plan_type}</p>
        </div>
    );
}
```

### 4. Conditional Rendering

Check subscription without redirecting:

```javascript
import { checkSubscriptionStatus } from '@/lib/subscription-protection';

export default async function HomePage() {
    const { hasSubscription, planType } = await checkSubscriptionStatus();
    
    return (
        <div>
            {hasSubscription ? (
                <PremiumFeatures planType={planType} />
            ) : (
                <UpgradePrompt />
            )}
        </div>
    );
}
```

---

## Testing

### Test Non-Subscriber Access

1. Create test user without subscription
2. Try accessing protected routes:

```bash
# Should return 403
curl -H "Cookie: session=..." http://localhost:3000/api/gmail/emails

# Expected response:
{
  "error": "subscription_required",
  "message": "An active subscription is required to access your emails.",
  "upgradeUrl": "/pricing"
}
```

### Test Subscriber Access

1. Activate subscription for test user:

```javascript
// Use admin script or API
await subscriptionService.activateSubscription(
    'test@example.com',
    'starter', // or 'pro'
    'whop_membership_id'
);
```

2. Verify access works:

```bash
curl -H "Cookie: session=..." http://localhost:3000/api/gmail/emails
# Should return emails
```

### Test Feature Limits

```javascript
// Test hitting limit
for (let i = 0; i < 6; i++) {
    const response = await fetch('/api/home-feed/insights');
    console.log(i === 5 ? 'Should be 403' : 'Should be 200', response.status);
}
```

---

## Debugging

### Check User's Subscription Status

```javascript
// In API route or page
const subscription = await subscriptionService.getUserSubscription(userEmail);
console.log('Subscription:', {
    planType: subscription?.plan_type,
    status: subscription?.status,
    endsAt: subscription?.subscription_ends_at,
    isActive: await subscriptionService.isSubscriptionActive(userEmail)
});
```

### Check Feature Usage

```javascript
const usage = await subscriptionService.getFeatureUsage(
    userEmail,
    FEATURE_TYPES.DRAFT_REPLY
);
console.log('Usage:', {
    used: usage.usage,
    limit: usage.limit,
    remaining: usage.remaining,
    hasAccess: usage.hasAccess,
    period: usage.period
});
```

### Enable Debug Logging

All subscription checks log to console:
```
🔒 Checking subscription status for: user@example.com
✅ Active subscription verified
```

Or if no subscription:
```
🔒 Checking subscription status for: user@example.com
❌ No active subscription, denying access
```

---

## Common Mistakes

### ❌ Don't Do This

```javascript
// Checking subscription in middleware (Edge runtime)
export async function middleware(request) {
    // ❌ This will fail - crypto not available in Edge
    const hasSubscription = await subscriptionService.isSubscriptionActive(email);
}
```

### ✅ Do This Instead

```javascript
// Check in API route (Node runtime)
export async function GET(request) {
    // ✅ This works - Node runtime
    const hasSubscription = await subscriptionService.isSubscriptionActive(email);
}
```

### ❌ Don't Increment Before Checking

```javascript
// ❌ Wrong order
await subscriptionService.incrementFeatureUsage(userId, featureType);
const canUse = await subscriptionService.canUseFeature(userId, featureType);
```

### ✅ Check Then Increment

```javascript
// ✅ Correct order
const canUse = await subscriptionService.canUseFeature(userId, featureType);
if (!canUse) return error;

// Do work...

await subscriptionService.incrementFeatureUsage(userId, featureType);
```

---

## Frontend Integration

### Show Upgrade Prompt

```javascript
try {
    const response = await fetch('/api/gmail/emails');
    const data = await response.json();
    
    if (response.status === 403 && data.error === 'subscription_required') {
        // Show upgrade prompt
        toast.error(data.message);
        router.push(data.upgradeUrl);
    }
} catch (error) {
    console.error(error);
}
```

### Display Usage Limits

```javascript
const response = await fetch('/api/subscription/usage');
const { features } = await response.json();

// features.draft_reply = { usage: 5, limit: 30, remaining: 25 }
```

---

## Security Notes

### Why This Matters

Without subscription protection:
1. **Revenue Loss** - Users access premium features without paying
2. **Quota Abuse** - Free users exhaust your Gmail API quota
3. **Service Quality** - Paying users impacted by quota limits
4. **Security Risk** - Unauthenticated access to sensitive data

### What's Protected

✅ **Email Access** - Gmail API routes require subscription  
✅ **AI Features** - Limited usage based on plan tier  
✅ **Calendar Features** - Subscription required  
✅ **Voice Cloning** - Premium feature protection  

### What's NOT Protected (Intentionally)

- Authentication routes (`/api/auth/*`)
- Public pages (landing page, pricing)
- Subscription management (`/api/subscription/*`)
- Onboarding flow

---

## Migration Notes

### Existing Users

After deploying subscription protection:
1. All existing users maintained their access
2. No breaking changes for current subscribers
3. Free users prompted to upgrade when accessing protected features

### Rollback Plan

If issues occur:
1. Comment out subscription checks in affected routes
2. Deploy rollback
3. Debug offline
4. Redeploy with fix

---

## Monitoring

### Metrics to Track

1. **403 Responses** - Count of subscription_required errors
2. **Conversion Rate** - % of users who upgrade after hitting paywall
3. **Feature Usage by Plan** - Ensure limits are working
4. **Gmail API Quota** - Should decrease after protection

### Alerts to Set

- Spike in 403 errors (possible bug)
- Paying users getting 403s (critical bug)
- Usage not incrementing (tracking failure)

---

**Last Updated:** 2026-01-11  
**Version:** 1.0  
**Author:** Security Audit Implementation
