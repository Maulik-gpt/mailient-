/**
 * Global AI Model constants and utilities
 */

export const DEFAULT_AI_MODELS = [
    'google/gemini-2.5-flash:free',
    'qwen/qwen-2.5-coder-32b-instruct:free',
    'openrouter/free'
];

export const PREMIUM_MODELS = [
    // Starter Tier Models ($7.99/mo)
    { id: 'openai/gpt-4.5', name: 'GPT 4.5', tier: 'starter', provider: 'OpenAI' },
    { id: 'anthropic/claude-opus-4.6', name: 'Opus 4.6', tier: 'starter', provider: 'Anthropic' },
    { id: 'google/gemini-3.1-pro', name: 'Gemini 3.1 Pro', tier: 'starter', provider: 'Google' },
    
    // Pro Tier Models ($29.99/mo)
    { id: 'openai/gpt-5.5', name: 'GPT 5.5', tier: 'pro', provider: 'OpenAI', isFlagship: true },
    { id: 'anthropic/claude-opus-4.7', name: 'Opus 4.7', tier: 'pro', provider: 'Anthropic', isFlagship: true },
];

export const MODEL_LIMITS = {
    free: { maxTokens: 2000, dailyLimit: 50 }, // strict limits for free
    starter: { maxTokens: 4000, dailyLimit: 200 }, // conservative limits for lower margin ($7.99)
    pro: { maxTokens: 8000, dailyLimit: 1000 } // high limits for Pro ($29.99)
};

/**
 * Generates a model fallback chain starting with the user preference, 
 * then the environment override, and finally the default high-performance chain.
 */
export const getModelChain = (preference = null) => {
    // Determine the environment override
    const envOverride = typeof process !== 'undefined' ? process.env.OPENROUTER_MODEL : null;

    const chain = [
        preference,
        envOverride,
        ...DEFAULT_AI_MODELS
    ].filter((model, index, self) => model && self.indexOf(model) === index);
    
    return chain;
};
