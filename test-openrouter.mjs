import fetch from 'node-fetch';
import 'dotenv/config';

async function test() {
  const prompt = `Categorize these 2 emails.
Categories: opportunity, urgent, lead, risk, follow_up, important

Output ONLY valid JSON format:
{"category_name": {"summary": "Short title", "description": "1 sentence explaining why", "relevance": 8, "ids": ["1", "2"]}}

EMAILS:
ID: 1 | From: boss@test.com | Subject: Urgent meeting | Content: We need to meet now to discuss the $1M deal.
ID: 2 | From: spam@test.com | Subject: Buy this | Content: 50% off`;

  const startTime = Date.now();
  console.log("Calling openrouter/free...");
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openrouter/free',
      messages: [{role: 'user', content: prompt}],
      temperature: 0.0,
      max_tokens: 500
    })
  });
  const json = await res.json();
  const duration = Date.now() - startTime;
  console.log(`Duration: ${duration}ms`);
  console.log("Raw Response:");
  console.log(json.choices[0].message.content);
}

test().catch(console.error);
