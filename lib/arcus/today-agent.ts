/**
 * Today triage agent — the AI brain behind the Home-feed "Today" surface.
 *
 * This replaces the old regex/heuristic selection (classifyDecideReason + fixed
 * rank()) with a real, tool-driven agent: it is SEEDED with the day's candidate
 * items (unread mail, sent-no-reply threads, upcoming meetings), then it
 * INVESTIGATES them with read-only tools (read_email, gmail_read_thread,
 * search_gmail, get_calendar_events …) before deciding — the "full back and
 * forth" — and finally returns a ranked, reasoned triage as structured JSON.
 *
 * Anti-hallucination: the agent may only reference candidates by their bracket
 * tag (D#/C#/S#); the mapper resolves each tag back to the REAL server-fetched
 * item, so the agent can never invent an email, name, number, or deadline. Any
 * tag out of range is dropped.
 *
 * Read-only by construction: the tool set is filtered to a read allowlist, so
 * triage can never send, archive, label, or book anything.
 *
 * Reuses the Arcus engine (model fallback + key rotation) and tool layer — the
 * same infra the background agents and live chat run on.
 */

import { callLLM, getRawText, getToolCalls, type LLMMessage, type ContentBlock } from './engine';
import { getAvailableTools, executeTool } from './tools';
import { getConnectedIntegrations } from './system-prompt';

export interface DecideCandidate {
  id: string;
  threadId: string;
  sender: { name: string; email: string };
  subject: string;
  snippet: string;
  receivedAt: string;
  gmailUrl: string;
}
export interface ChaseCandidate {
  id: string;
  threadId: string;
  recipient: { name: string; email: string };
  subject: string;
  daysSilent: number;
  sentAt: string;
  gmailUrl: string;
}
export interface ShowUpCandidate {
  id: string;
  start: string;
  end: string | null;
  title: string;
  attendeeCount: number;
  meetLink: string | null;
  hangoutLink: string | null;
  isExternal: boolean;
}

export interface AgentTodayResult {
  decide: Array<Omit<DecideCandidate, 'snippet'> & { reason: string }>;
  chase: Array<ChaseCandidate & { reason: string }>;
  showUp: Array<ShowUpCandidate & { reason: string }>;
  briefing: string;
}

// Tools the triage may call — READ-ONLY. It must never send, archive, label,
// book, or otherwise mutate. Names that aren't in the live registry simply never
// match (getAvailableTools won't return them), so this list is safe to keep broad.
const READ_ONLY_TOOLS = new Set([
  'search_gmail',
  'read_email',
  'gmail_read_thread',
  'get_sent_emails',
  'get_calendar_events',
  'calendar_get_availability',
  'search_notion',
  'notion_read_page',
  'slack_find_user',
  'get_recipient_context',
]);

const MAX_PER_BUCKET = 3;
const MAX_TURNS = 8;

/**
 * Run the triage agent over the day's candidates. Returns a ranked/reasoned
 * result, or null on any failure (no candidates, no keys, all models
 * rate-limited, unparseable output, deadline) — the caller falls back to the
 * heuristic fetchers so Today never loads worse than the regex baseline.
 */
export async function buildTodayViaAgent(
  userEmail: string,
  candidates: { decide: DecideCandidate[]; chase: ChaseCandidate[]; showUp: ShowUpCandidate[] },
  opts: { deadlineMs?: number; maxToolCalls?: number } = {},
): Promise<AgentTodayResult | null> {
  const { decide, chase, showUp } = candidates;
  if (!decide.length && !chase.length && !showUp.length) return null;

  const deadlineAt = Date.now() + (opts.deadlineMs ?? 24_000);
  const maxToolCalls = opts.maxToolCalls ?? 12;

  let connected: string[] = [];
  try { connected = await getConnectedIntegrations(userEmail); } catch { connected = []; }
  // Read-only subset. If we couldn't resolve integrations, tools is empty and the
  // agent simply triages from the seeded lists without digging deeper — still AI.
  const tools = getAvailableTools(connected, true).filter((t) => READ_ONLY_TOOLS.has(t.name));

  const decideList = decide.map((d, i) =>
    `[D${i}] From: ${d.sender.name || d.sender.email} <${d.sender.email}> | Subject: ${d.subject} | Received: ${d.receivedAt}\n      ThreadId: ${d.threadId} | MsgId: ${d.id}\n      Preview: ${(d.snippet || '').slice(0, 300)}`,
  ).join('\n');
  const chaseList = chase.map((c, i) =>
    `[C${i}] To: ${c.recipient.name || c.recipient.email} <${c.recipient.email}> | Subject: ${c.subject} | You sent ${c.daysSilent}d ago, still no reply | ThreadId: ${c.threadId}`,
  ).join('\n');
  const showUpList = showUp.map((s, i) =>
    `[S${i}] ${s.title} | Starts: ${s.start} | ${s.attendeeCount} attendee(s) | ${s.isExternal ? 'External' : 'Internal'}`,
  ).join('\n');

  const systemPrompt =
`You are the chief-of-staff brain behind a founder's daily briefing. You decide what genuinely deserves their attention TODAY and why.

You are given the day's candidate items below. This is a WIDE, mostly-UNFILTERED net — nothing here has been pre-vetted as important, and some of it IS noise (newsletters, receipts, automated notifications, cold outreach, FYIs). YOU are the filter: judge every item on what it actually says, not on the fact that it's in the list. These are the ONLY items you may put in your output — reference each by its bracket tag (D#, C#, S#). Never invent an item, person, number, or deadline.

DECIDE — unread emails that may need a reply or a decision:
${decideList || '(none)'}

CHASE — you emailed these people and they haven't replied yet:
${chaseList || '(none)'}

SHOW UP — upcoming meetings:
${showUpList || '(none)'}

HOW YOU WORK:
1. INVESTIGATE before judging. For any DECIDE or CHASE item you're unsure about, call read_email (messageId = the MsgId) or gmail_read_thread (threadId = the ThreadId) to read what it actually says. You may search_gmail for prior context on a sender, or get_calendar_events for meeting context. Don't guess from the subject alone when the preview is ambiguous.
2. TRIAGE RUTHLESSLY. The list is wide and unfiltered — expect most of it to be noise. Out of all candidates only a handful truly need a human today. Keep the genuine signal; DROP the rest (newsletters, receipts, FYIs, automated notifications, cold outreach, anything a busy founder would ignore) — leave those out of the output entirely. An empty bucket is correct when nothing in it matters.
3. RANK by real importance (revenue, a person waiting, a hard deadline, a relationship going cold), highest priority first.
4. Write ONE specific reason per kept item — name the concrete ask/decision, grounded ONLY in what you read. Good: "Priya needs the Q3 budget approved before Friday's board call." Bad: "Needs your attention."
5. At most ${MAX_PER_BUCKET} items per bucket.

When you have finished investigating, output ONE JSON object and NOTHING else (no prose, no markdown fence):
{"briefing":"<=140 chars: the day in one line — what needs them, or 'all quiet' if nothing does",
 "decide":[{"ref":"D0","reason":"...","priority":0-100}],
 "chase":[{"ref":"C0","reason":"...","priority":0-100}],
 "showUp":[{"ref":"S0","reason":"...","priority":0-100}]}
Use ONLY the D#/C#/S# tags listed above. reason: max 16 words, specific. Omit a bucket's array (or leave it empty) if nothing in it matters today.`;

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Investigate the candidates and produce the triage JSON for today.' },
  ];

  let toolCallsUsed = 0;
  let finalText = '';

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    if (deadlineAt - Date.now() < 3000) break; // not enough time for another round-trip
    const budgetSpent = toolCallsUsed >= maxToolCalls;

    let res;
    try {
      res = await callLLM(messages, budgetSpent ? [] : tools, {
        maxTokens: 1200,
        temperature: 0.2,
        deadlineAt,
      });
    } catch {
      break; // engine exhausted (all models/keys) → fall back
    }

    const text = getRawText(res.content);
    const toolCalls = budgetSpent ? [] : getToolCalls(res.content);

    if (!toolCalls.length) {
      finalText = text || finalText;
      break; // model produced its final answer (the JSON)
    }

    // Record the assistant turn (with its tool_use blocks), then execute + reply.
    messages.push({ role: 'assistant', content: res.content });
    const resultBlocks: ContentBlock[] = [];
    for (const tc of toolCalls) {
      if (toolCallsUsed >= maxToolCalls) {
        resultBlocks.push({ type: 'tool_result', tool_use_id: tc.id, content: 'Investigation budget reached — output the final triage JSON now.' });
        continue;
      }
      if (!READ_ONLY_TOOLS.has(tc.name)) {
        resultBlocks.push({ type: 'tool_result', tool_use_id: tc.id, content: 'That tool is not permitted during triage (read-only). Use only read tools, then output the JSON.' });
        continue;
      }
      toolCallsUsed++;
      let out = '';
      try {
        const r = await executeTool(tc.name, tc.input || {}, userEmail, { isBackgroundAgent: true, runState: 'PLANNING' });
        out = String(r?.output || '').slice(0, 4000);
      } catch (e: any) {
        out = `Tool error: ${e?.message || 'failed'}`;
      }
      resultBlocks.push({ type: 'tool_result', tool_use_id: tc.id, content: out });
    }
    messages.push({ role: 'user', content: resultBlocks });
  }

  const parsed = extractJsonObject(finalText);
  if (!parsed) return null;

  const result = mapToBuckets(parsed, candidates);
  if (!result.decide.length && !result.chase.length && !result.showUp.length && !result.briefing) {
    return null; // agent produced nothing usable → let heuristics take over
  }
  return result;
}

// ── JSON → typed buckets ───────────────────────────────────────────────────────

interface RefRow { ref?: string; reason?: string; priority?: number }

function mapToBuckets(
  parsed: any,
  candidates: { decide: DecideCandidate[]; chase: ChaseCandidate[]; showUp: ShowUpCandidate[] },
): AgentTodayResult {
  const briefing = typeof parsed?.briefing === 'string' ? parsed.briefing.trim().slice(0, 200) : '';

  const resolve = <T>(pool: T[], rows: any, prefix: string, fallbackReason: (item: T) => string) => {
    const chosen: Array<{ item: T; reason: string; p: number }> = [];
    const used = new Set<number>();
    if (Array.isArray(rows)) {
      for (const row of rows as RefRow[]) {
        const ref = String(row?.ref || '').trim().toUpperCase();
        if (!ref.startsWith(prefix)) continue;
        const idx = parseInt(ref.slice(prefix.length), 10);
        if (!Number.isInteger(idx) || idx < 0 || idx >= pool.length || used.has(idx)) continue;
        used.add(idx);
        const reason = typeof row.reason === 'string' ? row.reason.trim().slice(0, 140) : '';
        const p = Number(row.priority);
        chosen.push({ item: pool[idx], reason: reason || fallbackReason(pool[idx]), p: Number.isFinite(p) ? p : 0 });
      }
    }
    chosen.sort((a, b) => b.p - a.p);
    return chosen.slice(0, MAX_PER_BUCKET);
  };

  const decide = resolve(candidates.decide, parsed?.decide, 'D', () => 'Needs your reply.').map(({ item, reason }) => {
    const { snippet, ...rest } = item;
    return { ...rest, reason };
  });
  const chase = resolve(candidates.chase, parsed?.chase, 'C', () => "You sent this. They haven't replied.").map(({ item, reason }) => ({ ...item, reason }));
  const showUp = resolve(candidates.showUp, parsed?.showUp, 'S', (m) => (m.isExternal ? 'External meeting — prep it.' : 'Internal meeting.')).map(({ item, reason }) => ({ ...item, reason }));

  return { decide, chase, showUp, briefing };
}

/**
 * Pull a JSON object out of a model response, tolerant of reasoning models that
 * wrap the JSON in prose, ``` fences, or stray <thinking> tags. Mirrors the
 * helper in app/api/home-feed/recommendations/route.ts.
 */
function extractJsonObject(raw: string): any | null {
  if (!raw) return null;
  let t = raw.replace(/<\/?(?:thinking|thought|reasoning|answer)[^>]*>/gi, '').trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try { return JSON.parse(t.slice(first, last + 1)); } catch { /* give up */ }
  }
  return null;
}
