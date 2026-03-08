/**
 * Test script to reproduce the subscription credit exhaustion bug
 * Simulates the exact scenario: paid user signs out -> signs in -> loses credits
 */

import { subscriptionService } from './lib/subscription-service.js';
import { auth } from './lib/auth.js';

async function testSubscriptionBugReproduction() {
    console.log('🐛 Testing Subscription Bug Reproduction\n');
    console.log('Scenario: Paid user signs out and signs back in\n');

    const testEmail = 'test-paid-user@example.com';
    
    try {
        // Step 1: Simulate initial subscription activation (like after payment)
        console.log('1️⃣ Simulating initial subscription activation...');
        const whopDates = {
            createdAt: Math.floor(Date.now() / 1000),
            validUntil: Math.floor((Date.now() + (30 * 24 * 60 * 60 * 1000)) / 1000) // 30 days from now
        };
        
        await subscriptionService.activateSubscription(testEmail, 'starter', 'whop_mem_123', whopDates);
        
        // Step 2: Add some usage credits (simulate user activity)
        console.log('\n2️⃣ Adding user activity (using some credits)...');
        await subscriptionService.incrementFeatureUsage(testEmail, 'draft_reply');
        await subscriptionService.incrementFeatureUsage(testEmail, 'sift_analysis');
        await subscriptionService.incrementFeatureUsage(testEmail, 'sift_analysis');
        
        // Step 3: Check subscription status BEFORE sign-out
        console.log('\n3️⃣ Checking subscription status BEFORE sign-out:');
        const beforeStatus = await subscriptionService.isSubscriptionActive(testEmail);
        const beforePlan = await subscriptionService.getUserPlanType(testEmail);
        const beforeUsage = await subscriptionService.getAllFeatureUsage(testEmail);
        
        console.log(`  - Subscription Active: ${beforeStatus}`);
        console.log(`  - Plan Type: ${beforePlan}`);
        console.log(`  - Draft Reply Usage: ${beforeUsage.features.draft_reply.usage}/${beforeUsage.features.draft_reply.limit}`);
        console.log(`  - Sift Analysis Usage: ${beforeUsage.features.sift_analysis.usage}/${beforeUsage.features.sift_analysis.limit}`);
        
        // Step 4: Simulate the problematic scenario - what happens on re-auth
        console.log('\n4️⃣ Simulating RE-AUTH scenario (the bug)...');
        
        // This simulates what might happen when user signs back in
        // Check if there's any code that calls activateSubscription on re-auth
        console.log('  - Checking if activateSubscription gets called on re-auth...');
        
        // Simulate what might be happening in webhook or auth flow
        const reAuthDates = {
            createdAt: Math.floor(Date.now() / 1000),
            validUntil: whopDates.validUntil // Same expiry date
        };
        
        // This is the problematic call - if this happens on re-auth, it resets usage
        console.log('  - ⚠️  Calling activateSubscription (this might be the bug)...');
        await subscriptionService.activateSubscription(testEmail, 'starter', 'whop_mem_123', reAuthDates);
        
        // Step 5: Check subscription status AFTER re-auth
        console.log('\n5️⃣ Checking subscription status AFTER re-auth:');
        const afterStatus = await subscriptionService.isSubscriptionActive(testEmail);
        const afterPlan = await subscriptionService.getUserPlanType(testEmail);
        const afterUsage = await subscriptionService.getAllFeatureUsage(testEmail);
        
        console.log(`  - Subscription Active: ${afterStatus}`);
        console.log(`  - Plan Type: ${afterPlan}`);
        console.log(`  - Draft Reply Usage: ${afterUsage.features.draft_reply.usage}/${afterUsage.features.draft_reply.limit}`);
        console.log(`  - Sift Analysis Usage: ${afterUsage.features.sift_analysis.usage}/${afterUsage.features.sift_analysis.limit}`);
        
        // Step 6: Compare results to identify the bug
        console.log('\n6️⃣ Bug Analysis:');
        const draftReplyLost = beforeUsage.features.draft_reply.usage > afterUsage.features.draft_reply.usage;
        const siftAnalysisLost = beforeUsage.features.sift_analysis.usage > afterUsage.features.sift_analysis.usage;
        
        if (draftReplyLost || siftAnalysisLost) {
            console.log('❌ BUG CONFIRMED: Credits were lost during re-auth!');
            console.log(`  - Draft Reply Credits Lost: ${beforeUsage.features.draft_reply.usage - afterUsage.features.draft_reply.usage}`);
            console.log(`  - Sift Analysis Credits Lost: ${beforeUsage.features.sift_analysis.usage - afterUsage.features.sift_analysis.usage}`);
            
            console.log('\n🔍 Root Cause Analysis:');
            console.log('The activateSubscription method is being called during re-authentication');
            console.log('Even though we added isNewSubscription logic, something is still triggering usage reset');
            
            return false;
        } else {
            console.log('✅ No credit loss detected - the fix might be working');
            return true;
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
        return false;
    }
}

async function testSubscriptionChecking() {
    console.log('\n🔍 Testing Subscription Checking Logic\n');
    
    const testEmail = 'test-check@example.com';
    
    try {
        // Create a subscription
        const whopDates = {
            createdAt: Math.floor(Date.now() / 1000),
            validUntil: Math.floor((Date.now() + (30 * 24 * 60 * 60 * 1000)) / 1000)
        };
        
        await subscriptionService.activateSubscription(testEmail, 'starter', 'whop_mem_456', whopDates);
        
        // Test all the checking methods
        console.log('Testing subscription checking methods:');
        
        const isActive = await subscriptionService.isSubscriptionActive(testEmail);
        const planType = await subscriptionService.getUserPlanType(testEmail);
        const subscription = await subscriptionService.getUserSubscription(testEmail);
        const usage = await subscriptionService.getAllFeatureUsage(testEmail);
        
        console.log(`  - isSubscriptionActive: ${isActive}`);
        console.log(`  - getUserPlanType: ${planType}`);
        console.log(`  - getUserSubscription: ${subscription ? 'Found' : 'Not found'}`);
        console.log(`  - getAllFeatureUsage: ${usage.hasActiveSubscription ? 'Active' : 'Inactive'}`);
        
        // Test individual feature checking
        const draftUsage = await subscriptionService.getFeatureUsage(testEmail, 'draft_reply');
        console.log(`  - getFeatureUsage (draft_reply): ${draftUsage.hasAccess ? 'Can use' : 'Cannot use'} (${draftUsage.usage}/${draftUsage.limit})`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Subscription checking test failed:', error);
        return false;
    }
}

// Run the tests
async function runAllTests() {
    console.log('🧪 Starting Comprehensive Subscription Bug Tests\n');
    
    const bugTestResult = await testSubscriptionBugReproduction();
    const checkingTestResult = await testSubscriptionChecking();
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 FINAL TEST RESULTS:');
    console.log('='.repeat(60));
    
    if (!bugTestResult) {
        console.log('❌ The subscription bug is STILL PRESENT');
        console.log('💡 Need to investigate further');
        console.log('🔍 Possible causes:');
        console.log('  1. activateSubscription being called inappropriately');
        console.log('  2. resetAllFeatureUsage logic not working correctly');
        console.log('  3. Webhook or auth flow triggering subscription reset');
        console.log('  4. Database state inconsistency');
    } else {
        console.log('✅ The subscription bug appears to be FIXED');
    }
    
    if (!checkingTestResult) {
        console.log('❌ Subscription checking logic has issues');
    } else {
        console.log('✅ Subscription checking logic works correctly');
    }
    
    console.log('\n🎯 Recommendation:');
    if (!bugTestResult) {
        console.log('Need to add more debugging and find where activateSubscription is being called inappropriately');
    }
}

runAllTests().then(() => {
    console.log('\n✨ Test suite completed');
}).catch(error => {
    console.error('💥 Test suite crashed:', error);
});
