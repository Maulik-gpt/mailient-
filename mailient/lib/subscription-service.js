/**
 * Subscription Service for Mailient
 * Handles Whop payment integration, subscription management, and feature usage tracking
 */

import { supabaseAdmin } from './supabase.js';

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
    constructor() {
        this.supabase = supabaseAdmin;
    }

    /**
     * Get user's current subscription
     */
    async getUserSubscription(userId) {
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

        if (!subscription) return 'none';
        if (subscription.status !== 'active') return 'none';

        const now = new Date();
        const endDate = new Date(subscription.subscription_ends_at);

        if (endDate <= now) return 'none';

        return subscription.plan_type;
    }

    /**
     * Create or update subscription after successful payment
     */
    async activateSubscription(userId, planType, whopMembershipId = null) {
        try {
            const plan = PLANS[planType];
            if (!plan) {
                throw new Error(`Invalid plan type: ${planType}`);
            }

            const now = new Date();
            // Subscription lasts exactly one month
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

            // Reset all feature usage for the new period
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
            const startDate = periodStart instanceof Date ? periodStart : new Date(periodStart);
            const endDate = periodEnd instanceof Date ? periodEnd : new Date(periodEnd);

            // Delete old usage records for this user
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
            if (!subscription || subscription.status !== 'active') {
                return { usage: 0, limit: 0, remaining: 0, hasAccess: false, reason: 'no_subscription' };
            }

            // CHECK SUBSCRIPTION EXPIRY - Critical for monthly access control
            const now = new Date();
            const endDate = new Date(subscription.subscription_ends_at);
            if (endDate <= now) {
                // Subscription has expired - no access until renewed
                return { usage: 0, limit: 0, remaining: 0, hasAccess: false, reason: 'subscription_expired' };
            }

            const plan = PLANS[subscription.plan_type];
            if (!plan) {
                return { usage: 0, limit: 0, remaining: 0, hasAccess: false, reason: 'invalid_plan' };
            }

            const featureLimits = plan.limits[featureType];
            if (!featureLimits) {
                return { usage: 0, limit: 0, remaining: 0, hasAccess: false, reason: 'unknown_feature' };
            }

            // Pro plan has unlimited access for the entire month
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
                // For monthly features, check within the subscription period
                query = query
                    .lte('period_start', today)
                    .gte('period_end', today);
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
            return { usage: 0, limit: 0, remaining: 0, hasAccess: false };
        }
    }

    /**
     * Check if user can use a feature (has credits remaining)
     */
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
            if (!subscription || subscription.status !== 'active') {
                return { success: false, error: 'No active subscription' };
            }

            const plan = PLANS[subscription.plan_type];
            if (!plan) {
                return { success: false, error: 'Invalid plan' };
            }

            const featureLimits = plan.limits[featureType];
            if (!featureLimits) {
                return { success: false, error: 'Unknown feature' };
            }

            // Pro plan - unlimited, no need to track
            if (featureLimits.limit === -1) {
                return { success: true, isUnlimited: true };
            }

            const isDaily = featureLimits.period === 'daily';
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // Check current usage
            const currentUsage = await this.getFeatureUsage(userId, featureType);
            if (!currentUsage.hasAccess) {
                return {
                    success: false,
                    error: 'Usage limit reached',
                    usage: currentUsage.usage,
                    limit: currentUsage.limit
                };
            }

            // Get subscription period dates
            const periodStart = subscription.subscription_started_at.split('T')[0];
            const periodEnd = subscription.subscription_ends_at.split('T')[0];

            if (isDaily) {
                // For daily features, upsert with today's date
                const { error } = await this.supabase
                    .from('user_feature_usage')
                    .upsert({
                        user_id: userId,
                        feature_type: featureType,
                        usage_count: (currentUsage.usage || 0) + 1,
                        last_reset_date: todayStr,
                        period_start: todayStr,
                        period_end: todayStr,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'user_id,feature_type,period_start',
                        ignoreDuplicates: false
                    });

                if (error) {
                    console.error('Error incrementing daily usage:', error);
                    return { success: false, error: error.message };
                }
            } else {
                // For monthly features
                const { error } = await this.supabase
                    .from('user_feature_usage')
                    .upsert({
                        user_id: userId,
                        feature_type: featureType,
                        usage_count: (currentUsage.usage || 0) + 1,
                        period_start: periodStart,
                        period_end: periodEnd,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'user_id,feature_type,period_start',
                        ignoreDuplicates: false
                    });

                if (error) {
                    console.error('Error incrementing monthly usage:', error);
                    return { success: false, error: error.message };
                }
            }

            return {
                success: true,
                newUsage: currentUsage.usage + 1,
                remaining: currentUsage.remaining - 1
            };
        } catch (error) {
            console.error('Error in incrementFeatureUsage:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all feature usage for dashboard display
     */
    async getAllFeatureUsage(userId) {
        const subscription = await this.getUserSubscription(userId);

        if (!subscription || subscription.status !== 'active') {
            return {
                hasActiveSubscription: false,
                planType: 'none',
                features: {}
            };
        }

        const features = {};
        for (const featureType of Object.values(FEATURE_TYPES)) {
            features[featureType] = await this.getFeatureUsage(userId, featureType);
        }

        return {
            hasActiveSubscription: true,
            planType: subscription.plan_type,
            subscriptionEndsAt: subscription.subscription_ends_at,
            daysRemaining: this.getDaysRemaining(subscription.subscription_ends_at),
            features
        };
    }

    /**
     * Calculate days remaining in subscription
     */
    getDaysRemaining(endDate) {
        const now = new Date();
        const end = new Date(endDate);
        const diff = end - now;
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    /**
     * Check if subscription is about to expire (for notifications)
     */
    async isSubscriptionEndingSoon(userId, daysThreshold = 3) {
        const subscription = await this.getUserSubscription(userId);
        if (!subscription || subscription.status !== 'active') return false;

        const daysRemaining = this.getDaysRemaining(subscription.subscription_ends_at);
        return daysRemaining <= daysThreshold && daysRemaining > 0;
    }

    /**
     * Get checkout URL for a plan
     */
    getCheckoutUrl(planType, userId, userEmail) {
        const plan = PLANS[planType];
        if (!plan) return null;

        // Add user info as URL parameters for tracking
        const params = new URLSearchParams();
        if (userId) params.set('user_id', userId);
        if (userEmail) params.set('email', userEmail);

        return `${plan.whopCheckoutUrl}?${params.toString()}`;
    }

    /**
     * Validate Whop webhook signature (placeholder - implement based on Whop's docs)
     */
    validateWebhookSignature(payload, signature, secret) {
        // TODO: Implement Whop webhook signature validation
        // This is a placeholder - refer to Whop's documentation for actual implementation
        return true;
    }

    /**
     * Handle Whop webhook event
     */
    async handleWebhookEvent(event) {
        const { action, data } = event;

        switch (action) {
            case 'membership.went_valid':
            case 'membership.renewed':
                // Subscription activated or renewed
                const userEmail = data.user?.email;
                const productId = data.product?.id;
                const membershipId = data.id;

                if (userEmail && productId) {
                    const planType = productId === PLANS.starter.whopProductId ? 'starter' : 'pro';
                    await this.activateSubscription(userEmail, planType, membershipId);
                }
                break;

            case 'membership.went_invalid':
            case 'membership.cancelled':
                // Subscription expired or cancelled
                const cancelUserEmail = data.user?.email;
                if (cancelUserEmail) {
                    await this.cancelSubscription(cancelUserEmail);
                }
                break;

            default:
                console.log('Unhandled webhook event:', action);
        }
    }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
