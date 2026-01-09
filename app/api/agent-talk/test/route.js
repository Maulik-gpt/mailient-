import { NextResponse } from 'next/server';
import Bytez from "bytez.js";

/**
 * Test endpoint to verify bytez.js integration
 */
export async function GET() {
  try {
    const adminSecret = (process.env.DEBUG_ADMIN_SECRET || '').trim();
    return NextResponse.json({
      success: false,
      error: adminSecret ? 'Forbidden' : 'Forbidden'
    }, { status: 403 });

    console.log('🧪 Testing bytez.js integration...');
    
    // Test basic bytez.js setup
    const key = "7bb6ef128a200a796cc6ebf8fc063af9";
    const sdk = new Bytez(key);
    console.log('✅ SDK initialized');
    
    const model = sdk.model("Qwen/Qwen3-4B-Instruct-2507");
    console.log('✅ Model loaded');
    
    // Test simple call
    const testMessages = [
      {
        "role": "user",
        "content": "Say 'Hello, the test works!'"
      }
    ];
    
    console.log('🚀 Making test call...');
    const { error, output } = await model.run(testMessages);
    
    console.log('📥 Test response:', { error, output, outputType: typeof output });
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error,
        message: 'bytez.js test failed'
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'bytez.js test passed',
      output: output,
      outputType: typeof output,
      outputKeys: output && typeof output === 'object' ? Object.keys(output) : null
    });
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
