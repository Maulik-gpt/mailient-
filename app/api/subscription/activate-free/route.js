import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { subscriptionService } from '@/lib/subscription-service';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;
        
        // Activate free plan (clears expired status and resets usage)
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
    } catch (error) {
        console.error('Error activating free plan:', error);
        return NextResponse.json({ error: 'Failed to activate free plan' }, { status: 500 });
    }
}
