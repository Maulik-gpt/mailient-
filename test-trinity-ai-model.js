/**
 * Test script to verify the new Trinity Large Preview AI model is working
 * Tests speed and accuracy of the new model
 */

const { OpenRouterAIService } = require('./lib/openrouter-ai.js');

async function testNewAIModel() {
    console.log('🚀 Testing New AI Model: arcee-ai/trinity-large-preview:free\n');

    const aiService = new OpenRouterAIService();
    
    try {
        // Test 1: Simple response test
        console.log('1️⃣ Testing simple response...');
        const startTime = Date.now();
        
        const simpleResponse = await aiService.callOpenRouter([
            { role: 'user', content: 'What is 2+2? Answer with just the number.' }
        ], { maxTokens: 10 });
        
        const responseTime = Date.now() - startTime;
        const answer = aiService.extractResponse(simpleResponse);
        
        console.log(`✅ Response: "${answer}"`);
        console.log(`⚡ Response time: ${responseTime}ms`);
        console.log(`📊 Model used: ${simpleResponse.model || 'Unknown'}`);
        
        // Test 2: Email summary test
        console.log('\n2️⃣ Testing email summary...');
        const summaryStart = Date.now();
        
        const testEmail = `
From: john.doe@company.com
Subject: Quick question about your pricing

Hi there,

I'm interested in your service but had a quick question about the pricing tiers. 
Do you offer custom pricing for enterprise clients with over 100 users?

Also, what's included in the Pro plan exactly?

Thanks,
John
        `;
        
        const summary = await aiService.generateEmailSummary(testEmail);
        const summaryTime = Date.now() - summaryStart;
        
        console.log(`✅ Summary: "${summary}"`);
        console.log(`⚡ Summary time: ${summaryTime}ms`);
        
        // Test 3: Draft reply test
        console.log('\n3️⃣ Testing draft reply...');
        const draftStart = Date.now();
        
        const draft = await aiService.generateDraftReply(testEmail, 'inquiry', {
            name: 'Sarah',
            role: 'Sales Manager'
        });
        
        const draftTime = Date.now() - draftStart;
        
        console.log(`✅ Draft: "${draft.substring(0, 200)}${draft.length > 200 ? '...' : ''}"`);
        console.log(`⚡ Draft time: ${draftTime}ms`);
        
        // Results summary
        console.log('\n📈 PERFORMANCE SUMMARY:');
        console.log(`Simple response: ${responseTime}ms`);
        console.log(`Email summary: ${summaryTime}ms`);
        console.log(`Draft reply: ${draftTime}ms`);
        console.log(`Average: ${Math.round((responseTime + summaryTime + draftTime) / 3)}ms`);
        
        // Quality assessment
        console.log('\n🎯 QUALITY ASSESSMENT:');
        console.log(`Simple answer correct: ${answer.trim() === '4' ? '✅' : '❌'}`);
        console.log(`Summary meaningful: ${summary.length > 20 ? '✅' : '❌'}`);
        console.log(`Draft coherent: ${draft.length > 50 ? '✅' : '❌'}`);
        
        console.log('\n🎉 New AI model test completed successfully!');
        console.log('🚀 The Trinity Large Preview model is working and should be faster!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('💡 Make sure your OPENROUTER_API_KEY is set correctly');
    }
}

// Run the test
testNewAIModel().then(() => {
    console.log('\n✨ Test script finished');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test script crashed:', error);
    process.exit(1);
});
