import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { PLANS } from '@/lib/subscription-service';

/**
 * ADMIN TOOL: Audit and fix subscription plan types
 * Checks all subscriptions and reports/fixes any that might be incorrectly set to Pro
 */
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        // Get all subscriptions
        const { data: allSubs, error } = await supabase
            .from('user_subscriptions')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            throw error;
        }

        // Analyze each subscription
        const analysis = allSubs.map(sub => {
            const isStarter = sub.whop_product_id === PLANS.starter.whopProductId;
            const isPro = sub.whop_product_id === PLANS.pro.whopProductId;
            const planMismatch = (sub.whop_product_id === PLANS.starter.whopProductId && sub.plan_type !== 'starter') ||
                (sub.whop_product_id === PLANS.pro.whopProductId && sub.plan_type !== 'pro');

            return {
                user: sub.user_id.substring(0, 20) + '...',
                storedPlanType: sub.plan_type,
                storedPrice: sub.plan_price,
                whopProductId: sub.whop_product_id,
                detectedFromWhopId: isStarter ? 'starter' : isPro ? 'pro' : 'UNKNOWN',
                hasMismatch: planMismatch,
                status: sub.status,
                created: sub.subscription_started_at,
                expires: sub.subscription_ends_at
            };
        });

        const issues = analysis.filter(a => a.hasMismatch || a.detectedFromWhopId === 'UNKNOWN');
        const planCounts = analysis.reduce((acc, a) => {
            acc[a.storedPlanType] = (acc[a.storedPlanType] || 0) + 1;
            return acc;
        }, {});

        return NextResponse.json({
            summary: {
                total: allSubs.length,
                active: allSubs.filter(s => s.status === 'active').length,
                planDistribution: planCounts,
                issuesFound: issues.length,
                allPro: allSubs.every(s => s.plan_type === 'pro') && allSubs.length > 1
            },
            expectedProductIds: {
                starter: PLANS.starter.whopProductId,
                pro: PLANS.pro.whopProductId
            },
            issues: issues.length > 0 ? issues : 'No mismatches found',
            allSubscriptions: analysis,
            recommendations: issues.length > 0 ? [
                'Check server logs for webhook product IDs',
                'Verify Whop product configuration',
                'If product IDs match but plans are wrong, run the fix endpoint'
            ] : ['All subscriptions look correct']
        });
    } catch (error) {
        console.error('Audit error:', error);
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

/**
 * POST: Fix subscriptions that have incorrect plan types based on their Whop product ID
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        // Get all subscriptions
        const { data: allSubs } = await supabase
            .from('user_subscriptions')
            .select('*');

        const fixes = [];

        for (const sub of allSubs) {
            let correctPlanType = null;
            let correctPrice = null;

            if (sub.whop_product_id === PLANS.starter.whopProductId) {
                correctPlanType = 'starter';
                correctPrice = PLANS.starter.price;
            } else if (sub.whop_product_id === PLANS.pro.whopProductId) {
                correctPlanType = 'pro';
                correctPrice = PLANS.pro.price;
            }

            // Check if needs fixing
            if (correctPlanType && (sub.plan_type !== correctPlanType || sub.plan_price !== correctPrice)) {
                // Update the subscription
                const { error } = await supabase
                    .from('user_subscriptions')
                    .update({
                        plan_type: correctPlanType,
                        plan_price: correctPrice,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', sub.user_id);

                if (!error) {
                    fixes.push({
                        user: sub.user_id,
                        from: { plan: sub.plan_type, price: sub.plan_price },
                        to: { plan: correctPlanType, price: correctPrice },
                        status: 'FIXED'
                    });
                } else {
                    fixes.push({
                        user: sub.user_id,
                        from: { plan: sub.plan_type, price: sub.plan_price },
                        to: { plan: correctPlanType, price: correctPrice },
                        status: 'ERROR',
                        error: error.message
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            totalChecked: allSubs.length,
            fixed: fixes.filter(f => f.status === 'FIXED').length,
            errors: fixes.filter(f => f.status === 'ERROR').length,
            details: fixes
        });
    } catch (error) {
        console.error('Fix error:', error);
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}
