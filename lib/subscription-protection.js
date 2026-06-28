/**
 * Subscription Protection Helper
 * Use this at the page level to enforce subscription requirements
 * 
 * Edge Middleware limitation: Can't use Node crypto (needed by subscription-service)
 * Solution: Page-level checks with this helper
 */

import { auth } from '@/lib/auth';
import { subscriptionService } from '@/lib/subscription-service';
import { redirect } from 'next/navigation';

/**
 * Check if user has active subscription, redirect to pricing if not
 * @param {boolean} apiMode - If true, returns JSON error instead of redirecting
 * @returns {Promise<{session: Object, subscription: Object}>}
 */
export async function requireSubscription(apiMode = false) {
    const session = await auth();

    if (!session?.user?.email) {
        if (apiMode) {
            return {
                error: 'Unauthorized',
                status: 401,
                data: null
            };
        }
        redirect('/auth/signin');
    }

    const hasSubscription = await subscriptionService.isSubscriptionActive(session.user.email);

    if (!hasSubscription) {
        if (apiMode) {
            return {
                error: 'subscription_required',
                message: 'An active subscription is required to access this feature.',
                upgradeUrl: '/pricing',
                status: 403,
                data: null
            };
        }
        redirect('/pricing?reason=subscription_required');
    }

    const subscription = await subscriptionService.getUserSubscription(session.user.email);

    return {
        session,
        subscription,
        error: null
    };
}

/**
 * Check subscription status without redirecting (for conditional rendering)
 * @returns {Promise<{hasSubscription: boolean, planType: string, session: Object}>}
 */
export async function checkSubscriptionStatus() {
    const session = await auth();

    if (!session?.user?.email) {
        return {
            hasSubscription: false,
            planType: 'none',
            session: null
        };
    }

    const hasSubscription = await subscriptionService.isSubscriptionActive(session.user.email);
    const planType = await subscriptionService.getUserPlanType(session.user.email);

    return {
        hasSubscription,
        planType,
        session
    };
}

/**
 * Get user's feature usage for display
 * @param {string} featureType - FEATURE_TYPES constant
 * @returns {Promise<Object>}
 */
export async function getFeatureUsageInfo(featureType) {
    const session = await auth();

    if (!session?.user?.email) {
        return {
            usage: 0,
            limit: 0,
            remaining: 0,
            hasAccess: false
        };
    }

    return await subscriptionService.getFeatureUsage(session.user.email, featureType);
}

/**
 * Middleware for API routes to check subscription
 * Use at the start of API route handlers
 */
export async function apiRequireSubscription(request) {
    return await requireSubscription(true);
}

/**
 * STRICT paid-only API gate, keyed by email (so a route that already resolved its
 * session doesn't pay for a second auth() round-trip). Matches the cron's paidMap
 * logic exactly: access requires a real paid/trial plan — getUserPlanType ∉
 * {free, none}. Owners pass automatically (getUserPlanType returns 'pro' for
 * OWNER_EMAILS). Returns { ok, status, ... }; on failure use the status verbatim.
 *
 * Usage in a route that already has the user's email:
 *   const gate = await assertPaidAccess(userId);
 *   if (!gate.ok) return Response.json({ error: gate.error, upgradeUrl: gate.upgradeUrl }, { status: gate.status });
 */
export async function assertPaidAccess(email) {
    if (!email) {
        return { ok: false, status: 401, error: 'Unauthorized' };
    }
    try {
        const planType = await subscriptionService.getUserPlanType(email);
        if (!!planType && planType !== 'free' && planType !== 'none') {
            return { ok: true, status: 200, planType };
        }
        // getUserPlanType said free — DOUBLE-CHECK the live "active subscription"
        // signal before blocking. isSubscriptionActive accepts an active/trialing/
        // cancelled record (and free-Pro grants) regardless of how plan_type maps,
        // so a paid user whose plan_type the mapper doesn't recognize — or whose
        // record just landed from the payment webhook — is NOT locked out while
        // Settings shows "Pro · active". This is exactly the divergence users hit.
        const active = await subscriptionService.isSubscriptionActive(email);
        if (active) {
            return { ok: true, status: 200, planType: planType && planType !== 'free' ? planType : 'pro' };
        }
        return {
            ok: false,
            status: 402,
            error: 'subscription_required',
            message: 'An active paid or trial subscription is required to use Arcus.',
            upgradeUrl: '/pricing',
            planType,
        };
    } catch (e) {
        // NEVER hard-block on an infra/DB error — a transient read failure must not
        // lock out a paying user (the page-level paywall is the primary gate; this
        // is only a data-endpoint backstop). Fail OPEN and log it.
        console.error('[assertPaidAccess] check failed — failing open:', e?.message);
        return { ok: true, status: 200, planType: 'unknown', degraded: true };
    }
}
