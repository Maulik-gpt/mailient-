/**
 * GET /api/home-feed/conversations
 *
 * THE intelligence layer the home feed was missing. Independent of whether
 * anything is "actionable", this scans the user's real Gmail, finds their most
 * important ongoing conversations with actual people, and reports where each one
 * STANDS right now — so the feed is useful even when the inbox is handled and
 * every action pool is empty (the exact "0-0, nothing helpful" state reported).
 *
 * SPEED + RELIABILITY, because both failed before:
 *  - Server-cached in arcus_today_cache under `${email}::convos`, 45-min TTL, so
 *    repeat loads are instant and cheap. No migration — reuses the jsonb table.
 *  - The AI summary pass has a hard timeout and, crucially, a DETERMINISTIC
 *    FALLBACK: if the model is slow or rate-limited, every conversation still
 *    gets a real status + a plain summary from its own subject/snippet. The
 *    section is NEVER empty when the user has real email. "AI failed → blank"
 *    does not happen.
 */

import { NextResponse } from 'next/server';
// @ts-ignore — JS module
import { auth as nextAuth } from '@/lib/auth.js';
// @ts-ignore — JS module
import { getSupabaseAdmin } from '@/lib/supabase.js';
import { assertPaidAccess } from '@/lib/subscription-protection.js';
import { getGmailToken, googleFetch } from '@/lib/arcus/tools/http-tokens';
import { logEvent } from '@/lib/logsso';

const auth: any = nextAuth;
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CACHE_TTL_MS = 45 * 60 * 1000;
const MAX_CONVOS = 6;

type Status = 'awaiting_you' | 'waiting_on_them' | 'active';
interface Conversation {
  key: string;
  name: string;
  email: string;
  subject: string;
  status: Status;
  summary: string;          // AI one-liner, or deterministic fallback
  nextAction: string;       // handed to Arcus on click
  lastActivityIso: string;
  daysSince: number;
  fromThem: boolean;        // was the latest message inbound?
  messageCount: number;
}

// ── noise filter: keep real humans, drop automated senders ────────────────────
const NOISE_RE = /(no[-_.]?reply|do[-_.]?not[-_.]?reply|notification|mailer-daemon|postmaster|updates?@|newsletter|digest|team@|hello@|support@|billing@|receipts?@|via\b|automated|@.*\.(mailchimp|substack|beehiiv|sendgrid|mailgun|intercom|zendesk)\b)/i;

function parseFrom(header: string): { name: string; email: string } {
  const m = header.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/) || header.match(/^\s*([^<>@\s]+@[^<>@\s]+)\s*$/);
  if (!m) return { name: header.trim(), email: '' };
  if (m.length === 3) return { name: (m[1] || '').trim(), email: m[2].trim().toLowerCase() };
  return { name: '', email: m[1].trim().toLowerCase() };
}
function displayName(name: string, email: string): string {
  const n = (name || '').trim().replace(/^["']|["']$/g, '');
  if (n && !/@/.test(n)) return n.split(/\s+/).slice(0, 2).join(' ');
  const local = (email || '').split('@')[0] || 'Someone';
  return local.split(/[._-]/).map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ').trim() || 'Someone';
}

async function readCache(email: string): Promise<{ conversations: Conversation[]; generatedAt: string } | null> {
  try {
    const { data } = await getSupabaseAdmin()
      .from('arcus_today_cache')
      .select('payload, generated_at')
      .eq('user_id', `${email.toLowerCase()}::convos`)
      .maybeSingle();
    if (!data?.payload?.conversations) return null;
    return { conversations: data.payload.conversations, generatedAt: data.generated_at };
  } catch { return null; }
}
async function writeCache(email: string, conversations: Conversation[]): Promise<void> {
  try {
    await getSupabaseAdmin()
      .from('arcus_today_cache')
      .upsert({ user_id: `${email.toLowerCase()}::convos`, payload: { conversations }, generated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  } catch (e: any) {
    logEvent({ channel: 'failures', event: '❌ API Error', description: String(e?.message || e) });
  }
}

// Pull recent inbox + sent metadata, group into per-counterparty conversations.
async function gatherConversations(email: string): Promise<Conversation[]> {
  const token = await getGmailToken(email);
  if (!token) return [];
  const headers = { Authorization: `Bearer ${token}` };
  const me = email.toLowerCase();

  const q = encodeURIComponent('in:inbox OR in:sent newer_than:30d -category:promotions -category:social -category:forums -category:updates');
  const listRes = await googleFetch(email, 'gmail', `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=40`, { headers });
  if (!listRes.ok) return [];
  const list = await listRes.json();
  const ids: string[] = (list.messages || []).map((m: any) => m.id).slice(0, 40);
  if (!ids.length) return [];

  const msgs = await Promise.all(ids.map(async (id) => {
    try {
      const r = await googleFetch(email, 'gmail',
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }));

  // Group by the OTHER party. For inbound: the From. For outbound (from me): the To.
  const byParty = new Map<string, Conversation & { _ts: number }>();
  for (const m of msgs) {
    if (!m?.payload?.headers) continue;
    const h: any[] = m.payload.headers;
    const get = (n: string) => (h.find(x => x.name?.toLowerCase() === n.toLowerCase())?.value || '');
    const from = parseFrom(get('From'));
    const toRaw = get('To');
    const subject = get('Subject').replace(/^(re|fwd?):\s*/i, '').trim() || '(no subject)';
    const ts = Number(m.internalDate) || new Date(get('Date')).getTime() || 0;
    const snippet = (m.snippet || '').trim();

    const outbound = from.email === me || (!from.email && !toRaw.includes(me));
    let party: { name: string; email: string };
    if (outbound) {
      party = parseFrom(toRaw.split(',')[0] || '');
    } else {
      party = from;
    }
    if (!party.email || party.email === me) continue;
    if (NOISE_RE.test(party.email) || NOISE_RE.test(party.name)) continue;

    const key = party.email;
    const prev = byParty.get(key);
    const entry: Conversation & { _ts: number } = {
      key,
      name: displayName(party.name, party.email),
      email: party.email,
      subject,
      status: 'active',
      summary: snippet.slice(0, 200),
      nextAction: '',
      lastActivityIso: new Date(ts).toISOString(),
      daysSince: Math.max(0, Math.round((Date.now() - ts) / 86400000)),
      fromThem: !outbound,
      messageCount: 1,
      _ts: ts,
    };
    if (!prev) {
      byParty.set(key, entry);
    } else {
      prev.messageCount += 1;
      if (ts > prev._ts) { // keep the latest message's facts
        prev._ts = ts;
        prev.subject = subject;
        prev.summary = snippet.slice(0, 200);
        prev.lastActivityIso = entry.lastActivityIso;
        prev.daysSince = entry.daysSince;
        prev.fromThem = entry.fromThem;
      }
    }
  }

  // Deterministic status + rank. Importance = frequency, recency, and whether
  // it's genuinely two-way (a real relationship, not a one-off blast).
  const convos = [...byParty.values()].map(c => {
    const status: Status = c.fromThem
      ? (c.daysSince <= 10 ? 'awaiting_you' : 'active')  // they wrote last, still warm → on you
      : (c.daysSince >= 2 ? 'waiting_on_them' : 'active'); // you wrote last, no reply yet
    const { _ts, ...rest } = c;
    return { ...rest, status };
  });

  convos.sort((a, b) => {
    // awaiting_you first, then by messageCount (relationship depth), then recency.
    const rank = (s: Status) => (s === 'awaiting_you' ? 2 : s === 'waiting_on_them' ? 1 : 0);
    if (rank(b.status) !== rank(a.status)) return rank(b.status) - rank(a.status);
    if (b.messageCount !== a.messageCount) return b.messageCount - a.messageCount;
    return new Date(b.lastActivityIso).getTime() - new Date(a.lastActivityIso).getTime();
  });

  return convos.slice(0, MAX_CONVOS);
}

// Deterministic summary + next action — the fallback that guarantees the section
// is never empty or lorem when the AI is unavailable.
function deterministicFill(c: Conversation): Conversation {
  const who = c.name;
  const base = c.summary && c.summary.length > 12 ? c.summary : `Thread: "${c.subject}".`;
  let summary: string, nextAction: string;
  if (c.status === 'awaiting_you') {
    summary = `${who} is waiting on your reply about "${c.subject}". ${base}`.slice(0, 220);
    nextAction = `Draft a reply to ${who} about "${c.subject}". Read the thread first, then write it in my voice.`;
  } else if (c.status === 'waiting_on_them') {
    summary = `You're waiting on ${who} about "${c.subject}" — quiet for ${c.daysSince} day${c.daysSince === 1 ? '' : 's'}.`;
    nextAction = `Draft a warm, low-pressure follow-up to ${who} about "${c.subject}" — it's been quiet for ${c.daysSince} days.`;
  } else {
    summary = `Ongoing with ${who} about "${c.subject}". ${base}`.slice(0, 220);
    nextAction = `Catch me up on my conversation with ${who} about "${c.subject}" and suggest the next move.`;
  }
  return { ...c, summary, nextAction };
}

// ONE grounded AI pass that upgrades the deterministic summaries to sharp,
// human one-liners. Anti-hallucination: it may only reason from the provided
// threads. On any failure we simply keep the deterministic fill.
async function aiUpgrade(convos: Conversation[]): Promise<Conversation[]> {
  const keys = [process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_API_KEY2, process.env.OPENROUTER_API_KEY3, process.env.OPENROUTER_API_KEY4, process.env.OPENROUTER_API_KEY5].filter(Boolean) as string[];
  if (!keys.length) return convos;

  const catalog = convos.map((c, i) =>
    `[${i}] ${c.name} <${c.email}> — status:${c.status}, lastMsg:${c.fromThem ? 'from them' : 'from you'} ${c.daysSince}d ago, ${c.messageCount} msgs. Subject: "${c.subject}". Preview: "${(c.summary || '').slice(0, 160)}"`,
  ).join('\n');

  const system =
    'You are a founder\'s chief of staff summarising their live email relationships for a dashboard. For EACH numbered conversation, write a ONE-sentence status the founder can read at a glance: who it is, what it\'s about, and where it stands right now. Ground it ENTIRELY in the provided facts — NEVER invent a company, number, deadline, or detail not present. Be specific and warm, never generic ("Following up with Sarah on the Q3 proposal she sent Tuesday" not "You have an ongoing conversation").\n' +
    'Return ONLY JSON: {"items":[{"i":<number>,"summary":"<one sentence>"}]}';

  const body = {
    max_tokens: 700, temperature: 0.3, response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Conversations:\n${catalog}\n\nWrite each summary now.` },
    ],
  };

  // 'meta-llama/llama-3.3-70b-instruct:free' and 'qwen/qwen3-next-80b-a3b-instruct:free'
  // REMOVED 2026-07-22 — OpenRouter retired both from the free tier (404
  // "unavailable for free" on every key, live-probe confirmed). Replaced with
  // the nemotron pair, verified the same day to return clean non-empty JSON.
  const models = ['google/gemma-4-26b-a4b-it:free', 'nvidia/nemotron-3-super-120b-a12b:free', 'nvidia/nemotron-3-nano-30b-a3b:free'];
  // Tried at most 2 keys per model, not all of them. LIVE-TESTED 2026-07-23 (a
  // real tool-calling run against the shared engine, not a synthetic ping):
  // nemotron models can genuinely HANG for the full request timeout instead of
  // fast-failing. This loop has no cooling/circuit-breaker like the shared
  // engine does, so an 11s timeout × every model × every key could exceed this
  // route's own maxDuration long before exhausting the chain — the exact
  // mechanical shape of the "AI doesn't work" bug found and fixed in
  // lib/arcus/engine.ts's MODEL_TIMEOUT. Capping keys-per-model bounds the
  // worst case to (models × 2 × 11s) instead of (models × keys × 11s).
  const KEYS_PER_MODEL = 2;
  for (const model of models) {
    for (const key of keys.slice(0, KEYS_PER_MODEL)) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://mailient.xyz', 'X-Title': 'Mailient' },
          body: JSON.stringify({ ...body, model }),
          signal: AbortSignal.timeout(11000),
        });
        if (!res.ok) continue;
        const j = await res.json();
        const content = j?.choices?.[0]?.message?.content;
        if (!content) continue;
        const parsed = JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1));
        const items = Array.isArray(parsed?.items) ? parsed.items : [];
        if (!items.length) continue;
        const out = convos.map(c => ({ ...c }));
        for (const it of items) {
          const idx = Number(it.i);
          const s = String(it.summary || '').trim();
          if (out[idx] && s.length > 8) out[idx].summary = s.slice(0, 240);
        }
        return out;
      } catch { /* try next */ }
    }
  }
  return convos; // AI unreachable — deterministic summaries stand
}

export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gate = await assertPaidAccess(email);
  if (!gate.ok) return NextResponse.json({ error: gate.error, upgradeUrl: gate.upgradeUrl }, { status: gate.status });

  // Fast path: fresh cache.
  const cached = await readCache(email);
  if (cached && Date.now() - new Date(cached.generatedAt).getTime() < CACHE_TTL_MS) {
    return NextResponse.json({ conversations: cached.conversations, cached: true });
  }

  try {
    let convos = await gatherConversations(email);
    // Always deterministic-fill FIRST so we have a valid section even if AI fails.
    convos = convos.map(deterministicFill);
    if (convos.length) convos = await aiUpgrade(convos);
    await writeCache(email, convos);
    return NextResponse.json({ conversations: convos, cached: false });
  } catch (err: any) {
    logEvent({ channel: 'failures', event: '❌ API Error', description: String(err?.message || err) });
    // Serve stale cache rather than nothing.
    if (cached) return NextResponse.json({ conversations: cached.conversations, cached: true, stale: true });
    return NextResponse.json({ conversations: [] });
  }
}
