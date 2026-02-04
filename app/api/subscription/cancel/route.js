import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { subscriptionService } from '@/lib/subscription-service';

/**
 * POST - Cancel user's subscription
 * This will mark the subscription as cancelled but allow access until the end of billing period
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;

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

        // Cancel the subscription (this just marks it as cancelled, access continues until period ends)
        const cancelledSubscription = await subscriptionService.cancelSubscription(userId);

        if (!cancelledSubscription) {
            return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Subscription cancelled successfully. You will continue to have access until the end of your current billing period.',
            subscription: {
                status: cancelledSubscription.status,
                subscriptionEndsAt: cancelledSubscription.subscription_ends_at,
                daysRemaining: subscriptionService.getDaysRemaining(cancelledSubscription.subscription_ends_at)
            }
        });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
    }
}
