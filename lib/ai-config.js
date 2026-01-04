/**
 * AI Configuration Manager
 * Handles OpenRouter AI service configuration and testing
 */

import { OpenRouterAIService } from './openrouter-ai.js';

export class AIConfig {
  constructor() {
    this.openrouterService = null;
    this.initializeService();
  }

  /**
   * Initialize the OpenRouter service
   */
  initializeService() {
    try {
      this.openrouterService = new OpenRouterAIService();
      console.log('✅ OpenRouter AI service initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize OpenRouter AI service:', error.message);
      this.openrouterService = null;
    }
  }

  /**
   * Check if AI is configured and available
   */
  hasAIConfigured() {
    return !!this.openrouterService;
  }

  /**
   * Get configuration status
   */
  getConfigurationStatus() {
    const status = [];

    // OpenRouter status
    status.push({
      provider: 'openrouter',
      enabled: !!this.openrouterService,
      configured: !!process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku',
      status: this.openrouterService ? 'available' : 'unavailable'
    });

    // Legacy ElevenLabs status (for reference)
    status.push({
      provider: 'elevenlabs',
      enabled: !!process.env.ELEVENLABS_API_KEY,
      configured: !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID),
      agent_id: process.env.ELEVENLABS_AGENT_ID || null,
      status: (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID) ? 'configured' : 'not_configured'
    });

    return status;
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    const providers = [];

    if (this.openrouterService) {
      providers.push({
        name: 'openrouter',
        displayName: 'OpenRouter AI',
        description: 'Modern AI models via OpenRouter API',
        enabled: true
      });
    }

    if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID) {
      providers.push({
        name: 'elevenlabs',
        displayName: 'ElevenLabs',
        description: 'ElevenLabs conversational AI',
        enabled: true
      });
    }

    return providers;
  }

  /**
   * Test AI service
   */
  async testAIService(provider = 'openrouter') {
    try {
      if (provider === 'openrouter') {
        return await this.testOpenRouterService();
      } else if (provider === 'elevenlabs') {
        return await this.testElevenLabsService();
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Error testing ${provider} service:`, error);
      return {
        success: false,
        provider,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test OpenRouter service
   */
  async testOpenRouterService() {
    if (!this.openrouterService) {
      throw new Error('OpenRouter service not initialized');
    }

    const testMessage = "Hello, this is a test message. Please respond briefly.";

    try {
      const response = await this.openrouterService.generateChatResponse(
        testMessage,
        null,
        { user: { email: 'test@example.com' } }
      );

      const success = response && response.trim().length > 0;

      return {
        success,
        provider: 'openrouter',
        response: success ? response.substring(0, 100) + '...' : 'No response',
        timestamp: new Date().toISOString(),
        model: this.openrouterService.model
      };
    } catch (error) {
      throw new Error(`OpenRouter test failed: ${error.message}`);
    }
  }

  /**
   * Test ElevenLabs service (legacy)
   */
  async testElevenLabsService() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;

    if (!apiKey || !agentId) {
      throw new Error('ElevenLabs configuration incomplete');
    }

    try {
      const testMessages = [
        { role: 'user', content: 'Hello, this is a test.' }
      ];

      const response = await fetch('https://api.elevenlabs.io/v1/convai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          agent_id: agentId,
          messages: testMessages,
        }),
      });

      const success = response.ok;

      return {
        success,
        provider: 'elevenlabs',
        status: response.status,
        timestamp: new Date().toISOString(),
        agent_id: agentId
      };
    } catch (error) {
      throw new Error(`ElevenLabs test failed: ${error.message}`);
    }
  }

  /**
   * Set API key for a provider
   */
  setApiKey(provider, apiKey) {
    if (provider === 'openrouter') {
      process.env.OPENROUTER_API_KEY = apiKey;
      this.initializeService(); // Reinitialize with new key
    } else if (provider === 'elevenlabs') {
      process.env.ELEVENLABS_API_KEY = apiKey;
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Generate inbox intelligence using Sift AI
   */
  async generateInboxIntelligence(gmailData, privacyMode = false) {
    if (!this.openrouterService) {
      throw new Error('OpenRouter service not available');
    }

    return await this.openrouterService.generateInboxIntelligence(gmailData, privacyMode);
  }

  /**
   * Generate chat response
   */
  async generateChatResponse(userMessage, emailContext = null, session = null, privacyMode = false) {
    if (!this.openrouterService) {
      throw new Error('OpenRouter service not available');
    }

    return await this.openrouterService.generateChatResponse(userMessage, emailContext, privacyMode);
  }

  /**
   * Generate email summary
   */
  async generateEmailSummary(emailContent, privacyMode = false, userContext = {}) {
    if (!this.openrouterService) {
      throw new Error('OpenRouter service not available');
    }

    return await this.openrouterService.generateEmailSummary(emailContent, privacyMode, userContext);
  }

  /**
   * Generate draft reply
   */
  async generateDraftReply(emailContent, category, userContext = {}, privacyMode = false) {
    if (!this.openrouterService) {
      throw new Error('OpenRouter service not available');
    }

    return await this.openrouterService.generateDraftReply(emailContent, category, userContext, privacyMode);
  }

  /**
   * Generate follow-up email
   */
  async generateFollowUp(emailContent, userContext = {}, privacyMode = false) {
    if (!this.openrouterService) {
      throw new Error('OpenRouter service not available');
    }

    return await this.openrouterService.generateFollowUp(emailContent, userContext, privacyMode);
  }

  /**
   * Get service instance
   */
  getService(provider = 'openrouter') {
    if (provider === 'openrouter') {
      return this.openrouterService;
    }

    throw new Error(`Service not available for provider: ${provider}`);
  }
}