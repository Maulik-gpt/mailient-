const fetch = require('node-fetch');

async function testSchedulingAPI() {
  try {
    console.log('🧪 Testing scheduling API...');
    
    const response = await fetch('http://localhost:3000/api/agent-talk/schedule_meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        emailContent: 'Hi John, I wanted to discuss the Q4 marketing strategy and budget allocation. Can we set up a call next week to review the campaign performance and plan for next quarter? Thanks, Sarah',
        meetingContext: 'Discuss Q4 marketing strategy and budget allocation'
      })
    });

    const data = await response.json();
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.meetingDetails) {
      console.log('🎉 SUCCESS: Meeting details generated!');
      console.log(`Title: ${data.meetingDetails.suggested_title}`);
      console.log(`Objective: ${data.meetingDetails.suggested_description}`);
      console.log(`Duration: ${data.meetingDetails.suggested_duration} minutes`);
    } else {
      console.log('❌ FAILED: No meeting details generated');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSchedulingAPI();
