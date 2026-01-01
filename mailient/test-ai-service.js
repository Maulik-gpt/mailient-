/**
 * Test script to diagnose AI service issues
 */
console.log('🧪 Testing AI Service Configuration...');

// Test current Bytez implementation
async function testBytez() {
  console.log('\n🔍 Testing Bytez API...');
  try {
    const Bytez = require("bytez.js");
    const key = "7bb6ef128a200a796cc6ebf8fc063af9";
    const sdk = new Bytez(key);
    const model = sdk.model("Qwen/Qwen3-4B-Instruct-2507");
    
    console.log('✅ Bytez initialized:', { hasKey: !!key, hasSDK: !!sdk, hasModel: !!model });
    
    const result = await model.run([{
      role: "user",
      content: "Hello, test message"
    }]);
    
    console.log('📥 Bytez result:', result);
    return { success: true, result };
  } catch (error) {
    console.log('❌ Bytez failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Test Claude API
async function testClaude() {
  console.log('\n🔍 Testing Claude API...');
  try {
    const Anthropic = require("@anthropic-ai/sdk");
    const anthropic = new Anthropic({
      apiKey: "sk-ant-api03-Ci9qeD-zDWr0jkJVr1PXix74j375WbqPMTgbe7AIOEQjM0JRCsQtnb8BdtF6xrC7cfQwZ6_1N4DDMPcZGyG5Qw-z_NA4wA"
    });
    
    console.log('✅ Claude initialized');
    
    const result = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      messages: [{ role: "user", content: "Hello, test message" }]
    });
    
    console.log('📥 Claude result:', result.content[0].text);
    return { success: true, result: result.content[0].text };
  } catch (error) {
    console.log('❌ Claude failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting AI Service Diagnostic Tests...\n');
  
  // Test Bytez
  const bytezResult = await testBytez();
  
  // Test Claude
  const claudeResult = await testClaude();
  
  console.log('\n📊 Test Results Summary:');
  console.log('Bytez:', bytezResult.success ? '✅ Working' : `❌ Failed: ${bytezResult.error}`);
  console.log('Claude:', claudeResult.success ? '✅ Working' : `❌ Failed: ${claudeResult.error}`);
  
  // Recommendation
  if (!bytezResult.success && claudeResult.success) {
    console.log('\n💡 Recommendation: Switch to Claude API');
  } else if (bytezResult.success) {
    console.log('\n💡 Recommendation: Fix Bytez configuration');
  } else {
    console.log('\n💡 Recommendation: Check API keys and dependencies');
  }
}

runTests().catch(console.error);