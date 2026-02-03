/**
 * API Call Tracer - Diagnoses subscription credit issues
 * Traces the exact flow of API calls to find where credits are being reset
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Mock the subscription service to add detailed logging
class SubscriptionServiceTracer {
    constructor() {
        this.callLog = [];
        this.originalService = null;
    }

    logCall(method, userId, data = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            method,
            userId: userId?.toLowerCase(),
            data,
            stackTrace: new Error().stack
        };
        this.callLog.push(logEntry);
        
        console.log(`🔍 [${timestamp}] ${method} called for ${userId?.toLowerCase()}`, data);
    }

    async wrapMethod(methodName, originalMethod, ...args) {
        this.logCall(methodName, args[0], { args: args.slice(1) });
        
        try {
            const result = await originalMethod.apply(this.originalService, args);
            
            if (methodName.includes('Usage') || methodName.includes('resetAllFeatureUsage')) {
                console.log(`📊 [${methodName}] Result:`, result);
            }
            
            return result;
        } catch (error) {
            console.error(`❌ [${methodName}] Error:`, error.message);
            throw error;
        }
    }

    wrapService(originalService) {
        this.originalService = originalService;
        
        // Wrap critical methods
        this.getUserSubscription = (...args) => this.wrapMethod('getUserSubscription', originalService.getUserSubscription, ...args);
        this.isSubscriptionActive = (...args) => this.wrapMethod('isSubscriptionActive', originalService.isSubscriptionActive, ...args);
        this.getUserPlanType = (...args) => this.wrapMethod('getUserPlanType', originalService.getUserPlanType, ...args);
        this.getFeatureUsage = (...args) => this.wrapMethod('getFeatureUsage', originalService.getFeatureUsage, ...args);
        this.getAllFeatureUsage = (...args) => this.wrapMethod('getAllFeatureUsage', originalService.getAllFeatureUsage, ...args);
        this.incrementFeatureUsage = (...args) => this.wrapMethod('incrementFeatureUsage', originalService.incrementFeatureUsage, ...args);
        this.resetAllFeatureUsage = (...args) => this.wrapMethod('resetAllFeatureUsage', originalService.resetAllFeatureUsage, ...args);
        this.activateSubscription = (...args) => this.wrapMethod('activateSubscription', originalService.activateSubscription, ...args);
    }

    printCallLog() {
        console.log('\n' + '='.repeat(80));
        console.log('📋 SUBSCRIPTION SERVICE CALL LOG');
        console.log('='.repeat(80));
        
        this.callLog.forEach((log, index) => {
            console.log(`${index + 1}. [${log.timestamp}] ${log.method} for ${log.userId}`);
            if (Object.keys(log.data).length > 0) {
                console.log(`   Data: ${JSON.stringify(log.data, null, 6)}`);
            }
        });
        
        // Analyze patterns
        this.analyzePatterns();
    }

    analyzePatterns() {
        console.log('\n🔍 PATTERN ANALYSIS:');
        
        // Check for resetAllFeatureUsage calls
        const resetCalls = this.callLog.filter(log => log.method === 'resetAllFeatureUsage');
        if (resetCalls.length > 0) {
            console.log(`⚠️  Found ${resetCalls.length} resetAllFeatureUsage calls:`);
            resetCalls.forEach((call, index) => {
                console.log(`   ${index + 1}. ${call.timestamp} - ${call.userId}`);
                console.log(`      Data: ${JSON.stringify(call.data)}`);
            });
        }

        // Check for activateSubscription calls
        const activateCalls = this.callLog.filter(log => log.method === 'activateSubscription');
        if (activateCalls.length > 0) {
            console.log(`📋 Found ${activateCalls.length} activateSubscription calls:`);
            activateCalls.forEach((call, index) => {
                console.log(`   ${index + 1}. ${call.timestamp} - ${call.userId}`);
                console.log(`      isNewSubscription: ${call.data.isNewSubscription}`);
            });
        }

        // Check for rapid successive calls
        const rapidCalls = [];
        for (let i = 1; i < this.callLog.length; i++) {
            const current = new Date(this.callLog[i].timestamp);
            const previous = new Date(this.callLog[i-1].timestamp);
            const diff = current - previous;
            
            if (diff < 1000) { // Less than 1 second
                rapidCalls.push({
                    method1: this.callLog[i-1].method,
                    method2: this.callLog[i].method,
                    diff: diff,
                    timestamp: this.callLog[i].timestamp
                });
            }
        }

        if (rapidCalls.length > 0) {
            console.log(`⚡ Found ${rapidCalls.length} rapid successive calls (< 1s apart):`);
            rapidCalls.forEach((call, index) => {
                console.log(`   ${index + 1}. ${call.method1} → ${call.method2} (${call.diff}ms)`);
            });
        }
    }
}

// API Route Tracer
class APIRouteTracer {
    constructor() {
        this.requestLog = [];
    }

    logRequest(method, url, userId, body = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            method,
            url,
            userId: userId?.toLowerCase(),
            body
        };
        this.requestLog.push(logEntry);
        
        console.log(`🌐 [${timestamp}] ${method} ${url} for ${userId?.toLowerCase()}`, body);
    }

    printRequestLog() {
        console.log('\n' + '='.repeat(80));
        console.log('🌐 API REQUEST LOG');
        console.log('='.repeat(80));
        
        this.requestLog.forEach((log, index) => {
            console.log(`${index + 1}. [${log.timestamp}] ${log.method} ${log.url}`);
            console.log(`   User: ${log.userId}`);
            if (Object.keys(log.body).length > 0) {
                console.log(`   Body: ${JSON.stringify(log.body, null, 6)}`);
            }
        });
    }
}

// Simulate the problematic scenario
async function simulateProblematicScenario() {
    console.log('🐛 Simulating Problematic Scenario\n');
    
    const tracer = new SubscriptionServiceTracer();
    const apiTracer = new APIRouteTracer();
    
    // Import and wrap the subscription service
    const { subscriptionService } = await import('./lib/subscription-service.js');
    tracer.wrapService(subscriptionService);
    
    const testEmail = 'problem-diagnosis@example.com';
    
    try {
        // Step 1: Create initial subscription
        console.log('1️⃣ Creating initial subscription...');
        const whopDates = {
            createdAt: Math.floor(Date.now() / 1000),
            validUntil: Math.floor((Date.now() + (30 * 24 * 60 * 60 * 1000)) / 1000)
        };
        
        await tracer.activateSubscription(testEmail, 'starter', 'whop_mem_123', whopDates);
        
        // Step 2: Add usage
        console.log('\n2️⃣ Adding usage...');
        await tracer.incrementFeatureUsage(testEmail, 'draft_reply');
        await tracer.incrementFeatureUsage(testEmail, 'sift_analysis');
        
        // Step 3: Simulate multiple API calls (like frontend does)
        console.log('\n3️⃣ Simulating multiple API calls...');
        
        // Simulate what gmail-interface-fixed.tsx does
        for (let i = 0; i < 5; i++) {
            console.log(`   API call ${i + 1}: fetchUsage`);
            apiTracer.logRequest('GET', '/api/subscription/usage', testEmail);
            const usage = await tracer.getAllFeatureUsage(testEmail);
            
            // Simulate rapid calls
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Step 4: Simulate sign-out/sign-in
        console.log('\n4️⃣ Simulating sign-out/sign-in...');
        
        // This is what might happen when user signs back in
        apiTracer.logRequest('GET', '/api/subscription/status', testEmail);
        const status = await tracer.isSubscriptionActive(testEmail);
        
        // Multiple usage checks (potential race condition)
        for (let i = 0; i < 3; i++) {
            apiTracer.logRequest('GET', '/api/subscription/usage', testEmail);
            const usage = await tracer.getAllFeatureUsage(testEmail);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Step 5: Check final state
        console.log('\n5️⃣ Checking final state...');
        const finalUsage = await tracer.getAllFeatureUsage(testEmail);
        
        console.log('🎯 Final Usage:', {
            draft_reply: `${finalUsage.features.draft_reply.usage}/${finalUsage.features.draft_reply.limit}`,
            sift_analysis: `${finalUsage.features.sift_analysis.usage}/${finalUsage.features.sift_analysis.limit}`
        });
        
        // Print logs
        tracer.printCallLog();
        apiTracer.printRequestLog();
        
        // Analysis
        console.log('\n🔍 DIAGNOSIS:');
        
        const resetCalls = tracer.callLog.filter(log => log.method === 'resetAllFeatureUsage');
        if (resetCalls.length > 0) {
            console.log('❌ FOUND THE BUG: resetAllFeatureUsage is being called!');
            console.log('💡 This should only happen for new subscriptions, not re-auth');
        } else {
            console.log('✅ No inappropriate resetAllFeatureUsage calls detected');
        }
        
        const activateCalls = tracer.callLog.filter(log => log.method === 'activateSubscription');
        const newSubscriptionCalls = activateCalls.filter(call => call.data.isNewSubscription === true);
        
        if (activateCalls.length > newSubscriptionCalls.length) {
            console.log('⚠️  activateSubscription called for existing subscription');
            console.log('💡 This might indicate the re-auth issue');
        }
        
    } catch (error) {
        console.error('❌ Simulation failed:', error.message);
    }
}

// Run the diagnosis
simulateProblematicScenario().then(() => {
    console.log('\n✨ Diagnosis completed');
}).catch(error => {
    console.error('💥 Diagnosis crashed:', error);
});
