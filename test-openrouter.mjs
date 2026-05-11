import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prompt = `Analyze these 2 emails and categorize each as either urgent, risk, or newsletter:
1. "From: boss@company.com - Subject: Urgent meeting needed for $1M deal - Snippet: Please join the zoom link ASAP."
2. "From: spam@spam.com - Subject: Buy this - Snippet: This is a great deal."

Output format:
{
  "urgent": {
    "summary": "Urgent meeting requested",
    "ids": ["1"]
  }
}`;

const candidateModels = [
  'meta-llama/llama-3.1-8b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'qwen/qwen-2-7b-instruct:free',
  'openrouter/free'
];

async function testModels() {
  console.log(`🔍 [OpenRouter] Checking keys...`);
  
  for (const model of candidateModels) {
    console.log(`\n📡 Testing model: ${model}...`);
    const startTime = Date.now();
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{role: 'user', content: prompt}],
          temperature: 0.0,
          max_tokens: 500
        })
      });
      
      const json = await res.json();
      const duration = Date.now() - startTime;
      
      if (json.error) {
        console.error(`❌ ${model} failed with error: ${json.error.message || json.error.code}`);
      } else {
        console.log(`✅ ${model} SUCCESS! Duration: ${duration}ms`);
        console.log(`Response content: ${json.choices?.[0]?.message?.content}`);
      }
    } catch (err) {
      console.error(`❌ Exception testing ${model}: ${err.message}`);
    }
  }
}

testModels();
