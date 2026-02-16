/**
 * Subscription Service for Mailient
 * Handles Polar payment integration, subscription management, and feature usage tracking
 */

import { getSupabaseAdmin } from './supabase.js';
import crypto from 'crypto';

// Plan configurations - Now using Polar
export const PLANS = {
    free: {
        id: 'free',
        name: 'Free',
        price: 0,
        limits: {
            draft_reply: { limit: 1, period: 'daily' },
            schedule_call: { limit: 0, period: 'daily' },
            ai_notes: { limit: 2, period: 'monthly' },
            sift_analysis: { limit: 1, period: 'daily' },
            arcus_ai: { limit: 0, period: 'daily' },
            email_summary: { limit: 3, period: 'daily' }
        }
    },
    starter: {
        id: 'starter',
        name: 'Starter',
        price: 7.99,
        polarProductId: '1c744377-4821-4714-9d0d-5b96acbfb8f0',
        polarPriceId: '6c313193-76f4-4cb8-b34c-8871e7f4ad20',
        polarCheckoutUrl: 'https://buy.polar.sh/polar_cl_B9DSDJSz1EeVhR8rtLcVgn1vVvjvizMvp0yOs3IQOJW',
        checkoutUrl: 'https://buy.polar.sh/polar_cl_B9DSDJSz1EeVhR8rtLcVgn1vVvjvizMvp0yOs3IQOJW',
        // Legacy Whop IDs (kept for backward compatibility)
        whopProductId: 'plan_OXtDPFaYlmYWN',
        whopCheckoutUrl: 'https://whop.com/checkout/plan_OXtDPFaYlmYWN',
        limits: {
            draft_reply: { limit: 10, period: 'daily' },
            schedule_call: { limit: 30, period: 'monthly' },
            ai_notes: { limit: 50, period: 'monthly' },
            sift_analysis: { limit: 10, period: 'daily' },
            arcus_ai: { limit: 20, period: 'daily' },
            email_summary: { limit: 30, period: 'daily' }
        }
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: 29.99,
        polarProductId: '8a55bd82-d07a-4655-acd9-25728c50ba4b',
        polarPriceId: '585d2a3e-3fe5-490d-af1f-d0e9d6b736a9',
        polarCheckoutUrl: 'https://buy.polar.sh/polar_cl_B9DSDJSz1EeVhR8rtLcVgn1vVvjvizMvp0yOs3IQOJW',
        checkoutUrl: 'https://buy.polar.sh/polar_cl_B9DSDJSz1EeVhR8rtLcVgn1vVvjvizMvp0yOs3IQOJW',
        // Legacy Whop IDs (kept for backward compatibility)
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

        if (planId === 'free') {
            if (!Number.isFinite(limit) || limit < 0) return { limit: 0, period };
            return { limit, period };
        }

        if (planId === 'starter') {
            if (!Number.isFinite(limit) || limit < 0) return { limit: 0, period };
            return { limit, period };
        }

        if (planId === 'pro') {
            return { limit: -1, period };
        }

        return cfg;
    };

    for (const featureType of featureKeys) {
        PLANS.free.limits[featureType] = normalizeFeature('free', featureType, PLANS.free.limits?.[featureType]);
        PLANS.starter.limits[featureType] = normalizeFeature('starter', featureType, PLANS.starter.limits?.[featureType]);
        PLANS.pro.limits[featureType] = normalizeFeature('pro', featureType, PLANS.pro.limits?.[featureType]);
    }
}

normalizePlanConfig();

export class SubscriptionService {
    constructor() {
        this._supabase = null;
        this._connectionTested = false;
    }

    get supabase() {
        if (!this._supabase) {
            this._supabase = getSupabaseAdmin();
        }
        return this._supabase;
    }

    async testConnection() {
        if (this._connectionTested) return true;
        try {
            const { data, error } = await this.supabase
                .from('user_subscriptions')
                .select('count')
                .limit(1);

            if (error) {
                if (error.code === '42P01') {
                    console.error('❌ CRITICAL: user_subscriptions table missing');
                    return false;
                }
                return false;
            }
            this._connectionTested = true;
            return true;
        } catch (error) {
            return false;
        }
    }

    async getUserSubscription(userId) {
        if (!userId) return null;
        userId = userId.toLowerCase();
        try {
            const { data, error } = await this.supabase
                .from('user_subscriptions')
                .select('*')
                .ilike('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(1);

            if (error) throw error;
            return Array.isArray(data) && data.length > 0 ? data[0] : null;
        } catch (error) {
            console.error('Error in getUserSubscription:', error);
            return null;
        }
    }

    async isSubscriptionActive(userId) {
        const subscription = await this.getUserSubscription(userId);
        if (!subscription) return false;
        if (subscription.status !== 'active' && subscription.status !== 'cancelled') return false;
        const now = new Date();
        const endDate = new Date(subscription.subscription_ends_at);
        return endDate > now;
    }

    async checkAccess(userId) {
        if (!userId) return false;
        const planType = await this.getUserPlanType(userId);
        const isActive = await this.isSubscriptionActive(userId);
        // Free tier and all users with a valid plan should have base access to the app
        return isActive || planType === 'free' || planType === 'starter' || planType === 'pro';
    }

    /**
     * Determine plan type from Polar/Whop data
     */
    determinePlanType(data) {
        // 1. Check by exact Polar Product ID or Price ID (Most reliable)
        const productId = data.product_id || (typeof data.product === 'string' ? data.product : data.product?.id);
        const priceId = data.price_id || (typeof data.price === 'string' ? data.price : data.price?.id);

        console.log('🔍 [SERVICE] Detecting plan by IDs:', { productId, priceId });

        // Organization cross-check if available
        const orgId = data.organization_id || data.organization?.id;
        if (orgId && process.env.POLAR_ORGANIZATION_ID && orgId !== process.env.POLAR_ORGANIZATION_ID) {
            console.warn('⚠️ [SERVICE] Webhook organization ID mismatch:', { orgId, expected: process.env.POLAR_ORGANIZATION_ID });
        }

        if (productId === PLANS.pro.polarProductId || priceId === PLANS.pro.polarPriceId) {
            return 'pro';
        }
        if (productId === PLANS.starter.polarProductId || priceId === PLANS.starter.polarPriceId) {
            return 'starter';
        }

        // 2. Check by name (Fallback)
        const productName = (data.product?.name || data.product_name || '').toLowerCase();
        const priceName = (data.price?.name || data.price_name || '').toLowerCase();

        console.log('🔍 [SERVICE] Fallback to names:', { productName, priceName });

        if (productName.includes('pro') || priceName.includes('pro')) {
            return 'pro';
        }
        if (productName.includes('starter') || priceName.includes('starter') || productName.includes('basic') || productName.includes('mailient')) {
            // Check price to differentiate
            const priceAmount = data.price?.price_amount || data.amount || 0;
            if (priceAmount >= 2000) return 'pro'; // If it mentions Mailient but costs $20+, likely Pro
            return 'starter';
        }

        // 3. Check by price amount (Fallback)
        const priceAmount = data.price?.price_amount || data.amount || 0;
        if (priceAmount >= 2000) { // $20+ usually Pro
            return 'pro';
        } else if (priceAmount > 0) {
            return 'starter';
        }

        // Default to 'none' if we really don't know, rather than assuming 'starter'
        console.warn('⚠️ [SERVICE] Could not determine plan type, defaulting to none', {
            productId, priceId, productName, priceAmount
        });
        return 'none';
    }

    async getUserPlanType(userId) {
        const subscription = await this.getUserSubscription(userId);
        if (!subscription) return 'free';
        if (subscription.status !== 'active' && subscription.status !== 'cancelled') return 'free';
        const now = new Date();
        const endDate = new Date(subscription.subscription_ends_at);
        if (endDate <= now) return 'free';

        let planType = subscription.plan_type?.toLowerCase();
        const mapping = { 'starter': 'starter', 'pro': 'pro', 'professional': 'pro', 'basic': 'starter', 'premium': 'pro', 'free': 'free' };
        const normalized = mapping[planType] || planType;

        if (PLANS[normalized]) return normalized;
        return 'free';
    }

    async activateSubscription(userId, planType, subscriptionId = null, providerDates = null) {
        if (!userId) return null;
        userId = userId.toLowerCase();
        try {
            const plan = PLANS[planType];
            if (!plan) throw new Error(`Invalid plan type: ${planType}`);

            const existingSubscription = await this.getUserSubscription(userId);
            const isActive = existingSubscription && existingSubscription.status === 'active';
            const now = new Date();
            let isNewSubscription = true;

            const isWebhookRenewal = !!providerDates?.isRenewal;

            if (existingSubscription) {
                const existingEndDate = new Date(existingSubscription.subscription_ends_at);
                if (isWebhookRenewal || (isActive && existingEndDate > now)) {
                    isNewSubscription = false;
                }
            }

            let startDate = now;
            let endDate = new Date(now);
            endDate.setMonth(endDate.getMonth() + 1);

            if (providerDates) {
                if (providerDates.createdAt) {
                    const ts = Number(providerDates.createdAt);
                    if (!isNaN(ts) && ts > 0) startDate = new Date(ts * 1000);
                }
                if (providerDates.validUntil) {
                    const ts = Number(providerDates.validUntil);
                    if (!isNaN(ts) && ts > 0) endDate = new Date(ts * 1000);
                } else if (providerDates.expiresAt) {
                    const ts = Number(providerDates.expiresAt);
                    if (!isNaN(ts) && ts > 0) endDate = new Date(ts * 1000);
                }
            }

            if (isNaN(startDate.getTime())) startDate = now;
            if (isNaN(endDate.getTime())) {
                endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + 1);
            }

            const subscriptionData = {
                user_id: userId,
                whop_membership_id: subscriptionId,
                whop_product_id: plan.polarProductId || plan.whopProductId,
                plan_type: planType,
                plan_price: plan.price,
                subscription_started_at: startDate.toISOString(),
                subscription_ends_at: endDate.toISOString(),
                status: 'active',
                updated_at: now.toISOString(),
                source: providerDates ? (providerDates.provider || 'Provider') : 'Calculated'
            };

            const { data, error } = await this.supabase
                .from('user_subscriptions')
                .upsert(subscriptionData, { onConflict: 'user_id', ignoreDuplicates: false })
                .select()
                .single();

            if (error) throw error;

            // Update user profile plan
            try {
                const { data: profile } = await this.supabase
                    .from('user_profiles')
                    .select('preferences')
                    .ilike('user_id', userId)
                    .maybeSingle();

                if (profile) {
                    const preferences = profile.preferences || {};
                    preferences.plan = planType;
                    await this.supabase
                        .from('user_profiles')
                        .update({ preferences, updated_at: now.toISOString() })
                        .ilike('user_id', userId);
                }
            } catch (pErr) {
                console.error('Error updating profile plan:', pErr);
            }

            await this.resetAllFeatureUsage(userId, startDate, endDate, isNewSubscription);
            return data;
        } catch (error) {
            console.error('Error in activateSubscription:', error);
            throw error;
        }
    }

    async cancelSubscription(userId) {
        if (!userId) return null;
        userId = userId.toLowerCase();
        try {
            const { data, error } = await this.supabase
                .from('user_subscriptions')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .ilike('user_id', userId)
                .select();

            if (error) throw error;
            return Array.isArray(data) && data.length > 0 ? data[0] : null;
        } catch (error) {
            return null;
        }
    }

    async checkAndUpdateExpiredSubscriptions() {
        try {
            const now = new Date().toISOString();
            const { data, error } = await this.supabase
                .from('user_subscriptions')
                .update({ status: 'expired', updated_at: now })
                .eq('status', 'active')
                .lt('subscription_ends_at', now);

            return data;
        } catch (error) {
            return null;
        }
    }

    async resetAllFeatureUsage(userId, periodStart, periodEnd, isNewSubscription = true) {
        if (!isNewSubscription || !userId) return;
        userId = userId.toLowerCase();
        try {
            await this.supabase.from('user_feature_usage').delete().ilike('user_id', userId);
        } catch (error) {
            console.error('Error in resetAllFeatureUsage:', error);
        }
    }

    async getFeatureUsage(userId, featureType) {
        if (!userId) return { usage: 0, limit: 0, remaining: 0, hasAccess: false, planType: 'free' };
        userId = userId.toLowerCase();
        try {
            const subscription = await this.getUserSubscription(userId);
            const planType = await this.getUserPlanType(userId);
            const isActive = await this.isSubscriptionActive(userId);

            // For free tier, allow access even without a subscription record
            const isFree = planType === 'free';

            if (!isFree && (!subscription || !isActive)) {
                return { usage: 0, limit: 0, remaining: 0, hasAccess: false, planType };
            }

            const plan = PLANS[planType];
            const featureLimits = plan?.limits[featureType];
            if (!featureLimits) return { usage: 0, limit: 0, remaining: 0, hasAccess: false, planType };

            // If limit is 0, the feature is not available on this plan
            if (featureLimits.limit === 0) {
                return { usage: 0, limit: 0, remaining: 0, hasAccess: false, planType, period: featureLimits.period };
            }

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
            } else if (subscription) {
                const subStart = new Date(subscription.subscription_started_at).toISOString().split('T')[0];
                const subEnd = new Date(subscription.subscription_ends_at).toISOString().split('T')[0];
                query = query.gte('period_start', subStart).lte('period_end', subEnd);
            } else {
                // Free users with no subscription record: use current month
                const monthStart = new Date();
                monthStart.setDate(1);
                query = query.gte('period_start', monthStart.toISOString().split('T')[0]);
            }

            const { data } = await query.maybeSingle();
            const usage = data?.usage_count || 0;
            const remaining = Math.max(0, featureLimits.limit - usage);

            return { usage, limit: featureLimits.limit, remaining, hasAccess: remaining > 0, period: featureLimits.period, planType };
        } catch (error) {
            return { usage: 0, limit: 0, remaining: 0, hasAccess: false, planType: 'free' };
        }
    }

    async canUseFeature(userId, featureType) {
        try {
            const usage = await this.getFeatureUsage(userId, featureType);
            return usage.hasAccess;
        } catch (error) {
            return false;
        }
    }

    async incrementFeatureUsage(userId, featureType) {
        if (!userId) return { success: false };
        userId = userId.toLowerCase();
        try {
            const currentUsage = await this.getFeatureUsage(userId, featureType);
            if (currentUsage.isUnlimited) return { success: true, isUnlimited: true };
            if (!currentUsage.hasAccess) return { success: false, error: 'Limit reached' };

            const subscription = await this.getUserSubscription(userId);
            const plan = PLANS[currentUsage.planType];
            const featureLimits = plan.limits[featureType];

            const todayStr = new Date().toISOString().split('T')[0];
            let periodStart = todayStr;
            let periodEnd = todayStr;

            if (subscription) {
                periodStart = subscription.subscription_started_at.split('T')[0];
                periodEnd = subscription.subscription_ends_at.split('T')[0];
            } else {
                // Free tier: use current month as period
                const monthStart = new Date();
                monthStart.setDate(1);
                const monthEnd = new Date(monthStart);
                monthEnd.setMonth(monthEnd.getMonth() + 1);
                monthEnd.setDate(0);
                periodStart = monthStart.toISOString().split('T')[0];
                periodEnd = monthEnd.toISOString().split('T')[0];
            }

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
                }, { onConflict: 'user_id,feature_type,period_start' });

            return { success: !error, newUsage: currentUsage.usage + 1 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getAllFeatureUsage(userId) {
        if (!userId) return { hasActiveSubscription: false, planType: 'free', features: {} };
        userId = userId.toLowerCase();
        try {
            const subscription = await this.getUserSubscription(userId);
            const planType = await this.getUserPlanType(userId);
            const isActive = await this.isSubscriptionActive(userId);

            const features = {};
            for (const featureType of Object.values(FEATURE_TYPES)) {
                features[featureType] = await this.getFeatureUsage(userId, featureType);
            }

            return {
                hasActiveSubscription: isActive || planType === 'free',
                planType,
                subscriptionEndsAt: subscription?.subscription_ends_at,
                daysRemaining: subscription ? this.getDaysRemaining(subscription.subscription_ends_at) : 0,
                features
            };
        } catch (error) {
            return { hasActiveSubscription: false, planType: 'free', features: {} };
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
        if (!subscription || !await this.isSubscriptionActive(userId)) return false;
        const daysRemaining = this.getDaysRemaining(subscription.subscription_ends_at);
        return daysRemaining <= daysThreshold && daysRemaining > 0;
    }

    validateWebhookSignature(payload, headers, secret) {
        try {
            if (!secret || !headers) return false;
            const webhookId = headers['webhook-id'];
            const webhookTimestamp = headers['webhook-timestamp'];
            const webhookSignature = headers['webhook-signature'];

            if (!webhookId || !webhookTimestamp || !webhookSignature) return false;

            let key = secret.trim();
            if (key.startsWith('polar_whs_')) key = key.slice('polar_whs_'.length);
            else if (key.startsWith('whsec_')) key = key.slice('whsec_'.length);

            const keyBytes = Buffer.from(key, 'base64');
            const toSign = `${webhookId}.${webhookTimestamp}.${payload}`;
            const expected = crypto.createHmac('sha256', keyBytes).update(toSign).digest('base64');

            const candidates = String(webhookSignature).split(' ').map(s => s.trim()).filter(Boolean);
            for (const candidate of candidates) {
                const [version, sig] = candidate.split(',', 2);
                if (version === 'v1' && sig === expected) return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }
}

export const subscriptionService = new SubscriptionService();
