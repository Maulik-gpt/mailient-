/**
 * GET /api/debug/ai-health
 *
 * Ground-truth AI diagnostic that runs INSIDE the deployed environment, so we can
 * see what the SERVER actually has — not what a local .env.local has. It answers
 * the recurring "the home-feed AI is generic / not working" question directly:
 *
 *   1. Which OPENROUTER_API_KEY* vars this deployment actually sees (name + last4
 *      + count) — the single most common prod break is the keys simply not being
 *      set in Vercel, or being a different/unfunded account than the one that was
 *      funded. Never returns key material.
 *   2. The account's credit balance (is it funded? rate-limited?).
 *   3. A LIVE per-model completion against the exact model ids the home-feed AI
 *      uses, with reasoning disabled for nemotron (same as the real code path) —
 *      status, latency, whether real content came back, and any error.
 *
 * Read-only, no secrets leaked. Not gated behind a paywall so it's reachable to
 * diagnose even when subscription state itself is the issue; it exposes only
 * booleans/counts/last-4, never a key or user data.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const KEY_VARS = [
  'OPENROUTER_API_KEY',
  'OPENROUTER_API_KEY2',
  'OPENROUTER_API_KEY3',
  'OPENROUTER_API_KEY4',
  'OPENROUTER_API_KEY5',
];

// The exact ids the home-feed AI relies on (engine TOOL_CAPABLE_MODELS +
// DEFAULT_AI_MODELS + the recs/convos chains all draw from this set).
const MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
];

function loadKeys(): { name: string; last4: string; value: string }[] {
  const out: { name: string; last4: string; value: string }[] = [];
  for (const name of KEY_VARS) {
    const v = (process.env[name] || '').trim();
    if (v && v.length > 10) out.push({ name, last4: v.slice(-4), value: v });
  }
  return out;
}

async function creditsFor(key: string) {
  try {
    const r = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return { ok: false, status: r.status };
    const j = await r.json();
    return { ok: true, ...(j.data || {}) };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'failed' };
  }
}

async function testModel(key: string, model: string) {
  const body: Record<string, any> = {
    model,
    messages: [{ role: 'user', content: 'Reply with exactly the word: OK' }],
    max_tokens: 50,
    temperature: 0,
  };
  // Mirror the real code path: nemotron reasoners must have reasoning disabled or
  // they burn the token budget thinking and return an empty 200.
  if (/nemotron/i.test(model)) body.reasoning = { enabled: false };
  const t0 = Date.now();
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    });
    const ms = Date.now() - t0;
    const txt = await r.text();
    let j: any = null;
    try { j = JSON.parse(txt); } catch { /* non-json */ }
    const content = j?.choices?.[0]?.message?.content ?? '';
    const err = j?.error?.message;
    const verdict = !r.ok ? `FAIL_${r.status}` : err ? 'ERR' : (content && content.trim()) ? 'OK' : 'EMPTY';
    return {
      model, verdict, httpStatus: r.status, ms,
      hasContent: !!(content && content.trim()),
      error: err ? String(err).slice(0, 160) : (!r.ok ? txt.slice(0, 160) : undefined),
    };
  } catch (e: any) {
    return { model, verdict: 'THROW', ms: Date.now() - t0, error: `${e?.name}: ${e?.message}` };
  }
}

export async function GET() {
  const keys = loadKeys();

  const base: Record<string, any> = {
    checkedAt: new Date().toISOString(),
    vercelEnv: process.env.VERCEL_ENV || 'unknown',
    keyCount: keys.length,
    keysSeen: keys.map(k => ({ name: k.name, last4: k.last4 })),
    flags: {
      OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || null,
      DISABLE_PAID_FALLBACK: process.env.DISABLE_PAID_FALLBACK || null,
      ARCUS_PREMIUM_MODELS: process.env.ARCUS_PREMIUM_MODELS || null,
    },
  };

  if (!keys.length) {
    return NextResponse.json({
      ...base,
      verdict: 'NO_KEYS',
      diagnosis: 'This deployment sees ZERO OpenRouter API keys. Every AI surface (home-feed reasons, recommendations, Sift, key conversations) will silently fall back to generic text. Set OPENROUTER_API_KEY (+ optional 2..5) in the Vercel Production environment and redeploy.',
    }, { status: 503 });
  }

  // Credit balance is per-account; the first key represents the account the
  // deployment leads with (which is what most calls actually use).
  const credits = await creditsFor(keys[0].value);
  // Live per-model test on the FIRST key (the one the code tries first).
  const modelResults = await Promise.all(MODELS.map(m => testModel(keys[0].value, m)));

  const anyOk = modelResults.some(m => m.verdict === 'OK');
  const verdict = anyOk ? 'AI_REACHABLE' : 'AI_UNREACHABLE';
  const diagnosis = anyOk
    ? 'At least one model returned real content from THIS deployment, so the AI is reachable here. If the home-feed still reads generic, the cause is downstream (per-request timeouts under real load, or a stale server/client cache), not the keys.'
    : 'No model returned usable content from this deployment. Check the per-model errors below: 401/403 = bad/rotated key, 402 = account has no credit, 429 = rate-limited/quota. Fix the account or keys in Vercel Production.';

  return NextResponse.json({
    ...base,
    verdict,
    diagnosis,
    account: credits,
    models: modelResults,
  });
}
