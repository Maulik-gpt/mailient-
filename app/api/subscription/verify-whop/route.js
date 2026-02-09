import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { subscriptionService, PLANS } from '@/lib/subscription-service';

/**
 * POST - Verify user's Whop membership directly via Whop API and activate subscription
 * 
 * This is a fallback for when webhooks fail to process.
 * It calls Whop's API to verify the user actually paid, then activates the subscription.
 * 
 * Usage: POST /api/subscription/verify-whop
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized - Please sign in first' }, { status: 401 });
        }

        const userId = session.user.email;
        console.log(`🔍 Verifying Whop membership for user: ${userId}`);

        // Check for Whop API key
        const whopApiKey = process.env.WHOP_API_KEY || process.env.WHOP_BEARER_TOKEN;

        if (!whopApiKey) {
            console.error('❌ WHOP_API_KEY not configured - cannot verify membership directly');
            return NextResponse.json({
                error: 'Whop API not configured. Please contact support to manually verify your payment.',
                needsSupport: true
            }, { status: 503 });
        }

        // Call Whop API to get user's memberships
        const whopResponse = await fetch(`https://api.whop.com/api/v2/memberships?email=${encodeURIComponent(userId)}`, {
            headers: {
                'Authorization': `Bearer ${whopApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!whopResponse.ok) {
            const errorText = await whopResponse.text();
            console.error('❌ Whop API error:', whopResponse.status, errorText);
            return NextResponse.json({
                error: 'Unable to verify with Whop. Please contact support.',
                status: whopResponse.status
            }, { status: 500 });
        }

        const whopData = await whopResponse.json();
        console.log('📦 Whop memberships for user:', JSON.stringify(whopData, null, 2));

        // Find valid memberships
        const validMemberships = (whopData.data || []).filter(m =>
            m.valid === true || m.status === 'active' || m.status === 'completed'
        );

        if (validMemberships.length === 0) {
            console.log('❌ No valid Whop memberships found for:', userId);
            return NextResponse.json({
                error: 'No valid subscription found in Whop. Please ensure your payment was completed.',
                found: whopData.data?.length || 0,
                suggestion: 'If you just paid, please wait a moment and try again.'
            }, { status: 404 });
        }

        // Get the most recent valid membership
        const membership = validMemberships[0];
        console.log('✅ Found valid Whop membership:', membership.id);

        // Detect plan type from product ID
        let planType = null;
        const productId = membership.product?.id || membership.product_id;

        if (productId === PLANS.starter.whopProductId) {
            planType = 'starter';
        } else if (productId === PLANS.pro.whopProductId) {
            planType = 'pro';
        } else {
            // Default to starter if can't determine
            console.warn('⚠️ Unknown product ID, defaulting to starter:', productId);
            planType = 'starter';
        }

        // Create whopDates object for proper subscription timing
        const whopDates = {
            createdAt: membership.created_at,
            validUntil: membership.valid_until || membership.renewal_period_end,
            expiresAt: membership.expires_at
        };

        console.log(`🎯 Activating ${planType} plan for ${userId} based on Whop verification`);

        // Activate the subscription
        const subscription = await subscriptionService.activateSubscription(
            userId,
            planType,
            membership.id,
            whopDates
        );

        console.log(`✅ Subscription activated via Whop verification for ${userId}`);

        return NextResponse.json({
            success: true,
            message: `${PLANS[planType].name} plan activated successfully!`,
            subscription: {
                planType,
                planName: PLANS[planType].name,
                whopMembershipId: membership.id,
                subscriptionStartedAt: subscription.subscription_started_at,
                subscriptionEndsAt: subscription.subscription_ends_at
            }
        });

    } catch (error) {
        console.error('Error in Whop verification:', error);
        return NextResponse.json({
            error: 'Failed to verify subscription. Please contact support.',
            details: error.message
        }, { status: 500 });
    }
}

/**
 * GET - Check if user has a Whop membership
 */
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;

        // Check current subscription status in our database
        const subscription = await subscriptionService.getUserSubscription(userId);
        const isActive = await subscriptionService.isSubscriptionActive(userId);
        const planType = await subscriptionService.getUserPlanType(userId);

        return NextResponse.json({
            success: true,
            userId,
            databaseStatus: {
                hasSubscription: !!subscription,
                isActive,
                planType,
                status: subscription?.status || 'none',
                endsAt: subscription?.subscription_ends_at || null
            },
            canVerifyWhop: !!(process.env.WHOP_API_KEY || process.env.WHOP_BEARER_TOKEN)
        });
    } catch (error) {
        console.error('Error checking Whop status:', error);
        return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
    }
}
