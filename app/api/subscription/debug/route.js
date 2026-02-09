import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { subscriptionService, PLANS } from '@/lib/subscription-service';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Debug endpoint for subscription system
 * Helps diagnose issues with Supabase connection and subscription state
 * 
 * Only accessible to authenticated users for security
 */
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;
        const debugInfo = {
            timestamp: new Date().toISOString(),
            userId,
            environment: {},
            supabase: {},
            subscription: {},
            tables: {}
        };

        // Check environment variables
        debugInfo.environment = {
            hasSupabaseUrl: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
            hasSupabaseAnonKey: !!(process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
            hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            hasWhopWebhookSecret: !!process.env.WHOP_WEBHOOK_SECRET,
            nodeEnv: process.env.NODE_ENV
        };

        // Test Supabase connection
        try {
            const connectionOk = await subscriptionService.testConnection();
            debugInfo.supabase.connectionStatus = connectionOk ? 'connected' : 'failed';
        } catch (error) {
            debugInfo.supabase.connectionStatus = 'error';
            debugInfo.supabase.connectionError = error.message;
        }

        // Check if tables exist
        const supabase = getSupabaseAdmin();

        // Test user_subscriptions table
        try {
            const { data, error } = await supabase
                .from('user_subscriptions')
                .select('user_id')
                .limit(1);

            if (error) {
                debugInfo.tables.user_subscriptions = {
                    exists: false,
                    error: error.message,
                    code: error.code
                };
            } else {
                debugInfo.tables.user_subscriptions = {
                    exists: true,
                    canQuery: true
                };
            }
        } catch (e) {
            debugInfo.tables.user_subscriptions = {
                exists: false,
                error: e.message
            };
        }

        // Test user_feature_usage table
        try {
            const { data, error } = await supabase
                .from('user_feature_usage')
                .select('user_id')
                .limit(1);

            if (error) {
                debugInfo.tables.user_feature_usage = {
                    exists: false,
                    error: error.message,
                    code: error.code
                };
            } else {
                debugInfo.tables.user_feature_usage = {
                    exists: true,
                    canQuery: true
                };
            }
        } catch (e) {
            debugInfo.tables.user_feature_usage = {
                exists: false,
                error: e.message
            };
        }

        // Get current user's subscription
        try {
            const subscription = await subscriptionService.getUserSubscription(userId);
            const isActive = await subscriptionService.isSubscriptionActive(userId);
            const planType = await subscriptionService.getUserPlanType(userId);

            debugInfo.subscription = {
                found: !!subscription,
                isActive,
                planType,
                rawSubscription: subscription ? {
                    id: subscription.id,
                    user_id: subscription.user_id,
                    plan_type: subscription.plan_type,
                    status: subscription.status,
                    subscription_started_at: subscription.subscription_started_at,
                    subscription_ends_at: subscription.subscription_ends_at,
                    whop_membership_id: subscription.whop_membership_id ? 'present' : 'missing',
                    updated_at: subscription.updated_at
                } : null
            };
        } catch (error) {
            debugInfo.subscription = {
                error: error.message
            };
        }

        // Check PLANS configuration
        debugInfo.plansConfig = {
            starterProductId: PLANS.starter.whopProductId,
            proProductId: PLANS.pro.whopProductId,
            starterCheckoutUrl: PLANS.starter.whopCheckoutUrl,
            proCheckoutUrl: PLANS.pro.whopCheckoutUrl
        };

        return NextResponse.json({
            success: true,
            debug: debugInfo
        });

    } catch (error) {
        console.error('Debug endpoint error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
