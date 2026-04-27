/**
 * Global AI Model constants and utilities
 */

export const DEFAULT_AI_MODELS = [
    'google/gemini-2.5-flash:free',
    'qwen/qwen-2.5-coder-32b-instruct:free',
    'openrouter/free'
];

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
