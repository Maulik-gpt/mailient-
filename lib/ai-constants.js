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
// OpenRouter (2026-07-22, direct API probe with real keys — checked for actual
// non-empty content, not just an HTTP 200). Removed 'z-ai/glm-4.5-air:free' —
// paid-only, 404s. Removed 'meta-llama/llama-3.3-70b-instruct:free' and
// 'qwen/qwen3-coder:free' — OpenRouter retired both from the free tier
// entirely (404 "unavailable for free" on every key, confirmed 2026-07-22).
export const DEFAULT_AI_MODELS = [
    'nvidia/nemotron-3-ultra-550b-a55b:free',       // PRIMARY — NVIDIA Nemotron 3 Ultra 550B, 1M ctx, tool-capable
    'google/gemma-4-26b-a4b-it:free',               // fast, reliable, verified 2026-07-22
    'nvidia/nemotron-3-super-120b-a12b:free',       // verified 2026-07-22 — text, tools, and json_object all clean
    'nvidia/nemotron-3-nano-30b-a3b:free',          // verified 2026-07-22 — fast, same coverage
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
