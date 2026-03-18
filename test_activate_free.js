const { SubscriptionService } = require('./lib/subscription-service.js');
require('dotenv').config({ path: '.env.local' });

async function test() {
    const service = new SubscriptionService();
    const userId = 'mailient.xyz@gmail.com'; // Use a real user to see what happens
    
    try {
        console.log('--- Testing Free Activation for', userId, '---');
        const result = await service.activateSubscription(
            userId,
            'free',
            'free_' + Date.now()
        );
        console.log('✅ Activation Success:', result);
    } catch (error) {
        console.error('❌ Activation Failed:', error);
    }
}

test();
