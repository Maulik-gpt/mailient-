import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { subscriptionService } from '@/lib/subscription-service';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email.toLowerCase();
        
        // Activate free plan (clears expired status and resets usage)
        try {
            const subscription = await subscriptionService.activateSubscription(
                userId,
                'free',
                'free_' + Date.now()
            );

            console.log(`✅ Free plan activated for ${userId}`);

            return NextResponse.json({
                success: true,
                message: 'Free plan activated successfully',
                subscription
            });
        } catch (serviceError) {
            console.error('SubscriptionService error during free activation:', serviceError);
            return NextResponse.json({ 
                error: serviceError.message || 'Failed to activate free plan',
                details: serviceError.code || 'unknown'
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Route error activating free plan:', error);
        return NextResponse.json({ error: error.message || 'Failed to activate free plan' }, { status: 500 });
    }
}
