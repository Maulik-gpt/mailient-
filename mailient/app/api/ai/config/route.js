/**
 * AI Configuration API
 * Handles AI service configuration and testing
 */

import { AIConfig } from '../../../../lib/ai-config.js';

let aiConfig = new AIConfig();

export async function GET() {
  try {
    const status = aiConfig.getConfigurationStatus();
    const hasAIConfigured = aiConfig.hasAIConfigured();

    return Response.json({
      configured: hasAIConfigured,
      providers: status,
      available_providers: aiConfig.getAvailableProviders()
    });

  } catch (error) {
    console.error('Error getting AI configuration:', error);
    return Response.json(
      { error: 'Failed to get AI configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { provider, apiKey, action } = body;

    if (action === 'test') {
      const testResult = await aiConfig.testAIService(provider);
      return Response.json(testResult);
    }

    if (action === 'configure') {
      if (!provider || !apiKey) {
        return Response.json(
          { error: 'Provider and API key are required' },
          { status: 400 }
        );
      }

      // Set the API key
      aiConfig.setApiKey(provider, apiKey);

      // Test the configuration
      const testResult = await aiConfig.testAIService(provider);

      return Response.json({
        success: testResult.success,
        provider,
        test_result: testResult,
        configured_providers: aiConfig.getAvailableProviders()
      });
    }

    if (action === 'test_all') {
      const testResults = [];
      const providers = aiConfig.getConfigurationStatus();

      for (const providerStatus of providers) {
        if (providerStatus.enabled) {
          const testResult = await aiConfig.testAIService(providerStatus.provider);
          testResults.push(testResult);
        }
      }

      return Response.json({
        results: testResults,
        overall_success: testResults.some(t => t.success),
        working_providers: testResults.filter(t => t.success).map(t => t.provider)
      });
    }

    return Response.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error configuring AI:', error);
    return Response.json(
      { error: 'Failed to configure AI service' },
      { status: 500 }
    );
  }
}

