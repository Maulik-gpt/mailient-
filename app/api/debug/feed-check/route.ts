/**
 * GET /api/debug/feed-check — temporary diagnostic (no secrets, aggregates only).
 * Runs the owner's real Today snapshot + a live recommendations model probe to see
 * which AI surface is failing. Remove after use.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const OWNER = 'mailient.xyz@gmail.com';
const GENERIC = new Set([
  'Money on the line', 'Flagged urgent', 'Direct question',
  'Wants time on your calendar', 'Active thread waiting on you',
  'Needs your attention', 'Likely newsletter/automated', 'Needs your reply.',
]);

async function todayCheck() {
  try {
    const t0 = Date.now();
    const { computeTodaySnapshot } = await import('../../home-feed/today/route');
    const s: any = await computeTodaySnapshot(OWNER);
    const decide = s?.decide || [];
    const generic = decide.filter((d: any) => GENERIC.has(String(d?.reason || '').trim())).length;
    return {
      ms: Date.now() - t0,
      counts: { decide: decide.length, showUp: (s?.showUp || []).length, chase: (s?.chase || []).length, agentRuns: (s?.agentRuns || []).length },
      hasBriefing: !!(s?.briefing && String(s.briefing).trim()),
      briefingSample: s?.briefing ? String(s.briefing).slice(0, 60) : null,
      reasons: { specific: decide.length - generic, generic },
      firstReasonSample: decide[0]?.reason ? String(decide[0].reason).slice(0, 60) : null,
      needsReconnect: s?.needsReconnect ?? null,
      gmailConnected: s?.gmailConnected ?? null,
      calendarConnected: s?.calendarConnected ?? null,
    };
  } catch (e: any) {
    return { verdict: 'THREW', error: `${e?.name}: ${e?.message}`.slice(0, 400), stack: String(e?.stack || '').split('\n').slice(0, 4).join(' | ') };
  }
}

// Live recs-model probe: same model + json_object the recs route uses, minimal prompt.
async function recsModelCheck() {
  const key = (process.env.OPENROUTER_API_KEY || '').trim();
  if (!key) return { verdict: 'NO_KEY' };
  const sys = 'You are a chief of staff. Return ONLY JSON: {"sift":{"headline":"...","analysis":"..."},"recommendations":[{"category":"productivity","title":"...","summary":"...","arcusPrompt":"...","ctaLabel":"...","atRisk":false,"refIds":[1]}]}';
  const t0 = Date.now();
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'google/gemma-4-26b-a4b-it:free', max_tokens: 700, temperature: 0.3, response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: sys }, { role: 'user', content: "Today's real items:\n[1] (decide) Sarah — Unanswered email: \"Q3 proposal\"\nWrite the recommendations now." }] }),
      signal: AbortSignal.timeout(20000),
    });
    const txt = await r.text(); let j: any = null; try { j = JSON.parse(txt); } catch {}
    const content = j?.choices?.[0]?.message?.content ?? '';
    let parses = false; try { JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1)); parses = true; } catch {}
    return { ms: Date.now() - t0, httpStatus: r.status, verdict: !r.ok ? `FAIL_${r.status}` : !content ? 'EMPTY' : parses ? 'JSON_OK' : 'NONJSON', len: content.length };
  } catch (e: any) { return { verdict: 'THREW', error: `${e?.name}: ${e?.message}`.slice(0, 200) }; }
}

export async function GET() {
  const [today, recsModel] = await Promise.all([todayCheck(), recsModelCheck()]);
  return NextResponse.json({ build: 'feed-check-v1', checkedAt: new Date().toISOString(), today, recsModel });
}
