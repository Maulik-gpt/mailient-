/**
 * Quick script to check subscription status and identify potential issues
 */

import { getSupabaseAdmin } from './lib/supabase.js';
import { PLANS } from './lib/subscription-service.js';

async function checkSubscriptions() {
    const supabase = getSupabaseAdmin();
    
    console.log('🔍 Checking subscription data...\n');
    
    // Get all subscriptions
    const { data: allSubs, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .order('updated_at', { ascending: false });
    
    if (error) {
        console.error('❌ Error fetching subscriptions:', error);
        return;
    }
    
    console.log(`📊 Total subscriptions: ${allSubs.length}`);
    
    // Analyze subscriptions
    const analysis = {
        total: allSubs.length,
        active: 0,
        expired: 0,
        cancelled: 0,
        inactive: 0,
        starter: 0,
        pro: 0,
        none: 0,
        issues: []
    };
    
    const now = new Date();
    
    for (const sub of allSubs) {
        // Count by status
        analysis[sub.status] = (analysis[sub.status] || 0) + 1;
        
        // Count by plan type
        analysis[sub.plan_type] = (analysis[sub.plan_type] || 0) + 1;
        
        // Check for issues
        const endDate = new Date(sub.subscription_ends_at);
        const isActive = sub.status === 'active' && endDate > now;
        
        // Check plan mismatches
        const isStarterProduct = sub.whop_product_id === PLANS.starter.whopProductId;
        const isProProduct = sub.whop_product_id === PLANS.pro.whopProductId;
        
        if (sub.plan_type === 'starter' && !isStarterProduct) {
            analysis.issues.push({
                user: sub.user_id,
                issue: 'Plan type starter but wrong product ID',
                productId: sub.whop_product_id,
                expectedId: PLANS.starter.whopProductId
            });
        }
        
        if (sub.plan_type === 'pro' && !isProProduct) {
            analysis.issues.push({
                user: sub.user_id,
                issue: 'Plan type pro but wrong product ID',
                productId: sub.whop_product_id,
                expectedId: PLANS.pro.whopProductId
            });
        }
        
        // Check expired but still active
        if (sub.status === 'active' && endDate <= now) {
            analysis.issues.push({
                user: sub.user_id,
                issue: 'Subscription expired but still marked active',
                expiredDate: sub.subscription_ends_at
            });
        }
        
        // Check missing product IDs
        if (!sub.whop_product_id && sub.status === 'active') {
            analysis.issues.push({
                user: sub.user_id,
                issue: 'Active subscription missing Whop product ID'
            });
        }
    }
    
    // Print results
    console.log('\n📈 Subscription Status:');
    console.log(`  Active: ${analysis.active}`);
    console.log(`  Expired: ${analysis.expired}`);
    console.log(`  Cancelled: ${analysis.cancelled}`);
    console.log(`  Inactive: ${analysis.inactive}`);
    
    console.log('\n💳 Plan Distribution:');
    console.log(`  Starter: ${analysis.starter}`);
    console.log(`  Pro: ${analysis.pro}`);
    console.log(`  None: ${analysis.none}`);
    
    console.log('\n🚨 Issues Found:');
    if (analysis.issues.length === 0) {
        console.log('  ✅ No issues detected');
    } else {
        analysis.issues.forEach((issue, i) => {
            console.log(`  ${i + 1}. User: ${issue.user.substring(0, 20)}...`);
            console.log(`     Issue: ${issue.issue}`);
            if (issue.productId) console.log(`     Product ID: ${issue.productId}`);
            if (issue.expectedId) console.log(`     Expected ID: ${issue.expectedId}`);
            if (issue.expiredDate) console.log(`     Expired: ${issue.expiredDate}`);
            console.log('');
        });
    }
    
    // Check for potential free users (no subscription but using features)
    console.log('\n🔍 Checking for users without subscriptions...');
    const { data: featureUsage } = await supabase
        .from('user_feature_usage')
        .select('user_id, usage_count, feature_type')
        .gt('usage_count', 0);
    
    if (featureUsage && featureUsage.length > 0) {
        const usersWithUsage = new Set(featureUsage.map(f => f.user_id));
        const subscribedUsers = new Set(allSubs.map(s => s.user_id));
        const unsubscribedUsers = [...usersWithUsage].filter(user => !subscribedUsers.has(user));
        
        if (unsubscribedUsers.length > 0) {
            console.log(`⚠️  Found ${unsubscribedUsers.length} users using features without subscriptions:`);
            unsubscribedUsers.forEach(user => {
                const usage = featureUsage.filter(f => f.user_id === user);
                const totalUsage = usage.reduce((sum, f) => sum + f.usage_count, 0);
                console.log(`  - ${user.substring(0, 30)}... (${totalUsage} total uses)`);
            });
        } else {
            console.log('✅ All feature usage is from subscribed users');
        }
    }
    
    console.log('\n🎯 Expected Product IDs:');
    console.log(`  Starter: ${PLANS.starter.whopProductId}`);
    console.log(`  Pro: ${PLANS.pro.whopProductId}`);
}

// Run the check
checkSubscriptions().catch(console.error);
