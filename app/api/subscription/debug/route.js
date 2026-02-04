import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { subscriptionService, PLANS } from '@/lib/subscription-service';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * DEBUG ENDPOINT - Check subscription data directly from Supabase
 * This helps diagnose subscription display issues
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
        const isActive = await subscriptionService.isSubscriptionActive(userId);
        const allUsage = await subscriptionService.getAllFeatureUsage(userId);

        // Query 3: Get plan details
        const plan = planType !== 'none' ? PLANS[planType] : null;

        // Query 4: Check what the status API would return
        const statusApiResponse = {
            hasActiveSubscription: isActive,
            planType,
            planName: plan?.name || 'No Plan',
            planPrice: plan?.price || 0,
            subscriptionStartedAt: serviceData?.subscription_started_at || null,
            subscriptionEndsAt: serviceData?.subscription_ends_at || null,
            daysRemaining: allUsage.daysRemaining || 0,
            status: serviceData?.status || 'inactive'
        };

        // Query 5: Get ALL subscriptions (to check if everyone is Pro)
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

        // Detailed analysis for current user
        const now = new Date();
        const subEndsAt = serviceData?.subscription_ends_at ? new Date(serviceData.subscription_ends_at) : null;
        const isExpired = subEndsAt ? subEndsAt <= now : true;
        const daysRemaining = subEndsAt ? Math.ceil((subEndsAt - now) / (1000 * 60 * 60 * 24)) : 0;

        return NextResponse.json({
            currentUser: {
                email: userId,
                timestamp: now.toISOString(),
                directQuery: {
                    data: directData?.[0] || null,
                    error: directError?.message || null
                },
                viaService: {
                    subscription: serviceData,
                    planType,
                    isActive,
                    allUsage
                },
                statusApiResponse,
                detailedAnalysis: {
                    hasSubscription: !!serviceData,
                    subscriptionStatus: serviceData?.status,
                    planTypeFromDb: serviceData?.plan_type,
                    endsAt: serviceData?.subscription_ends_at,
                    isExpired,
                    daysRemaining,
                    shouldShowAsActive: serviceData?.status === 'active' && !isExpired
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
            availablePlans: Object.keys(PLANS).map(key => ({
                id: key,
                name: PLANS[key].name,
                price: PLANS[key].price
            })),
            diagnosis: {
                isProbablyBug: allSubs?.every(s => s.plan_type === 'pro') && allSubs.length > 1,
                message: allSubs?.every(s => s.plan_type === 'pro') && allSubs.length > 1
                    ? '⚠️ WARNING: All active subscriptions are Pro - this might be a bug!'
                    : '✅ Plan types look varied - no obvious bug',
                whyShowingNoPlan: !statusApiResponse.planName || statusApiResponse.planName === 'No Plan'
                    ? '🔍 Plan name is "No Plan" - check planType and PLANS mapping'
                    : '✅ Plan name looks correct'
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
