/**
 * Global AI Model constants and utilities
 *
 * The DEFAULT_AI_MODELS chain is tried in order. When a model returns
 * a 429 (rate-limited) or times out, the caller moves to the next one.
 * Keeping many diverse free models here is the #1 defence against the
 * "All models are currently busy" error.
 */

// NOTE: 'openrouter/free' is NOT a valid OpenRouter model id — it 400s on every
// call. It used to lead this list, which broke draft-reply and every other AI
// feature routed through this chain. Lead with real, verified free models
// (matching lib/arcus/engine.ts's tool-capable set).
export const DEFAULT_AI_MODELS = [
    'openai/gpt-oss-120b:free',                     // OpenAI OSS 120B — most reliable
    'google/gemma-4-31b-it:free',                   // Google Gemma 4
    'meta-llama/llama-3.3-70b-instruct:free',       // Llama 3.3 70B
    'z-ai/glm-4.5-air:free',                        // GLM 4.5 Air
    'qwen/qwen3-coder:free',                        // Qwen 3 Coder
    'nvidia/nemotron-3-super-120b-a12b:free',       // NVIDIA 120B
    'openai/gpt-oss-20b:free',                      // OpenAI OSS 20B
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
