/**
 * Global AI Model constants and utilities
 */

export const DEFAULT_AI_MODELS = [
    'openrouter/free',
    'qwen/qwen-2.5-72b-instruct:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'tencent/hy3-preview:free',
    'google/gemma-2-9b-it:free'
];

export const PREMIUM_MODELS = [
    // Starter Tier Models ($7.99/mo) — routed via OPENROUTER_API_KEY4
    { id: 'anthropic/claude-sonnet-4.6', name: 'Sonnet 4.6', tier: 'starter', provider: 'Anthropic' },
    { id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', tier: 'starter', provider: 'Google' },
    { id: 'openai/gpt-5.4', name: 'GPT 5.4', tier: 'starter', provider: 'OpenAI' },
    
    // Pro Tier Models ($29.99/mo) — routed via OPENROUTER_API_KEY4
    { id: 'anthropic/claude-opus-4.6', name: 'Opus 4.6', tier: 'pro', provider: 'Anthropic', isFlagship: true },
    { id: 'openai/gpt-5.5', name: 'GPT 5.5', tier: 'pro', provider: 'OpenAI', isFlagship: true },
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
