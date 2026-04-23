
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

async function testModel() {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY2 || process.env.OPENROUTER_API_KEY3;
  const model = 'google/gemma-3-27b-it:free';
  
  console.log(`Testing model: ${model}`);
  console.log(`Using API key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NONE'}`);

  if (!apiKey) {
    console.error('No API key found in .env.local');
    return;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://mailient.xyz',
        'X-Title': 'Mailient Test'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Say hello' }],
        max_tokens: 10
      })
    });

    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Fetch Error:', error.message);
  }
}

testModel();
