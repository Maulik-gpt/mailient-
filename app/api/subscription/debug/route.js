import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { subscriptionService } from '@/lib/subscription-service';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * DEBUG ENDPOINT - Check subscription data directly from Supabase
 * This helps diagnose if all users are being returned as Pro
 */
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email.toLowerCase();
        const supabase = getSupabaseAdmin();

        // Query 1: Direct Supabase query for this user
        const { data: directData, error: directError } = await supabase
            .from('user_subscriptions')
            .select('*')
            .ilike('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(1);

        // Query 2: Through subscription service
        const serviceData = await subscriptionService.getUserSubscription(userId);
        const planType = await subscriptionService.getUserPlanType(userId);

        // Query 3: Get ALL subscriptions (to check if everyone is Pro)
        const { data: allSubs, error: allError } = await supabase
            .from('user_subscriptions')
            .select('user_id, plan_type, plan_price, status, subscription_started_at, subscription_ends_at')
            .eq('status', 'active')
            .order('updated_at', { ascending: false })
            .limit(20);

        // Count by plan type
        const planCounts = allSubs?.reduce((acc, sub) => {
            acc[sub.plan_type] = (acc[sub.plan_type] || 0) + 1;
            return acc;
        }, {});

        return NextResponse.json({
            currentUser: {
                email: userId,
                directQuery: {
                    data: directData?.[0] || null,
                    error: directError?.message || null
                },
                viaService: {
                    subscription: serviceData,
                    planType: planType
                }
            },
            allActiveSubscriptions: {
                total: allSubs?.length || 0,
                planDistribution: planCounts || {},
                sample: allSubs?.slice(0, 5).map(s => ({
                    user: s.user_id.substring(0, 10) + '...',
                    plan: s.plan_type,
                    price: s.plan_price,
                    status: s.status
                })) || []
            },
            diagnosis: {
                isProbablyBug: allSubs?.every(s => s.plan_type === 'pro') && allSubs.length > 1,
                message: allSubs?.every(s => s.plan_type === 'pro') && allSubs.length > 1
                    ? '⚠️ WARNING: All active subscriptions are Pro - this might be a bug!'
                    : '✅ Plan types look varied - no obvious bug'
            }
        });
    } catch (error) {
        console.error('Debug endpoint error:', error);
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
