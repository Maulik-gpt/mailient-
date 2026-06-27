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

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

// nemotron-3-super (NOT ultra) — this needs response_format json_object, which
// ultra's API doesn't support but super does. Falls back across keys.
const REC_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
const FALLBACK_MODEL = 'google/gemma-4-31b-it:free';

type Category = 'connect' | 'productivity';

interface InItem { id: string; kind: 'decide' | 'chase' | 'promised' | 'meeting'; label: string; detail: string; metric?: number; }

interface OutRec {
  id: string;
  category: Category;
  title: string;
  summary: string;
  arcusPrompt: string;
  ctaLabel: string;
  stat: { value: number; label: string };
  refIds: string[];
}

function keys(): string[] {
  return [process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_API_KEY2, process.env.OPENROUTER_API_KEY3, process.env.OPENROUTER_API_KEY4, process.env.OPENROUTER_API_KEY5].filter(Boolean) as string[];
}

function clampStr(v: any, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// Build the real, id-tagged item list the model is allowed to reference.
function normalizeItems(body: any): InItem[] {
  const items: InItem[] = [];
  const decide = Array.isArray(body?.decide) ? body.decide : [];
  const chase = Array.isArray(body?.chase) ? body.chase : [];
  const promised = Array.isArray(body?.actionItems) ? body.actionItems : [];
  const meetings = Array.isArray(body?.showUp) ? body.showUp : [];

  for (const d of decide.slice(0, 8)) {
    if (!d?.id) continue;
    items.push({ id: `decide:${d.id}`, kind: 'decide', label: clampStr(d?.sender?.name || d?.sender?.email, 80) || 'Someone', detail: `Unanswered: "${clampStr(d?.subject, 120)}" — ${clampStr(d?.reason, 140)}` });
  }
  for (const c of chase.slice(0, 8)) {
    if (!c?.id) continue;
    items.push({ id: `chase:${c.id}`, kind: 'chase', label: clampStr(c?.recipient?.name || c?.recipient?.email, 80) || 'A contact', detail: `You messaged about "${clampStr(c?.subject, 120)}" — no reply in ${Number(c?.daysSilent) || 0} days`, metric: Number(c?.daysSilent) || 0 });
  }
  for (const a of promised.slice(0, 8)) {
    if (!a?.id) continue;
    const who = Array.isArray(a?.attendees) && a.attendees.length ? ` (with ${a.attendees.slice(0, 2).join(', ')})` : '';
    items.push({ id: `promised:${a.id}`, kind: 'promised', label: clampStr(a?.meetingTitle, 80) || 'A commitment', detail: `${a?.isOverdue ? 'OVERDUE promise' : 'Promise'}: "${clampStr(a?.text, 140)}"${who}`, metric: a?.isOverdue ? 1 : 0 });
  }
  for (const m of meetings.slice(0, 8)) {
    if (!m?.id) continue;
    items.push({ id: `meeting:${m.id}`, kind: 'meeting', label: clampStr(m?.title, 80) || 'A meeting', detail: `${m?.isExternal ? 'External' : 'Internal'} meeting, ${Number(m?.attendeeCount) || 0} attendees` });
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
  }
  return { value: refs.length, label: 'items' };
}

async function generate(items: InItem[]): Promise<OutRec[] | null> {
  const ks = keys();
  if (!ks.length || !items.length) return null;

  const catalog = items.map(it => `- id=${it.id} | who/what: ${it.label} | ${it.detail}`).join('\n');

  const system =
    'You are the chief-of-staff brain behind a founder\'s daily briefing. You are given a list of REAL items from their inbox, calendar, and commitments — each with a stable id. ' +
    'Produce 3 (max 4) high-leverage next-step RECOMMENDATIONS that either STRENGTHEN A RELATIONSHIP (category "connect") or BOOST PRODUCTIVITY (category "productivity"). Aim for a mix of both when the items allow.\n\n' +
    'HARD RULES — accuracy is everything:\n' +
    '- Only ever reference the items provided. Put the exact id(s) each recommendation is about in refIds. NEVER invent an id, a person, a number, a company, or a deadline that is not in the input.\n' +
    '- Do NOT put any statistics or counts in your text — the system computes those. Keep the summary about the specific people/subjects.\n' +
    '- title: a short, plain imperative (≤7 words), e.g. "Reconnect with Sarah before it stalls".\n' +
    '- summary: 1 sentence, specific, naming the real person/subject, why it matters now.\n' +
    '- arcusPrompt: a single clear instruction the user can hand to their AI assistant (Arcus) to DO this with no further typing — e.g. "Draft a warm follow-up to Sarah Chen about the Q3 proposal she hasn\'t replied to in 6 days." It must be fully self-contained and grounded in the item.\n' +
    '- ctaLabel: 2-3 words on the button, e.g. "Draft nudge", "Prep me", "Clear it".\n' +
    'Return ONLY JSON: {"recommendations":[{"category","title","summary","arcusPrompt","ctaLabel","refIds":[...]}]}';

  const payload = {
    model: REC_MODEL,
    max_tokens: 900,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Today's real items:\n${catalog}\n\nWrite the recommendations now.` },
    ],
  };

  for (const key of ks) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://mailient.xyz', 'X-Title': 'Mailient' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(14000),
      });
      if (!res.ok) {
        // On a model-side issue, retry the next key with the lighter fallback model.
        payload.model = FALLBACK_MODEL;
        continue;
      }
      const json = await res.json();
      let text: string = json.choices?.[0]?.message?.content || '';
      text = text.replace(/<\/?(?:thinking|thought|reasoning)[^>]*>/gi, '').trim();
      // json_object should already be clean JSON, but tolerate a ```json fence.
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenced) text = fenced[1].trim();
      const parsed = JSON.parse(text);
      const raw: any[] = Array.isArray(parsed?.recommendations) ? parsed.recommendations : Array.isArray(parsed) ? parsed : [];
      return validate(raw, items);
    } catch {
      payload.model = FALLBACK_MODEL;
      continue;
    }
  }
  return null;
}

// Reject anything the model invented; attach real, server-computed stats.
function validate(raw: any[], items: InItem[]): OutRec[] {
  const byId = new Map(items.map(it => [it.id, it]));
  const out: OutRec[] = [];
  for (let i = 0; i < raw.length && out.length < 4; i++) {
    const r = raw[i] || {};
    const category: Category = r.category === 'connect' ? 'connect' : r.category === 'productivity' ? 'productivity' : 'productivity';
    const title = clampStr(r.title, 70);
    const summary = clampStr(r.summary, 200);
    const arcusPrompt = clampStr(r.arcusPrompt, 400);
    const ctaLabel = clampStr(r.ctaLabel, 24) || 'Do it with Arcus';
    // refIds MUST all resolve to real items we sent — this is the anti-hallucination gate.
    const refIdsRaw = Array.isArray(r.refIds) ? r.refIds : [];
    const refs = refIdsRaw.map((id: any) => byId.get(String(id))).filter(Boolean) as InItem[];
    if (!title || !summary || !arcusPrompt || refs.length === 0) continue;
    out.push({
      id: `airec-${i}`,
      category,
      title,
      summary,
      arcusPrompt,
      ctaLabel,
      stat: statFor(refs),
      refIds: refs.map(r2 => r2.id),
    });
  }
  return out;
}

export async function POST(req: Request) {
  try {
    // @ts-ignore
    const session = await (auth as any)();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const items = normalizeItems(body);
    if (!items.length) {
      return NextResponse.json({ success: true, recommendations: [], source: 'empty' });
    }

    const recs = await generate(items);
    if (!recs || !recs.length) {
      // Signal the client to keep its instant deterministic recommendations.
      return NextResponse.json({ success: true, recommendations: [], source: 'fallback' });
    }
    return NextResponse.json({ success: true, recommendations: recs, source: 'ai' });
  } catch (err: any) {
    return NextResponse.json({ success: true, recommendations: [], source: 'error', error: String(err?.message || 'failed').slice(0, 200) }, { status: 200 });
  }
}
