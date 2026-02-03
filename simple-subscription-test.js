/**
 * Simple test to isolate the subscription bug
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { subscriptionService } from './lib/subscription-service.js';

async function simpleTest() {
    console.log('🧪 Simple Subscription Test');
    
    const testEmail = 'simple-test@example.com';
    
    try {
        // Test 1: Create subscription
        console.log('1️⃣ Creating subscription...');
        const whopDates = {
            createdAt: Math.floor(Date.now() / 1000),
            validUntil: Math.floor((Date.now() + (30 * 24 * 60 * 60 * 1000)) / 1000)
        };
        
        await subscriptionService.activateSubscription(testEmail, 'starter', 'whop_mem_123', whopDates);
        console.log('✅ Subscription created');
        
        // Test 2: Add usage
        console.log('2️⃣ Adding usage...');
        await subscriptionService.incrementFeatureUsage(testEmail, 'draft_reply');
        console.log('✅ Usage added');
        
        // Test 3: Check usage
        console.log('3️⃣ Checking usage...');
        const usage = await subscriptionService.getFeatureUsage(testEmail, 'draft_reply');
        console.log(`Usage: ${usage.usage}/${usage.limit}`);
        
        // Test 4: Check all usage
        console.log('4️⃣ Checking all usage...');
        const allUsage = await subscriptionService.getAllFeatureUsage(testEmail);
        console.log('All usage:', allUsage);
        
        // Test 5: Simulate re-auth
        console.log('5️⃣ Simulating re-auth...');
        await subscriptionService.activateSubscription(testEmail, 'starter', 'whop_mem_123', whopDates);
        console.log('✅ Re-auth simulation complete');
        
        // Test 6: Check usage after re-auth
        console.log('6️⃣ Checking usage after re-auth...');
        const usageAfter = await subscriptionService.getFeatureUsage(testEmail, 'draft_reply');
        console.log(`Usage after re-auth: ${usageAfter.usage}/${usageAfter.limit}`);
        
        if (usageAfter.usage === 0) {
            console.log('❌ BUG: Usage reset to 0!');
        } else {
            console.log('✅ Usage preserved');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

simpleTest();
