import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { subscriptionService } from '@/lib/subscription-service';
import { Whop } from '@whop/sdk';

/**
 * POST - Cancel user's subscription
 * Integrates with Whop API for proper cancellation and collects feedback
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

        // Initialize Whop client
        const whopClient = new Whop({ 
            apiKey: process.env.WHOP_API_KEY 
        });

        let whopCancellationResult = null;
        let cancellationError = null;

        // Try to cancel with Whop first if we have the membership ID
        if (subscription.whop_membership_id) {
            try {
                console.log('🔄 Cancelling Whop membership:', subscription.whop_membership_id);
                
                // Map our reasons to Whop's cancel_option format
                const cancelOption = reasons.length > 0 ? reasons[0] : 'other';
                
                whopCancellationResult = await whopClient.memberships.cancel(
                    subscription.whop_membership_id,
                    {
                        // Cancel at period end to maintain access until billing period ends
                        cancel_at_period_end: true,
                        // Include cancellation reason if provided
                        cancel_option: cancelOption,
                        // Include additional feedback
                        cancellation_reason: feedback || 'User cancelled via Mailient settings'
                    }
                );
                
                console.log('✅ Whop membership cancelled successfully:', whopCancellationResult.id);
            } catch (whopError) {
                console.error('❌ Error cancelling Whop membership:', whopError);
                cancellationError = whopError.message || 'Failed to cancel with Whop';
                
                // Continue with local cancellation even if Whop fails
                // This ensures users can still cancel even if there are API issues
            }
        }

        // Always update local subscription status
        const cancelledSubscription = await subscriptionService.cancelSubscription(userId);

        if (!cancelledSubscription) {
            return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
        }

        // Log cancellation feedback for analytics
        console.log('📊 Cancellation feedback:', {
            userId,
            reasons,
            feedback: feedback.substring(0, 200), // Limit feedback length for logging
            whopSuccess: !!whopCancellationResult,
            whopError: cancellationError
        });

        return NextResponse.json({
            success: true,
            message: whopCancellationResult 
                ? 'Subscription cancelled successfully through Whop. You will continue to have access until the end of your current billing period.'
                : 'Subscription cancelled successfully. You will continue to have access until the end of your current billing period.',
            subscription: {
                status: cancelledSubscription.status,
                subscriptionEndsAt: cancelledSubscription.subscription_ends_at,
                daysRemaining: subscriptionService.getDaysRemaining(cancelledSubscription.subscription_ends_at)
            },
            whopIntegration: {
                success: !!whopCancellationResult,
                error: cancellationError,
                membershipId: subscription.whop_membership_id
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
