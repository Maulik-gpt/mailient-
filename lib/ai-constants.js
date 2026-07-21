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
    'nvidia/nemotron-3-ultra-550b-a55b:free',       // PRIMARY — NVIDIA Nemotron 3 Ultra 550B, 1M ctx, tool-capable
    'meta-llama/llama-3.3-70b-instruct:free',       // Llama 3.3 70B
    'qwen/qwen3-coder:free',                        // Qwen 3 Coder
    // Removed: openai/gpt-oss-120b/20b (retired), z-ai/glm-4.5-air (404),
    // nemotron-3-super-120b:free + gemma-4-31b-it:free (2026-07-19, user report: not working).
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
