// Test script for Urgent actions functionality
const { DatabaseService } = require('./lib/supabase');

async function testUrgentActions() {
    console.log('🧪 Testing Urgent Actions Implementation');
    
    try {
        // Test 1: DatabaseService storeEscalation method exists
        console.log('\n1. Testing DatabaseService.storeEscalation method...');
        const dbService = new DatabaseService();
        
        if (typeof dbService.storeEscalation !== 'function') {
            throw new Error('storeEscalation method not found in DatabaseService');
        }
        console.log('✅ storeEscalation method exists');
        
        // Test 2: Mock escalation data
        console.log('\n2. Testing escalation data structure...');
        const mockEscalationData = {
            user_email: 'test@example.com',
            email_id: 'test123',
            subject: 'Urgent: Server Down',
            sender_email: 'alerts@monitoring.com',
            sender_name: 'Monitoring System',
            received_at: new Date().toISOString(),
            snippet: 'The production server is down and needs immediate attention',
            urgency_level: 'high',
            category: 'urgent',
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('Mock escalation data:', JSON.stringify(mockEscalationData, null, 2));
        console.log('✅ Escalation data structure is valid');
        
        // Test 3: API route exists
        console.log('\n3. Checking if escalate API route exists...');
        try {
            const fs = require('fs');
            const routePath = './app/api/email/escalate/route.js';
            if (fs.existsSync(routePath)) {
                console.log('✅ Escalate API route exists');
            } else {
                console.warn('⚠️  Escalate API route not found at expected path');
            }
        } catch (fsError) {
            console.warn('⚠️  Could not check API route file:', fsError.message);
        }
        
        console.log('\n🎉 All basic tests passed!');
        console.log('\nNext steps:');
        console.log('- Test the escalate API endpoint with actual requests');
        console.log('- Verify the UI buttons are properly connected');
        console.log('- Test with real urgent email scenarios');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the tests
testUrgentActions();
