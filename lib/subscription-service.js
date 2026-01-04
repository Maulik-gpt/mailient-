/**
 * Subscription Service for Mailient
 * Handles Whop payment integration, subscription management, and feature usage tracking
 */

import { getSupabaseAdmin } from './supabase.js';

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
                .eq('user_id', userId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching subscription:', error);
                throw error;
            }

            return data;
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

        if (!subscription) return 'starter';
        if (subscription.status !== 'active') return 'starter';

        const now = new Date();
        const endDate = new Date(subscription.subscription_ends_at);

        if (endDate <= now) return 'starter';

        return subscription.plan_type;
    }

    /**
     * Create or update subscription after successful payment
     */
    async activateSubscription(userId, planType, whopMembershipId = null) {
        userId = userId?.toLowerCase();
        try {
            const plan = PLANS[planType];
            if (!plan) {
                throw new Error(`Invalid plan type: ${planType}`);
            }

            const now = new Date();
            const endDate = new Date(now);
            endDate.setMonth(endDate.getMonth() + 1);

            const subscriptionData = {
                user_id: userId,
                whop_membership_id: whopMembershipId,
                whop_product_id: plan.whopProductId,
                plan_type: planType,
                plan_price: plan.price,
                subscription_started_at: now.toISOString(),
                subscription_ends_at: endDate.toISOString(),
                status: 'active',
                updated_at: now.toISOString()
            };

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

            await this.resetAllFeatureUsage(userId, now, endDate);
            console.log(`✅ Subscription activated for ${userId}: ${planType}`);
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
        try {
            const { data, error } = await this.supabase
                .from('user_subscriptions')
                .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (error) {
                console.error('Error cancelling subscription:', error);
                throw error;
            }

            return data;
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
     */
    async resetAllFeatureUsage(userId, periodStart, periodEnd) {
        try {
            await this.supabase
                .from('user_feature_usage')
                .delete()
                .eq('user_id', userId);

            console.log(`🔄 Reset feature usage for ${userId}`);
        } catch (error) {
            console.error('Error in resetAllFeatureUsage:', error);
        }
    }

    /**
     * Get feature usage for a specific feature
     */
    async getFeatureUsage(userId, featureType) {
        try {
            const subscription = await this.getUserSubscription(userId);

            // Default to Starter if no subscription record exists
            let planType = 'starter';
            let isSubscriptionActive = true;

            if (subscription) {
                planType = subscription.plan_type;
                isSubscriptionActive = subscription.status === 'active';

                const now = new Date();
                const endDate = new Date(subscription.subscription_ends_at);
                if (endDate <= now) {
                    isSubscriptionActive = false;
                }
            }

            // For Pro users, they are always active if their sub is active
            // For Starter users, we allow usage even without a record (TRIAL)
            if (!isSubscriptionActive && planType !== 'starter') {
                return { usage: 0, limit: 0, remaining: 0, hasAccess: false, reason: 'subscription_expired' };
            }

            const plan = PLANS[planType];
            if (!plan) {
                return { usage: 0, limit: 0, remaining: 0, hasAccess: false, reason: 'invalid_plan' };
            }

            const featureLimits = plan.limits[featureType];
            if (!featureLimits) {
                return { usage: 0, limit: 0, remaining: 0, hasAccess: false, reason: 'unknown_feature' };
            }

            // Pro plan unlimited
            if (featureLimits.limit === -1) {
                return { usage: 0, limit: -1, remaining: -1, hasAccess: true, isUnlimited: true };
            }

            const isDaily = featureLimits.period === 'daily';
            const today = new Date().toISOString().split('T')[0];

            let query = this.supabase
                .from('user_feature_usage')
                .select('usage_count')
                .eq('user_id', userId)
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
                period: featureLimits.period
            };
        } catch (error) {
            console.error('Error in getFeatureUsage:', error);
            return { usage: 0, limit: 0, remaining: 0, hasAccess: false, reason: error.message };
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
        try {
            const subscription = await this.getUserSubscription(userId);

            let planType = 'starter';
            let isSubscriptionActive = true;

            if (subscription) {
                planType = subscription.plan_type;
                isSubscriptionActive = subscription.status === 'active';
                const now = new Date();
                const endDate = new Date(subscription.subscription_ends_at);
                if (endDate <= now) isSubscriptionActive = false;
            }

            if (!isSubscriptionActive && planType !== 'starter') {
                return { success: false, error: 'No active subscription' };
            }

            const plan = PLANS[planType];
            if (!plan) return { success: false, error: 'Invalid plan' };

            const featureLimits = plan.limits[featureType];
            if (!featureLimits) return { success: false, error: 'Unknown feature' };

            if (featureLimits.limit === -1) return { success: true, isUnlimited: true };

            const currentUsage = await this.getFeatureUsage(userId, featureType);
            if (!currentUsage.hasAccess) {
                return { success: false, error: 'Limit reached', usage: currentUsage.usage, limit: currentUsage.limit };
            }

            const todayStr = new Date().toISOString().split('T')[0];
            const now = new Date();
            const monthStartStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const monthEndStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

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
        try {
            const subscription = await this.getUserSubscription(userId);
            const planType = subscription?.status === 'active' ? subscription.plan_type : 'starter';

            const features = {};
            for (const featureType of Object.values(FEATURE_TYPES)) {
                features[featureType] = await this.getFeatureUsage(userId, featureType);
            }

            return {
                hasActiveSubscription: subscription?.status === 'active',
                planType: planType,
                subscriptionEndsAt: subscription?.subscription_ends_at,
                daysRemaining: subscription ? this.getDaysRemaining(subscription.subscription_ends_at) : 0,
                features
            };
        } catch (error) {
            console.error('Error in getAllFeatureUsage:', error);
            return { hasActiveSubscription: false, planType: 'starter', features: {} };
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
        return true;
    }

    async handleWebhookEvent(event) {
        const { action, data } = event;
        switch (action) {
            case 'membership.went_valid':
            case 'membership.renewed':
                const userEmail = data.user?.email;
                const productId = data.product?.id;
                if (userEmail && productId) {
                    const planType = productId === PLANS.starter.whopProductId ? 'starter' : 'pro';
                    await this.activateSubscription(userEmail, planType, data.id);
                }
                break;
            case 'membership.went_invalid':
            case 'membership.cancelled':
                const cancelUserEmail = data.user?.email;
                if (cancelUserEmail) await this.cancelSubscription(cancelUserEmail);
                break;
        }
    }
}

export const subscriptionService = new SubscriptionService();
