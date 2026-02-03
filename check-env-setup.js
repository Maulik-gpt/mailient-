/**
 * Environment Configuration Diagnostic
 * Checks if environment variables are properly loaded
 */

// Load environment variables from .env.local
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('🔍 Environment Configuration Diagnostic\n');

// Check all possible OpenRouter API key variables
const openrouterKeys = {
    'OPENROUTER_API_KEY': process.env.OPENROUTER_API_KEY,
    'OPENROUTER_API_KEY2': process.env.OPENROUTER_API_KEY2,
    'OPENROUTER_API_KEY3': process.env.OPENROUTER_API_KEY3
};

console.log('📋 OpenRouter API Keys Status:');
Object.entries(openrouterKeys).forEach(([key, value]) => {
    const status = value ? '✅ Set' : '❌ Missing';
    const preview = value ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}` : 'N/A';
    console.log(`  ${key}: ${status} (${preview})`);
});

// Check other important environment variables
const otherVars = {
    'OPENROUTER_MODEL': process.env.OPENROUTER_MODEL,
    'NODE_ENV': process.env.NODE_ENV,
    'HOST': process.env.HOST
};

console.log('\n📋 Other Environment Variables:');
Object.entries(otherVars).forEach(([key, value]) => {
    const status = value ? '✅ Set' : '❌ Missing';
    const preview = value || 'N/A';
    console.log(`  ${key}: ${status} (${preview})`);
});

// Test if we can import the AI service
console.log('\n🤖 AI Service Import Test:');
try {
    // Try to dynamically import to avoid module loading issues
    console.log('  Attempting to import OpenRouter AI service...');
    
    // Check if the file exists and can be accessed
    const fs = require('fs');
    const path = require('path');
    
    const aiServicePath = path.join(process.cwd(), 'lib', 'openrouter-ai.js');
    if (fs.existsSync(aiServicePath)) {
        console.log('  ✅ AI service file exists');
        
        // Try to read the first few lines to verify model configuration
        const content = fs.readFileSync(aiServicePath, 'utf8');
        const lines = content.split('\n').slice(0, 20);
        
        console.log('  📄 AI Service Configuration:');
        lines.forEach((line, index) => {
            if (line.includes('arcee-ai/trinity-large-preview:free') || 
                line.includes('this.model') ||
                line.includes('apiKey')) {
                console.log(`    Line ${index + 1}: ${line.trim()}`);
            }
        });
    } else {
        console.log('  ❌ AI service file not found');
    }
} catch (error) {
    console.log(`  ❌ Import failed: ${error.message}`);
}

console.log('\n🔧 Troubleshooting Tips:');
console.log('1. Make sure your .env.local file is in the project root directory');
console.log('2. Restart your development server after changing environment variables');
console.log('3. Check that the API key doesn\'t have extra spaces or quotes');
console.log('4. Verify the API key is valid and active on OpenRouter');

console.log('\n📊 Summary:');
const hasKey = Object.values(openrouterKeys).some(value => value);
console.log(`OpenRouter API Key Available: ${hasKey ? '✅' : '❌'}`);
console.log(`Default Model: ${process.env.OPENROUTER_MODEL || 'Not set'}`);

if (!hasKey) {
    console.log('\n❌ ISSUE: No OpenRouter API key found!');
    console.log('💡 Solution: Add OPENROUTER_API_KEY to your .env.local file');
    console.log('🔗 Get your key at: https://openrouter.ai/keys');
} else {
    console.log('\n✅ Environment setup looks good!');
    console.log('🚀 Try running the test again or restart your dev server');
}
