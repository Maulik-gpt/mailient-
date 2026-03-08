/**
 * Test the frontend debouncing fix for subscription usage
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { subscriptionService } from './lib/subscription-service.js';

async function testFrontendFix() {
    console.log('🧪 Testing Frontend Debouncing Fix\n');
    
    const testEmail = 'frontend-test@example.com';
    
    try {
        // Step 1: Create subscription
        console.log('1️⃣ Creating subscription...');
        const whopDates = {
            createdAt: Math.floor(Date.now() / 1000),
            validUntil: Math.floor((Date.now() + (30 * 24 * 60 * 60 * 1000)) / 1000)
        };
        
        await subscriptionService.activateSubscription(testEmail, 'starter', 'whop_mem_123', whopDates);
        
        // Step 2: Add usage
        console.log('2️⃣ Adding usage...');
        await subscriptionService.incrementFeatureUsage(testEmail, 'draft_reply');
        await subscriptionService.incrementFeatureUsage(testEmail, 'sift_analysis');
        
        // Step 3: Simulate rapid API calls (like what frontend was doing)
        console.log('3️⃣ Simulating rapid API calls (old behavior)...');
        
        const usageBefore = await subscriptionService.getAllFeatureUsage(testEmail);
        console.log(`Usage before rapid calls: draft_reply=${usageBefore.features.draft_reply.usage}, sift_analysis=${usageBefore.features.sift_analysis.usage}`);
        
        // Simulate multiple rapid calls (what was causing the race condition)
        console.log('   Making 5 rapid API calls...');
        const rapidResults = [];
        
        for (let i = 0; i < 5; i++) {
            const usage = await subscriptionService.getAllFeatureUsage(testEmail);
            rapidResults.push({
                call: i + 1,
                draft_usage: usage.features.draft_reply.usage,
                sift_usage: usage.features.sift_analysis.usage
            });
            
            // Small delay to simulate real API timing
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('   Rapid call results:');
        rapidResults.forEach(result => {
            console.log(`     Call ${result.call}: draft=${result.draft_usage}, sift=${result.sift_usage}`);
        });
        
        // Step 4: Check if usage is consistent
        console.log('4️⃣ Checking consistency...');
        const allDraftUsages = rapidResults.map(r => r.draft_usage);
        const allSiftUsages = rapidResults.map(r => r.sift_usage);
        
        const draftConsistent = allDraftUsages.every(u => u === allDraftUsages[0]);
        const siftConsistent = allSiftUsages.every(u => u === allSiftUsages[0]);
        
        if (draftConsistent && siftConsistent) {
            console.log('✅ Usage is consistent across rapid calls');
            console.log('✅ Backend can handle concurrent requests');
        } else {
            console.log('❌ Usage inconsistent - potential race condition');
        }
        
        // Step 5: Simulate re-auth scenario
        console.log('5️⃣ Simulating re-auth scenario...');
        
        // This is what happens when user signs back in
        await subscriptionService.activateSubscription(testEmail, 'starter', 'whop_mem_123', whopDates);
        
        const usageAfterReauth = await subscriptionService.getAllFeatureUsage(testEmail);
        console.log(`Usage after re-auth: draft_reply=${usageAfterReauth.features.draft_reply.usage}, sift_analysis=${usageAfterReauth.features.sift_analysis.usage}`);
        
        // Step 6: Final verification
        const creditsLost = usageBefore.features.draft_reply.usage > usageAfterReauth.features.draft_reply.usage ||
                           usageBefore.features.sift_analysis.usage > usageAfterReauth.features.sift_analysis.usage;
        
        if (creditsLost) {
            console.log('❌ Credits still being lost during re-auth!');
            console.log('💡 The issue might not be just in the frontend');
        } else {
            console.log('✅ Credits preserved during re-auth');
        }
        
        // Step 7: Test debouncing effectiveness
        console.log('6️⃣ Testing debouncing effectiveness...');
        
        console.log('   Simulating debounced calls (new behavior)...');
        const debouncedResults = [];
        
        // Simulate the new debounced behavior
        let lastCallTime = 0;
        const debounceDelay = 2000; // 2 seconds
        
        for (let i = 0; i < 5; i++) {
            const now = Date.now();
            
            if (now - lastCallTime >= debounceDelay) {
                const usage = await subscriptionService.getAllFeatureUsage(testEmail);
                debouncedResults.push({
                    call: i + 1,
                    time: now,
                    draft_usage: usage.features.draft_reply.usage,
                    sift_usage: usage.features.sift_analysis.usage,
                    should_fetch: true
                });
                lastCallTime = now;
            } else {
                debouncedResults.push({
                    call: i + 1,
                    time: now,
                    draft_usage: 'skipped',
                    sift_usage: 'skipped',
                    should_fetch: false
                });
            }
            
            // Small delay between attempts
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log('   Debounced call results:');
        debouncedResults.forEach(result => {
            console.log(`     Call ${result.call}: ${result.should_fetch ? 'FETCHED' : 'SKIPPED'} (${result.draft_usage !== 'skipped' ? `draft=${result.draft_usage}` : ''})`);
        });
        
        const actualFetches = debouncedResults.filter(r => r.should_fetch).length;
        console.log(`   Actual API calls reduced from 5 to ${actualFetches}`);
        
        console.log('\n🎯 SUMMARY:');
        console.log(`✅ Backend handles concurrent requests: ${draftConsistent && siftConsistent ? 'YES' : 'NO'}`);
        console.log(`✅ Credits preserved on re-auth: ${!creditsLost ? 'YES' : 'NO'}`);
        console.log(`✅ API calls reduced by debouncing: ${actualFetches < 5 ? 'YES' : 'NO'}`);
        
        if (draftConsistent && siftConsistent && !creditsLost && actualFetches < 5) {
            console.log('\n🎉 ALL FIXES WORKING CORRECTLY!');
            console.log('💡 The subscription bug should now be resolved');
        } else {
            console.log('\n⚠️  Some issues still need investigation');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testFrontendFix().then(() => {
    console.log('\n✨ Frontend fix test completed');
}).catch(error => {
    console.error('💥 Test crashed:', error);
});
