import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { subscriptionService, PLANS } from '@/lib/subscription-service';

/**
 * POST - Verify user's subscription directly via provider API (fallback)
 * 
 * This is a fallback for when webhooks fail to process.
 * 
 * Usage: POST /api/subscription/verify
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized - Please sign in first' }, { status: 401 });
        }

        const userId = session.user.email;
        console.log(`🔍 Verifying Polar subscription for user: ${userId}`);

        // Check for Polar API key
        const polarApiKey = process.env.POLAR_ACCESS_TOKEN || process.env.POLAR_API_KEY;

        if (!polarApiKey) {
            console.error('❌ POLAR_ACCESS_TOKEN not configured - cannot verify subscription directly');
            return NextResponse.json({
                error: 'Polar API not configured. Please contact support to manually verify your payment.',
                needsSupport: true
            }, { status: 503 });
        }

        // Call Polar API to get user's subscriptions
        // Polar API: GET /api/v1/subscriptions with customer email filter
        const polarResponse = await fetch(`https://api.polar.sh/v1/subscriptions?customer_email=${encodeURIComponent(userId)}&active=true`, {
            headers: {
                'Authorization': `Bearer ${polarApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!polarResponse.ok) {
            const errorText = await polarResponse.text();
            console.error('❌ Polar API error:', polarResponse.status, errorText);

            // Try alternative endpoint - check orders
            const ordersResponse = await fetch(`https://api.polar.sh/v1/orders?customer_email=${encodeURIComponent(userId)}`, {
                headers: {
                    'Authorization': `Bearer ${polarApiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!ordersResponse.ok) {
                return NextResponse.json({
                    error: 'Unable to verify with Polar. Please contact support.',
                    status: polarResponse.status
                }, { status: 500 });
            }

            const ordersData = await ordersResponse.json();
            console.log('📦 Polar orders for user:', JSON.stringify(ordersData, null, 2));

            // Process orders if found
            const validOrders = (ordersData.items || ordersData.data || []).filter(o =>
                o.status === 'completed' || o.status === 'paid'
            );

            if (validOrders.length > 0) {
                const order = validOrders[0];
                return await activateFromPolarData(userId, order, 'order');
            }

            return NextResponse.json({
                error: 'No valid subscription found in Polar. Please ensure your payment was completed.',
                suggestion: 'If you just paid, please wait a moment and try again.'
            }, { status: 404 });
        }

        const polarData = await polarResponse.json();
        console.log(`📦 [VERIFY] Polar subs found for ${userId}:`, (polarData.items || polarData.data || []).length);

        // Find valid subscriptions
        const validSubscriptions = (polarData.items || polarData.data || []).filter(s =>
            s.status === 'active' || s.status === 'trialing'
        );

        if (validSubscriptions.length === 0) {
            console.log(`❌ [VERIFY] No active Polar subscriptions for: ${userId}. All items:`, JSON.stringify(polarData.items || polarData.data || [], null, 2));
            return NextResponse.json({
                error: 'No valid subscription found. Please ensure your payment on Polar was successful.',
                suggestion: 'If you just paid, please wait 30 seconds and try again.'
            }, { status: 404 });
        }

        // Get the most recent valid subscription
        const subscription = validSubscriptions[0];
        console.log(`🎯 [VERIFY] Selecting subscription: ${subscription.id} (${subscription.status})`);
        return await activateFromPolarData(userId, subscription, 'subscription');

    } catch (error) {
        console.error('Error in Polar verification:', error);
        return NextResponse.json({
            error: 'Failed to verify subscription. Please contact support.',
            details: error.message
        }, { status: 500 });
    }
}

async function activateFromPolarData(userId, data, source) {
    console.log(`✅ Found valid Polar ${source}:`, data.id);

    // Detect plan type from product/price
    const planType = subscriptionService.determinePlanType(data);

    // Create dates for subscription
    const polarDates = {
        createdAt: data.created_at ? new Date(data.created_at).getTime() / 1000 : Date.now() / 1000,
        validUntil: data.current_period_end ? new Date(data.current_period_end).getTime() / 1000 : null,
        expiresAt: data.cancel_at ? new Date(data.cancel_at).getTime() / 1000 : null
    };

    console.log(`🎯 Activating ${planType} plan for ${userId} based on Polar verification`);

    // Activate the subscription
    const subscription = await subscriptionService.activateSubscription(
        userId,
        planType,
        data.id,
        polarDates
    );

    console.log(`✅ Subscription activated via Polar verification for ${userId}`);

    return NextResponse.json({
        success: true,
        message: `${PLANS[planType].name} plan activated successfully!`,
        subscription: {
            planType,
            planName: PLANS[planType].name,
            polarSubscriptionId: data.id,
            subscriptionStartedAt: subscription.subscription_started_at,
            subscriptionEndsAt: subscription.subscription_ends_at
        }
    });
}

/**
 * GET - Check if user has a Polar subscription
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
            canVerifyPolar: !!(process.env.POLAR_ACCESS_TOKEN || process.env.POLAR_API_KEY)
        });
    } catch (error) {
        console.error('Error checking Polar status:', error);
        return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
    }
}
