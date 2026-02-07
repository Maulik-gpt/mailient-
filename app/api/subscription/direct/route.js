import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * DIRECT DATABASE QUERY - Bypass all service layer issues
 * This endpoint directly queries the database for subscription info
 */
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email.toLowerCase();
        const supabase = getSupabaseAdmin();
        const now = new Date();

        // Direct database query - no service layer
        const { data: subscriptions, error } = await supabase
            .from('user_subscriptions')
            .select('*')
            .ilike('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Direct DB query error:', error);
            return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
        }

        const subscription = subscriptions?.[0] || null;

        // Determine subscription status directly
        let isActive = false;
        let planName = 'No Plan';
        let planType = 'none';
        let daysRemaining = 0;

        if (subscription) {
            const endDate = new Date(subscription.subscription_ends_at);
            const isExpired = endDate <= now;
            daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

            isActive = (subscription.status === 'active' || subscription.status === 'cancelled') && !isExpired;
            planType = subscription.plan_type || 'none';

            // Direct plan name mapping
            if (isActive && planType) {
                const normalizedPlanType = planType.toString().trim().toLowerCase();
                if (normalizedPlanType === 'pro' || normalizedPlanType === 'professional') {
                    planName = 'Pro';
                } else if (normalizedPlanType === 'starter' || normalizedPlanType === 'basic') {
                    planName = 'Starter';
                } else {
                    planName = `${normalizedPlanType} Plan`;
                }
            }
        }

        console.log('🎯 Direct DB Result:', {
            userId,
            subscription,
            isActive,
            planType,
            planName,
            daysRemaining
        });

        return NextResponse.json({
            success: true,
            subscription: {
                hasActiveSubscription: isActive,
                planType,
                planName,
                planPrice: planType === 'pro' ? 29.99 : planType === 'starter' ? 7.99 : 0,
                subscriptionStartedAt: subscription?.subscription_started_at || null,
                subscriptionEndsAt: subscription?.subscription_ends_at || null,
                daysRemaining,
                status: subscription?.status || 'inactive'
            },
            direct: true, // Flag to indicate this is direct DB data
            rawData: subscription // Include raw data for debugging
        });
    } catch (error) {
        console.error('Direct endpoint error:', error);
        return NextResponse.json({ error: 'Direct query failed' }, { status: 500 });
    }
}
