import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { subscriptionService, PLANS } from '@/lib/subscription-service';

/**
 * POST - Manually activate a subscription for the current user
 * This is a helper endpoint for users who paid via Whop but didn't get their subscription activated
 * 
 * Usage: POST /api/subscription/activate with { planType: 'pro' } or { planType: 'starter' }
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized - Please sign in first' }, { status: 401 });
        }

        // SECURITY: Manual subscription activation is disabled by default.
        // Subscriptions must be activated via verified Whop webhook only.
        // If you need a break-glass admin flow, set SUBSCRIPTION_ACTIVATION_ADMIN_SECRET
        // and pass it as x-admin-secret.
        const adminSecret = (process.env.SUBSCRIPTION_ACTIVATION_ADMIN_SECRET || '').trim();
        const providedSecret = (request.headers.get('x-admin-secret') || '').trim();
        if (!adminSecret || providedSecret !== adminSecret) {
            return NextResponse.json({
                error: 'Manual activation is disabled. Subscriptions are activated via Whop webhook after verified payment.'
            }, { status: 403 });
        }

        const body = await request.json();
        const { planType } = body;

        if (!planType || !['starter', 'pro'].includes(planType)) {
            return NextResponse.json({
                error: 'Invalid plan type. Use "starter" or "pro"'
            }, { status: 400 });
        }

        const userId = session.user.email;
        console.log(`🔧 Manual subscription activation for ${userId}: ${planType}`);

        // Check if user already has this plan active
        const currentPlan = await subscriptionService.getUserPlanType(userId);
        if (currentPlan === planType) {
            return NextResponse.json({
                success: true,
                message: `You already have an active ${PLANS[planType].name} subscription!`,
                subscription: {
                    planType: currentPlan,
                    alreadyActive: true
                }
            });
        }

        // Activate the subscription
        const subscription = await subscriptionService.activateSubscription(
            userId,
            planType,
            null // No Whop membership ID for manual activation
        );

        console.log(`✅ Manual activation complete for ${userId}: ${planType}`);

        return NextResponse.json({
            success: true,
            message: `${PLANS[planType].name} plan activated successfully! Enjoy unlimited access.`,
            subscription: {
                planType,
                planName: PLANS[planType].name,
                planPrice: PLANS[planType].price,
                subscriptionStartedAt: subscription.subscription_started_at,
                subscriptionEndsAt: subscription.subscription_ends_at
            }
        });
    } catch (error) {
        console.error('Error in manual subscription activation:', error);
        return NextResponse.json({
            error: 'Failed to activate subscription. Please contact support.',
            details: error.message
        }, { status: 500 });
    }
}

/**
 * GET - Check current subscription status
 */
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;
        const subscription = await subscriptionService.getUserSubscription(userId);
        const planType = await subscriptionService.getUserPlanType(userId);
        const isActive = await subscriptionService.isSubscriptionActive(userId);

        return NextResponse.json({
            success: true,
            userId,
            hasActiveSubscription: isActive,
            planType,
            subscription
        });
    } catch (error) {
        console.error('Error getting subscription:', error);
        return NextResponse.json({ error: 'Failed to get subscription' }, { status: 500 });
    }
}
