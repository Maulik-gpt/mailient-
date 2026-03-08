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
