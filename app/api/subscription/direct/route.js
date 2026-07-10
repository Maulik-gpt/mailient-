import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logEvent } from "@/lib/logsso";

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
            const hasEndDate = !!subscription.subscription_ends_at;
            const endDate = hasEndDate ? new Date(subscription.subscription_ends_at) : new Date('2099-12-31');
            const isExpired = hasEndDate && endDate <= now;
            daysRemaining = hasEndDate ? Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))) : 999;

            isActive = (subscription.status === 'active' || subscription.status === 'cancelled') && !isExpired;
            planType = subscription.plan_type || 'none';

            // Direct plan name mapping
            if (isActive && planType) {
                const normalizedPlanType = planType.toString().trim().toLowerCase();
                if (normalizedPlanType === 'pro' || normalizedPlanType === 'professional' || normalizedPlanType.includes('pro') || normalizedPlanType === 'starter' || normalizedPlanType === 'basic') {
                    planName = 'Monthly';
                    planType = 'pro';
                } else if (normalizedPlanType === 'annual' || normalizedPlanType === 'yearly') {
                    planName = 'Annual';
                    planType = 'annual';
                } else if (normalizedPlanType === 'lifetime' || normalizedPlanType === 'founder') {
                    planName = 'Lifetime Founder';
                    planType = 'lifetime';
                } else if (normalizedPlanType === 'free' || normalizedPlanType === 'none') {
                    planName = 'No Plan';
                    planType = 'free';
                } else {
                    planName = `${normalizedPlanType.charAt(0).toUpperCase() + normalizedPlanType.slice(1)}`;
                }
            } else if (!isActive) {
                planType = 'free';
                planName = 'No Plan';
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
                planPrice: planType === 'lifetime' ? 499 : planType === 'annual' ? 16.58 : planType === 'pro' ? 29 : 0,
                subscriptionStartedAt: subscription?.subscription_started_at || null,
                subscriptionEndsAt: subscription?.subscription_ends_at || null,
                daysRemaining,
                status: subscription?.status || 'inactive'
            },
            direct: true, // Flag to indicate this is direct DB data
            rawData: subscription // Include raw data for debugging
        });
    } catch (error) {
    logEvent({ channel: "failures", event: "❌ API Error", description: String(error) });
        console.error('Direct endpoint error:', error);
        return NextResponse.json({ error: 'Direct query failed' }, { status: 500 });
    }
}
