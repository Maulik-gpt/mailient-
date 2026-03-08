/**
 * Test Bytez API to diagnose the failure
 */
console.log('🔍 Diagnosing Bytez API failure...');

async function diagnoseBytez() {
  try {
    console.log('📦 Importing Bytez...');
    const Bytez = require("bytez.js");
    
    console.log('🔑 Initializing with key:', "7bb6ef128a200a796cc6ebf8fc063af9");
    const key = "7bb6ef128a200a796cc6ebf8fc063af9";
    const sdk = new Bytez(key);
    
    console.log('🤖 Creating model...');
    const model = sdk.model("Qwen/Qwen3-4B-Instruct-2507");
    
    console.log('📡 Testing connection...');
    const startTime = Date.now();
    
    const result = await model.run([
      {
        "role": "user",
        "content": "Hello, this is a test"
      }
    ]);
    
    const endTime = Date.now();
    console.log(`⏱️ Response time: ${endTime - startTime}ms`);
    console.log('📥 Raw result:', JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.log('❌ Bytez returned error:', result.error);
      return { success: false, error: result.error, result };
    }
    
    if (result.output) {
      console.log('✅ Bytez working! Response:', result.output);
      return { success: true, output: result.output, result };
    }
    
    console.log('⚠️ Unexpected response format');
    return { success: false, error: 'Unexpected response format', result };
    
  } catch (error) {
    console.log('💥 Bytez exception:', error.message);
    console.log('📍 Stack trace:', error.stack);
    return { success: false, error: error.message, stack: error.stack };
  }
}

// Run diagnosis
diagnoseBytez().then(result => {
  console.log('\n📊 Diagnosis Complete:');
  console.log('Success:', result.success);
  console.log('Error:', result.error);
  if (result.output) console.log('Output length:', result.output.length);
});
