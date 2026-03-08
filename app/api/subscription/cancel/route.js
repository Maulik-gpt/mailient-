import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { subscriptionService } from '@/lib/subscription-service';

/**
 * POST - Cancel user's subscription
 * Integrates with Polar API for proper cancellation and collects feedback
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;
        const body = await request.json();
        const { reasons = [], feedback = "" } = body;

        // Check if user has an active subscription
        const isActive = await subscriptionService.isSubscriptionActive(userId);
        if (!isActive) {
            return NextResponse.json({ error: 'No active subscription to cancel' }, { status: 400 });
        }

        // Get current subscription details
        const subscription = await subscriptionService.getUserSubscription(userId);
        if (!subscription) {
            return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
        }

        // Initialize Polar API key
        const polarApiKey = process.env.POLAR_ACCESS_TOKEN || process.env.POLAR_API_KEY;

        let providerCancellationResult = null;
        let cancellationError = null;

        // Try to cancel with Polar first if we have the membership/subscription ID
        // Note: we store Polar subscription ID in whop_membership_id column for now
        const subscriptionId = subscription.whop_membership_id;

        if (subscriptionId && polarApiKey) {
            try {
                console.log('🔄 Cancelling Polar subscription:', subscriptionId);

                // Polar API: PATCH /v1/subscriptions/{id} with cancel_at_period_end: true
                const response = await fetch(`https://api.polar.sh/v1/subscriptions/${subscriptionId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${polarApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        cancel_at_period_end: true
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || errorData.error || `Polar API error (${response.status})`);
                }

                providerCancellationResult = await response.json();
                console.log('✅ Polar subscription set to cancel at period end:', subscriptionId);
            } catch (polarError) {
                console.error('❌ Error cancelling Polar subscription:', polarError);
                cancellationError = polarError.message || 'Failed to cancel with Polar';
            }
        } else if (!polarApiKey) {
            console.warn('⚠️ POLAR_ACCESS_TOKEN not set, skipping provider-side cancellation');
            cancellationError = 'Payment provider API not configured';
        }

        // Always update local subscription status
        const cancelledSubscription = await subscriptionService.cancelSubscription(userId);

        if (!cancelledSubscription) {
            return NextResponse.json({ error: 'Failed to cancel subscription locally' }, { status: 500 });
        }

        // Log cancellation feedback for analytics
        console.log('📊 Cancellation feedback:', {
            userId,
            reasons,
            feedback: feedback.substring(0, 200),
            providerSuccess: !!providerCancellationResult,
            providerError: cancellationError
        });

        return NextResponse.json({
            success: true,
            message: providerCancellationResult
                ? 'Subscription cancelled successfully with your payment provider. You will continue to have access until the end of your current billing period.'
                : 'Subscription cancelled locally. You will continue to have access until the end of your current billing period.',
            subscription: {
                status: cancelledSubscription.status,
                subscriptionEndsAt: cancelledSubscription.subscription_ends_at,
                daysRemaining: subscriptionService.getDaysRemaining(cancelledSubscription.subscription_ends_at)
            },
            providerIntegration: {
                success: !!providerCancellationResult,
                error: cancellationError,
                subscriptionId: subscriptionId
            }
        });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        return NextResponse.json({
            error: 'Failed to cancel subscription',
            details: error.message
        }, { status: 500 });
    }
}
