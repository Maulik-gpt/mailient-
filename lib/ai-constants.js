/**
 * Global AI Model constants and utilities
 */

export const DEFAULT_AI_MODELS = [
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'qwen/qwen3-coder:free'
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
