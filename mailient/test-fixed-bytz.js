/**
 * Test the fixed Bytez implementation
 */
console.log('🧪 Testing Fixed Bytez Implementation...');

async function testFixedBytez() {
  try {
    const Bytez = (await import("bytez.js")).default;
    const key = "7bb6ef128a200a796cc6ebf8fc063af9";
    const sdk = new Bytez(key);
    const model = sdk.model("Qwen/Qwen3-4B-Instruct-2507");

    console.log('📡 Sending test request...');
    const { error, output } = await model.run([
      {
        "role": "user",
        "content": "Hello, test message"
      }
    ]);
    
    console.log('📥 Result:', { error, output: output?.substring(0, 50) });
    
    // Test the new response format
    if (!error && output && output.trim().length > 10) {
      console.log('✅ Success - would return:', { response: output, error: null });
    } else {
      console.log('❌ Failure - would return:', { response: null, error: error || 'No response from Bytez API' });
    }
    
    return { response: output, error };
  } catch (error) {
    console.log('💥 Exception:', error.message);
    return { response: null, error: error.message };
  }
}

testFixedBytez().then(result => {
  console.log('\n📊 Test Complete:');
  console.log('Response:', result.response ? 'SUCCESS' : 'FAILED');
  console.log('Error:', result.error || 'None');
});