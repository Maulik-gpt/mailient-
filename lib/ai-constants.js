/**
 * Global AI Model constants and utilities
 */

export const DEFAULT_AI_MODELS = [
    'google/gemini-2.0-flash-lite-preview-02-05:free',
    'qwen/qwen-2.5-7b-instruct:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'nvidia/nemotron-3-super-120b-a12b:free'
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
