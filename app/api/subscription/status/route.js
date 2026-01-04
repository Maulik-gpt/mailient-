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

        // Get plan details
        const plan = planType !== 'none' ? PLANS[planType] : null;

        return NextResponse.json({
            success: true,
            subscription: {
                hasActiveSubscription: isActive,
                planType,
                planName: plan?.name || 'No Plan',
                planPrice: plan?.price || 0,
                subscriptionStartedAt: subscription?.subscription_started_at || null,
                subscriptionEndsAt: subscription?.subscription_ends_at || null,
                daysRemaining: allUsage.daysRemaining || 0,
                status: subscription?.status || 'inactive',
                isEndingSoon
            },
            features: allUsage.features || {},
            upgradeToPro: planType === 'starter' ? PLANS.pro.whopCheckoutUrl : null
        });
    } catch (error) {
        console.error('Error getting subscription status:', error);
        return NextResponse.json({ error: 'Failed to get subscription status' }, { status: 500 });
    }
}

/**
 * POST - Activate subscription (called after successful Whop payment)
 * This can be called from the frontend after redirect from Whop
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { planType, whopMembershipId } = body;

        if (!planType || !['starter', 'pro'].includes(planType)) {
            return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 });
        }

        const userId = session.user.email.toLowerCase();
        console.log(`📡 Activating subscription for: ${userId}`);

        // Activate the subscription
        const subscription = await subscriptionService.activateSubscription(
            userId,
            planType,
            whopMembershipId
        );

        // Fail-safe: Mark onboarding as completed in the profile when a subscription is activated
        try {
            const db = new DatabaseService();
            // Use ilike for update to handle MixedCase user_id values in existing data
            const { error: profileError } = await db.supabase
                .from('user_profiles')
                .update({ onboarding_completed: true })
                .ilike('user_id', userId);

            if (profileError) {
                console.error(`❌ Profile update failed during activation:`, profileError);
            } else {
                console.log(`✅ Onboarding auto-completed for ${userId} during activation`);
            }
        } catch (profileError) {
            console.error('Error updating profile during activation:', profileError);
        }

        return NextResponse.json({
            success: true,
            message: `${PLANS[planType].name} plan activated successfully!`,
            subscription: {
                planType,
                planName: PLANS[planType].name,
                planPrice: PLANS[planType].price,
                subscriptionStartedAt: subscription.subscription_started_at,
                subscriptionEndsAt: subscription.subscription_ends_at
            }
        });
    } catch (error) {
        console.error('Error activating subscription:', error);
        return NextResponse.json({ error: 'Failed to activate subscription' }, { status: 500 });
    }
}
