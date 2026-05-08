/**
 * Global AI Model constants and utilities
 */

export const DEFAULT_AI_MODELS = [
    'openrouter/free',
    'google/gemma-4-26b-a4b-it:free',
    'qwen/qwen3-coder:free',
    'nvidia/nemotron-3-super-120b-a12b:free'
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
