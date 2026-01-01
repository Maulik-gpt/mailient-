/**
 * Test script for follow-up functionality
 * This script tests the generateFollowUp method in the OpenRouterAIService
 */

import { OpenRouterAIService } from './lib/openrouter-ai.js';

async function testFollowUpFunctionality() {
    console.log('🧪 Testing Follow-up Functionality...\n');

    try {
        // Create AI service instance
        const aiService = new OpenRouterAIService();

        if (!aiService.apiKey) {
            console.warn('⚠️  OPENROUTER_API_KEY not configured. Using fallback responses.');
        }

        // Test email content
        const testEmailContent = `
From: John Doe <john@example.com>
Subject: Project Discussion
Date: 2023-11-15
Snippet: Hi there, I wanted to discuss the project timeline and next steps.
Body: Hello,\n\nI hope you're doing well. I wanted to follow up on our previous discussion about the project timeline. Could you please share your thoughts on the proposed schedule?\n\nLooking forward to your response.\n\nBest regards,\nJohn Doe
`;

        // Test user context
        const userContext = {
            name: 'Sarah Johnson',
            email: 'sarah@example.com'
        };

        console.log('📧 Test Email Content:');
        console.log(testEmailContent);
        console.log('\n👤 User Context:');
        console.log(userContext);
        console.log('\n--- Generating Follow-up ---\n');

        // Generate follow-up
        const followUp = await aiService.generateFollowUp(testEmailContent, userContext);

        console.log('✅ Follow-up Generated:');
        console.log('\n' + followUp);

        // Validate the follow-up contains expected elements
        const validationResults = {
            hasGreeting: followUp.includes('Hi John') || followUp.includes('Hi John,'),
            hasContext: followUp.toLowerCase().includes('project') || followUp.toLowerCase().includes('timeline'),
            hasCTA: followUp.includes('?') || followUp.toLowerCase().includes('let me know'),
            hasSignOff: followUp.includes('Best regards') || followUp.includes('Regards'),
            hasSenderName: followUp.includes('Sarah'),
            isProfessional: followUp.length > 50 && followUp.length < 1000
        };

        console.log('\n🔍 Validation Results:');
        console.log('- Has greeting:', validationResults.hasGreeting ? '✅' : '❌');
        console.log('- References context:', validationResults.hasContext ? '✅' : '❌');
        console.log('- Has call-to-action:', validationResults.hasCTA ? '✅' : '❌');
        console.log('- Has sign-off:', validationResults.hasSignOff ? '✅' : '❌');
        console.log('- Includes sender name:', validationResults.hasSenderName ? '✅' : '❌');
        console.log('- Professional length:', validationResults.isProfessional ? '✅' : '❌');

        const allValid = Object.values(validationResults).every(result => result);
        console.log('\n📊 Overall Result:', allValid ? '✅ PASS' : '❌ FAIL');

        if (allValid) {
            console.log('\n🎉 Follow-up functionality is working correctly!');
        } else {
            console.log('\n⚠️  Follow-up functionality has some issues.');
        }

        return allValid;

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error(error.stack);
        return false;
    }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testFollowUpFunctionality().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export { testFollowUpFunctionality };