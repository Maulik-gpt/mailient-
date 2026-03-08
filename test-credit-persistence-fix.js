/**
 * Test script to verify the subscription credit persistence fix
 * Tests that paid users don't lose credits on sign-out/sign-in
 */

const { subscriptionService } = require('./lib/subscription-service.js');

async function testCreditPersistence() {
    console.log('🧪 Testing Credit Persistence Fix\n');

    const testEmail = 'test-paid-user@example.com';
    
    try {
        // 1. Create initial subscription (simulating new user)
        console.log('1️⃣ Creating NEW subscription...');
        await subscriptionService.activateSubscription(testEmail, 'starter', 'test_membership_123');
        
        // 2. Add some usage
        console.log('\n2️⃣ Adding feature usage...');
        await subscriptionService.incrementFeatureUsage(testEmail, 'draft_reply');
        await subscriptionService.incrementFeatureUsage(testEmail, 'sift_analysis');
        await subscriptionService.incrementFeatureUsage(testEmail, 'sift_analysis');
        
        // 3. Check usage
        console.log('\n3️⃣ Checking usage after initial activation:');
        const initialUsage = await subscriptionService.getAllFeatureUsage(testEmail);
        console.log('Draft Reply Usage:', initialUsage.features.draft_reply);
        console.log('Sift Analysis Usage:', initialUsage.features.sift_analysis);
        
        // 4. Simulate re-auth/renewal (the problematic scenario)
        console.log('\n4️⃣ Simulating RE-AUTH/RENEWAL (this was the bug)...');
        const whopDates = {
            createdAt: Math.floor(Date.now() / 1000),
            validUntil: Math.floor((Date.now() + (30 * 24 * 60 * 60 * 1000)) / 1000) // 30 days from now
        };
        
        await subscriptionService.activateSubscription(testEmail, 'starter', 'test_membership_123', whopDates);
        
        // 5. Check if usage was preserved (this should now work)
        console.log('\n5️⃣ Checking usage after re-auth (should be preserved):');
        const preservedUsage = await subscriptionService.getAllFeatureUsage(testEmail);
        console.log('Draft Reply Usage:', preservedUsage.features.draft_reply);
        console.log('Sift Analysis Usage:', preservedUsage.features.sift_analysis);
        
        // 6. Verify the fix
        console.log('\n🔍 VERIFICATION:');
        const draftReplyPreserved = initialUsage.features.draft_reply.usage === preservedUsage.features.draft_reply.usage;
        const siftAnalysisPreserved = initialUsage.features.sift_analysis.usage === preservedUsage.features.sift_analysis.usage;
        
        if (draftReplyPreserved && siftAnalysisPreserved) {
            console.log('✅ SUCCESS: Credits were preserved during re-auth!');
            console.log('✅ The fix is working correctly.');
        } else {
            console.log('❌ FAILURE: Credits were reset during re-auth!');
            console.log('❌ The fix needs more work.');
            console.log('Expected:', {
                draft_reply: initialUsage.features.draft_reply.usage,
                sift_analysis: initialUsage.features.sift_analysis.usage
            });
            console.log('Actual:', {
                draft_reply: preservedUsage.features.draft_reply.usage,
                sift_analysis: preservedUsage.features.sift_analysis.usage
            });
        }
        
        // 7. Test monthly reset for renewal
        console.log('\n6️⃣ Testing monthly reset for renewal...');
        const renewalDates = {
            createdAt: Math.floor(Date.now() / 1000),
            validUntil: Math.floor((Date.now() + (60 * 24 * 60 * 60 * 1000)) / 1000) // 60 days from now
        };
        
        await subscriptionService.handleWebhookEvent({
            action: 'membership.renewed',
            data: {
                user: { email: testEmail },
                product: { id: subscriptionService.PLANS.starter.whopProductId },
                id: 'renewal_membership_456',
                created_at: renewalDates.createdAt,
                valid_until: renewalDates.validUntil
            }
        });
        
        const afterRenewalUsage = await subscriptionService.getAllFeatureUsage(testEmail);
        console.log('Usage after renewal:', {
            draft_reply: afterRenewalUsage.features.draft_reply,
            sift_analysis: afterRenewalUsage.features.sift_analysis
        });
        
        console.log('\n🎯 Test completed!');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Run the test
testCreditPersistence().then(() => {
    console.log('\n✨ Test script finished');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test script crashed:', error);
    process.exit(1);
});
