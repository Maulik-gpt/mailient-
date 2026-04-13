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
            draft_reply: { limit: 10, period: 'daily' },
            schedule_call: { limit: 5, period: 'monthly' },
            ai_notes: { limit: 10, period: 'monthly' },
            sift_analysis: { limit: 10, period: 'daily' },
            arcus_ai: { limit: 50, period: 'daily' },
            email_summary: { limit: 20, period: 'daily' },
            openai_tokens: { limit: 50000, period: 'monthly' }
        }
    },
    starter: {
        id: 'starter',
        name: 'Starter',
        price: 7.99,
        polarProductId: '1c744377-4821-4714-9d0d-5b96acbfb8f0',
        polarPriceId: '6c313193-76f4-4cb8-b34c-8871e7f4ad20',
        polarCheckoutUrl: 'https://buy.polar.sh/polar_cl_ojXGgACq5GNMsUInVP3HX5vpXepohT5P8m7SL2RcCej',
        checkoutUrl: 'https://buy.polar.sh/polar_cl_ojXGgACq5GNMsUInVP3HX5vpXepohT5P8m7SL2RcCej',
        // Legacy Whop IDs (kept for backward compatibility)
        whopProductId: 'plan_OXtDPFaYlmYWN',
        whopCheckoutUrl: 'https://whop.com/checkout/plan_OXtDPFaYlmYWN',
        limits: {
            draft_reply: { limit: 200, period: 'daily' },
            schedule_call: { limit: -1, period: 'monthly' },
            ai_notes: { limit: -1, period: 'monthly' },
            sift_analysis: { limit: 200, period: 'daily' },
            arcus_ai: { limit: 1000, period: 'daily' },
            email_summary: { limit: 500, period: 'daily' },
            openai_tokens: { limit: 2000000, period: 'monthly' }
        }
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: 29.99,
        polarProductId: '8a55bd82-d07a-4655-acd9-25728c50ba4b',
        polarPriceId: '585d2a3e-3fe5-490d-af1f-d0e9d6b736a9',
        polarCheckoutUrl: 'https://buy.polar.sh/polar_cl_BmoCj2jm6Hxy2Pc4DI6y717wsENNDAniGPfsB1pMO61',
        checkoutUrl: 'https://buy.polar.sh/polar_cl_BmoCj2jm6Hxy2Pc4DI6y717wsENNDAniGPfsB1pMO61',
        // Legacy Whop IDs (kept for backward compatibility)
        whopProductId: 'plan_HjjXVb5SWxdOK',
        whopCheckoutUrl: 'https://whop.com/checkout/plan_HjjXVb5SWxdOK',
        limits: {
            draft_reply: { limit: -1, period: 'monthly' }, // -1 means unlimited
            schedule_call: { limit: -1, period: 'monthly' },
            ai_notes: { limit: -1, period: 'monthly' },
            sift_analysis: { limit: -1, period: 'daily' },
            arcus_ai: { limit: -1, period: 'daily' },
            email_summary: { limit: -1, period: 'daily' },
            openai_tokens: { limit: -1, period: 'monthly' } // unlimited pro
        }
    },
    none: {
        id: 'free',
        name: 'Free',
        price: 0,
        limits: {
            draft_reply: { limit: 10, period: 'daily' },
            schedule_call: { limit: 5, period: 'monthly' },
            ai_notes: { limit: 10, period: 'monthly' },
            sift_analysis: { limit: 10, period: 'daily' },
            arcus_ai: { limit: 50, period: 'daily' },
            email_summary: { limit: 20, period: 'daily' },
            openai_tokens: { limit: 50000, period: 'monthly' }
        }
    },
    basic: {
        id: 'starter',
        name: 'Starter',
        price: 7.99,
        limits: {
            draft_reply: { limit: 200, period: 'daily' },
            schedule_call: { limit: -1, period: 'monthly' },
            ai_notes: { limit: -1, period: 'monthly' },
            sift_analysis: { limit: 200, period: 'daily' },
            arcus_ai: { limit: 1000, period: 'daily' },
            email_summary: { limit: 500, period: 'daily' },
            openai_tokens: { limit: 2000000, period: 'monthly' }
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
    EMAIL_SUMMARY: 'email_summary',
    OPENAI_TOKENS: 'openai_tokens'
};

function normalizePlanConfig() {
    const featureKeys = Object.values(FEATURE_TYPES);

    const normalizeFeature = (planId, featureType, cfg) => {
        const period = cfg?.period || 'daily';
        let limit = cfg?.limit;

        // Ensure Arcus AI has a healthy default if missing
        if (featureType === FEATURE_TYPES.ARCUS_AI && (limit === undefined || limit === null)) {
            limit = planId === 'pro' ? -1 : (planId === 'starter' ? 1000 : 50);
        }

        if (planId === 'free' || planId === 'none') {
            if (!Number.isFinite(limit) || limit < 0) return { limit: 10, period }; // Always at least 10 for free
            return { limit, period };
        }

        if (planId === 'starter' || planId === 'basic') {
            if (!Number.isFinite(limit) || limit < 0) return { limit: 200, period }; 
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
            console.log('🧪 Checking subscription DB connection...');
            const { data, error } = await this.supabase
                .from('user_subscriptions')
                .select('count')
                .limit(1);

            if (error) {
                console.error(`❌ DB Connection failed: ${error.message}`);
                return false;
            }
            this._connectionTested = true;
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get plan information for AI context
     */
    getPlanInfo(planType, subscriptionEndDate) {
        const plan = PLANS[planType?.toLowerCase()] || PLANS.free;
        const now = new Date();
        const isActive = subscriptionEndDate ? new Date(subscriptionEndDate) > now : true;

        return {
            planName: plan.name,
            planType: plan.id,
            status: isActive ? 'active' : 'expired',
            expiresAt: subscriptionEndDate || 'never'
        };
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
        
        // Basic status check
        // Added 'trialing' as an active status
        if (subscription.status !== 'active' && subscription.status !== 'cancelled' && subscription.status !== 'trialing') return false;
        
        // If no end date is set, consider it active (forever or to be updated)
        if (!subscription.subscription_ends_at) return true;
        
        const now = new Date();
        const endDate = new Date(subscription.subscription_ends_at);
        return endDate > now;
    }

    async isSubscriptionExpired(userId) {
        const subscription = await this.getUserSubscription(userId);
        if (!subscription) return false;
        
        // If it's not a free plan but the date has passed
        const planType = subscription.plan_type?.toLowerCase();
        if (planType === 'free' || planType === 'none') return false;

        if (!subscription.subscription_ends_at) return false;

        const now = new Date();
        const endDate = new Date(subscription.subscription_ends_at);
        return endDate < now;
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
        
        // Status check
        if (subscription.status !== 'active' && subscription.status !== 'cancelled' && subscription.status !== 'trialing') return 'free';
        
        // Expiration check - ALWAYS check if end date exists
        if (subscription.subscription_ends_at) {
            const now = new Date();
            const endDate = new Date(subscription.subscription_ends_at);
            if (endDate <= now) return 'free';
        }

        let planType = subscription.plan_type?.toLowerCase();
        const mapping = { 
            'starter': 'starter', 
            'pro': 'pro', 
            'professional': 'pro', 
            'premium': 'pro', 
            'basic': 'starter', 
            'free': 'free',
            'none': 'free',
            'unknown': 'free',
            '': 'free'
        };
        const normalized = mapping[planType] || planType || 'free';

        if (PLANS[normalized]) return normalized;
        
        // Fallback: search for keywords in plan_type if not direct match
        if (planType && typeof planType === 'string') {
            if (planType.includes('pro')) return 'pro';
            if (planType.includes('starter') || planType.includes('basic') || planType.includes('mailient')) return 'starter';
        }

        return 'free';
    }

    async downgradeToFree(userId) {
        if (!userId) return null;
        userId = userId.toLowerCase();
        try {
            console.log(`📉 Downgrading ${userId} to Free plan (deleting subscription record)`);
            const { error } = await this.supabase
                .from('user_subscriptions')
                .delete()
                .ilike('user_id', userId);

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
                    preferences.plan = 'free';
                    await this.supabase
                        .from('user_profiles')
                        .update({ preferences, updated_at: new Date().toISOString() })
                        .ilike('user_id', userId);
                }
            } catch (pErr) {
                console.error('Error updating profile plan for free:', pErr);
            }

            // Also reset usage to give them a fresh start on the free tier
            await this.resetAllFeatureUsage(userId, new Date(), null, true);
            
            return { success: true, plan: 'free' };
        } catch (error) {
            console.error('Error in downgradeToFree:', error);
            return null;
        }
    }

    async activateSubscription(userId, planType, subscriptionId = null, providerDates = null, paymentMethodInfo = null) {
        if (!userId) throw new Error('User ID is required');
        
        // If it's the free plan, we just want to clear any existing subscription record
        if (planType?.toLowerCase() === 'free') {
            return await this.downgradeToFree(userId);
        }

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
                subscription_ends_at: planType === 'free' ? null : endDate.toISOString(),
                status: 'active',
                updated_at: now.toISOString(),
                source: providerDates ? (providerDates.provider || 'Provider') : 'Calculated'
            };

            // Store payment method info if provided (from Polar webhook)
            if (paymentMethodInfo?.last4) {
                subscriptionData.payment_method_last4 = paymentMethodInfo.last4;
            }
            if (paymentMethodInfo?.brand) {
                subscriptionData.payment_method_brand = paymentMethodInfo.brand;
            }

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
                    
                    // Conversion Reward Logic for Referrals
                    if (isNewSubscription && planType !== 'free' && !preferences.conversion_rewarded) {
                        try {
                            const { data: userProfile } = await this.supabase
                                .from('user_profiles')
                                .select('invited_by')
                                .ilike('user_id', userId)
                                .maybeSingle();
                            
                            const inviterCode = userProfile?.invited_by;
                            if (inviterCode) {
                                console.log(`🚀 Conversion detected: ${userId} went Pro! Crediting inviter ${inviterCode}`);
                                
                                // 1. Credit the Inviter (High value reward for conversion)
                                const { data: inviter } = await this.supabase
                                    .from('user_profiles')
                                    .select('user_id, preferences, conversion_count')
                                    .or(`username.ilike.${inviterCode},user_id.ilike.${inviterCode}@%`)
                                    .maybeSingle();
                                
                                if (inviter) {
                                    const inviterPrefs = inviter.preferences || {};
                                    const bonus = inviterPrefs.bonus_credits || {};
                                    bonus.arcus_ai = (bonus.arcus_ai || 0) + 100; // Big bonus for Pro conversion
                                    inviterPrefs.bonus_credits = bonus;
                                    
                                    // Increment conversion count
                                    const currentConversionCount = inviter.conversion_count || 0;
                                    
                                    await this.supabase
                                        .from('user_profiles')
                                        .update({ 
                                            preferences: inviterPrefs,
                                            conversion_count: currentConversionCount + 1 
                                        })
                                        .eq('user_id', inviter.user_id);
                                }
                                
                                // 2. Credit the Subscriber (Extra loyalty units)
                                const bonus = preferences.bonus_credits || {};
                                bonus.arcus_ai = (bonus.arcus_ai || 0) + 50;
                                preferences.bonus_credits = bonus;
                                preferences.conversion_rewarded = true; // Mark as done
                                
                                console.log(`🎁 Conversion rewards applied to inviter and ${userId}`);
                            }
                        } catch (convErr) {
                            console.error('Error processing conversion rewards:', convErr);
                        }
                    }

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

            // For non-free tier, if subscription record is missing OR inactive, 
            // we let it fall through to the limits check which will handle the fallback
            // rather than a hard block that returns 0 credits.
            if (!isFree && (!subscription || !isActive)) {
                console.warn(`⚠️ [LIMITS] Subscription inactive for ${userId}. Falling back to standard limits.`);
                // We don't return early here, we let the planType determine the limits.
                // If planType was already downgraded to 'free' above, it will use free limits.
            }

            // ROBUST FALLBACK: If plan or limits are missing, always inherit from Free
            let plan = PLANS[planType] || PLANS.free;
            let featureLimits = plan?.limits[featureType] || PLANS.free.limits[featureType];

            // Safety net: hardcoded minimums if even PLANS.free is corrupted
            if (!featureLimits) {
                console.warn(`🚨 [LIMITS] Missing config for ${featureType}. Using hardcoded safety net.`);
                const safetyLimit = featureType === 'arcus_ai' ? 50 : 10;
                featureLimits = { limit: safetyLimit, period: 'daily' };
            }

            // Fetch permanent bonus credits from profile preferences
            let bonusLimit = 0;
            try {
                const { data: profile } = await this.supabase
                    .from('user_profiles')
                    .select('preferences')
                    .ilike('user_id', userId)
                    .maybeSingle();
                
                if (profile?.preferences?.bonus_credits?.[featureType]) {
                    bonusLimit = Number(profile.preferences.bonus_credits[featureType]) || 0;
                }
            } catch (err) {
                console.warn('Error fetching bonus credits:', err);
            }

            const totalLimit = featureLimits.limit === -1 ? -1 : featureLimits.limit + bonusLimit;

            // If limit is 0 (and no bonus), the feature is not available on this plan
            if (totalLimit === 0) {
                return { usage: 0, limit: 0, remaining: 0, hasAccess: false, planType, period: featureLimits.period };
            }

            if (featureLimits.limit === -1) {
                return { usage: 0, limit: -1, remaining: -1, hasAccess: true, isUnlimited: true, planType, period: featureLimits.period };
            }

            const isDaily = featureLimits.period === 'daily';
            const today = new Date().toISOString().split('T')[0];

            let query = this.supabase
                .from('user_feature_usage')
                .select('id, usage_count, updated_at, metadata')
                .ilike('user_id', userId)
                .eq('feature_type', featureType);

            if (isDaily) {
                query = query.eq('last_reset_date', today);
                // For daily limits, the reset date is sufficient. 
                // We no longer strictly enforce period_start/end boundaries to avoid sync issues.
            } else {
                // Free users with no subscription record: use current month
                const monthStart = new Date();
                monthStart.setDate(1);
                query = query.gte('period_start', monthStart.toISOString().split('T')[0]);
            }

            // Use order and limit(1) instead of maybeSingle() to handle potential duplicates gracefully
            // Sorting by updated_at ensures we get the most recent record if duplicates exist
            const { data: usageRows, error: queryError } = await query
                .order('updated_at', { ascending: false })
                .limit(1);

            if (queryError) throw queryError;

            const row = usageRows?.[0];
            const usage = row?.usage_count || 0;
            const remaining = Math.max(0, totalLimit - usage);

            return {
                id: row?.id,
                usage,
                limit: totalLimit,
                remaining,
                hasAccess: remaining > 0,
                period: featureLimits.period,
                planType,
                updatedAt: row?.updated_at,
                metadata: row?.metadata
            };
        } catch (error) {
            console.error('💥 [getFeatureUsage] CRITICAL ERROR for', userId, featureType, '=>', error);
            return { usage: 0, limit: 0, remaining: 0, hasAccess: false, planType: 'free' };
        }
    }

    async canUseFeature(userId, featureType) {
        if (!userId) {
            console.error('🔴 [CREDITS] Attempted to check credits without UserID');
            return false;
        }
        try {
            const usage = await this.getFeatureUsage(userId, featureType);
            const hasAccess = usage.hasAccess || usage.isUnlimited;
            
            console.log(`🔍 [CREDITS] ${userId} | ${featureType} | Usage: ${usage.usage}/${usage.limit} | Access: ${hasAccess} | Plan: ${usage.planType}`);
            
            if (!hasAccess && usage.limit === 0) {
                console.warn(`⚠️ [CREDITS] Feature ${featureType} might be misconfigured. Limit is 0 for plan ${usage.planType}`);
            }
            
            return hasAccess;
        } catch (error) {
            console.error(`💥 [CREDITS] Error checking feature access for ${userId} (${featureType}):`, error);
            return false;
        }
    }

    async incrementFeatureUsage(userId, featureType, runId = null) {
        if (!userId) return { success: false };
        userId = userId.toLowerCase();
        try {
            const currentUsage = await this.getFeatureUsage(userId, featureType);
            
            console.log(`🚀 [SERVICE] Incrementing ${featureType} for ${userId}. Current: ${currentUsage.usage}/${currentUsage.limit}`);

            if (currentUsage.isUnlimited) return { success: true, isUnlimited: true };
            if (!currentUsage.hasAccess) {
                console.error(`🔴 [SERVICE] Blocked increment: Limit reached for ${userId} (${featureType})`);
                return { success: false, error: 'Limit reached' };
            }

            // Idempotency: prevent rapid double-counting (within 3 seconds)
            const now = new Date();
            if (currentUsage.updatedAt) {
                const lastUsed = new Date(currentUsage.updatedAt);
                const diffSeconds = (now.getTime() - lastUsed.getTime()) / 1000;
                
                if (diffSeconds < 3 && !runId) {
                    console.log(`🛡️ [SERVICE] Throttling rapid increment for ${userId} : ${featureType} (RunID: ${runId})`);
                    return { success: true, newUsage: currentUsage.usage, throttled: true };
                }
            }

            const subscription = await this.getUserSubscription(userId);
            const plan = PLANS[currentUsage.planType] || PLANS.free;
            const featureLimits = plan.limits[featureType];

            if (!featureLimits) {
                console.error(`❌ [SERVICE] No feature limits found for ${featureType} on plan ${currentUsage.planType}`);
                return { success: false, error: 'Feature configuration error' };
            }

            const todayStr = now.toISOString().split('T')[0];
            let periodStart = todayStr;
            let periodEnd = todayStr;

            if (subscription) {
                periodStart = subscription.subscription_started_at.split('T')[0];
                periodEnd = subscription.subscription_ends_at.split('T')[0];
            } else {
                // Free tier
                const monthStart = new Date();
                monthStart.setDate(1);
                periodStart = monthStart.toISOString().split('T')[0];
                periodEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).toISOString().split('T')[0];
            }

            const newUsageCount = (currentUsage.usage || 0) + 1;

            const usageObj = {
                user_id: userId,
                feature_type: featureType,
                usage_count: newUsageCount,
                last_reset_date: todayStr,
                period_start: (featureLimits && featureLimits.period === 'daily') ? todayStr : periodStart,
                period_end: (featureLimits && featureLimits.period === 'daily') ? todayStr : periodEnd,
                updated_at: now.toISOString(),
                metadata: {
                    lastRunId: runId,
                    lastIncrementAt: now.toISOString()
                }
            };

            let updateResult;
            if (currentUsage.id) {
                updateResult = await this.supabase
                    .from('user_feature_usage')
                    .update(usageObj)
                    .eq('id', currentUsage.id);
            } else {
                updateResult = await this.supabase
                    .from('user_feature_usage')
                    .upsert(usageObj, { onConflict: 'user_id,feature_type,period_start' });
            }

            if (updateResult.error) {
                console.error(`❌ [SERVICE] DB update failed for ${userId}:`, updateResult.error);
                throw updateResult.error;
            }

            console.log(`✅ [SERVICE] Usage incremented to ${newUsageCount} for ${userId} (${featureType})`);
            return { success: true, newUsage: newUsageCount };
        } catch (error) {
            console.error('Error in incrementFeatureUsage:', error);
            return { success: false, error: error.message };
        }
    }

    async decrementFeatureUsage(userId, featureType, amount) {
        if (!userId) return { success: false };
        userId = userId.toLowerCase();
        try {
            const currentUsage = await this.getFeatureUsage(userId, featureType);
            const todayStr = new Date().toISOString().split('T')[0];

            // If we have an existing row, we can just subtract from it
            if (currentUsage.id) {
                const { error } = await this.supabase
                    .from('user_feature_usage')
                    .update({ 
                        usage_count: Math.max(-1000000, currentUsage.usage - amount),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', currentUsage.id);
                
                return { success: !error };
            }

            // If no row exists, we create one with negative usage (bonus credits for the period)
            const plan = PLANS[currentUsage.planType];
            const featureLimits = plan.limits[featureType];
            
            const usageObj = {
                user_id: userId,
                feature_type: featureType,
                usage_count: -amount,
                last_reset_date: todayStr,
                period_start: (featureLimits && featureLimits.period === 'daily') ? todayStr : todayStr, // Simplification
                period_end: (featureLimits && featureLimits.period === 'daily') ? todayStr : todayStr,
                updated_at: new Date().toISOString()
            };

            await this.supabase.from('user_feature_usage').upsert(usageObj, { onConflict: 'user_id,feature_type,period_start' });
            return { success: true };
        } catch (error) {
            console.error('Error in decrementFeatureUsage:', error);
            return { success: false };
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
                subscriptionId: subscription?.whop_membership_id || subscription?.id || null,
                subscriptionEndsAt: subscription?.subscription_ends_at,
                subscriptionStartedAt: subscription?.subscription_started_at,
                daysRemaining: subscription ? this.getDaysRemaining(subscription.subscription_ends_at) : 0,
                paymentMethodLast4: subscription?.payment_method_last4 || null,
                paymentMethodBrand: subscription?.payment_method_brand || null,
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

    async logTokenUsage(userId, tokenCount) {
        if (!userId || !tokenCount) return;
        try {
            // We reuse the feature usage system but for tokens
            const { data: existing } = await this.supabase
                .from('user_feature_usage')
                .select('id, usage_count')
                .eq('user_id', userId.toLowerCase())
                .eq('feature_type', FEATURE_TYPES.OPENAI_TOKENS)
                .maybeSingle();

            if (existing) {
                await this.supabase
                    .from('user_feature_usage')
                    .update({ usage_count: (existing.usage_count || 0) + tokenCount, updated_at: new Date().toISOString() })
                    .eq('id', existing.id);
            } else {
                await this.supabase
                    .from('user_feature_usage')
                    .insert({
                        user_id: userId.toLowerCase(),
                        feature_type: FEATURE_TYPES.OPENAI_TOKENS,
                        usage_count: tokenCount,
                        period_start: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
            }
        } catch (e) {
            console.error('Error logging token usage:', e);
        }
    }

    async getRecentPayments(userId) {
        if (!userId) return [];
        userId = userId.toLowerCase();
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription || subscription.plan_type === 'free' || subscription.plan_type === 'none') {
                return [];
            }

            // Build payment entry from subscription record
            const payments = [];
            if (subscription.status === 'active' || subscription.status === 'cancelled') {
                const last4 = subscription.payment_method_last4;
                const brand = subscription.payment_method_brand;
                payments.push({
                    id: subscription.id,
                    date: subscription.subscription_started_at || subscription.created_at,
                    amount: subscription.plan_price || 0,
                    method: last4 ? `${(brand || 'card').charAt(0).toUpperCase() + (brand || 'card').slice(1)} ending in ${last4}` : null,
                    last4: last4 || null,
                    brand: brand || null,
                    status: 'paid',
                    planType: subscription.plan_type
                });
            }
            return payments;
        } catch (error) {
            console.error('Error in getRecentPayments:', error);
            return [];
        }
    }

    async getInvoices(userId) {
        if (!userId) return [];
        userId = userId.toLowerCase();
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription || subscription.plan_type === 'free' || subscription.plan_type === 'none') {
                return [];
            }

            // Build invoice from subscription data
            const invoices = [];
            if (subscription.plan_price && subscription.plan_price > 0) {
                invoices.push({
                    id: subscription.id,
                    number: `INV-${(subscription.whop_membership_id || subscription.id || '').slice(-8).toUpperCase()}`,
                    date: subscription.subscription_started_at || subscription.created_at,
                    amount: subscription.plan_price,
                    status: 'paid',
                    planType: subscription.plan_type
                });
            }
            return invoices;
        } catch (error) {
            console.error('Error in getInvoices:', error);
            return [];
        }
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
