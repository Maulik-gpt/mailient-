/**
 * Global AI Model constants and utilities
 *
 * The DEFAULT_AI_MODELS chain is tried in order. When a model returns
 * a 429 (rate-limited) or times out, the caller moves to the next one.
 * Keeping many diverse free models here is the #1 defence against the
 * "All models are currently busy" error.
 */

// 'openrouter/free' used to lead this list and was unreliable; every AI feature
// routed through this chain suffered. These ids are LIVE-VERIFIED against
// OpenRouter (2026-06): each returns 200 or a transient 429, none 404. Removed
// 'z-ai/glm-4.5-air:free' — it moved to paid-only and now 404s.
export const DEFAULT_AI_MODELS = [
    'openai/gpt-oss-120b:free',                     // OpenAI OSS 120B — most reliable
    'google/gemma-4-31b-it:free',                   // Google Gemma 4
    'nvidia/nemotron-3-super-120b-a12b:free',       // NVIDIA 120B
    'meta-llama/llama-3.3-70b-instruct:free',       // Llama 3.3 70B
    'qwen/qwen3-coder:free',                        // Qwen 3 Coder
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
