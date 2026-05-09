const { AIConfig } = require('./lib/ai-config.js');
async function test() {
  const ai = new AIConfig();
  const mockEmails = [
    { id: '1', from: 'boss@company.com', subject: 'Urgent meeting', body: 'We need to meet now.' },
    { id: '2', from: 'newsletter@spam.com', subject: 'Buy this', body: 'Discount inside.' }
  ];
  
  // Set fake API key for test if not present (assuming dotenv loads it or it's in .env.local)
  require('dotenv').config({ path: '.env.local' });
  
  const categories = ['opportunity', 'urgent', 'lead', 'risk', 'follow_up', 'important'];
  console.log("Testing batch process...");
  const result = await ai._processIntelligenceBatch(mockEmails, ['1', '2'], categories, false);
  console.log("Result:", result);
}
test();
