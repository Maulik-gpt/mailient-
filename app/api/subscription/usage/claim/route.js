import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service.js';
import { DatabaseService } from '@/lib/supabase.js';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { rewardId } = body;

        if (!rewardId) {
            return NextResponse.json({ error: 'Reward ID is required' }, { status: 400 });
        }

        const userId = session.user.email.toLowerCase();
        const db = new DatabaseService();

        // Check if reward was already claimed
        const profile = await db.getUserProfile(userId);
        const preferences = profile?.preferences || {};
        const claimedRewards = preferences.claimed_rewards || [];

        if (claimedRewards.includes(rewardId)) {
            return NextResponse.json({ error: 'Reward already claimed' }, { status: 400 });
        }

        // Define reward amounts
        const REWARDS = {
            'referral_bonus_25': { amount: 25, feature: FEATURE_TYPES.ARCUS_AI },
            'welcome_bonus_10': { amount: 10, feature: FEATURE_TYPES.ARCUS_AI },
        };

        const rewardConfig = REWARDS[rewardId];
        if (!rewardConfig) {
            return NextResponse.json({ error: 'Invalid reward ID' }, { status: 400 });
        }

        // Apply reward: decrement usage count (credit injection)
        const result = await subscriptionService.decrementFeatureUsage(
            userId, 
            rewardConfig.feature, 
            rewardConfig.amount
        );

        if (!result.success) {
            return NextResponse.json({ error: 'Failed to apply reward' }, { status: 500 });
        }

        // Record the claim in profile preferences
        preferences.claimed_rewards = [...claimedRewards, rewardId];
        await db.supabase
            .from('user_profiles')
            .update({ preferences, updated_at: new Date().toISOString() })
            .ilike('user_id', userId);

        return NextResponse.json({ 
            success: true, 
            message: `Successfully claimed ${rewardConfig.amount} credits`,
            newTotalRemaining: await subscriptionService.getFeatureUsage(userId, rewardConfig.feature).then(u => u.remaining)
        });

    } catch (error) {
        console.error('Error claiming reward:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
