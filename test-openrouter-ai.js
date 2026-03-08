/**
 * Test script to verify the new OpenRouter AI workflow
 * Tests Sift AI intelligence engine and chat functionality
 */

import { AIConfig } from './lib/ai-config.js';
import { OpenRouterAIService } from './lib/openrouter-ai.js';
import fs from 'fs';
import path from 'path';

// Load environment variables manually
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            process.env[key] = valueParts.join('=');
          }
        }
      });
      console.log('✅ Environment variables loaded from .env.local');
    }
  } catch (error) {
    console.log('⚠️ Could not load .env.local:', error.message);
  }
}

async function testOpenRouterAI() {
  console.log('🧪 Testing OpenRouter AI Workflow\n');

  // Load environment variables
  loadEnv();

  // Test 1: AI Config Initialization
  console.log('📋 Test 1: AI Config Initialization');
  try {
    const aiConfig = new AIConfig();
    const status = aiConfig.getConfigurationStatus();
    const available = aiConfig.getAvailableProviders();
    
    console.log('✅ AI Config initialized successfully');
    console.log('📊 Configuration Status:', JSON.stringify(status, null, 2));
    console.log('🔧 Available Providers:', JSON.stringify(available, null, 2));
    
    const hasAI = aiConfig.hasAIConfigured();
    console.log(`🤖 AI Configured: ${hasAI ? '✅ YES' : '❌ NO'}`);
    
    if (!hasAI) {
      throw new Error('AI not properly configured');
    }
  } catch (error) {
    console.error('❌ AI Config test failed:', error.message);
    return false;
  }

  // Test 2: OpenRouter Service Direct Test
  console.log('\n📋 Test 2: OpenRouter Service Direct Test');
  try {
    const service = new OpenRouterAIService();
    const testResponse = await service.generateChatResponse(
      "Hello! I'm testing the Sift AI system. Can you confirm you're working?",
      null,
      { user: { email: 'test@example.com' } }
    );
    
    console.log('✅ OpenRouter Service test passed');
    console.log('🤖 AI Response:', testResponse.substring(0, 200) + '...');
    
    if (!testResponse || testResponse.trim().length === 0) {
      throw new Error('Empty response from AI service');
    }
  } catch (error) {
    console.error('❌ OpenRouter Service test failed:', error.message);
    return false;
  }

  // Test 3: Sift AI Intelligence Engine Test
  console.log('\n📋 Test 3: Sift AI Intelligence Engine Test');
  try {
    const aiConfig = new AIConfig();
    
    // Sample Gmail data for testing
    const testGmailData = {
      emails: [
        {
          id: "test-email-1",
          threadId: "thread-1",
          from: "John Doe <john@example.com>",
          to: ["user@example.com"],
          subject: "Interested in your product - pricing question",
          snippet: "Hi, I'm very interested in your product and would like to know about pricing...",
          body: "Hi there,\n\nI'm John from Example Corp and I'm very interested in your product. We have been looking for a solution like this for our team. Could you please share your pricing information? We have about 50 users and would need this implemented within the next month.\n\nLooking forward to hearing from you.\n\nBest regards,\nJohn Doe",
          timestamp: "2025-12-13T09:00:00Z"
        },
        {
          id: "test-email-2", 
          threadId: "thread-2",
          from: "Sarah Investor <sarah@vc.com>",
          to: ["user@example.com"],
          subject: "Follow up on our conversation",
          snippet: "Hi, following up on our conversation about potential investment...",
          body: "Hi,\n\nI wanted to follow up on our conversation from last week about potential investment in your company. I've had a chance to review your deck and I'm impressed with the traction. Could we schedule a call this week to discuss terms?\n\nBest,\nSarah",
          timestamp: "2025-12-13T08:30:00Z"
        }
      ],
      time_range: "past_week",
      user_profile: {
        name: "Test Founder",
        role: "founder/entrepreneur",
        company: "TestCorp"
      }
    };
    
    const intelligence = await aiConfig.generateInboxIntelligence(testGmailData);
    
    console.log('✅ Sift AI Intelligence test passed');
    console.log('🧠 Intelligence Response:', JSON.stringify(intelligence, null, 2));
    
    // Validate the intelligence structure
    if (!intelligence.inbox_intelligence || !Array.isArray(intelligence.inbox_intelligence)) {
      throw new Error('Invalid intelligence structure');
    }
    
    if (intelligence.inbox_intelligence.length === 0) {
      console.log('⚠️ No intelligence cards generated - this might be expected for test data');
    }
    
  } catch (error) {
    console.error('❌ Sift AI Intelligence test failed:', error.message);
    return false;
  }

  // Test 4: Chat Response Test
  console.log('\n📋 Test 4: Chat Response Test');
  try {
    const aiConfig = new AIConfig();
    
    const chatResponse = await aiConfig.generateChatResponse(
      "Can you help me analyze my inbox for opportunities?",
      "User has 5 unread emails from potential leads",
      { user: { email: 'test@example.com' } }
    );
    
    console.log('✅ Chat Response test passed');
    console.log('💬 Chat Response:', chatResponse.substring(0, 300) + '...');
    
    if (!chatResponse || chatResponse.trim().length === 0) {
      throw new Error('Empty chat response');
    }
    
  } catch (error) {
    console.error('❌ Chat Response test failed:', error.message);
    return false;
  }

  // Test 5: API Service Test
  console.log('\n📋 Test 5: AI Config Service Test');
  try {
    const aiConfig = new AIConfig();
    
    // Test the configuration status
    const testResult = await aiConfig.testAIService('openrouter');
    
    console.log('✅ AI Config Service test passed');
    console.log('🧪 Service Test Result:', JSON.stringify(testResult, null, 2));
    
    if (!testResult.success) {
      throw new Error(`Service test failed: ${testResult.error}`);
    }
    
  } catch (error) {
    console.error('❌ AI Config Service test failed:', error.message);
    return false;
  }

  console.log('\n🎉 All OpenRouter AI tests completed!');
  console.log('\n📊 Summary:');
  console.log('✅ OpenRouter API integration: WORKING');
  console.log('✅ Sift AI intelligence engine: WORKING');
  console.log('✅ Chat functionality: WORKING');
  console.log('✅ Configuration management: WORKING');
  
  console.log('\n🚀 The AI workflow has been successfully replaced with OpenRouter + Sift AI!');
  
  return true;
}

// Run the tests
testOpenRouterAI().then(success => {
  if (success) {
    console.log('\n✨ Test suite PASSED - Ready for production!');
    process.exit(0);
  } else {
    console.log('\n💥 Test suite FAILED - Please check the errors above');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
