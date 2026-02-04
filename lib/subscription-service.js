/**
 * Subscription Service for Mailient
 * Handles Whop payment integration, subscription management, and feature usage tracking
 */

import { getSupabaseAdmin } from './supabase.js';
import crypto from 'crypto';

// Plan configurations
export const PLANS = {
    starter: {
        id: 'starter',
        name: 'Starter',
        price: 7.99,
        whopProductId: 'plan_OXtDPFaYlmYWN',
        whopCheckoutUrl: 'https://whop.com/checkout/plan_OXtDPFaYlmYWN',
        limits: {
            draft_reply: { limit: 30, period: 'monthly' },
            schedule_call: { limit: 30, period: 'monthly' },
            ai_notes: { limit: 20, period: 'monthly' },
            sift_analysis: { limit: 5, period: 'daily' },
            arcus_ai: { limit: 10, period: 'daily' },
            email_summary: { limit: 20, period: 'daily' }
        }
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: 29.99,
        whopProductId: 'plan_HjjXVb5SWxdOK',
        whopCheckoutUrl: 'https://whop.com/checkout/plan_HjjXVb5SWxdOK',
        limits: {
            draft_reply: { limit: -1, period: 'monthly' }, // -1 means unlimited
            schedule_call: { limit: -1, period: 'monthly' },
            ai_notes: { limit: -1, period: 'monthly' },
            sift_analysis: { limit: -1, period: 'daily' },
            arcus_ai: { limit: -1, period: 'daily' },
            email_summary: { limit: -1, period: 'daily' }
        }
    }
};

// Feature types for tracking
export const FEATURE_TYPES = {
    DRAFT_REPLY: 'draft_reply',
    SCHEDULE_CALL: 'schedule_call',
    AI_NOTES: 'ai_notes',
    SIFT_ANALYSIS: 'sift_analysis',
    ARCUS_AI: 'arcus_ai',
    EMAIL_SUMMARY: 'email_summary'
};

function normalizePlanConfig() {
    const featureKeys = Object.values(FEATURE_TYPES);

    const normalizeFeature = (planId, featureType, cfg) => {
        const period = cfg?.period || 'monthly';
        const limit = cfg?.limit;

        // Starter: never allow unlimited. Fail closed.
        if (planId === 'starter') {
            if (!Number.isFinite(limit) || limit < 0) {
                return { limit: 0, period };
            }
            return { limit, period };
        }

        // Pro: always unlimited.
        if (planId === 'pro') {
            return { limit: -1, period };
        }

        return cfg;
    };

    for (const featureType of featureKeys) {
        // Starter
        PLANS.starter.limits[featureType] = normalizeFeature(
            'starter',
            featureType,
            PLANS.starter.limits?.[featureType]
        );

        // Pro
        PLANS.pro.limits[featureType] = normalizeFeature(
            'pro',
            featureType,
            PLANS.pro.limits?.[featureType]
        );
    }
}

normalizePlanConfig();

export class SubscriptionService {
    constructor() { }

    get supabase() {
        return getSupabaseAdmin();
    }

    /**
     * Get user's current subscription
     */
    async getUserSubscription(userId) {
        userId = userId?.toLowerCase();
        try {
            const { data, error } = await this.supabase
                .from('user_subscriptions')
                .select('*')
                .ilike('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error('Error fetching subscription:', error);
                throw error;
            }

            return Array.isArray(data) && data.length > 0 ? data[0] : null;
        } catch (error) {
            console.error('Error in getUserSubscription:', error);
            return null;
        }
    }

    /**
     * Check if user has an active subscription
     */
    async isSubscriptionActive(userId) {
        const subscription = await this.getUserSubscription(userId);
        if (!subscription) return false;
        if (subscription.status !== 'active') return false;

        const now = new Date();
        const endDate = new Date(subscription.subscription_ends_at);
        return endDate > now;
    }

    /**
     * Get user's current plan type
     */
    async getUserPlanType(userId) {
        const subscription = await this.getUserSubscription(userId);

        if (!subscription) return 'none';
        if (subscription.status !== 'active') return 'none';

        const now = new Date();
        const endDate = new Date(subscription.subscription_ends_at);

        if (endDate <= now) return 'none';

        return subscription.plan_type;
    }

    /**
     * Create or update subscription after successful payment
     * @param {string} userId - User's email/ID
     * @param {string} planType - 'starter' or 'pro'
     * @param {string} whopMembershipId - Whop membership ID
     * @param {Object} whopDates - Optional dates from Whop (validUntil, createdAt)
     */
    async activateSubscription(userId, planType, whopMembershipId = null, whopDates = null) {
        userId = userId?.toLowerCase();
        try {
            const plan = PLANS[planType];
            if (!plan) {
                throw new Error(`Invalid plan type: ${planType}`);
            }

            // CRITICAL FIX: Check if user already has an active subscription
            const existingSubscription = await this.getUserSubscription(userId);
            const isActive = existingSubscription && existingSubscription.status === 'active';
            const now = new Date();
            let isNewSubscription = true;

            // If this came from a Whop renewal webhook, ALWAYS treat it as a renewal
            // so that we DO NOT wipe usage here – monthly credits will be reset in
            // handleMonthlyResetForRenewal instead.
            const isWebhookRenewal = !!whopDates?.isRenewal;

            if (existingSubscription) {
                const existingEndDate = new Date(existingSubscription.subscription_ends_at);

                if (isWebhookRenewal) {
                    // Renewal from Whop → preserve usage here
                    isNewSubscription = false;
                    console.log(`🔁 Renewal detected for ${userId}, preserving usage in activateSubscription`);
                } else if (isActive && existingEndDate > now) {
                    // Mid-period update (e.g., plan change) → preserve usage
                    isNewSubscription = false;
                    console.log(`🔒 User ${userId} has existing active subscription, preserving usage`);
                } else {
                    // Previous subscription is expired / inactive → this is a fresh billing cycle
                    // Treat as NEW subscription so the user gets a clean set of credits.
                    isNewSubscription = true;
                    console.log(`🆕 New billing cycle for ${userId} (previous subscription not actively within period)`);
                }
            }

            // CRITICAL FIX: Use dates from Whop webhook if available
            // Otherwise fall back to calculating (only for manual activations)
            let startDate = now;
            let endDate = new Date(now);
            endDate.setMonth(endDate.getMonth() + 1);

            if (whopDates) {
                console.log('🔄 Using Whop-provided dates:', whopDates);

                // Use Whop's creation date as start date if available
                if (whopDates.createdAt) {
                    startDate = new Date(whopDates.createdAt * 1000); // Whop uses Unix timestamps
                }

                // MOST IMPORTANT: Use Whop's valid_until as the end date
                if (whopDates.validUntil) {
                    endDate = new Date(whopDates.validUntil * 1000); // Whop uses Unix timestamps
                    console.log('✅ Renewal date from Whop:', endDate.toISOString());
                } else if (whopDates.expiresAt) {
                    endDate = new Date(whopDates.expiresAt * 1000);
                    console.log('✅ Expiry date from Whop:', endDate.toISOString());
                }
            } else {
                console.warn('⚠️ No Whop dates provided, calculating locally (should only happen for manual activation)');
            }

            const subscriptionData = {
                user_id: userId,
                whop_membership_id: whopMembershipId,
                whop_product_id: plan.whopProductId,
                plan_type: planType,
                plan_price: plan.price,
                subscription_started_at: startDate.toISOString(),
                subscription_ends_at: endDate.toISOString(),
                status: 'active',
                updated_at: now.toISOString()
            };

            console.log('💾 Saving subscription:', {
                userId,
                planType,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                isNewSubscription,
                source: whopDates ? 'Whop' : 'Calculated'
            });

            const { data, error } = await this.supabase
                .from('user_subscriptions')
                .upsert(subscriptionData, {
                    onConflict: 'user_id',
                    ignoreDuplicates: false
                })
                .select()
                .single();

            if (error) {
                console.error('Error activating subscription:', error);
                throw error;
            }

            // CRITICAL FIX: Only reset usage for truly new subscriptions
            await this.resetAllFeatureUsage(userId, startDate, endDate, isNewSubscription);
            console.log(`✅ Subscription ${isNewSubscription ? 'activated' : 'updated'} for ${userId}: ${planType}, renews at ${endDate.toISOString()}`);
            return data;
        } catch (error) {
            console.error('Error in activateSubscription:', error);
            throw error;
        }
    }

    /**
     * Cancel/expire subscription
     */
    async cancelSubscription(userId) {
        userId = userId?.toLowerCase();
        try {
            const { data, error } = await this.supabase
                .from('user_subscriptions')
                .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .ilike('user_id', userId)
                .select();

            if (error) {
                console.error('Error cancelling subscription:', error);
                throw error;
            }

            return Array.isArray(data) && data.length > 0 ? data[0] : null;
        } catch (error) {
            console.error('Error in cancelSubscription:', error);
            throw error;
        }
    }

    /**
     * Check subscription expiry and update status
     */
    async checkAndUpdateExpiredSubscriptions() {
        try {
            const now = new Date().toISOString();
            const { data, error } = await this.supabase
                .from('user_subscriptions')
                .update({ status: 'expired', updated_at: now })
                .eq('status', 'active')
                .lt('subscription_ends_at', now);

            if (error) {
                console.error('Error updating expired subscriptions:', error);
            }
            return data;
        } catch (error) {
            console.error('Error in checkAndUpdateExpiredSubscriptions:', error);
        }
    }

    /**
     * Reset feature usage for a new subscription period
     * CRITICAL FIX: Only reset for NEW subscriptions, not renewals or re-auth
     */
    async resetAllFeatureUsage(userId, periodStart, periodEnd, isNewSubscription = true) {
        userId = userId?.toLowerCase();
        
        // CRITICAL FIX: Don't reset usage for existing subscriptions (renewals, re-auth)
        if (!isNewSubscription) {
            console.log(`🔒 Preserving existing usage for ${userId} (renewal/re-auth)`);
            return;
        }
        
        try {
            await this.supabase
                .from('user_feature_usage')
                .delete()
                .ilike('user_id', userId);

            console.log(`🔄 Reset feature usage for NEW subscription ${userId}`);
        } catch (error) {
            console.error('Error in resetAllFeatureUsage:', error);
        }
    }

    /**
     * Handle monthly usage reset for renewals
     * Only resets monthly features, preserves daily usage within current period
     */
    async handleMonthlyResetForRenewal(userId, newPeriodStart, newPeriodEnd) {
        userId = userId?.toLowerCase();
        try {
            // Get all current usage records
            const { data: usageRecords, error } = await this.supabase
                .from('user_feature_usage')
                .select('*')
                .ilike('user_id', userId);

            if (error) {
                console.error('Error fetching usage records for monthly reset:', error);
                return;
            }

            if (!usageRecords || usageRecords.length === 0) {
                console.log(`No usage records to reset for ${userId}`);
                return;
            }

            // Separate monthly vs daily features
            const monthlyFeatures = [];
            const dailyFeatures = [];

            for (const record of usageRecords) {
                const featureType = record.feature_type;
                const currentPlanType = await this.getUserPlanType(userId);
                const plan = PLANS[currentPlanType];
                
                if (plan && plan.limits[featureType]) {
                    const period = plan.limits[featureType].period;
                    if (period === 'monthly') {
                        monthlyFeatures.push(record);
                    } else if (period === 'daily') {
                        dailyFeatures.push(record);
                    }
                }
            }

            // Reset monthly features to 0
            if (monthlyFeatures.length > 0) {
                for (const feature of monthlyFeatures) {
                    await this.supabase
                        .from('user_feature_usage')
                        .update({
                            usage_count: 0,
                            period_start: newPeriodStart,
                            period_end: newPeriodEnd,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', userId)
                        .eq('feature_type', feature.feature_type);
                }
                console.log(`🔄 Reset monthly features for ${userId}: ${monthlyFeatures.map(f => f.feature_type).join(', ')}`);
            }

            // Update period dates for daily features but preserve usage
            if (dailyFeatures.length > 0) {
                for (const feature of dailyFeatures) {
                    await this.supabase
                        .from('user_feature_usage')
                        .update({
                            period_start: newPeriodStart,
                            period_end: newPeriodEnd,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', userId)
                        .eq('feature_type', feature.feature_type);
                }
                console.log(`📅 Updated period dates for daily features for ${userId}: ${dailyFeatures.map(f => f.feature_type).join(', ')}`);
            }

        } catch (error) {
            console.error('Error in handleMonthlyResetForRenewal:', error);
        }
    }

    /**
     * Get feature usage for a specific feature
     */
    async getFeatureUsage(userId, featureType) {
        userId = userId?.toLowerCase();
        try {
            const subscription = await this.getUserSubscription(userId);

            // Default to 'none' if no subscription record exists
            let planType = 'none';
            let isSubscriptionActive = false;

            if (subscription) {
                planType = subscription.plan_type;
                isSubscriptionActive = subscription.status === 'active';

                const now = new Date();
                const endDate = new Date(subscription.subscription_ends_at);
                if (endDate <= now) {
                    isSubscriptionActive = false;
                }
            }

            if (!subscription) {
                return { usage: 0, limit: 0, remaining: 0, hasAccess: false, reason: 'no_subscription', planType };
            }

            if (!isSubscriptionActive) {
                return { usage: 0, limit: 0, remaining: 0, hasAccess: false, reason: 'subscription_expired', planType };
            }

            const plan = PLANS[planType];
            if (!plan) {
                return { usage: 0, limit: 0, remaining: 0, hasAccess: false, reason: 'invalid_plan', planType };
            }

            const featureLimits = plan.limits[featureType];
            if (!featureLimits) {
                return { usage: 0, limit: 0, remaining: 0, hasAccess: false, reason: 'unknown_feature', planType };
            }

            // Pro plan unlimited
            if (featureLimits.limit === -1) {
                return { usage: 0, limit: -1, remaining: -1, hasAccess: true, isUnlimited: true, planType, period: featureLimits.period };
            }

            const isDaily = featureLimits.period === 'daily';
            const today = new Date().toISOString().split('T')[0];

            let query = this.supabase
                .from('user_feature_usage')
                .select('usage_count')
                .ilike('user_id', userId)
                .eq('feature_type', featureType);

            if (isDaily) {
                query = query.eq('last_reset_date', today);
            } else {
                if (subscription) {
                    const subPeriodStart = new Date(subscription.subscription_started_at).toISOString().split('T')[0];
                    const subPeriodEnd = new Date(subscription.subscription_ends_at).toISOString().split('T')[0];
                    query = query
                        .gte('period_start', subPeriodStart)
                        .lte('period_end', subPeriodEnd);
                } else {
                    // For monthly trial features, use the current calendar month
                    const now = new Date();
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                    query = query.eq('period_start', monthStart);
                }
            }

            const { data, error } = await query.maybeSingle();
            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching feature usage:', error);
            }

            const usage = data?.usage_count || 0;
            const remaining = Math.max(0, featureLimits.limit - usage);

            return {
                usage,
                limit: featureLimits.limit,
                remaining,
                hasAccess: remaining > 0,
                period: featureLimits.period,
                planType
            };
        } catch (error) {
            console.error('Error in getFeatureUsage:', error);
            return { usage: 0, limit: 0, remaining: 0, hasAccess: false, reason: error.message, planType: 'none' };
        }
    }

    async canUseFeature(userId, featureType) {
        const usage = await this.getFeatureUsage(userId, featureType);
        return usage.hasAccess;
    }

    /**
     * Increment feature usage
     */
    async incrementFeatureUsage(userId, featureType) {
        userId = userId?.toLowerCase();
        try {
            const subscription = await this.getUserSubscription(userId);

            if (!subscription) {
                return { success: false, error: 'No active subscription' };
            }

            const currentPlanType = subscription.plan_type;
            let isSubscriptionActive = subscription.status === 'active';
            const now = new Date();
            const endDate = new Date(subscription.subscription_ends_at);
            if (endDate <= now) isSubscriptionActive = false;

            if (!isSubscriptionActive) {
                return { success: false, error: 'No active subscription' };
            }

            const plan = PLANS[currentPlanType];
            if (!plan) return { success: false, error: 'Invalid plan' };

            const featureLimits = plan.limits[featureType];
            if (!featureLimits) return { success: false, error: 'Unknown feature' };

            if (featureLimits.limit === -1) return { success: true, isUnlimited: true };

            const currentUsage = await this.getFeatureUsage(userId, featureType);
            if (!currentUsage.hasAccess) {
                return { success: false, error: 'Limit reached', usage: currentUsage.usage, limit: currentUsage.limit };
            }

            const todayStr = new Date().toISOString().split('T')[0];
            const periodNow = new Date();
            const monthStartStr = new Date(periodNow.getFullYear(), periodNow.getMonth(), 1).toISOString().split('T')[0];
            const monthEndStr = new Date(periodNow.getFullYear(), periodNow.getMonth() + 1, 0).toISOString().split('T')[0];

            const periodStart = subscription ? subscription.subscription_started_at.split('T')[0] : monthStartStr;
            const periodEnd = subscription ? subscription.subscription_ends_at.split('T')[0] : monthEndStr;

            const { error } = await this.supabase
                .from('user_feature_usage')
                .upsert({
                    user_id: userId,
                    feature_type: featureType,
                    usage_count: (currentUsage.usage || 0) + 1,
                    last_reset_date: todayStr,
                    period_start: featureLimits.period === 'daily' ? todayStr : periodStart,
                    period_end: featureLimits.period === 'daily' ? todayStr : periodEnd,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,feature_type,period_start',
                    ignoreDuplicates: false
                });

            if (error) {
                console.error('Error incrementing usage:', error);
                return { success: false, error: error.message };
            }

            return { success: true, newUsage: currentUsage.usage + 1, remaining: currentUsage.remaining - 1 };
        } catch (error) {
            console.error('Error in incrementFeatureUsage:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all feature usage for dashboard display
     */
    async getAllFeatureUsage(userId) {
        userId = userId?.toLowerCase();
        try {
            const subscription = await this.getUserSubscription(userId);
            const currentPlanType = await this.getUserPlanType(userId);
            const isActive = await this.isSubscriptionActive(userId);

            const features = {};
            for (const featureType of Object.values(FEATURE_TYPES)) {
                features[featureType] = await this.getFeatureUsage(userId, featureType);
            }

            return {
                hasActiveSubscription: isActive,
                planType: currentPlanType,
                subscriptionEndsAt: subscription?.subscription_ends_at,
                daysRemaining: subscription ? this.getDaysRemaining(subscription.subscription_ends_at) : 0,
                features
            };
        } catch (error) {
            console.error('Error in getAllFeatureUsage:', error);
            return { hasActiveSubscription: false, planType: 'none', features: {} };
        }
    }

    getDaysRemaining(endDate) {
        if (!endDate) return 0;
        const now = new Date();
        const end = new Date(endDate);
        const diff = end - now;
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    async isSubscriptionEndingSoon(userId, daysThreshold = 3) {
        const subscription = await this.getUserSubscription(userId);
        if (!subscription || subscription.status !== 'active') return false;
        const daysRemaining = this.getDaysRemaining(subscription.subscription_ends_at);
        return daysRemaining <= daysThreshold && daysRemaining > 0;
    }

    getCheckoutUrl(planType, userId, userEmail) {
        const plan = PLANS[planType];
        if (!plan) return null;
        const params = new URLSearchParams();
        if (userId) params.set('user_id', userId);
        if (userEmail) params.set('email', userEmail);
        return `${plan.whopCheckoutUrl}?${params.toString()}`;
    }

    validateWebhookSignature(payload, signature, secret) {
        try {
            if (!secret) return false;

            const headers = (signature && typeof signature === 'object') ? signature : null;
            if (!headers) return false;

            const webhookId = headers['webhook-id'] || headers['Webhook-Id'] || headers['x-whop-webhook-id'] || null;
            const webhookTimestamp = headers['webhook-timestamp'] || headers['Webhook-Timestamp'] || headers['x-whop-webhook-timestamp'] || null;
            const webhookSignature = headers['webhook-signature'] || headers['Webhook-Signature'] || headers['x-whop-signature'] || null;

            if (!webhookId || !webhookTimestamp || !webhookSignature) return false;

            const ts = Number(webhookTimestamp);
            if (!Number.isFinite(ts)) return false;

            const nowSeconds = Math.floor(Date.now() / 1000);
            const maxSkewSeconds = 5 * 60;
            if (Math.abs(nowSeconds - ts) > maxSkewSeconds) return false;

            let key = (secret || '').trim();
            if (key.startsWith('whsec_')) {
                key = key.slice('whsec_'.length);
            }

            const looksBase64 = /^[A-Za-z0-9+/=]+$/.test(key) && key.length % 4 === 0;
            const keyBytes = looksBase64 ? Buffer.from(key, 'base64') : Buffer.from(key, 'utf8');
            if (!keyBytes || keyBytes.length === 0) return false;

            const toSign = `${webhookId}.${webhookTimestamp}.${payload}`;
            const expected = crypto.createHmac('sha256', keyBytes).update(toSign).digest('base64');

            const candidates = String(webhookSignature)
                .split(' ')
                .map((s) => s.trim())
                .filter(Boolean);

            for (const candidate of candidates) {
                const [version, sig] = candidate.split(',', 2);
                if (version !== 'v1' || !sig) continue;

                const a = Buffer.from(sig);
                const b = Buffer.from(expected);
                if (a.length !== b.length) continue;
                if (crypto.timingSafeEqual(a, b)) return true;
            }

            return false;
        } catch (e) {
            console.error('Webhook signature validation error:', e);
            return false;
        }
    }

    /**
     * Send payment data to DataFast's API
     */
    async sendPaymentToDataFast(paymentData) {
        try {
            const DATAFAST_API_KEY = process.env.DATAFAST_API_KEY;
            
            // Try to retrieve stored visitor ID
            let datafastVisitorId = null;
            if (paymentData.user_email) {
                try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/datafast/visitor-id?email=${encodeURIComponent(paymentData.user_email)}`);
                    if (response.ok) {
                        const data = await response.json();
                        datafastVisitorId = data.visitor_id;
                    }
                } catch (error) {
                    console.log('⚠️ Could not retrieve DataFast visitor ID:', error.message);
                }
            }
            
            console.log('💳 Sending payment data to DataFast:', {
                amount: paymentData.amount,
                currency: paymentData.currency,
                transaction_id: paymentData.transaction_id,
                email: paymentData.user_email,
                renewal: paymentData.is_renewal,
                datafast_visitor_id: datafastVisitorId ? '***' + datafastVisitorId.slice(-8) : 'not_found'
            });

            const requestBody = {
                amount: paymentData.amount,
                currency: paymentData.currency,
                transaction_id: paymentData.transaction_id,
                email: paymentData.user_email,
                renewal: paymentData.is_renewal || false,
                timestamp: new Date().toISOString()
            };

            // Add visitor ID if available
            if (datafastVisitorId) {
                requestBody.datafast_visitor_id = datafastVisitorId;
            }

            const response = await fetch('https://datafa.st/api/v1/payments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${DATAFAST_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ DataFast API error:', response.status, errorText);
                throw new Error(`DataFast API error: ${response.status} ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Payment data sent to DataFast successfully:', result);
            return result;
        } catch (error) {
            console.error('❌ Error sending payment to DataFast:', error);
            // Don't throw error to avoid breaking subscription activation
            // Just log it for monitoring
        }
    }

    async handleWebhookEvent(event) {
        const { action, data } = event;
        console.log('🔔 Processing webhook event:', action, 'for user:', data.user?.email);

        switch (action) {
            case 'membership.went_valid':
            case 'membership.renewed':
                const userEmail = data.user?.email;
                const productId = data.product?.id;

                if (userEmail && productId) {
                    // CRITICAL FIX: Properly detect plan type - don't default to Pro!
                    let planType;

                    console.log('🔍 Detecting plan type from product ID:', productId);
                    console.log('📋 Expected IDs:', {
                        starter: PLANS.starter.whopProductId,
                        pro: PLANS.pro.whopProductId
                    });

                    if (productId === PLANS.starter.whopProductId) {
                        planType = 'starter';
                        console.log('✅ Matched: Starter plan');
                    } else if (productId === PLANS.pro.whopProductId) {
                        planType = 'pro';
                        console.log('✅ Matched: Pro plan');
                    } else {
                        // Unknown product ID - this is an ERROR, not a default!
                        console.error('❌ CRITICAL: Unknown Whop product ID:', productId);
                        console.error('❌ Expected one of:', {
                            starter: PLANS.starter.whopProductId,
                            pro: PLANS.pro.whopProductId
                        });
                        console.error('❌ This subscription will NOT be activated');
                        break; // Exit without activating subscription
                    }

                    // CRITICAL FIX: Extract renewal dates from Whop webhook data
                    const whopDates = {
                        createdAt: data.created_at,           // When membership was created
                        validUntil: data.valid_until,         // When membership expires/renews
                        expiresAt: data.expires_at,           // Alternative expiry field
                        cancelAtPeriodEnd: data.cancel_at_period_end,
                        // Flag so activateSubscription knows this is a renewal
                        isRenewal: action === 'membership.renewed'
                    };

                    console.log('📅 Whop subscription dates:', {
                        createdAt: whopDates.createdAt ? new Date(whopDates.createdAt * 1000).toISOString() : 'N/A',
                        validUntil: whopDates.validUntil ? new Date(whopDates.validUntil * 1000).toISOString() : 'N/A',
                        expiresAt: whopDates.expiresAt ? new Date(whopDates.expiresAt * 1000).toISOString() : 'N/A'
                    });

                    // Check if this is a renewal vs new subscription
                    const existingSubscription = await this.getUserSubscription(userEmail);
                    const isRenewal = action === 'membership.renewed' || 
                                     (existingSubscription && existingSubscription.status === 'active');

                    if (isRenewal && whopDates.validUntil) {
                        // For renewals, handle monthly reset properly
                        const newPeriodStart = new Date();
                        const newPeriodEnd = new Date(whopDates.validUntil * 1000);
                        
                        console.log(`🔄 Processing RENEWAL for ${userEmail}, handling monthly reset`);
                        
                        // Activate subscription (preserves usage)
                        await this.activateSubscription(userEmail, planType, data.id, whopDates);
                        
                        // Handle monthly reset for renewals
                        await this.handleMonthlyResetForRenewal(userEmail, 
                            newPeriodStart.toISOString().split('T')[0],
                            newPeriodEnd.toISOString().split('T')[0]
                        );
                    } else {
                        // New subscription - normal activation
                        console.log(`🆕 Processing NEW subscription for ${userEmail}`);
                        await this.activateSubscription(userEmail, planType, data.id, whopDates);
                    }
                    
                    // Send payment data to DataFast's API
                    await this.sendPaymentToDataFast({
                        amount: PLANS[planType].price,
                        currency: 'USD',
                        transaction_id: data.id,
                        user_email: userEmail,
                        is_renewal: action === 'membership.renewed'
                    });
                }
                break;

            case 'membership.went_invalid':
            case 'membership.cancelled':
                const cancelUserEmail = data.user?.email;
                if (cancelUserEmail) {
                    console.log('❌ Cancelling subscription for:', cancelUserEmail);
                    await this.cancelSubscription(cancelUserEmail);
                }
                break;

            default:
                console.log('ℹ️ Unhandled webhook action:', action);
        }
    }
}

export const subscriptionService = new SubscriptionService();
