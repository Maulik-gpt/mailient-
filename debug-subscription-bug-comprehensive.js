/**
 * Comprehensive Subscription Bug Debugger
 * Traces the exact flow of subscription checking and usage tracking
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { subscriptionService } from './lib/subscription-service.js';

class SubscriptionDebugger {
    constructor() {
        this.testEmail = 'debug-test@example.com';
        this.logs = [];
    }

    log(message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}`;
        if (data) {
            logEntry += ` | Data: ${JSON.stringify(data, null, 2)}`;
        }
        this.logs.push(logEntry);
        console.log(logEntry);
    }

    async simulateFullUserFlow() {
        this.log('🚀 Starting Full User Flow Simulation');
        
        try {
            // Step 1: Initial subscription (like after payment)
            this.log('1️⃣ Creating initial subscription...');
            const whopDates = {
                createdAt: Math.floor(Date.now() / 1000),
                validUntil: Math.floor((Date.now() + (30 * 24 * 60 * 60 * 1000)) / 1000)
            };
            
            await subscriptionService.activateSubscription(this.testEmail, 'starter', 'whop_mem_123', whopDates);
            this.log('✅ Initial subscription created');

            // Step 2: Add usage
            this.log('2️⃣ Adding user usage...');
            await subscriptionService.incrementFeatureUsage(this.testEmail, 'draft_reply');
            await subscriptionService.incrementFeatureUsage(this.testEmail, 'sift_analysis');
            await subscriptionService.incrementFeatureUsage(this.testEmail, 'sift_analysis');
            
            const usageAfterActivity = await subscriptionService.getAllFeatureUsage(this.testEmail);
            this.log('✅ Usage after activity', {
                draft_reply: `${usageAfterActivity.features.draft_reply.usage}/${usageAfterActivity.features.draft_reply.limit}`,
                sift_analysis: `${usageAfterActivity.features.sift_analysis.usage}/${usageAfterActivity.features.sift_analysis.limit}`
            });

            // Step 3: Simulate multiple API calls (like what happens in frontend)
            this.log('3️⃣ Simulating multiple API calls (frontend behavior)...');
            
            for (let i = 0; i < 5; i++) {
                this.log(`   API call ${i + 1}: Checking subscription status`);
                const status = await subscriptionService.isSubscriptionActive(this.testEmail);
                const planType = await subscriptionService.getUserPlanType(this.testEmail);
                const usage = await subscriptionService.getAllFeatureUsage(this.testEmail);
                
                this.log(`   Result ${i + 1}`, {
                    active: status,
                    plan: planType,
                    draft_usage: usage.features.draft_reply.usage,
                    sift_usage: usage.features.sift_analysis.usage
                });
            }

            // Step 4: Simulate sign-out/sign-in cycle
            this.log('4️⃣ Simulating sign-out/sign-in cycle...');
            
            // This simulates what might happen when user signs back in
            // and the subscription status is checked multiple times
            for (let i = 0; i < 3; i++) {
                this.log(`   Re-auth check ${i + 1}`);
                
                // Check subscription (this is what home-feed page does)
                const isActive = await subscriptionService.isSubscriptionActive(this.testEmail);
                const planType = await subscriptionService.getUserPlanType(this.testEmail);
                
                // Check usage (this is what gmail-interface does)
                const usage = await subscriptionService.getAllFeatureUsage(this.testEmail);
                
                this.log(`   Re-auth result ${i + 1}`, {
                    subscription_active: isActive,
                    plan_type: planType,
                    draft_usage: usage.features.draft_reply.usage,
                    sift_usage: usage.features.sift_analysis.usage
                });
                
                // Simulate a small delay between checks
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Step 5: Check final state
            this.log('5️⃣ Checking final state...');
            const finalUsage = await subscriptionService.getAllFeatureUsage(this.testEmail);
            const finalStatus = await subscriptionService.isSubscriptionActive(this.testEmail);
            
            this.log('🎯 Final Results', {
                subscription_active: finalStatus,
                draft_reply_usage: finalUsage.features.draft_reply.usage,
                sift_analysis_usage: finalUsage.features.sift_analysis.usage,
                draft_reply_limit: finalUsage.features.draft_reply.limit,
                sift_analysis_limit: finalUsage.features.sift_analysis.limit
            });

            // Step 6: Analyze results
            this.analyzeResults(finalUsage);

        } catch (error) {
            this.log(`❌ Error in simulation: ${error.message}`);
        }
    }

    analyzeResults(finalUsage) {
        this.log('📊 Analysis Results');
        
        const draftUsage = finalUsage.features.draft_reply.usage;
        const siftUsage = finalUsage.features.sift_analysis.usage;
        
        if (draftUsage === 0 && siftUsage === 0) {
            this.log('❌ CRITICAL BUG: All usage reset to 0!');
            this.log('💡 Possible causes:');
            this.log('   1. activateSubscription being called inappropriately');
            this.log('   2. resetAllFeatureUsage being triggered');
            this.log('   3. Database transaction issues');
            this.log('   4. Race condition in API calls');
        } else if (draftUsage < 3 || siftUsage < 2) {
            this.log('⚠️  Partial credit loss detected');
            this.log(`   Expected: draft_reply=3, sift_analysis=2`);
            this.log(`   Actual: draft_reply=${draftUsage}, sift_analysis=${siftUsage}`);
        } else {
            this.log('✅ Credits preserved correctly');
        }
    }

    async testDatabaseState() {
        this.log('🔍 Testing Database State Consistency');
        
        try {
            // Check raw database state
            const subscription = await subscriptionService.getUserSubscription(this.testEmail);
            this.log('Raw subscription data', subscription);
            
            // Check raw usage data
            const draftUsage = await subscriptionService.getFeatureUsage(this.testEmail, 'draft_reply');
            const siftUsage = await subscriptionService.getFeatureUsage(this.testEmail, 'sift_analysis');
            
            this.log('Raw usage data', {
                draft_reply: draftUsage,
                sift_analysis: siftUsage
            });
            
        } catch (error) {
            this.log(`❌ Database state check failed: ${error.message}`);
        }
    }

    async testConcurrentAccess() {
        this.log('🔄 Testing Concurrent Access (Race Conditions)');
        
        try {
            // Simulate multiple concurrent calls
            const promises = [];
            
            for (let i = 0; i < 10; i++) {
                promises.push(
                    subscriptionService.getAllFeatureUsage(this.testEmail).then(usage => ({
                        call: i + 1,
                        draft_usage: usage.features.draft_reply.usage,
                        sift_usage: usage.features.sift_analysis.usage
                    }))
                );
            }
            
            const results = await Promise.all(promises);
            
            this.log('Concurrent access results', results);
            
            // Check if all results are consistent
            const uniqueDraftUsages = [...new Set(results.map(r => r.draft_usage))];
            const uniqueSiftUsages = [...new Set(results.map(r => r.sift_usage))];
            
            if (uniqueDraftUsages.length > 1 || uniqueSiftUsages.length > 1) {
                this.log('❌ RACE CONDITION DETECTED!');
                this.log(`   Draft usage variations: ${uniqueDraftUsages.join(', ')}`);
                this.log(`   Sift usage variations: ${uniqueSiftUsages.join(', ')}`);
            } else {
                this.log('✅ No race conditions detected');
            }
            
        } catch (error) {
            this.log(`❌ Concurrent access test failed: ${error.message}`);
        }
    }

    printSummary() {
        console.log('\n' + '='.repeat(80));
        console.log('📋 DEBUGGING SUMMARY');
        console.log('='.repeat(80));
        
        this.logs.forEach(log => console.log(log));
        
        console.log('\n🎯 RECOMMENDATIONS:');
        console.log('1. Check if activateSubscription is being called inappropriately');
        console.log('2. Look for client-side state management issues');
        console.log('3. Investigate database transaction isolation');
        console.log('4. Check for race conditions in API calls');
        console.log('5. Verify webhook handling is not resetting usage');
    }
}

// Run the comprehensive debugging
async function runComprehensiveDebug() {
    const subscriptionDebugger = new SubscriptionDebugger();
    
    await subscriptionDebugger.simulateFullUserFlow();
    await subscriptionDebugger.testDatabaseState();
    await subscriptionDebugger.testConcurrentAccess();
    
    subscriptionDebugger.printSummary();
}

runComprehensiveDebug().then(() => {
    console.log('\n✨ Comprehensive debugging completed');
}).catch(error => {
    console.error('💥 Debugging crashed:', error);
});
