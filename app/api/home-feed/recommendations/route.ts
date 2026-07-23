/**
 * Home-feed "Worth your time" — AI-generated next-step recommendations.
 *
 * ACCURACY MODEL (this is the whole point): the LLM is used ONLY for judgment +
 * phrasing, and is fed nothing but the user's REAL feed items (the same Gmail /
 * Calendar / ledger data the buckets render). It must reference each item by the
 * id we pass; on the way back we:
 *   1. DROP any recommendation that references an id we didn't send (the only way
 *      a model can "hallucinate" here is to invent an id — we reject those), and
 *   2. attach the displayed STAT ourselves, computed deterministically from the
 *      referenced real items — the model never supplies a number we show.
 * So the copy is AI-written and specific, but every name/count on screen is real.
 *
 * The client renders instant deterministic recommendations first and swaps these
 * in when ready, so the feed is never blocked and never broken if this fails.
 */
import { NextResponse } from 'next/server';
// @ts-ignore — JS module
import { auth } from '@/lib/auth.js';
import { getGmailToken, getGcalToken, getNotionToken, getSlackToken, googleFetch } from '@/lib/arcus/tools/http-tokens';
// @ts-ignore — JS module
import { getSupabaseAdmin } from '@/lib/supabase.js';
// @ts-ignore — JS module
import { CalComService } from '@/lib/calcom.js';
import { getBriefingPrefs, type BriefingPrefs } from '@/lib/arcus/briefing-prefs';
import { logEvent } from "@/lib/logsso";

export const dynamic = 'force-dynamic';
export const maxDuration = 25;

// 'qwen/qwen3-next-80b-a3b-instruct:free' REMOVED 2026-07-22 — OpenRouter
// retired it from the free tier entirely (confirmed 404 "unavailable for free"
// on every key via a live probe, not a rate limit). nemotron-3-super-120b is
// its replacement, LIVE-VERIFIED 2026-07-22 to return clean, non-empty content
// under response_format:json_object (this route's hard requirement) — checked
// directly, not assumed from the model card.
const REC_MODEL = 'google/gemma-4-26b-a4b-it:free';
const FALLBACK_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

type Category = 'connect' | 'productivity';

// `ref` is the SHORT integer token the model echoes in refIds. Long compound
// ids get mangled by LLMs (which silently dropped every recommendation); a 1-based
// integer is trivial to copy back, so matching is reliable.
type SignalKind = 'decide' | 'chase' | 'promised' | 'meeting' | 'bounce' | 'booking' | 'notion' | 'slack';
interface InItem { ref: number; kind: SignalKind; label: string; detail: string; metric?: number; }

// A server-gathered cross-app signal (before it's assigned a numeric ref).
interface RawSignal { kind: SignalKind; label: string; detail: string; metric?: number; }

// Which app a kind belongs to — drives the "spanned N apps" footer and the prompt.
const APP_OF: Record<SignalKind, string> = {
  decide: 'Gmail', chase: 'Gmail', bounce: 'Gmail',
  meeting: 'Calendar', booking: 'Cal.com', notion: 'Notion', slack: 'Slack', promised: 'Notes',
};

// Same mapping, but to the short KEY the "Across your apps" chart renders —
// this is this endpoint's connection-aware cross-app gather already in effect
// (gatherServerSignals only calls a source when its token exists AND the user
// left it enabled), so a count here already means "connected AND active this
// week." 'promised' has no key: it's the user's own commitments, not a
// connected app, so it never appears in the chart. Disconnected/quiet apps
// just never get a key set above 0 — nothing to render, nothing invented.
type AppKey = 'gmail' | 'calendar' | 'notion' | 'slack' | 'calcom';
const APP_KEY_OF: Partial<Record<SignalKind, AppKey>> = {
  decide: 'gmail', chase: 'gmail', bounce: 'gmail',
  meeting: 'calendar', booking: 'calcom', notion: 'notion', slack: 'slack',
};

interface SiftSummary { headline: string; analysis: string; }

// Guaranteed-available fallback — built ONLY from real counts already computed
// server-side, same two-tier pattern as /api/home-feed/conversations
// (deterministicFill + aiUpgrade): the section is never blank or lorem when
// the model is unavailable, and the AI pass (if it lands) just makes the same
// facts read more like a person wrote them.
function deterministicSift(items: InItem[]): SiftSummary {
  const decideN = items.filter((i) => i.kind === 'decide').length;
  const chaseN = items.filter((i) => i.kind === 'chase').length;
  const meetingN = items.filter((i) => i.kind === 'meeting').length;
  const otherN = items.length - decideN - chaseN - meetingN;
  const parts: string[] = [];
  if (decideN) parts.push(`${decideN} email${decideN === 1 ? '' : 's'} need${decideN === 1 ? 's' : ''} a reply`);
  if (chaseN) parts.push(`${chaseN} follow-up${chaseN === 1 ? '' : 's'} going quiet`);
  if (meetingN) parts.push(`${meetingN} meeting${meetingN === 1 ? '' : 's'} coming up`);
  if (!parts.length && otherN) parts.push(`${otherN} item${otherN === 1 ? '' : 's'} worth a look`);
  const headline = parts.length ? `${parts.join(', ')}.` : 'Nothing urgent anywhere — your inbox and calendar are handled.';
  const apps = Array.from(new Set(items.map((i) => APP_OF[i.kind]))).filter((a) => a !== 'Notes');
  const analysis = apps.length
    ? `${headline} Checked in across ${apps.join(', ')} — this reflects only what's actually connected.`
    : headline;
  return { headline, analysis };
}

interface OutRec {
  id: string;
  category: Category;
  title: string;
  summary: string;
  arcusPrompt: string;
  ctaLabel: string;
  stat: { value: number; label: string };
  // Opportunity Detection: true when this is a hidden loss caught before it
  // slips (revenue/relationship/deadline at risk) — rendered with a protective
  // "before it slips" tag so the founder can't miss it.
  atRisk?: boolean;
  refIds: string[];
}

function keys(): string[] {
  return [process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_API_KEY2, process.env.OPENROUTER_API_KEY3, process.env.OPENROUTER_API_KEY4, process.env.OPENROUTER_API_KEY5].filter(Boolean) as string[];
}

function clampStr(v: any, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// Display-clean a sender/recipient name: strip an email down to its local part,
// drop quotes/extra whitespace, and Title-Case it so raw fragments like "nand"
// or "ANAND.K" don't reach the UI looking broken.
function cleanName(raw: any): string {
  let s = clampStr(raw, 80).replace(/^["'<]+|["'>]+$/g, '').trim();
  if (!s) return '';
  if (s.includes('@')) s = s.split('@')[0].replace(/[._-]+/g, ' ').trim();
  return s
    .split(/\s+/)
    .map(w => (w.length <= 3 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

// Build the real, id-tagged item list the model is allowed to reference.
function normalizeItems(body: any): InItem[] {
  const items: InItem[] = [];
  const decide = Array.isArray(body?.decide) ? body.decide : [];
  const chase = Array.isArray(body?.chase) ? body.chase : [];
  const promised = Array.isArray(body?.actionItems) ? body.actionItems : [];
  const meetings = Array.isArray(body?.showUp) ? body.showUp : [];

  let ref = 0;
  for (const d of decide.slice(0, 8)) {
    if (!d?.id) continue;
    items.push({ ref: ++ref, kind: 'decide', label: cleanName(d?.sender?.name || d?.sender?.email) || 'Someone', detail: `Unanswered email: "${clampStr(d?.subject, 120)}" — ${clampStr(d?.reason, 140)}` });
  }
  for (const c of chase.slice(0, 8)) {
    if (!c?.id) continue;
    items.push({ ref: ++ref, kind: 'chase', label: cleanName(c?.recipient?.name || c?.recipient?.email) || 'A contact', detail: `You emailed about "${clampStr(c?.subject, 120)}" — no reply in ${Number(c?.daysSilent) || 0} days`, metric: Number(c?.daysSilent) || 0 });
  }
  for (const a of promised.slice(0, 8)) {
    if (!a?.id) continue;
    const who = Array.isArray(a?.attendees) && a.attendees.length ? ` (with ${a.attendees.slice(0, 2).map((n: string) => cleanName(n)).join(', ')})` : '';
    items.push({ ref: ++ref, kind: 'promised', label: clampStr(a?.meetingTitle, 80) || 'A commitment', detail: `${a?.isOverdue ? 'OVERDUE promise' : 'Promise'}: "${clampStr(a?.text, 140)}"${who}`, metric: a?.isOverdue ? 1 : 0 });
  }
  for (const m of meetings.slice(0, 8)) {
    if (!m?.id) continue;
    items.push({ ref: ++ref, kind: 'meeting', label: clampStr(m?.title, 80) || 'A meeting', detail: `${m?.isExternal ? 'External' : 'Internal'} meeting, ${Number(m?.attendeeCount) || 0} attendees` });
  }
  return items;
}

// Deterministic stat for a recommendation, from the REAL referenced items only.
function statFor(refs: InItem[]): { value: number; label: string } {
  if (!refs.length) return { value: 0, label: '' };
  const kinds = new Set(refs.map(r => r.kind));
  if (kinds.size === 1) {
    const k = refs[0].kind;
    if (k === 'chase') {
      const maxSilent = Math.max(...refs.map(r => r.metric || 0));
      return refs.length === 1 ? { value: maxSilent, label: 'days silent' } : { value: refs.length, label: 'going quiet' };
    }
    if (k === 'decide') return { value: refs.length, label: refs.length === 1 ? 'reply needed' : 'replies needed' };
    if (k === 'promised') {
      const overdue = refs.filter(r => (r.metric || 0) > 0).length;
      return overdue > 0 ? { value: overdue, label: 'overdue' } : { value: refs.length, label: 'to close' };
    }
    if (k === 'meeting') return { value: refs.length, label: refs.length === 1 ? 'to prep' : 'meetings' };
    if (k === 'bounce') return { value: refs.length, label: refs.length === 1 ? 'bounced' : 'bounced' };
    if (k === 'booking') return { value: refs.length, label: refs.length === 1 ? 'to prep' : 'bookings' };
    if (k === 'notion') return { value: refs.length, label: refs.length === 1 ? 'page' : 'pages' };
    if (k === 'slack') return { value: refs.length, label: 'awaiting reply' };
  }
  // Mixed kinds = a genuine cross-app move. Surface how many apps it spans.
  const apps = new Set(refs.map(r => APP_OF[r.kind]));
  if (apps.size > 1) return { value: apps.size, label: 'apps in play' };
  return { value: refs.length, label: 'items' };
}

interface GenerateResult { recs: OutRec[]; sift: SiftSummary | null; }

async function generate(items: InItem[], prefs: BriefingPrefs, founderModel = ''): Promise<GenerateResult | null> {
  const ks = keys();
  if (!ks.length || !items.length) return null;

  const catalog = items.map(it => `[${it.ref}] (${it.kind}) ${it.label} — ${it.detail}`).join('\n');

  // User's Customize-Briefing preferences shape (but never override accuracy).
  const max = prefs.maxRecommendations;
  const focusLine =
    prefs.focus === 'connections' ? 'WHEN RANKING, lean toward relationship/connection moves (people going quiet, follow-ups, intros) over pure task-clearing.\n'
    : prefs.focus === 'productivity' ? 'WHEN RANKING, lean toward productivity moves (clearing replies, overdue work, prep) over relationship outreach.\n'
    : '';
  const toneLine =
    prefs.tone === 'direct' ? 'TONE: crisp and direct in titles and summaries — no filler.\n'
    : prefs.tone === 'detailed' ? 'TONE: warm but include a touch more why-now context in each one-sentence summary.\n'
    : 'TONE: warm and human, like a sharp chief of staff.\n';
  const customLine = prefs.customInstructions
    ? `The user has a STANDING PREFERENCE for their briefing: "${prefs.customInstructions.replace(/"/g, "'")}". Honor it where it applies, but NEVER invent items to satisfy it.\n`
    : '';

  // FOUNDER MEMORY (visible recall on the feed): if we know the founder's VIPs /
  // style / priorities, let the picks reason from that — a rec grounded in "Priya
  // is a VIP you flagged" reads like Mailient already knows them. Never invent:
  // the model may only LEAN on this, never manufacture a person/fact from it.
  const memoryLine = founderModel.trim()
    ? `WHAT YOU ALREADY KNOW ABOUT THIS FOUNDER (reason from it; rank a known VIP's silence above a stranger's; when a pick is shaped by something here, say so briefly in the summary — "Priya, a VIP you flagged, has gone quiet". NEVER invent a person or fact not present in the numbered items):\n${founderModel.trim().slice(0, 900)}\n\n`
    : '';

  const system =
    'You are the chief-of-staff brain behind a founder\'s daily briefing. You are given a numbered list of REAL items pulled from ACROSS their connected apps — Gmail (incl. bounced sends), Google Calendar/Meet, Cal.com bookings, Notion pages, and Slack DMs. Each item is tagged with its source kind.\n' +
    `Produce up to ${max} high-leverage next-step RECOMMENDATIONS that either STRENGTHEN A RELATIONSHIP (category "connect") or BOOST PRODUCTIVITY (category "productivity"). Group related items into one recommendation rather than repeating yourself.\n` +
    memoryLine + focusLine + toneLine + customLine +
    'PROTECT AGAINST INVISIBLE LOSSES FIRST. A founder loses deals by never SEEING them, not by deciding badly. Before anything else, hunt what is QUIETLY AT RISK — a proposal/quote/contract thread gone silent, a VIP or warm contact you haven\'t answered, a bounced send to a real person, a deadline/renewal closing while it sits unread. Rank by what it COSTS to miss, not by how loud it is: a quiet deal at risk outranks routine task-clearing. For any recommendation that is such a caught-before-it-slips item, set "atRisk": true and make the summary say why NOW ("the Acme renewal lapses Friday; the thread\'s been quiet 8 days"). Be selective — the feeling is "I\'m covered", not "here\'s more to worry about". Only mark atRisk when there is genuine time-boxed or revenue/relationship risk in the referenced items.\n' +
    'PRIORITIZE recommendations that CONNECT TWO OR MORE APPS when the items plausibly relate — e.g. an email gone quiet whose Notion deal page is stale, a Cal.com booking with no prep doc, a bounced send to fix from a Notion contact, a Slack ask that mirrors an unanswered email. A cross-app move is the most valuable thing you can surface. Only join items when they clearly concern the same person/company/topic — never invent a connection.\n\n' +
    'HARD RULES — accuracy is everything:\n' +
    '- For each recommendation, list the bracket numbers of the item(s) it is about in refIds, e.g. "refIds": [1, 3]. Use ONLY numbers that appear in the list. NEVER invent a person, number, company, or deadline that is not in the items.\n' +
    '- Do NOT put your own statistics or counts in the text — the system computes and renders those separately. Keep summary about the specific people/subjects.\n' +
    '- title: a short, plain imperative, ≤7 words (e.g. "Reconnect with Sarah before it stalls").\n' +
    '- summary: ONE sentence, specific, naming the real person/subject and why it matters now.\n' +
    '- arcusPrompt: one self-contained instruction the user hands to their AI assistant (Arcus) to DO this with zero further typing (e.g. "Draft a warm, low-pressure follow-up to Sarah Chen about the Q3 proposal she hasn\'t replied to."). Grounded entirely in the referenced items.\n' +
    '- ctaLabel: 2-3 words for the button (e.g. "Draft nudge", "Prep me", "Clear it").\n\n' +
    'ALSO write a "sift" object — a Siri-style spoken-aloud read of the founder\'s WHOLE connected ecosystem right now (not just the recommendations above): headline = ONE short punchy sentence (≤14 words) naming the single thing that matters most today. analysis = 4-5 sentences synthesizing the real state across every app that has items below (who needs a reply, what\'s going quiet, what\'s coming up, what\'s handled) — read like a sharp chief of staff briefing the founder in 20 seconds, not a bullet list. Ground both ENTIRELY in the numbered items; NEVER invent a person, count, or company.\n' +
    'Return ONLY JSON: {"sift":{"headline","analysis"},"recommendations":[{"category","title","summary","arcusPrompt","ctaLabel","atRisk":true|false,"refIds":[numbers]}]}';

  const basePayload = {
    max_tokens: 900,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Today's real items:\n${catalog}\n\nWrite the recommendations now.` },
    ],
  };

  // PAID MODELS EMPTIED 2026-07-19 on explicit user directive: "remove every
  // paid model from our list, it is too much costing us money. you'll add when
  // i tell." Deliberate — when the whole free chain below is rate-limited, this
  // route now returns no AI recs rather than spending money. Do NOT re-add a
  // paid model here without the user naming it first.
  const paidModels = process.env.DISABLE_PAID_FALLBACK === 'true'
    ? []
    : ((process.env.ARCUS_PREMIUM_MODELS || '').split(',').map(s => s.trim()).filter(Boolean));
  // Extra free model so the chain doesn't dead-end when gemma and nemotron-super
  // are both rate-limited upstream. Live-verified 2026-07-22 (real keys, clean
  // non-empty content under response_format:json_object). extractJsonObject()
  // also tolerates any that leak prose. 'meta-llama/llama-3.3-70b-instruct:free'
  // REMOVED same day — OpenRouter retired it from the free tier (404 on every
  // key, confirmed via live probe, not a rate limit).
  const EXTRA_FREE = [
    'nvidia/nemotron-3-nano-30b-a3b:free',
  ];
  const modelChain = [REC_MODEL, FALLBACK_MODEL, ...EXTRA_FREE, ...paidModels];

  for (const model of modelChain) {
    for (const key of ks) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://mailient.xyz', 'X-Title': 'Mailient' },
          body: JSON.stringify({ ...basePayload, model }),
          signal: AbortSignal.timeout(14000),
        });
        if (!res.ok) {
          console.warn(`[recs] ${model} key…${key.slice(-4)} -> HTTP ${res.status}`);
          continue; // try the next key, then the next model
        }
        const json = await res.json();
        const text: string = json.choices?.[0]?.message?.content || '';
        const parsed = extractJsonObject(text);
        if (!parsed) {
          console.warn(`[recs] ${model} returned unparseable content (${text.slice(0, 80)}…)`);
          continue;
        }
        const raw: any[] = Array.isArray(parsed?.recommendations) ? parsed.recommendations : Array.isArray(parsed) ? parsed : [];
        const recs = validate(raw, items, max);
        if (recs.length) {
          console.log(`[recs] ${model} -> ${recs.length} recs`);
          return { recs, sift: validateSift(parsed?.sift) }; // got usable AI recs (sift falls back deterministically if missing/invalid)
        }
        console.warn(`[recs] ${model} parsed but ${raw.length} raw -> 0 valid after refId check`);
      } catch (e: any) {
        logEvent({ channel: "failures", event: "❌ API Error", description: String(e) });
        console.warn(`[recs] ${model} key…${key.slice(-4)} threw: ${e?.message || e}`);
        continue;
      }
    }
  }
  console.warn('[recs] all models/keys exhausted — no AI recs');
  return null;
}

/**
 * Pull a JSON object out of a model response, tolerant of reasoning models that
 * wrap the JSON in prose, ```fences, or stray <thinking> tags. Returns the parsed
 * object, or null if nothing parseable is found.
 */
function extractJsonObject(raw: string): any | null {
  if (!raw) return null;
  let t = raw.replace(/<\/?(?:thinking|thought|reasoning|answer)[^>]*>/gi, '').trim();
  // ```json … ``` fence
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  // direct parse
  try { return JSON.parse(t); } catch {
    logEvent({ channel: "failures", event: "❌ API Error", description: "Unknown error" }); /* fall through */ }
  // last resort: grab the outermost {...} span (handles "Here is the JSON: {…}")
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first !== -1 && last > first) {
    const span = t.slice(first, last + 1);
    try { return JSON.parse(span); } catch {
      logEvent({ channel: "failures", event: "❌ API Error", description: "Unknown error" }); /* give up */ }
  }
  return null;
}

// Same discipline as validate() below, just for the free-text sift fields:
// reject anything empty/malformed rather than let a blank or truncated headline
// through — the caller always has the deterministic sift to fall back to.
function validateSift(raw: any): SiftSummary | null {
  const headline = clampStr(raw?.headline, 90);
  const analysis = clampStr(raw?.analysis, 380);
  if (!headline || !analysis) return null;
  return { headline, analysis };
}

// Reject anything the model invented; attach real, server-computed stats.
function validate(raw: any[], items: InItem[], maxRecs: number): OutRec[] {
  const byRef = new Map(items.map(it => [it.ref, it]));
  const out: OutRec[] = [];
  const cap = [2, 3, 4].includes(maxRecs) ? maxRecs : 4;
  for (let i = 0; i < raw.length && out.length < cap; i++) {
    const r = raw[i] || {};
    const category: Category = r.category === 'connect' ? 'connect' : r.category === 'productivity' ? 'productivity' : 'productivity';
    const title = clampStr(r.title, 70);
    const summary = clampStr(r.summary, 200);
    const arcusPrompt = clampStr(r.arcusPrompt, 400);
    const ctaLabel = clampStr(r.ctaLabel, 24) || 'Do it with Arcus';
    // refIds MUST all resolve to real items we sent — this is the anti-hallucination
    // gate. Coerce "1" / 1 / "[1]" to the integer ref; drop anything that doesn't match.
    const refIdsRaw = Array.isArray(r.refIds) ? r.refIds : [];
    const refs = refIdsRaw
      .map((id: any) => byRef.get(parseInt(String(id).replace(/[^\d]/g, ''), 10)))
      .filter(Boolean) as InItem[];
    if (!title || !summary || !arcusPrompt || refs.length === 0) continue;
    out.push({
      id: `airec-${i}`,
      category,
      title,
      summary,
      arcusPrompt,
      ctaLabel,
      stat: statFor(refs),
      atRisk: r.atRisk === true,
      refIds: refs.map(r2 => String(r2.ref)),
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-app signal gathering — server-side, gated implicitly by token presence.
// Each gatherer is fully self-contained, bounded, and fail-soft: if the app isn't
// connected (no token) or the call errors/times out, it returns [] and never
// blocks the others. Everything it surfaces is a REAL item the LLM may reference.
// ─────────────────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 3500;

function raceTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}
function daysSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}
function firstEmail(text: string): string {
  const m = (text || '').match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0] : '';
}

// Gmail — bounced sends (mailer-daemon / delivery failures) in the last 5 days.
async function gatherGmailBounces(userEmail: string): Promise<RawSignal[]> {
  const token = await getGmailToken(userEmail);
  if (!token) return [];
  const auth = { Authorization: `Bearer ${token}` };
  const q = encodeURIComponent('(from:mailer-daemon OR subject:"Delivery Status Notification" OR subject:"Undelivered") newer_than:5d');
  const listRes = await googleFetch(userEmail, 'gmail', `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=4`, { headers: auth });
  if (!listRes.ok) return [];
  const list = await listRes.json();
  const ids: string[] = (list.messages || []).map((m: any) => m.id).slice(0, 3);
  const msgs = await Promise.all(ids.map(async (id) => {
    try {
      const r = await googleFetch(userEmail, 'gmail', `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject`, { headers: auth });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      logEvent({ channel: "failures", event: "❌ API Error", description: "Unknown error" }); return null; }
  }));
  const out: RawSignal[] = [];
  const seen = new Set<string>();
  for (const m of msgs) {
    const failed = firstEmail(m?.snippet || '');
    if (!failed || failed.includes('mailer-daemon') || seen.has(failed)) continue;
    seen.add(failed);
    out.push({ kind: 'bounce', label: failed, detail: `Your email to ${failed} bounced (delivery failed) — likely a bad or mistyped address` });
  }
  return out;
}

// Google Calendar / Meet — upcoming meetings (next 2 days) that have a Meet link
// but NO agenda/description: a real "walk in prepared" signal the client buckets lack.
async function gatherCalendarPrep(userEmail: string): Promise<RawSignal[]> {
  const token = await getGcalToken(userEmail);
  if (!token) return [];
  const now = new Date();
  const end = new Date(now.getTime() + 2 * 86_400_000);
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=12`;
  const res = await googleFetch(userEmail, 'gcal', url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  const data = await res.json();
  const out: RawSignal[] = [];
  for (const ev of (data.items || [])) {
    if (out.length >= 3) break;
    if (!ev.start?.dateTime) continue; // skip all-day
    const attendees = ev.attendees || [];
    if (attendees.length === 0) continue; // skip solo blocks
    const hasMeet = !!(ev.hangoutLink || ev.conferenceData?.entryPoints?.some((e: any) => e.entryPointType === 'video'));
    const hasAgenda = !!(ev.description && String(ev.description).trim().length > 20);
    if (!hasMeet || hasAgenda) continue; // only surface Meet calls with no agenda
    const when = new Date(ev.start.dateTime).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    out.push({ kind: 'meeting', label: clampStr(ev.summary, 80) || 'A meeting', detail: `Google Meet "${clampStr(ev.summary, 80) || 'meeting'}" at ${when}, ${attendees.length} attendees — no agenda set` });
  }
  return out;
}

// Cal.com — upcoming bookings (next 7 days) that may need prep.
async function getCalClientLocal(userEmail: string): Promise<any | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('integration_credentials').select('access_token').eq('user_email', userEmail.toLowerCase()).eq('provider', 'cal_com').maybeSingle();
    const k = (data?.access_token || '').trim();
    if (k) return new CalComService(k);
  } catch {
    logEvent({ channel: "failures", event: "❌ API Error", description: "Unknown error" }); /* fall through */ }
  const shared = (process.env.CAL_API_KEY || '').trim();
  return (shared && process.env.CAL_ALLOW_SHARED_KEY === 'true') ? new CalComService(shared) : null;
}
async function gatherCalcom(userEmail: string): Promise<RawSignal[]> {
  const cal = await getCalClientLocal(userEmail);
  if (!cal) return [];
  let bookings: any[] = [];
  try { bookings = await raceTimeout(cal.getBookings(), FETCH_TIMEOUT_MS); } catch {
    logEvent({ channel: "failures", event: "❌ API Error", description: "Unknown error" }); return []; }
  if (!Array.isArray(bookings)) return [];
  const now = Date.now();
  const horizon = now + 7 * 86_400_000;
  const upcoming = bookings
    .filter((b) => { const t = new Date(b.startTime || b.start).getTime(); return Number.isFinite(t) && t > now && t < horizon && (b.status || 'accepted') !== 'cancelled'; })
    .sort((a, b) => new Date(a.startTime || a.start).getTime() - new Date(b.startTime || b.start).getTime())
    .slice(0, 3);
  return upcoming.map((b) => {
    const who = cleanName(b.attendees?.[0]?.name || b.attendees?.[0]?.email) || 'someone';
    const when = new Date(b.startTime || b.start).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    return { kind: 'booking', label: who, detail: `Cal.com booking "${clampStr(b.title, 80) || 'Meeting'}" with ${who} on ${when} (${b.status || 'accepted'})` };
  });
}

// Notion — most recently edited pages (active context the LLM can join to email threads).
function notionTitle(page: any): string {
  const props = page?.properties || {};
  for (const key of Object.keys(props)) {
    const p = props[key];
    if (p?.type === 'title' && Array.isArray(p.title)) {
      const t = p.title.map((x: any) => x?.plain_text || '').join('').trim();
      if (t) return t;
    }
  }
  return '';
}
async function gatherNotion(userEmail: string): Promise<RawSignal[]> {
  const token = await getNotionToken(userEmail);
  if (!token) return [];
  const res = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
    body: JSON.stringify({ filter: { property: 'object', value: 'page' }, sort: { direction: 'descending', timestamp: 'last_edited_time' }, page_size: 6 }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const out: RawSignal[] = [];
  for (const p of (data.results || [])) {
    if (out.length >= 3) break;
    const title = notionTitle(p);
    if (!title) continue;
    const days = daysSince(p.last_edited_time);
    out.push({ kind: 'notion', label: clampStr(title, 80), detail: `Notion page "${clampStr(title, 80)}" — last edited ${days}d ago`, metric: days });
  }
  return out;
}

// Slack — DMs whose latest message is from someone else (awaiting your reply).
async function gatherSlack(userEmail: string): Promise<RawSignal[]> {
  const token = await getSlackToken(userEmail);
  if (!token) return [];
  const auth = { Authorization: `Bearer ${token}` };
  let myId = '';
  try {
    const a = await (await fetch('https://slack.com/api/auth.test', { method: 'POST', headers: auth, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })).json();
    if (!a.ok) return [];
    myId = a.user_id;
  } catch {
    logEvent({ channel: "failures", event: "❌ API Error", description: "Unknown error" }); return []; }
  let ims: any;
  try {
    ims = await (await fetch('https://slack.com/api/conversations.list?types=im&limit=20', { headers: auth, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })).json();
  } catch {
    logEvent({ channel: "failures", event: "❌ API Error", description: "Unknown error" }); return []; }
  if (!ims?.ok) return [];
  const channels = (ims.channels || []).slice(0, 6);
  const checked = await Promise.all(channels.map(async (ch: any) => {
    try {
      const h = await (await fetch(`https://slack.com/api/conversations.history?channel=${ch.id}&limit=1`, { headers: auth, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })).json();
      const last = h?.messages?.[0];
      if (last && last.user && last.user !== myId && !last.bot_id) {
        return { user: ch.user || last.user, text: String(last.text || '').replace(/<[^>]+>/g, '').trim() };
      }
    } catch {
      logEvent({ channel: "failures", event: "❌ API Error", description: "Unknown error" }); /* ignore */ }
    return null;
  }));
  const waiting = checked.filter(Boolean).slice(0, 3) as Array<{ user: string; text: string }>;
  if (!waiting.length) return [];
  // Resolve the sender names (one users.info each, in parallel, best-effort).
  const named = await Promise.all(waiting.map(async (w) => {
    try {
      const u = await (await fetch(`https://slack.com/api/users.info?user=${w.user}`, { headers: auth, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })).json();
      const name = u?.user?.real_name || u?.user?.profile?.display_name || '';
      return { name: cleanName(name) || 'A teammate', text: w.text };
    } catch {
      logEvent({ channel: "failures", event: "❌ API Error", description: "Unknown error" }); return { name: 'A teammate', text: w.text }; }
  }));
  return named.map((n) => ({ kind: 'slack', label: n.name, detail: `Slack DM from ${n.name} is waiting on your reply: "${n.text.slice(0, 90)}"` }));
}

// Only fetch from the apps the user left enabled in Customize Briefing — saves
// latency and respects the toggle. (No token → the gatherer returns [] anyway.)
async function gatherServerSignals(userEmail: string, apps: BriefingPrefs['apps']): Promise<RawSignal[]> {
  const tasks: Promise<RawSignal[]>[] = [];
  if (apps.gmail) tasks.push(gatherGmailBounces(userEmail));
  if (apps.calendar) tasks.push(gatherCalendarPrep(userEmail));
  if (apps.calcom) tasks.push(gatherCalcom(userEmail));
  if (apps.notion) tasks.push(gatherNotion(userEmail));
  if (apps.slack) tasks.push(gatherSlack(userEmail));
  const results = await Promise.allSettled(tasks);
  const out: RawSignal[] = [];
  for (const r of results) if (r.status === 'fulfilled' && Array.isArray(r.value)) out.push(...r.value);
  return out;
}

// Drop client-bucket items for apps the user toggled off (promised/notes always
// stay — they're the user's own commitments, not an app feed).
function filterByApps(items: InItem[], apps: BriefingPrefs['apps']): InItem[] {
  const enabled: Record<string, boolean> = {
    decide: apps.gmail, chase: apps.gmail, bounce: apps.gmail,
    meeting: apps.calendar, booking: apps.calcom, notion: apps.notion, slack: apps.slack,
    promised: true,
  };
  return items.filter(it => enabled[it.kind] !== false);
}

// Continue the numeric-ref counter from the client items so every signal — local
// or cross-app — shares one ref space the model echoes back.
function appendServerSignals(items: InItem[], signals: RawSignal[]): InItem[] {
  let ref = items.length; // normalizeItems assigned refs 1..items.length
  const merged = [...items];
  for (const s of signals.slice(0, 12)) {
    merged.push({ ref: ++ref, kind: s.kind, label: s.label, detail: s.detail, metric: s.metric });
  }
  return merged;
}

export async function POST(req: Request) {
  try {
    // @ts-ignore
    const session = await (auth as any)();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email as string;
    const body = await req.json().catch(() => ({}));

    // The user's Customize-Briefing prefs shape what we gather and how we rank.
    // The founder model (VIPs/style/priorities) lets picks reason from what
    // Mailient already knows — fetched in parallel, fail-soft to ''.
    const [prefs, founderModel] = await Promise.all([
      getBriefingPrefs(userEmail),
      (async () => { try { const { getUserModelSummary } = await import('@/lib/arcus/user-model'); return await getUserModelSummary(userEmail); } catch {
          logEvent({ channel: "failures", event: "❌ API Error", description: "Unknown error" }); return ''; } })(),
    ]);

    // Client buckets (Gmail/Calendar/ledger, already computed + freshest) + the
    // cross-app signals we gather server-side from every ENABLED app, in one
    // shared numeric-ref space, then drop any app the user toggled off.
    const clientItems = normalizeItems(body);
    const serverSignals = await gatherServerSignals(userEmail, prefs.apps).catch(() => []);
    const items = filterByApps(appendServerSignals(clientItems, serverSignals), prefs.apps);

    if (!items.length) {
      return NextResponse.json({ success: true, recommendations: [], source: 'empty', appCounts: {}, sift: null });
    }

    const apps = Array.from(new Set(items.map(i => APP_OF[i.kind])));
    // Real per-app counts for the "Across your apps" chart — already
    // connection-gated (gatherServerSignals only ever produced a signal for an
    // app with a live token) and toggle-gated (filterByApps above), so a key
    // only appears here for an app that's actually connected and active.
    const appCounts: Record<AppKey, number> = { gmail: 0, calendar: 0, notion: 0, slack: 0, calcom: 0 };
    for (const it of items) {
      const k = APP_KEY_OF[it.kind];
      if (k) appCounts[k] += 1;
    }
    const fallbackSift = deterministicSift(items);

    const genResult = await generate(items, prefs, founderModel);
    if (!genResult || !genResult.recs.length) {
      // Signal the client to keep its instant deterministic recommendations.
      return NextResponse.json({ success: true, recommendations: [], source: 'fallback', apps, appCounts, sift: fallbackSift });
    }
    return NextResponse.json({
      success: true,
      recommendations: genResult.recs,
      source: 'ai',
      apps,
      appCounts,
      sift: genResult.sift || fallbackSift,
    });
  } catch (err: any) {
    logEvent({ channel: "failures", event: "❌ API Error", description: String(err) });
    return NextResponse.json({ success: true, recommendations: [], source: 'error', error: String(err?.message || 'failed').slice(0, 200) }, { status: 200 });
  }
}
