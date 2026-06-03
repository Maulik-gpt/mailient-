/**
 * Global AI Model constants and utilities
 *
 * The DEFAULT_AI_MODELS chain is tried in order. When a model returns
 * a 429 (rate-limited) or times out, the caller moves to the next one.
 * Keeping many diverse free models here is the #1 defence against the
 * "All models are currently busy" error.
 */

export const DEFAULT_AI_MODELS = [
    'openrouter/free',                              // Auto-router – picks the best available free model
    'google/gemma-4-31b-it:free',                   // Google Gemma 4
    'meta-llama/llama-3.3-70b-instruct:free',       // Llama 3.3 70B
    'qwen/qwen3-coder:free',                        // Qwen 3 Coder
    'liquid/lfm-2.5-1.2b-thinking:free',            // Liquid 2.5 thinking
    'nvidia/nemotron-3-super-120b-a12b:free',       // NVIDIA 120B
    'openai/gpt-oss-120b:free',                     // OpenAI OSS 120B
    'meta-llama/llama-3.2-3b-instruct:free',       // Llama 3.2 3B
    'z-ai/glm-4.5-air:free',                        // GLM 4.5 Air
    'moonshotai/kimi-k2.6:free',                    // Kimi K2.6
    'liquid/lfm-2.5-1.2b-instruct:free',            // Liquid 2.5 instruct
];

export const MODEL_LIMITS = {
    free: { maxTokens: 0, dailyLimit: 0 }, // no free tier — must subscribe
    starter: { maxTokens: 8000, dailyLimit: 1000 }, // legacy alias → same as pro
    pro: { maxTokens: 8000, dailyLimit: 1000 } // all paid plans ($29/mo, $199/yr, $499 lifetime)
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
