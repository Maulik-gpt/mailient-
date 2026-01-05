import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service';

/**
 * POST - Check if user can use a feature and optionally increment usage
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { featureType, increment = false } = body;

        if (!featureType || !Object.values(FEATURE_TYPES).includes(featureType)) {
            return NextResponse.json({ error: 'Invalid feature type' }, { status: 400 });
        }

        const userId = session.user.email;

        // Get current usage
        const usage = await subscriptionService.getFeatureUsage(userId, featureType);

        // If user wants to use the feature, increment the count
        if (increment) {
            if (!usage.hasAccess && !usage.isUnlimited) {
                return NextResponse.json({
                    success: false,
                    error: 'limit_reached',
                    message: `Sorry, but you've exhausted all the credits of ${usage.period === 'daily' ? 'the day' : 'the month'}.`,
                    usage: usage.usage,
                    limit: usage.limit,
                    remaining: 0,
                    period: usage.period,
                    planType: usage.planType,
                    upgradeUrl: '/pricing'
                }, { status: 403 });
            }

            const incrementResult = await subscriptionService.incrementFeatureUsage(userId, featureType);

            if (!incrementResult.success) {
                return NextResponse.json({
                    success: false,
                    error: incrementResult.error,
                    message: `Sorry, but you've exhausted all the credits of ${usage.period === 'daily' ? 'the day' : 'the month'}.`,
                    period: usage.period,
                    planType: usage.planType,
                    upgradeUrl: '/pricing'
                }, { status: 403 });
            }

            return NextResponse.json({
                success: true,
                usage: incrementResult.newUsage || usage.usage + 1,
                limit: usage.limit,
                remaining: incrementResult.remaining ?? (usage.remaining - 1),
                isUnlimited: usage.isUnlimited || false,
                period: usage.period,
                planType: usage.planType
            });
        }

        // Just return current usage without incrementing
        return NextResponse.json({
            success: true,
            canUse: usage.hasAccess || usage.isUnlimited,
            usage: usage.usage,
            limit: usage.limit,
            remaining: usage.remaining,
            period: usage.period,
            isUnlimited: usage.isUnlimited || false,
            planType: usage.planType
        });
    } catch (error) {
        console.error('Error checking feature usage:', error);
        return NextResponse.json({ error: 'Failed to check feature usage' }, { status: 500 });
    }
}

/**
 * GET - Get usage for all features
 */
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;
        const allUsage = await subscriptionService.getAllFeatureUsage(userId);

        return NextResponse.json({
            success: true,
            ...allUsage
        });
    } catch (error) {
        console.error('Error getting all feature usage:', error);
        return NextResponse.json({ error: 'Failed to get feature usage' }, { status: 500 });
    }
}
