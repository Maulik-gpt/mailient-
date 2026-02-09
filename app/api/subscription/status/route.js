import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { subscriptionService, PLANS } from '@/lib/subscription-service';
import { DatabaseService } from '@/lib/supabase';

/**
 * GET - Get current user's subscription status
 */
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;

        // Get subscription details
        const subscription = await subscriptionService.getUserSubscription(userId);
        const isActive = await subscriptionService.isSubscriptionActive(userId);
        const planType = await subscriptionService.getUserPlanType(userId);
        const allUsage = await subscriptionService.getAllFeatureUsage(userId);
        const isEndingSoon = await subscriptionService.isSubscriptionEndingSoon(userId);

        // Enhanced logging for debugging
        console.log('🔍 Subscription Status Debug:', {
            userId,
            subscription,
            isActive,
            planType,
            subscriptionEndsAt: subscription?.subscription_ends_at,
            subscriptionStatus: subscription?.status
        });

        // Get plan details with enhanced error checking
        let plan = null;
        let planName = 'No Plan';

        if (planType && planType !== 'none') {
            plan = PLANS[planType];
            if (plan) {
                planName = plan.name;
            } else {
                console.error('❌ Plan type found but not in PLANS config:', planType);
                console.error('❌ Available plan types:', Object.keys(PLANS));
                planName = `Unknown Plan (${planType})`;
            }
        } else {
            console.log('ℹ️ No valid plan type found:', { planType, subscription });
        }

        return NextResponse.json({
            success: true,
            subscription: {
                hasActiveSubscription: isActive,
                planType,
                planName: planName,
                planPrice: plan?.price || 0,
                subscriptionStartedAt: subscription?.subscription_started_at || null,
                subscriptionEndsAt: subscription?.subscription_ends_at || null,
                daysRemaining: allUsage.daysRemaining || 0,
                status: subscription?.status || 'inactive',
                isEndingSoon
            },
            features: allUsage.features || {},
            upgradeToPro: planType === 'starter' ? PLANS.pro.checkoutUrl : null,
            debugInfo: {
                rawPlanType: planType,
                hasPlanObject: !!plan,
                availablePlans: Object.keys(PLANS)
            }
        });
    } catch (error) {
        console.error('Error getting subscription status:', error);
        return NextResponse.json({ error: 'Failed to get subscription status' }, { status: 500 });
    }
}

/**
 * POST - DISABLED: Client-side subscription activation is no longer allowed
 * 
 * SECURITY FIX: This endpoint was exploitable - anyone could activate any plan
 * by simply calling this endpoint. Subscriptions are now ONLY activated via 
 * the Polar webhook (/api/subscription/webhook) after verified payment.
 * 
 * If you need to manually activate a subscription for a user, use the
 * /api/subscription/activate endpoint which requires admin verification.
 */
export async function POST(request) {
    console.warn('⚠️ SECURITY: Blocked client-side subscription activation attempt');

    return NextResponse.json({
        error: 'Client-side subscription activation is disabled for security reasons. Subscriptions are activated automatically via Polar webhook after payment verification.',
        help: 'If you just completed a payment, please wait a moment for the webhook to process. If the issue persists, contact support.'
    }, { status: 403 });
}
