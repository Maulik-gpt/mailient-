/**
 * Arcus Agentic Loop
 *
 * SSE streaming agentic loop with three infrastructure layers added
 * on top of the core LLM → tool → loop cycle:
 *
 * Layer 1 — Vague instruction detection
 *   Before the main loop starts, the user message is checked against
 *   known vague-instruction patterns. If vague, a short planning-mode
 *   LLM call generates a 2-sentence plan + "Should I proceed?" and the
 *   stream ends. On the next user message (any form of yes), full
 *   execution runs with the plan already in history.
 *
 * Layer 2 — Inbox pipeline
 *   search_gmail results on inbox-related tasks are passed through the
 *   inbox pipeline before the LLM sees them: classified by priority tier,
 *   sorted (client threads → revenue → scheduling → general), and
 *   newsletters/promotions silently removed. Archive count accumulates
 *   and is reported at the end.
 *
 * Layer 3 — Failure tracking and partial failure reporting
 *   Every tool call records either a success (tool name) or a failure
 *   (tool name + error). If the task partially fails, the final message
 *   always includes a Done / Needs attention section regardless of what
 *   the LLM wrote. One targeted recovery question is appended.
 *
 * SSE events:
 *   run_start     → { runId, message }
 *   thinking      → { status }
 *   narrative     → { text, iteration }
 *   tool_call     → { tool, params, iteration }
 *   tool_result   → { tool, success, summary, iteration }
 *   canvas        → { title, type, markdown, draftMeta? }
 *   task_list     → { tasks }
 *   task_progress → { completedCount }
 *   message       → { content, canvasContent? }
 *   plan          → { title, markdown }
 *   error         → { message }
 *   done          → { runId, durationMs, totalSteps }
 */

import crypto from 'crypto';
import { callLLM, getText, getRawText, getToolCalls, sanitizeModelText } from './engine';
import { executeTool, getAvailableTools, TOOL_SCHEMAS } from './tools';
import { processGmailResults, isVagueInstruction, shouldDispatchParallelVAs, type ArcusVA } from './inbox-pipeline';
import { invalidateGmailScope } from './gmail-scope';
import { getSupabaseAdmin } from '../supabase.js';
import { buildExecutionPlan, planToHint, checkPrerequisites } from './orchestrator';
import { classifyUserIntent, shouldSuppressTools, intentSystemHint } from './intent-classifier';
import type { LLMMessage } from './engine';

// ── Audit logging — fire-and-forget, never blocks the loop ────────────────────
function logAudit(params: {
  userId: string; runId: string; toolName: string;
  inputSummary?: string; outputSummary?: string;
  durationMs?: number; success: boolean; errorMessage?: string; iteration?: number;
}) {
  try {
    const supabase = getSupabaseAdmin();
    supabase.from('arcus_audit_log').insert({
      user_id:        params.userId,
      run_id:         params.runId,
      tool_name:      params.toolName,
      input_summary:  params.inputSummary?.slice(0, 500),
      output_summary: params.outputSummary?.slice(0, 500),
      duration_ms:    params.durationMs,
      success:        params.success,
      error_message:  params.errorMessage?.slice(0, 500),
      iteration:      params.iteration,
    });
  } catch { /* non-fatal */ }
}

const ASK_USER_SCHEMA = TOOL_SCHEMAS.find(s => s.name === 'ask_user')!;

function ts() { return new Date().toISOString().slice(11, 23); }

// ── Plan-mode output normalisation (PART 42) ──────────────────────────────────
//
// Free models routinely violate the plan-mode formatting rules: numbered steps
// collapse into one paragraph, headings run inline with surrounding prose, and
// for agent-creation requests the model sometimes dumps the would-be tool
// params (`name: "X"`, `cron_schedule: "0 2 * * *"`) as the entire plan body.
//
// Rather than throwing those failures on the user, we apply three forgiving
// rewrites before emitting the `plan` SSE event. None of these change the
// MEANING of the LLM's output — they only fix presentation.

function normalizePlanMarkdown(raw: string): string {
  let s = (raw || '').trim();
  if (!s) return s;

  // 1. Detect the params-dump pattern: ≥3 lines of bare `key: "value"` shape
  // with no markdown structure. Rewrite as a "Plan output was malformed"
  // wrapper so the user at least sees readable text instead of a JSON-ish
  // mess that looks like a bug.
  const paramLineRe = /^\s*[a-z_]+:\s*("[^"\n]*"|true|false|\d+|-?\d+(?:\.\d+)?)\s*$/i;
  const paramDumpLineCount = s.split(/\r?\n/).filter(l => paramLineRe.test(l)).length;
  const totalNonBlank = s.split(/\r?\n/).filter(l => l.trim()).length;
  if (paramDumpLineCount >= 3 && paramDumpLineCount / Math.max(1, totalNonBlank) > 0.5) {
    // Convert the param-dump into a single narrative paragraph the user can read.
    const lines = s.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const narrativeBits = lines
      .filter(l => paramLineRe.test(l))
      .map(l => {
        const m = l.match(/^([a-z_]+):\s*(.+)$/i);
        if (!m) return null;
        const key = m[1].replace(/_/g, ' ');
        const val = m[2].replace(/^"|"$/g, '');
        return `${key}: ${val}`;
      })
      .filter(Boolean);
    s = [
      `# Plan`,
      '',
      `## Configuration`,
      '',
      ...narrativeBits.map(b => `- ${b}`),
      '',
      `## Note`,
      '',
      `_The model returned configuration values instead of a structured plan. The settings above are what would be applied — review them and re-prompt if you want a fuller breakdown._`,
    ].join('\n');
  }

  // 2. Split inline-numbered list items. Pattern: "1. Foo. 2. Bar. 3. Baz"
  // becomes one numbered item per line. Only fire when the digit is preceded
  // by sentence-end punctuation or 2+ spaces — never break legitimate prose.
  s = s.replace(/([.!?:;]\s+|\s{2,})(\d{1,2}\.\s+)/g, '$1\n$2');

  // 3. Ensure ## / ### headings have a blank line before them when they're
  // not at the very start of the document. (Markdown renderers tolerate
  // missing blanks but the LLM regularly produces "... text. ## Heading"
  // which renders as a paragraph instead of a heading.)
  s = s.replace(/(\S)(\n)(#{1,6}\s+)/g, '$1\n\n$3');

  // 4. Ensure --- separators have blank lines around them.
  s = s.replace(/([^\n])\n(---+)\n([^\n])/g, '$1\n\n$2\n\n$3');

  // 5. Collapse runs of 3+ newlines so we don't end up with monster gaps.
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
}
function log(level: 'info' | 'warn' | 'error', msg: string, extra?: Record<string, unknown>) {
  const prefix = `[Arcus:Loop] ${ts()}`;
  const line = extra ? `${prefix} ${msg} ${JSON.stringify(extra)}` : `${prefix} ${msg}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/**
 * Hard cap on tool calls per run.
 * Background agents (isBackgroundAgent=true) bypass this via the
 * maxToolCalls loop option — see toolCallLimit calculation below.
 * Interactive chat sessions are capped at 20 to keep responses snappy.
 */
export const MAX_TOOL_CALLS = 20;
/**
 * Raised cap for background / cron agents. 100 lets a scheduling agent
 * process a full inbox (50 threads × 2 calls each) without hitting the
 * wall mid-run. The Vercel deadlineMs budget is the real constraint.
 */
export const MAX_TOOL_CALLS_BACKGROUND = 100;
const MAX_NUDGES = 3;

// ── Pattern guards ─────────────────────────────────────────────────────────────

const INTENT_PATTERN = /^(searching|looking|checking|reading|finding|fetching|let me|i['']ll|i will|i am going to|going to|will (search|check|look|read|find|fetch)|now (searching|checking|reading)|got it|sure|okay|alright)/i;

// Catches future-intent phrases ANYWHERE in the text — handles planning paragraphs
// that don't start with intent words but end with "I'll set that up now." etc.
const INTENT_ANYWHERE_PATTERN =
  /\b(i['']ll\s+(?:set\s+(?:that|this|it)\s+up|proceed(?:\s+now)?|create\s+(?:the|an?\s+|this\s+)?\w|start(?:\s+(?:now|this|that))?|do\s+(?:this|that)\s+now|handle\s+this|call\s+the\s+tools?|use\s+the\s+tools?|draft\s+\w|define\s+\w|write\s+\w|open\s+\w|search\s+\w|send\s+\w|check\s+\w|read\s+\w|schedule\s+\w|look\s+\w)|i\s+will\s+(?:now|proceed|create|set\s+up|schedule|run|execute|build|make|draft|define|write|open|search|send|check|read)\b|setting\s+(?:this|that|it)\s+up\s+now|proceeding\s+now|will\s+proceed\s+now|and\s+then\s+create\s+it|then\s+I'?ll\s+\w)\b/i;

const PLACEHOLDER_PATTERN = /\[\s*(I will|will be|to be|once generated|actual.*link|link here|pending|tbd|insert|placeholder|meet link|google meet link|conference link|calendar link|meeting link)\s*[^\]]*?\]/i;

// Bracketed directives where the model *describes* a tool action instead of
// performing it — e.g. "[open canvas with the proof report]",
// "[draft the reply here]", "[schedule the meeting]". These must trigger a
// nudge so the model actually calls the tool rather than narrating it.
const ACTION_PLACEHOLDER_PATTERN = /\[\s*(open(s|ing)?\s+(the\s+)?canvas|canvas\s*:|(create|generate|render|build|produce|put)\s+(a\s+|the\s+|this\s+)?(canvas|notion|page|document|report|summary|draft|plan|table)|draft\s+(a\s+|the\s+)?(reply|email|response|message)|schedule\s+(a\s+|the\s+)?(meeting|call|event)|send\s+(a\s+|an?\s+|the\s+)?(email|message|slack|reply))\b[^\]]*\]/i;

function isIntentText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  // Increased from 500 to 800 — some narration paragraphs are longer
  if (t.length < 800 && INTENT_PATTERN.test(t)) return true;
  return INTENT_ANYWHERE_PATTERN.test(t);
}

function hasPlaceholders(text: string): boolean {
  return PLACEHOLDER_PATTERN.test(text) || ACTION_PLACEHOLDER_PATTERN.test(text);
}

// Detects step-listing responses: LLM lists what tools it ran instead of answering the question.
// Three shapes we catch:
//   (a) "Done — completed Searched inbox for..." — verb-then-tool
//   (b) "Done — completed Completed gmail get profile" — double-completion + tool name
//   (c) "Done — completed gmail get profile, Running create scheduled agent" — tool-name salad
//   (d) "I searched the inbox and..." — first-person narration of what was searched
const STEP_LIST_PATTERN = /^(done\s*[—–-]\s*(completed|i handled|i ran|executed|performed|opened|running|finished)\s+((completed|opened|running|finished)\s+)?(?:searched|search|read|fetch|check|look|scan|get|gmail|calendar|notion|slack|create|update|draft|send|schedule|run)|done\s*[—–-]\s*(?:searched\s+inbox|read\s+email|fetch|checked\s+calendar)|i\s+(?:searched|read|fetched|checked|scanned)\s+(?:the\s+)?(?:inbox|gmail|calendar|notion|slack)\s+(?:for|and)\b)/i;

// "Tool-name salad" detector — sentences whose nouns/verbs are dominated by underscored
// tool names ("gmail_get_profile", "create_scheduled_agent", "open_canvas").
// If a short response is mostly tool-name salad with no substantive English, it's a step list.
function isToolNameSalad(text: string): boolean {
  const t = text.trim();
  if (t.length > 500) return false;
  // Look for two or more bare tool-shaped phrases: lowercase verb + space + lowercase noun
  // ("gmail get profile", "create scheduled agent", "open canvas", "search gmail")
  const toolPhraseCount = (t.match(/\b(gmail|calendar|notion|slack|canvas|scheduled|drafted?|sent?|read)\s+(get|create|open|update|send|run|read|search|apply|archive|find)(?:\s+\w+)?/gi) || []).length;
  if (toolPhraseCount < 2) return false;
  // ...AND no substantive content words
  const hasSubstance = /\b(because|since|so that|found|says|reads|wrote|subject|from|to|body|threadId removed|meeting|event|time|date|reason|error|missing|no \w+ found|drafted (?:a|the) reply (?:to|about))\b/i.test(t);
  return !hasSubstance;
}

// A step-listing response has short length with no real info, or starts with a step recap
// and the whole body is just a comma-separated list of tool actions.
function isStepListingResponse(text: string, toolsWereCalled: boolean): boolean {
  if (!toolsWereCalled) return false;
  const t = text.trim();
  if (!t || t.length > 1200) return false; // Long responses likely have real content
  if (STEP_LIST_PATTERN.test(t)) return true;
  if (isToolNameSalad(t)) return true;
  // Catch the pattern: "Done — I handled X, Y and Z for you." with only tool names
  if (/^done\s*[—–-]/i.test(t) && /\bfor you\b/i.test(t) && t.length < 300) {
    // Check if the text is primarily a list of actions/tool names
    const hasRealContent = /\b(found|says|email|subject|from|body|content|result|message|reply|thread|schedule|event|meeting|note|page|slack|notion)\b/i.test(t);
    if (!hasRealContent) return true;
  }
  // "Waiting for your approval" / "waiting on approval" without any substance
  if (/^done\s*[—–-]/i.test(t) && /\bwaiting\s+(for|on)\s+(your\s+)?approval/i.test(t) && t.length < 250) {
    return true;
  }
  return false;
}

// Extracts the last N tool results from the message history and returns them
// as a readable string so we can inject actual data into step-listing retries.
function extractLastToolResults(messages: any[], maxResults = 3): string {
  const snippets: string[] = [];
  for (let i = messages.length - 1; i >= 0 && snippets.length < maxResults; i--) {
    const msg = messages[i];
    if (msg.role !== 'user') continue;
    const content = Array.isArray(msg.content) ? msg.content : [];
    for (const block of content) {
      if (block.type === 'tool_result' && typeof block.content === 'string' && block.content.length > 30) {
        // Skip bridge/auto-bridge injections
        if (block.content.startsWith('[AUTO-BRIDGE') || block.content.startsWith('[WRITING STYLE') || block.content.startsWith('[UNIFIED')) continue;
        snippets.push(block.content.slice(0, 1200));
        if (snippets.length >= maxResults) break;
      }
    }
  }
  return snippets.length > 0
    ? snippets.map((s, i) => `--- Result ${i + 1} ---\n${s}`).join('\n\n')
    : '(no tool results available)';
}

// ── Error humanizer ────────────────────────────────────────────────────────────
//
// Raw tool errors (stack traces, "403", "fetch failed", AbortError) must never
// reach the user or even the LLM verbatim — they make Arcus feel broken and
// mechanical. This converts them into a plain-English explanation plus a
// concrete alternative the model can act on or relay.

/**
 * Convert a tool name to a plain-English bulk noun for progress lines
 * ("Creating 17 <label> now"). Defaults to tool-name with underscores
 * replaced by spaces when the tool isn't in the known list.
 */
function humanizeBulkLabel(tool: string): string {
  switch (tool) {
    case 'draft_reply':
    case 'draft_cold_email':
      return 'personalized drafts';
    case 'send_email':
      return 'emails';
    case 'create_notion_page':
    case 'notion_create_task':
      return 'Notion pages';
    case 'schedule_meeting':
      return 'meetings';
    case 'send_slack_message':
    case 'slack_send_dm':
      return 'Slack messages';
    case 'gmail_apply_label':
      return 'labels';
    case 'gmail_archive_thread':
      return 'archives';
    case 'read_email':
    case 'gmail_read_thread':
      return 'threads';
    case 'search_gmail':
      return 'searches';
    case 'remember_about_contact':
    case 'memory_save':
      return 'memory entries';
    default:
      return `${tool.replace(/_/g, ' ')} calls`;
  }
}

function humanizeError(tool: string, raw: string): string {
  const e = (raw || '').toLowerCase();
  const friendlyTool = tool.replace(/_/g, ' ');

  if (/abort|timeout|timed out|etimedout/.test(e)) {
    return `The ${friendlyTool} step took too long to respond. This is usually a temporary network hiccup — I can retry it, or continue with the other steps and come back to this one.`;
  }
  if (/\b401\b|unauthorized|invalid[_\s-]?grant|token (expired|invalid)/.test(e)) {
    return `The connection for ${friendlyTool} has expired and needs to be re-authorized. Ask the user to reconnect it via the connectors button in the prompt box, then try again.`;
  }
  if (/\b403\b|insufficient|forbidden|scope/.test(e)) {
    return `Arcus doesn't have permission for ${friendlyTool} yet — the connected account is missing that specific access. Ask the user to reconnect that integration with full permissions via the connectors button.`;
  }
  if (/not connected|connect .* in settings|connect .* in integrations/.test(e)) {
    return raw; // these are already user-friendly, written by the tools
  }
  if (/\b429\b|rate limit|quota|exhausted/.test(e)) {
    return `The ${friendlyTool} service is rate-limiting requests right now. I can wait a moment and retry, or proceed with the rest of the task first.`;
  }
  if (/\b5\d\d\b|server error|bad gateway|unavailable/.test(e)) {
    return `${friendlyTool[0].toUpperCase()}${friendlyTool.slice(1)} is temporarily unavailable on the provider's side. This isn't something on our end — retrying shortly usually works.`;
  }
  // Unknown — keep it short and non-technical, drop any stack noise.
  const firstLine = (raw || 'unknown error').split('\n')[0].slice(0, 160);
  return `The ${friendlyTool} step didn't complete (${firstLine}). I'll continue with everything else and flag this so you can decide how to handle it.`;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Parse the structured Stage-2 message the ChatInterface Confirm button sends:
 *
 *   Spec approved for "<name>". Create the agent now.
 *   Call create_scheduled_agent with these exact parameters AND _planApproved: true:
 *   - name: "Morning Inbox Sweep"
 *   - task_description: "..."
 *   - cron_schedule: "0 7 * * *"
 *   - output_channel: "gmail"
 *   - slack_channel: "#general"     (optional)
 *   - skip_confirmations: false
 *   - _planApproved: true
 *
 * Returns the input object create_scheduled_agent expects, or null if parsing
 * failed (caller falls through to the normal loop).
 */
function parseStructuredAgentParams(msg: string): Record<string, any> | null {
  try {
    const params: Record<string, any> = {};
    // Match lines like:  - key: "value"   or   - key: value   or   - key: true
    const lineRe = /^\s*-\s*([a-zA-Z_]+)\s*:\s*(.+?)\s*$/gm;
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(msg)) !== null) {
      const key = m[1];
      let raw = m[2];
      // Strip surrounding quotes
      if ((raw.startsWith('"') && raw.endsWith('"')) ||
          (raw.startsWith("'") && raw.endsWith("'"))) {
        raw = raw.slice(1, -1);
      }
      // Coerce literals
      if (raw === 'true') params[key] = true;
      else if (raw === 'false') params[key] = false;
      else if (raw === 'null') params[key] = null;
      else if (/^-?\d+$/.test(raw)) params[key] = parseInt(raw, 10);
      else params[key] = raw;
    }
    return Object.keys(params).length > 0 ? params : null;
  } catch {
    return null;
  }
}

function sseEvent(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

function encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

// ── Tool outcome tracking ──────────────────────────────────────────────────────

interface ToolOutcome {
  tool: string;
  ok: boolean;
  error?: string;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LoopOptions {
  userId: string;
  systemPrompt: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage: string;
  connectedIntegrations?: string[];
  isPlanMode?: boolean;
  /**
   * Hard cap on tool calls for this run. Defaults to MAX_TOOL_CALLS.
   * Background/cron runs pass a smaller value so the whole loop finishes
   * within Vercel's 60s function limit (otherwise the platform kills it
   * mid-run and no report is ever produced or delivered).
   */
  maxToolCalls?: number;
  /**
   * Wall-clock budget in ms. Once exceeded, the loop stops calling tools
   * and forces a final summary from whatever it has so far. Lets scheduled
   * runs always emit a report instead of being 504'd into oblivion.
   */
  deadlineMs?: number;
  /**
   * Stable conversation id — threaded into executeTool so the session-state
   * approval gate (send_email / schedule_meeting / send_slack_message /
   * create_notion_page) can match a request_confirmation row against the
   * subsequent write. Omit for background-agent runs; the gate fails open.
   */
  conversationId?: string;
  isBackgroundAgent?: boolean;
  skipConfirmations?: boolean;
  agentId?: string;
  /**
   * F6 — Free-text user instructions from the settings card. The loop uses
   * the FIRST 220 chars as a per-turn reminder appended to the user message
   * so the LLM re-reads the rules every step instead of having to recall
   * them from the bottom of a 1000-line system prompt.
   */
  userInstructions?: string;
  /**
   * F12 — Attachments uploaded with the user's message. Only image types are
   * forwarded to the LLM as vision content blocks; non-image attachments are
   * surfaced as text mentions ("file: <name>") so the model knows they exist.
   */
  attachments?: Array<{ name: string; url: string; type: string; size?: number }>;
}

// ── Main loop ──────────────────────────────────────────────────────────────────

export function runAgentLoop(opts: LoopOptions): ReadableStream {
  const {
    userId,
    systemPrompt,
    history,
    userMessage,
    connectedIntegrations = [],
    isPlanMode = false,
    maxToolCalls,
    deadlineMs,
    conversationId,
    isBackgroundAgent,
    skipConfirmations,
    agentId,
    userInstructions,
    attachments,
  } = opts;

  // F12 — Split attachments into image (sent as vision blocks) and other
  // (surfaced as text). image_url accepts data: URLs and https: URLs equally.
  const imageAttachments = (attachments || []).filter(a =>
    a.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(a.name || ''),
  );
  const nonImageAttachments = (attachments || []).filter(a => !imageAttachments.includes(a));

  // F6 — One-line reminder of the user's binding rules, appended to every
  // user message so attention never drifts past them.
  const activeRulesHint = (() => {
    if (!userInstructions || !userInstructions.trim()) return '';
    const compact = userInstructions
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 220);
    return `\n\n[ACTIVE RULES: ${compact}${userInstructions.length > 220 ? '…' : ''}]`;
  })();
  // Tracks every successful tool call this run so PART 4 Rule 1 (draft_reply
  // requires a preceding read_email/gmail_read_thread) and Rule 3
  // (schedule_meeting requires a preceding calendar fetch) can verify the
  // LLM actually fetched ground truth before acting.
  const toolHistory: Array<{ name: string; input: any; success: boolean }> = [];

  // PART 31 — Per-run dedup cache. When the LLM tries to call a READ tool
  // with the same params it already used this turn, we return the cached
  // result instead of re-running the API call. This kills the "drafting one
  // reply does the same search 4 times" loop the user reported.
  //
  // ONLY read/search tools are cacheable — writes (send_email, etc.)
  // always re-execute because their semantics differ (a second send is a
  // second email, not a cached no-op).
  //
  // Key shape: `${toolName}|${stableJsonStringify(input)}`
  const READ_TOOLS_FOR_DEDUP = new Set([
    'search_gmail', 'read_email', 'gmail_read_thread', 'get_sent_emails',
    'gmail_get_labels', 'gmail_get_profile',
    'get_calendar_events', 'calendar_get_availability', 'calendar_unlimited_scan',
    'search_notion', 'notion_read_page', 'fetch_notion_schema',
    'web_search', 'web_search_instant',
    'memory_search', 'memory_get_contact_profile', 'memory_unlimited_scan',
    'gmail_unlimited_search', 'gmail_bulk_read_threads',
    'get_voice_profile', 'get_contact_context', 'get_recipient_context',
    'slack_get_channels', 'slack_find_user',
  ]);
  const toolResultCache = new Map<string, { output: string; success?: boolean; canvasData?: any }>();

  // F4 — Normalize input values so the LLM hitting the same search with a
  // slightly different phrasing (e.g. "Q3 proposal" vs "Q3 proposal Priya")
  // still cache-hits. Without this the cache rarely caught anything.
  const STOP_WORDS = new Set([
    'a', 'an', 'and', 'or', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
    'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'as',
    'this', 'that', 'these', 'those', 'i', 'you', 'we', 'they', 'me', 'my',
    'about', 'please', 'find', 'show', 'me', 'get', 'list', 'all', 'any',
  ]);
  function normalizeValue(v: any): any {
    if (v == null) return v;
    if (typeof v === 'string') {
      const tokens = v
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s@\-_.]/gu, ' ')
        .split(/\s+/)
        .filter(t => t && !STOP_WORDS.has(t));
      tokens.sort();
      return tokens.join(' ');
    }
    if (Array.isArray(v)) {
      const norm = v.map(normalizeValue);
      // Stable order for ID arrays / lists — sort lex.
      try { return [...norm].sort((a, b) => String(a).localeCompare(String(b))); }
      catch { return norm; }
    }
    if (typeof v === 'object') {
      const out: any = {};
      for (const k of Object.keys(v).sort()) out[k] = normalizeValue(v[k]);
      return out;
    }
    return v;
  }
  function makeCacheKey(name: string, input: any): string {
    try {
      return `${name}|${JSON.stringify(normalizeValue(input || {}))}`;
    } catch {
      return `${name}|<unserializable>`;
    }
  }

  // F1 — Intent classifier. Computed early so the LLM gets [INTENT: …] in
  // its system prompt AND so we can suppress the tool schema entirely for
  // identity / smalltalk / capability messages (kills "Who are you?" →
  // calendar tool dispatch).
  const lastTurn = history.length > 0 ? history[history.length - 1] : null;
  const hasOpenConfirmation = !!(lastTurn && lastTurn.role === 'assistant' &&
    /(should I|shall I|do you want me to|need approval|please confirm|confirmation card)/i.test(lastTurn.content));
  const detectedIntent = classifyUserIntent(userMessage, hasOpenConfirmation);
  const suppressToolsForIntent = shouldSuppressTools(detectedIntent) && !isBackgroundAgent;

  // PART 39b — VA-scoped tool filtering. Compute the dispatcher decision
  // ONCE here so it's reused for (1) trimming the tool surface the LLM sees
  // and (2) deciding whether to run the parallel context sweep further down.
  // Filter applies only on interactive turns where the dispatcher fires
  // (≥2 VAs relevant); background agents and pivot-prone follow-up turns
  // keep the full surface.
  const vaDispatch = !isPlanMode && !isBackgroundAgent
    ? shouldDispatchParallelVAs(userMessage)
    : { fire: false, vas: [] as ArcusVA[], reason: 'none' as const };
  const vaFilter: ArcusVA[] | undefined = vaDispatch.fire && vaDispatch.vas.length >= 2
    ? vaDispatch.vas
    : undefined;

  const availableTools = (isPlanMode || suppressToolsForIntent)
    ? []
    : getAvailableTools(connectedIntegrations, isBackgroundAgent, vaFilter);

  if (vaFilter) {
    log('info', 'tool surface VA-filtered', {
      relevantVAs: vaFilter,
      total: TOOL_SCHEMAS.length,
      exposed: availableTools.length,
    });
  }

  // Append intent hint to the system prompt so the LLM reads it every turn.
  const effectiveSystemPrompt = `${systemPrompt}\n\n${intentSystemHint(detectedIntent)}`;
  // Background agents get the raised limit so they can handle large inboxes
  // without hitting the wall mid-run. Interactive sessions stay at 20 so
  // the LLM doesn't burn budget on exploratory calls.
  const hardCap = isBackgroundAgent ? MAX_TOOL_CALLS_BACKGROUND : MAX_TOOL_CALLS;
  const toolCallLimit =
    typeof maxToolCalls === 'number' && maxToolCalls > 0
      ? Math.min(maxToolCalls, hardCap)
      : hardCap;
  const runId = crypto.randomUUID();
  const startedAt = Date.now();
  const deadlineAt =
    typeof deadlineMs === 'number' && deadlineMs > 0 ? startedAt + deadlineMs : Infinity;
  // Newsletter/promo filtering should apply to ANY email-listing task, not only
  // ones that match inbox keywords — otherwise promos leak into summaries and
  // "reply to X" results. The only time we keep them is when the user is
  // explicitly hunting for a newsletter/promotional/receipt email.
  const wantsPromos = /\b(newsletter|promotion(al)?|promo|unsubscribe|marketing|receipt|digest|sale|coupon)\b/i.test(userMessage);
  const filterNewsletters = !wantsPromos;

  return new ReadableStream({
    async start(controller) {
      const emit = (type: string, data: unknown) => {
        try { controller.enqueue(encode(sseEvent(type, data))); } catch { /* closed */ }
      };

      /**
       * F1.2 — Single canonical close path. Every controller.close() in this
       * loop MUST go through this helper so we always emit `done` first.
       * Previously, error branches called close() without done, leaving the
       * ChatInterface in its "stream finished unexpectedly" fallback path
       * (where it fabricated "Done — completed [tool salad]" strings).
       *
       * If a 'done' was already emitted before the caller hit this helper,
       * the alreadyDone flag suppresses the second emission so we don't
       * double-emit `done`. Idempotent on multiple calls (controller throws
       * when closing twice).
       */
      let alreadyDone = false;
      const closeStream = (totalSteps = 0) => {
        if (!alreadyDone) {
          alreadyDone = true;
          try { controller.enqueue(encode(sseEvent('done', { runId, durationMs: Date.now() - startedAt, totalSteps }))); } catch { /* closed */ }
        }
        try { controller.close(); } catch { /* already closed */ }
      };

      try {
        log('info', 'run_start', { runId, isPlanMode, tools: availableTools.map(t => t.name), msgLen: userMessage.length });
        emit('run_start', { runId, message: userMessage });

        // ── Pre-plan clarification pass ─────────────────────────────────────
        // Ask clarifying questions ONLY when truly needed. Skip entirely if:
        // - The user already provided answers (Q:/A: pattern in history), OR
        // - The request already contains enough context to write a complete plan.
        // Never ask about things derivable from connected integrations.
        if (isPlanMode) {
          // Detect if the user has already answered questions (any user message with Q:/A: pairs)
          const alreadyAnswered = history.some(h =>
            h.role === 'user' && /Q:[\s\S]*\nA:/.test(h.content)
          ) || /Q:[\s\S]*\nA:/.test(userMessage);

          if (!alreadyAnswered) {
            emit('thinking', { status: 'Analysing your request…' });

            const connectedInfo = connectedIntegrations.length > 0
              ? `Connected integrations (already available — NEVER ask about these): ${connectedIntegrations.join(', ')}.`
              : 'No integrations connected.';

            const clarifyRes = await callLLM(
              [
                {
                  role: 'system',
                  content:
                    `You are about to create a detailed execution plan for the user.\n\n` +
                    `${connectedInfo}\n\n` +
                    `Rule: Only ask a clarifying question if (a) the answer is genuinely unknown from the request and context, AND (b) the answer would significantly change the structure of the plan. ` +
                    `Do NOT ask about: which apps to use (you can see what is connected), the user's name, timezone, or anything inferable from the request. ` +
                    `Do NOT ask more than 2 questions. ` +
                    `If the request is specific enough to plan immediately, respond with ONLY the word "proceed" — nothing else.\n\n` +
                    `IF you call ask_user: ALSO output ONE short sentence of text BEFORE the tool call. The sentence sets up the questions ("Before I draft this plan, I need to nail down a couple of things:" / "Quick — to make this plan useful, two things to confirm:"). Do NOT explain WHY you need the answers — the questions speak for themselves. Do NOT list the questions in the text; they render as a separate card.`,
                },
                ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
                { role: 'user', content: userMessage },
              ],
              [ASK_USER_SCHEMA],
              { maxTokens: 350, temperature: 0.1 },
            );

            const clarifyToolCalls = getToolCalls(clarifyRes.content);
            const askCall = clarifyToolCalls.find(tc => tc.name === 'ask_user');
            if (askCall) {
              const questions = (askCall.input?.questions ?? []).filter((q: any) => q?.text?.trim());
              if (questions.length > 0) {
                // Plan-mode UX fix — emit the preamble text the LLM produced
                // alongside its ask_user tool call BEFORE the question event,
                // so the user sees a normal chat bubble setting up the
                // questions instead of an empty reply followed by a card.
                // Falls back to a static preamble if the model produced none
                // (older models sometimes emit the tool_use with no text).
                const preambleRaw = sanitizeModelText(getRawText(clarifyRes.content) || '').trim();
                const preamble = preambleRaw && preambleRaw.length >= 10 && preambleRaw.length <= 400
                  ? preambleRaw
                  : 'Before I draft this plan, I need to nail down a couple of things:';
                emit('message', { content: preamble });
                emit('question', { questions, runId });
                closeStream(0);
                return;
              }
            }
          }
        }

        // ── Layer 1: Vague instruction detection ────────────────────────────
        if (!isPlanMode && availableTools.length > 0 && isVagueInstruction(userMessage)) {
          emit('thinking', { status: 'Interpreting your request…' });

          const vagueRes = await callLLM(
            [
              { role: 'system', content: systemPrompt },
              {
                role: 'system',
                content:
                  'The user has given a broad instruction. Do NOT call any tools. ' +
                  'Interpret their request using your knowledge of what tools are available and what you can do. ' +
                  'Respond in exactly two sentences: ' +
                  '(1) What specific actions you will take (tools in order, who you will contact, what you will produce). ' +
                  '(2) What the outcome will be for the user. ' +
                  'Then on a new line, write exactly: "Should I proceed?" ' +
                  'Be specific and confident. No hedging.',
              },
              ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
              { role: 'user', content: userMessage },
            ],
            [], // no tools — this is a planning pass only
            { maxTokens: 300, temperature: 0.2 },
          );

          const planText = sanitizeModelText(getText(vagueRes.content));
          emit('message', { content: planText });
          closeStream(0);
          return;
        }

        // ── PART 11 — Hard intercept: agent-creation requests ──────────────
        // When the user asks to CREATE / SET UP / SCHEDULE a recurring agent,
        // the LLM has historically emitted a plan paragraph + "Should I
        // proceed?" instead of calling create_scheduled_agent. System-prompt
        // rules alone weren't enough. So we bypass the entire normal flow and
        // force a tool call to create_scheduled_agent Stage 1 with only that
        // schema available + forceToolCall: true.
        //
        // The detector is conservative — it ignores follow-up messages in an
        // already-in-progress creation flow (spec approved, plan approved).
        const AGENT_CREATION_INTENT = /\b(create|set ?up|schedule|build|make|register)\b.{0,60}\b(scheduled|recurring|background|cron|daily|weekly|hourly|monthly|automated?)?\s*(agent|bot|automation|workflow|cron\s*job)\b/i;
        const isAgentCreationFollowup =
          userMessage.trim().startsWith('Spec approved for ') ||
          userMessage.trim().startsWith('Create the scheduled agent now.') ||
          userMessage.trim().startsWith('Create agent ') ||
          userMessage.trim().startsWith('Execute these steps in order:');

        // F10 — Intent classifier feeds this intercept. The regex stays as a
        // fallback but the classifier catches paraphrases the regex misses
        // ("set up a daily inbox check" without the word "agent"). The
        // classifier ALSO acts as a negative filter — if the user asked
        // "what's my agent's status?" the classifier returns `query`, not
        // `agent_creation`, so the intercept is suppressed even though the
        // word "agent" appears.
        const looksLikeAgentCreation =
          !isPlanMode &&
          !isBackgroundAgent &&
          !isAgentCreationFollowup &&
          (detectedIntent === 'agent_creation' || AGENT_CREATION_INTENT.test(userMessage)) &&
          detectedIntent !== 'query' &&
          detectedIntent !== 'capability';

        if (looksLikeAgentCreation) {
          emit('thinking', { status: 'Drafting the agent spec…' });

          // The LLM gets ONLY the create_scheduled_agent schema and is forced
          // to emit a tool call. This makes it physically impossible to emit
          // a plan paragraph instead.
          const createAgentSchema = TOOL_SCHEMAS.find(s => s.name === 'create_scheduled_agent');
          if (!createAgentSchema) {
            log('error', 'create_scheduled_agent schema missing — falling through to default loop');
          } else {
            const intercept = await callLLM(
              [
                { role: 'system', content: systemPrompt },
                {
                  role: 'system',
                  content:
                    'AGENT CREATION INTERCEPT: The user has asked to create a scheduled background agent. ' +
                    'Your ONLY allowed action this turn is to call create_scheduled_agent ONCE with all required fields including spec_markdown. ' +
                    'Do NOT write any text. Do NOT call open_canvas. Do NOT call any read tool (search_gmail, gmail_get_profile, get_calendar_events, etc.). ' +
                    'spec_markdown must contain a full specification document: a "# <Agent Name>" H1, then "## 1. Agent Objective", "## 2. Operational Logic", "## 3. Schedule & Delivery", "## 4. Expected Output". ' +
                    'No bracketed placeholders. Be specific about what the agent will read, write, and deliver. ' +
                    'If the user gave you the name, schedule, and delivery channel — use them verbatim. ' +
                    'If something is genuinely missing, set the field to a reasonable default rather than asking — the spec stage shows the user everything and they can edit before confirming.',
                },
                ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
                { role: 'user', content: userMessage },
              ],
              [createAgentSchema],
              { forceToolCall: true, maxTokens: 4000, temperature: 0.2 },
            );

            const interceptToolCalls = getToolCalls(intercept.content);
            const createCall = interceptToolCalls.find(tc => tc.name === 'create_scheduled_agent');
            if (createCall) {
              log('info', 'agent_creation_intercept_success', { name: createCall.input?.name });
              emit('tool_call', { tool: 'create_scheduled_agent', params: createCall.input, iteration: 0 });
              try {
                const result = await executeTool(
                  'create_scheduled_agent',
                  createCall.input,
                  userId,
                  {
                    conversationId,
                    toolHistory: [],
                    isBackgroundAgent,
                    skipConfirmations,
                    runId,
                    agentId,
                    runState: 'PLANNING' as const,
                  },
                );
                emit('tool_result', { tool: 'create_scheduled_agent', success: result.success !== false, summary: result.output.slice(0, 300), iteration: 0 });
                if (result.canvasData) emit('canvas', result.canvasData);
                // F8 — Internal-only validation errors (e.g. missing spec_markdown)
                // must NEVER reach chat verbatim. Swap with a clean clarifying ask.
                const isInternalOnly = (result as any)._internal_only === true;
                const userFacing = isInternalOnly
                  ? 'What should this agent do, and how often? (e.g. "summarise my inbox every morning at 7am")'
                  : sanitizeModelText(result.output);
                emit('message', { content: userFacing });
                closeStream(1);
                return;
              } catch (err: any) {
                log('error', 'agent_creation_intercept_execution_failed', { error: err.message });
                emit('error', { message: `Couldn't create the agent: ${err.message}` });
                closeStream(0);
                return;
              }
            }
            log('warn', 'agent_creation_intercept_no_tool_call — falling through to default loop');
          }
        }

        // ── Stage 2 intercept: spec-approved message from UI Confirm button ─
        // After the user clicks Confirm on the spec card, ChatInterface sends:
        //   Spec approved for "<name>". Create the agent now.
        //   Call create_scheduled_agent with these exact parameters AND _planApproved: true:
        //   - name: "..."
        //   - task_description: "..."
        //   - cron_schedule: "..."
        //   - output_channel: "..."
        //   - skip_confirmations: false|true
        //   - _planApproved: true
        // We don't need an LLM round-trip — parse the params directly from the
        // message and call the tool. This guarantees the LLM cannot "ask for
        // confirmation again" because the LLM never sees this message.
        const isStage2SpecApproved =
          !isPlanMode &&
          !isBackgroundAgent &&
          /^Spec approved for ['"]/.test(userMessage.trim()) &&
          userMessage.includes('_planApproved: true');

        if (isStage2SpecApproved) {
          emit('thinking', { status: 'Registering your agent…' });
          const params = parseStructuredAgentParams(userMessage);
          if (params && params.name && params.task_description && params.cron_schedule) {
            try {
              emit('tool_call', { tool: 'create_scheduled_agent', params, iteration: 0 });
              const result = await executeTool(
                'create_scheduled_agent',
                params,
                userId,
                {
                  conversationId,
                  toolHistory: [],
                  isBackgroundAgent,
                  skipConfirmations,
                  runId,
                  agentId,
                  runState: 'EXECUTING' as const,
                },
              );
              emit('tool_result', { tool: 'create_scheduled_agent', success: result.success !== false, summary: result.output.slice(0, 300), iteration: 0 });

              // F1.1 — Branch on result.success. Previously we ALWAYS emitted
              // a "**X** is live — first run …" message even on validation
              // errors / integration gates / agent_create_failed, because the
              // happy-path code ran unconditionally. The user would see a
              // confident "live" message but no agent was created.
              if (result.success === false) {
                log('warn', 'stage2_intercept_tool_returned_failure', { code: result.errorCode, output: result.output.slice(0, 200) });
                // Surface the canvasData regardless (integration_required
                // card is useful) but use the tool's actual output text in
                // the chat message — sanitized by the sanitizer downstream
                // so self-instructions don't leak.
                if (result.canvasData) emit('canvas', result.canvasData);
                // Strip the LLM-facing "Now write..." / "Do NOT call any
                // more tools" tails before showing to the user.
                const userFacing = result.output
                  .replace(/\s*Do\s+NOT\s+call\s+(?:any\s+more|more)\s+tools?\.?/gi, '')
                  .replace(/\s*Now\s+(?:write|call|tell|reply|compose|confirm)\s+[^.\n]*?(?:to\s+the\s+user|the\s+user)[^.\n]*?\.\s*$/gi, '')
                  .trim();
                emit('message', { content: userFacing || `Couldn't create the agent — ${result.errorCode || 'unknown error'}.` });
                closeStream(1);
                return;
              }

              // Happy path — agent created. Emit canvas + compose a clean
              // one-sentence chat message from canvasData.pageMeta.
              if (result.canvasData) emit('canvas', result.canvasData);
              const cd: any = result.canvasData;
              const attrs: any[] = cd?.pageMeta?.attendees || [];
              const scheduleLabel = attrs[0] || 'as scheduled';
              const channelRaw = (attrs[2] || 'gmail') as string;
              const channelHuman = channelRaw === 'gmail' ? 'your Gmail inbox'
                : channelRaw === 'slack' ? 'Slack'
                : 'both Slack and your Gmail inbox';
              const nextRun = cd?.pageMeta?.startTime;
              const nextRunHuman = nextRun
                ? new Date(nextRun).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                : null;
              const agentName = params.name;
              const chatMsg = nextRunHuman
                ? `**${agentName}** is live — first run ${nextRunHuman}, report lands in ${channelHuman}.`
                : `**${agentName}** is live — running ${scheduleLabel}, report lands in ${channelHuman}.`;
              emit('message', { content: chatMsg });
              closeStream(1);
              return;
            } catch (err: any) {
              log('error', 'stage2_intercept_execution_failed', { error: err.message });
              emit('error', { message: `Couldn't create the agent: ${err.message}` });
              closeStream(0);
              return;
            }
          }
          log('warn', 'stage2_intercept_param_parse_failed — falling through to default loop', { sample: userMessage.slice(0, 200) });
        }

        // ── PART 10: Auto-detect plan-first tasks ───────────────────────────
        // Patterns that indicate irreversible or multi-step actions that benefit
        // from an explicit approval step before execution.
        const PLAN_FIRST_EMAIL_PATTERN = /\b(send|shoot|fire off)\b.{0,50}\b(email|mail|message)\b/i;
        const PLAN_FIRST_MEETING_PATTERN = /\b(book|schedule|create|add)\b.{0,30}\b(meeting|event|call)\b/i;
        const PLAN_FIRST_SLACK_PATTERN = /\b(post|send|message|ping)\b.{0,30}\b(slack|channel)\b/i;
        const PLAN_FIRST_APPROVAL_PATTERN = /^(yes|proceed|execute|go ahead|run it|do it|execute these steps)/i;

        const isPlanApproval = PLAN_FIRST_APPROVAL_PATTERN.test(userMessage.trim()) ||
          userMessage.trim().startsWith('Execute these steps in order:');

        // ── PART 9: Build execution plan ────────────────────────────────────
        // Build the dependency-ordered execution plan BEFORE the first LLM call.
        // The plan is injected as a hint at the end of the messages array so the
        // LLM always sees the intended tool sequence and doesn't re-order it.
        // Null plan = no orchestration needed (conversational message, plan mode).
        const executionPlan = buildExecutionPlan(
          userMessage,
          connectedIntegrations,
          isPlanMode,
        );

        // ── PART 10: plan_preview — gate irreversible/complex tasks ─────────
        // Auto-show a structured plan preview for tasks that:
        //   (a) involve 3+ tool calls, OR contain irreversible action patterns
        //   (b) are NOT already in plan mode
        //   (c) are NOT a background agent run
        //   (d) are NOT a follow-up approval / continuation
        const hasIrreversiblePattern =
          PLAN_FIRST_EMAIL_PATTERN.test(userMessage) ||
          PLAN_FIRST_MEETING_PATTERN.test(userMessage) ||
          PLAN_FIRST_SLACK_PATTERN.test(userMessage);

        const isLargeTask = executionPlan !== null && executionPlan.estimatedCalls.min >= 3;

        // Do not show plan-preview if the last assistant message already showed one
        // (user is in the middle of approving/editing) — detect by checking history.
        const lastAssistantHadPlanPreview = history.length >= 2 &&
          history[history.length - 1]?.role === 'assistant' &&
          /^I've built a plan|Execute these steps|Here's my plan/i.test(
            history[history.length - 1]?.content?.slice(0, 60) || ''
          );

        const needsPlanFirst =
          (isLargeTask || hasIrreversiblePattern) &&
          !isPlanMode &&
          !isBackgroundAgent &&
          !isPlanApproval &&
          !lastAssistantHadPlanPreview;

        if (needsPlanFirst && executionPlan) {
          emit('thinking', { status: 'Building execution plan…' });

          // Generate a specific human-readable description via a focused LLM call
          const stepSummary = executionPlan.steps
            .map((s, i) => `${i + 1}. ${s.label} (${s.tools.join(', ')})`)
            .join('\n');
          const descRes = await callLLM(
            [
              {
                role: 'system',
                content: 'You describe execution plans in plain English. Be specific. Name exact tools and data. 2-3 sentences max.',
              },
              {
                role: 'user',
                content: `User asked: "${userMessage}"\n\nPlanned steps:\n${stepSummary}\n\nDescribe exactly what you will do in 2-3 sentences. Name every data source, every action, every output.`,
              },
            ],
            [],
            { maxTokens: 200, temperature: 0.1 },
          );
          const specificDescription = sanitizeModelText(getText(descRes.content)).trim();

          emit('plan_preview', {
            intent: executionPlan.intent,
            steps: executionPlan.steps.map(s => ({
              label: s.label,
              tools: s.tools,
              parallel: s.parallel,
              isWrite: s.isWrite,
              requiredIntegration: s.requiredIntegration,
            })),
            missingIntegrations: executionPlan.missingIntegrations,
            estimatedCalls: executionPlan.estimatedCalls,
            specificDescription: specificDescription || `I will execute ${executionPlan.steps.length} steps to complete your request.`,
          });
          closeStream(0);
          return;
        }

        if (executionPlan) {
          log('info', 'orchestration_plan', {
            intent: executionPlan.intent,
            steps: executionPlan.steps.length,
            missingIntegrations: executionPlan.missingIntegrations,
            estimatedCalls: executionPlan.estimatedCalls,
          });
          emit('orchestration_plan', {
            intent: executionPlan.intent,
            steps: executionPlan.steps.map(s => ({
              label: s.label,
              tools: s.tools,
              parallel: s.parallel,
              isWrite: s.isWrite,
              requiredIntegration: s.requiredIntegration,
            })),
            missingIntegrations: executionPlan.missingIntegrations,
            estimatedCalls: executionPlan.estimatedCalls,
          });
        }

        // ── Pre-loop: generate task list ────────────────────────────────────
        const planModeInstruction = isPlanMode
          ? `\n\n[PLAN MODE — STRICT]\nYou are in plan creation mode. Your only output must be a well-structured markdown plan document.\nRules:\n- Do NOT execute any actions or call any tools\n- Do NOT use agent-style language ("I'll now...", "Let me...", "I've completed...")\n- Write the plan entirely in future tense ("Step 1: Search...", "Step 2: Analyse...")\n- Structure the plan with: ## Objective, ## Steps (numbered), ## Expected Output, ## Time estimate\n- Be specific: name the exact tools/APIs/searches that would be used\n- The user should be able to hand this plan to someone else and have it executed exactly`
          : '';

        // F12 — Build the user message. If images attached, use the multi-block
        // vision shape ({type:'text'},{type:'image_url'}). Non-image attachments
        // (PDF, txt, etc.) are surfaced as a text mention so the LLM knows they
        // exist even though it can't see their contents.
        const userMessageWithRules = userMessage + activeRulesHint;
        const attachmentMention = nonImageAttachments.length > 0
          ? `\n\n[Attached files (not images, contents not visible to you): ${nonImageAttachments.map(a => a.name).join(', ')}]`
          : '';
        const finalUserText = userMessageWithRules + attachmentMention;

        const userMessageContent: string | any[] = imageAttachments.length > 0
          ? [
              { type: 'text' as const, text: finalUserText },
              ...imageAttachments.map(a => ({ type: 'image_url' as const, image_url: { url: a.url } })),
            ]
          : finalUserText;

        const messages: LLMMessage[] = [
          { role: 'system', content: effectiveSystemPrompt + planModeInstruction },
          ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
          { role: 'user', content: userMessageContent as any },
        ];

        // Inject orchestration hint as the final user message so it's the last
        // thing the LLM reads before generating tool calls.
        if (executionPlan && !isPlanMode) {
          const hint = planToHint(executionPlan, toolCallLimit);
          // Append to the last user message (the userMessage we just pushed) rather
          // than a new message — keeps the role alternation clean.
          const lastMsg = messages[messages.length - 1] as any;
          if (typeof lastMsg.content === 'string') {
            lastMsg.content = `${lastMsg.content}\n\n${hint}`;
          }
        }

        // ── PART 10 Fix 7: Agent plan approved — inject _planApproved ────────
        // When the user sends "Create agent X - plan approved", the LLM must
        // call create_scheduled_agent with _planApproved: true in the input.
        const isAgentPlanApproval = /^Create agent .+ - plan approved$/i.test(userMessage.trim());
        if (isAgentPlanApproval) {
          const lastMsg = messages[messages.length - 1] as any;
          if (typeof lastMsg.content === 'string') {
            lastMsg.content = `${lastMsg.content}\n\n[AGENT PLAN APPROVED] The user has approved the agent plan. Call create_scheduled_agent NOW with the parameters from context AND include "_planApproved: true" in the input parameters. Do not show another plan preview.`;
          }
        }

        // Plan-mode UX fix — when the user message is a Q&A reply to the
        // clarify pass's ask_user, tell the LLM explicitly that the answers
        // are in and it should draft the full plan now. Without this nudge
        // the LLM sometimes treats the Q:/A: lines as conversational and
        // produces a short reply instead of the structured markdown plan.
        if (isPlanMode && /Q:[\s\S]*\nA:/.test(userMessage)) {
          const lastMsg = messages[messages.length - 1] as any;
          const hint = `\n\n[CLARIFYING ANSWERS RECEIVED] The user has answered your clarifying questions above. Draft the full structured markdown plan NOW per the plan-mode rules in the system prompt (## Objective / ## Steps (numbered) / ## Expected Output / ## Time estimate). Start the response immediately with "# <Plan Title>" — no preamble, no conversational text before the H1.`;
          if (typeof lastMsg.content === 'string') {
            lastMsg.content = `${lastMsg.content}${hint}`;
          } else if (Array.isArray(lastMsg.content)) {
            // Multi-block content (text + images) — find/append the text block
            const textBlock = lastMsg.content.find((b: any) => b?.type === 'text');
            if (textBlock) textBlock.text = `${textBlock.text}${hint}`;
          }
        }

        let totalToolCalls = 0;
        let nudgeCount = 0;
        let stepListingRetryCount = 0; // counter: allows up to 2 forced retries before giving up
        let finalText = '';
        let canvasContent: any = null;
        let iteration = 0;
        let taskCount = 0;
        let archivedCount = 0;
        const outcomes: ToolOutcome[] = [];
        let forceNextToolCall = false;

        // ── PART 10 Fix 5: Parse approved plan steps ─────────────────────────
        // When the user approves a plan_preview, the ChatInterface sends a
        // structured message starting with "Execute these steps in order:".
        // Parse the step→tool mapping to create a gate for the tool dispatch loop.
        let approvedPlanTools: Set<string> | null = null;
        if (userMessage.trim().startsWith('Execute these steps in order:')) {
          approvedPlanTools = new Set<string>();
          const lines = userMessage.split('\n');
          for (const line of lines) {
            // Format: "1. [label] → tools: [tool1, tool2]"
            const match = line.match(/→\s*tools?:\s*(.+)/i);
            if (match) {
              const toolNames = match[1].split(',').map(t => t.trim()).filter(Boolean);
              for (const tn of toolNames) approvedPlanTools.add(tn);
            }
          }
          // If parsing yielded nothing, don't gate (fallback: allow all)
          if (approvedPlanTools.size === 0) approvedPlanTools = null;
        }

        // ── Agent state machine (RC3) ──────────────────────────────────────
        // Four phases the run can be in:
        //   PLANNING   — fetching context, no writes yet
        //   CONFIRMING — request_confirmation emitted, waiting on user (loop ends turn)
        //   EXECUTING  — user approved, write tools running
        //   REPORTING  — all tool calls done, composing final message
        //
        // The hard write-time gate already lives in tools.ts/session-state.ts
        // (Phase 2). This tracker is for observability: the UI shows the
        // current phase and the LLM sees a [STATE: ...] tag so it knows
        // what's expected of it next. State transitions also feed audit log.
        type RunState = 'PLANNING' | 'CONFIRMING' | 'EXECUTING' | 'REPORTING';
        let runState: RunState = 'PLANNING';
        const transitionState = (next: RunState, reason: string) => {
          if (runState === next) return;
          log('info', 'state_change', { from: runState, to: next, reason });
          runState = next;
          emit('state_change', { state: next, reason, iteration });
        };
        emit('state_change', { state: runState, reason: 'run_start', iteration: 0 });

        // If the user message looks like an approval response ("yes", "go
        // ahead", "confirmed"), the LLM is being woken up from a previous
        // CONFIRMING turn — start this turn in EXECUTING so the LLM knows
        // the gate is open. Cheap heuristic; the real gate is consumeApproval.
        const looksLikeApproval = /^(yes|y|yep|yeah|go ahead|confirmed|confirm|please proceed|do it|send it|proceed)\b/i.test(userMessage.trim());
        if (looksLikeApproval) transitionState('EXECUTING', 'user_message_looks_like_approval');

        // FIX 1 — buildToolContext is defined here (inside start()) so it can
        // close over `runState`, which is a let-mutable declared above. The
        // arrow function re-reads runState on every call, so write tools always
        // see the current phase — not a stale snapshot from construction time.
        const buildToolContext = () => ({
          conversationId,
          toolHistory: [...toolHistory],
          isBackgroundAgent,
          skipConfirmations,
          runId,
          agentId,
          runState: runState as 'PLANNING' | 'CONFIRMING' | 'EXECUTING' | 'REPORTING',
        });

        // ── Five-VA dispatcher: parallel context sweep ──────────────────────
        // PART 37 — small/free LLMs rarely emit multiple tool_use blocks per
        // turn. That makes the AI feel one-tool-at-a-time even though the
        // system prompt and infra both support 5-VA parallelism. To force
        // the parallel-VA experience: detect which VAs the request touches,
        // fire each VA's read tool concurrently here, then inject the
        // combined context + a per-turn dispatch nudge so the LLM's first
        // response synthesizes across VAs instead of discovering them one
        // by one.
        // vaDispatch was computed at the top of runAgentLoop (PART 39b) so it
        // could feed the VA-scoped tool filter. Reuse it here for the parallel
        // sweep — same decision, no double-classification.
        if (vaDispatch.fire && connectedIntegrations.length > 0) {
          // Map each VA → the read tool it owns + the section header for its
          // sweep result. Only VAs whose underlying integration is connected
          // actually fan out; the others are silently skipped so we don't
          // claim coverage we can't deliver.
          type VAFanout = {
            va: ArcusVA;
            requires: (integrations: string[]) => boolean;
            tool: string;
            input: Record<string, any>;
            header: string;
            fallback: string;
          };
          const FANOUT: VAFanout[] = [
            {
              va: 'inbox',
              requires: (i) => i.includes('gmail'),
              tool: 'search_gmail',
              input: { query: 'is:unread newer_than:2d', maxResults: 10 },
              header: '## 📧 Inbox VA — Recent Unread (last 2 days)',
              fallback: '## 📧 Inbox VA\n(Could not fetch — Gmail may need reconnection)',
            },
            {
              va: 'calendar',
              requires: (i) => i.includes('gcal'),
              tool: 'get_calendar_events',
              input: { daysAhead: 3, maxResults: 15 },
              header: '## 📅 Calendar VA — Next 3 Days',
              fallback: '## 📅 Calendar VA\n(Could not fetch — Calendar may need reconnection)',
            },
            {
              va: 'crm',
              requires: (i) => i.includes('notion') || i.includes('notion_calendar'),
              tool: 'search_notion',
              input: { query: '', maxResults: 5 },
              header: '## 📝 CRM VA — Recent Notion Pages',
              fallback: '## 📝 CRM VA\n(Could not fetch)',
            },
            {
              va: 'comms',
              requires: (i) => i.includes('slack'),
              tool: 'slack_get_channels',
              input: { limit: 10 },
              header: '## 💬 Comms VA — Slack Channels',
              fallback: '## 💬 Comms VA\n(Could not fetch — Slack may need reconnection)',
            },
            {
              va: 'research',
              // Memory works without an external integration — always eligible.
              requires: () => true,
              tool: 'memory_search',
              // Use the user message as the relevance query so the Research
              // VA surfaces history specific to this turn, not a generic dump.
              input: { query: userMessage.slice(0, 200), limit: 5 },
              header: '## 🔍 Research VA — Relevant Memory',
              fallback: '## 🔍 Research VA\n(No relevant memory found)',
            },
          ];

          const active = FANOUT.filter(f => vaDispatch.vas.includes(f.va) && f.requires(connectedIntegrations));
          if (active.length >= 2) {
            const vaNames = active.map(a => a.va);
            emit('thinking', { status: `Dispatching ${active.length} VAs in parallel — ${vaNames.join(', ')}…` });
            log('info', 'Five-VA dispatch triggered', { reason: vaDispatch.reason, vas: vaNames });

            const sweepResults: string[] = [];
            const sweepPromises: Promise<void>[] = active.map(f =>
              executeTool(f.tool, f.input, userId)
                .then(r => { sweepResults.push(`${f.header}\n${r.output}`); })
                .catch(() => { sweepResults.push(f.fallback); })
            );

            await Promise.allSettled(sweepPromises);

            if (sweepResults.length > 0) {
              const contextBlock = sweepResults.join('\n\n---\n\n');
              // The user-message payload now has TWO parts:
              //   1. the sweep results (cross-VA context, pre-loaded)
              //   2. a tight dispatch nudge that survives the 1100-line system
              //      prompt by virtue of being the most recent context the
              //      model sees before deciding what to do.
              messages.push({
                role: 'user',
                content: [
                  `[FIVE-VA PARALLEL DISPATCH — ${active.length} VAs already ran for you]`,
                  `The following data was gathered IN PARALLEL from ${vaNames.join(', ')}.`,
                  'Synthesize across these VAs — do NOT re-call the same read tools unless you need detail beyond what is shown.',
                  '',
                  contextBlock,
                  '',
                  '---',
                  '[DISPATCH REFLEX — act on this turn]',
                  'You are a chief of staff routing five specialist VAs (Inbox / Calendar / CRM / Comms / Research).',
                  'If multiple VAs would do useful work in your next move, emit ALL their tool calls in THIS SINGLE response.',
                  'The loop executes parallel tool_use blocks concurrently. One tool per turn is leaving four VAs idle while the user waits.',
                ].join('\n'),
              } as any);
              log('info', 'Five-VA sweep + dispatch nudge injected', {
                vas: vaNames,
                sections: sweepResults.length,
                totalChars: contextBlock.length,
              });
              totalToolCalls += sweepPromises.length; // count pre-fetches toward the limit
            }
          }
        }

        // Task list: fire async — does NOT block the main loop from starting.
        // Both the task list LLM call and the first main-loop LLM call run in
        // parallel. The task_list SSE event arrives whenever the call resolves,
        // which is typically before or alongside the first tool_call event.
        if (!isPlanMode && availableTools.length > 0) {
          callLLM(
            [
              {
                role: 'system',
                content:
                  'You are a task planner. Decide if the user\'s request is a COMPLEX MULTI-STEP task that requires 3 or more distinct tool calls.\n' +
                  'Complex tasks involve real work: searching emails, reading threads, drafting messages, scheduling meetings, managing calendar, writing documents.\n' +
                  'Simple tasks (casual replies, single questions, greetings) are NOT complex.\n\n' +
                  'For COMPLEX tasks: output a JSON object with two fields:\n' +
                  '  "plan": a single sentence (max 220 chars) describing concretely what will be done — which tools, what will be found, what will be produced.\n' +
                  '  "tasks": array of 3-5 short action items (max 10 words each).\n' +
                  'For SIMPLE tasks: output exactly {}  (empty object).\n' +
                  'Output ONLY raw JSON. No markdown fences, no extra text.\n' +
                  'Example complex: {"plan":"I\'ll search your Gmail for the past 7 days, read each thread, and compile a full activity report in Canvas.","tasks":["Search Gmail last 7 days","Read top email threads","Compile key metrics","Open activity report in Canvas"]}\n' +
                  'Example simple: {}',
              },
              { role: 'user', content: userMessage },
            ],
            [],
            { maxTokens: 250 },
          ).then(tlRes => {
            const raw = getText(tlRes.content).trim();
            const objMatch = raw.match(/\{[\s\S]*\}/);
            if (objMatch) {
              const parsed = JSON.parse(objMatch[0]);
              if (parsed.tasks && Array.isArray(parsed.tasks) && parsed.tasks.length >= 3) {
                const clean = parsed.tasks.slice(0, 6).map((t: any) => String(t).trim()).filter(Boolean);
                taskCount = clean.length;
                emit('task_list', { tasks: clean });
              }
              if (parsed.plan && typeof parsed.plan === 'string' && parsed.plan.trim().length > 10) {
                emit('plan_text', { content: parsed.plan.trim() });
              }
            }
          }).catch(() => { /* task list is optional */ });
        }

        emit('thinking', { status: 'Thinking…' });

        // ── Main agentic loop ───────────────────────────────────────────────
        while (true) {
          // Inject budget counter + current state so the model always knows
          // its remaining allowance AND which phase of the run it is in.
          const budgetUsed = totalToolCalls;
          const budgetLeft = toolCallLimit - budgetUsed;
          // Cast widens TS's view past the let-initializer narrowing —
          // runState is mutated via transitionState() but TS can't follow
          // the closure mutation.
          const currentState: RunState = runState as RunState;
          const stateNote = (() => {
            switch (currentState) {
              case 'PLANNING':
                return '[STATE: PLANNING] — gather context with read-only tools (search_gmail, read_email, get_calendar_events, etc.). Do NOT call write tools (send_email, schedule_meeting, send_slack_message, create_notion_page) yet — call request_confirmation first.';
              case 'CONFIRMING':
                return '[STATE: CONFIRMING] — waiting for user approval. Do not call any more tools this turn.';
              case 'EXECUTING':
                return '[STATE: EXECUTING] — user has approved. Call the write tool that matches the approval now.';
              case 'REPORTING':
                return '[STATE: REPORTING] — all tool calls done. Write the final user-facing message and stop.';
            }
          })();
          const budgetMsg = budgetLeft <= 3
            ? `${stateNote}\n[TOOL BUDGET: ${budgetUsed}/${toolCallLimit} used — ${budgetLeft} calls remaining. RESERVE these for report delivery. Stop executing new tasks and write your final report NOW.]`
            : `${stateNote}\n[TOOL BUDGET: ${budgetUsed}/${toolCallLimit} used — ${budgetLeft} calls remaining.]`;
          if (messages.at(-1)?.role !== 'user') {
            messages.push({ role: 'user', content: budgetMsg } as any);
          } else {
            // Append to the last user message so we don't break the alternating pattern
            const last = messages[messages.length - 1] as any;
            if (typeof last.content === 'string' && !last.content.startsWith('[STATE:') && !last.content.includes('[STATE:')) {
              last.content = `${last.content}\n\n${budgetMsg}`;
            }
          }

          const response = await callLLM(messages, availableTools, { forceToolCall: forceNextToolCall });
          forceNextToolCall = false;
          messages.push({ role: 'assistant', content: response.content });

          const toolCalls = getToolCalls(response.content);
          const rawText = getRawText(response.content);
          const textContent = sanitizeModelText(rawText);

          // Extract chain-of-thought from <thinking> tags emitted by reasoning models.
          // sanitizeModelText strips these before getText returns, so we must read raw.
          const thinkMatch = rawText.match(/<thinking>([\s\S]*?)<\/thinking>/i);
          const thinkingText = thinkMatch ? thinkMatch[1].trim() : '';

          // ── Case 1: Tool calls ────────────────────────────────────────────
          if (toolCalls.length > 0) {
            // Prefer raw chain-of-thought for the narrative card; fall back to visible text.
            const narrativeText = thinkingText || textContent;
            if (narrativeText && narrativeText.length >= 20 && narrativeText.length <= 6000 && !isIntentText(narrativeText)) {
              emit('narrative', { text: narrativeText, iteration });
            }

            const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];

            // ── ask_user: emit question event and stop the loop ───────────
            const askUserCall = toolCalls.find(tc => tc.name === 'ask_user');
            if (askUserCall) {
              const questions = askUserCall.input?.questions ?? [];
              if (questions.length > 0) {
                emit('question', { questions, runId });
                closeStream(totalToolCalls);
                return;
              }
            }

            const overDeadline = Date.now() >= deadlineAt;

            // ── Parallel tool execution ───────────────────────────────────────
            // All tools in a single model turn run concurrently — P50 latency
            // drops 50-70% when the model requests 2+ tools simultaneously.
            // ask_user is already handled above. We respect the tool-call cap
            // by eagerly incrementing totalToolCalls before dispatching.
            const executableTools = toolCalls.filter(tc => tc.name !== 'ask_user');
            const slotsLeft = toolCallLimit - totalToolCalls;

            // ── PART 9: Budget-aware task queue ──────────────────────────────
            // When the orchestration plan knows how many more calls remain AND
            // the budget is too tight to complete even one more plan step, stop
            // scheduling new tool calls and fall through to the final-response
            // path. This prevents the loop from starting a step it can't finish
            // (e.g. kicking off search_gmail with only 1 slot left when the
            // next step also needs read_email + draft_reply).
            // The threshold: if slotsLeft < the plan's minimum estimated remaining
            // calls (total_plan_calls − already_run), emit a partial_completion
            // event so the UI can show the user what was skipped and why.
            const planMinRemaining = (() => {
              if (!executionPlan) return 0;
              // Count plan tools already dispatched
              const dispatchedNames = new Set(toolHistory.map(t => t.name));
              const remaining = executionPlan.steps
                .filter(s => !s.tools.every(t => dispatchedNames.has(t)))
                .reduce((n, s) => n + (s.parallel ? 1 : s.tools.length), 0);
              return remaining;
            })();

            const budgetTooTight =
              executionPlan !== null &&
              planMinRemaining > 0 &&
              slotsLeft > 0 &&
              slotsLeft < planMinRemaining &&
              slotsLeft < 3; // only cut early when truly tight

            if (overDeadline || slotsLeft <= 0 || budgetTooTight) {
              const reason = overDeadline
                ? 'Time budget reached — finalising the report…'
                : budgetTooTight
                  ? `Budget tight (${slotsLeft} slots, ~${planMinRemaining} needed) — wrapping up…`
                  : 'Reached tool call limit. Summarising…';
              emit('thinking', { status: reason });

              // Emit partial completion if the plan had steps we couldn't reach
              if ((budgetTooTight || slotsLeft <= 0) && executionPlan && planMinRemaining > 0) {
                const dispatchedNames = new Set(toolHistory.map(t => t.name));
                const skippedSteps = executionPlan.steps
                  .filter(s => !s.tools.every(t => dispatchedNames.has(t)))
                  .map(s => s.label);
                if (skippedSteps.length > 0) {
                  emit('partial_completion', {
                    completed: toolHistory.filter(t => t.success).map(t => t.name),
                    skipped: skippedSteps,
                    reason: `Tool call budget (${toolCallLimit}) reached before all plan steps could run.`,
                  });
                }
              }
            } else {
              const batch = executableTools.slice(0, slotsLeft);
              totalToolCalls += batch.length;

              // ── PART 8 #1 — bulk progress streaming ──────────────────────────
              // When the LLM batches ≥3 calls of the same write/draft tool in
              // one assistant turn, treat it as a bulk operation and stream
              // incremental progress events the UI can render as a live block.
              // Parallel execution stays — progress is just a side-channel
              // counter that increments as each Promise resolves.
              const toolCounts = new Map<string, number>();
              for (const tc of batch) toolCounts.set(tc.name, (toolCounts.get(tc.name) || 0) + 1);
              const progressTrackers = new Map<string, { current: number; total: number; nextMilestone: number; label: string }>();
              for (const [name, total] of toolCounts) {
                if (total >= 3) {
                  const label = humanizeBulkLabel(name);
                  emit('progress', { phase: 'start', current: 0, total, label, tool: name, iteration });
                  // Update at quarter-completion checkpoints — for 17 items that's
                  // 4 updates total (at items 4, 8, 12, 16). Avoids 17-update spam.
                  progressTrackers.set(name, {
                    current: 0,
                    total,
                    nextMilestone: Math.max(1, Math.floor(total / 4)),
                    label,
                  });
                }
              }

              // Each parallel execution returns a typed result so we can process
              // sequentially after without losing tc context on rejection.
              type ParallelOutcome =
                | { ok: true; tc: any; result: any; extraArchiveCount: number }
                | { ok: false; tc: any; error: string };

              const parallelOutcomes = await Promise.all(
                batch.map(async (tc): Promise<ParallelOutcome> => {
                  log('info', `tool_call`, { tool: tc.name, iteration, input: JSON.stringify(tc.input).slice(0, 200) });
                  emit('tool_call', { tool: tc.name, params: tc.input, iteration });
                  const toolStart = Date.now();
                  try {
                    // ── PART 10 Fix 5: Plan gate ──────────────────────────────
                    // When the user approved a specific plan, only tools in that
                    // plan are allowed. Refusal is returned as a tool_result so
                    // the LLM sees it as a hard stop, not a silent skip.
                    if (approvedPlanTools !== null && !approvedPlanTools.has(tc.name)) {
                      const allowedList = [...approvedPlanTools].join(', ');
                      const gateMsg = `[PLAN GATE] Tool '${tc.name}' is not in the approved plan. Only call tools from the approved plan: ${allowedList}. Stop and report what you've done so far.`;
                      log('warn', 'plan_gate_rejected', { tool: tc.name, allowed: allowedList });
                      return { ok: false, tc, error: gateMsg } satisfies ParallelOutcome;
                    }

                    // ── PART 9: Prerequisite gate ─────────────────────────────
                    // Check dependency graph before dispatching. If a write tool
                    // is called without its required read, surface an advisory
                    // failure that the LLM sees as a tool_result — it then calls
                    // the missing prereq before retrying the write. This is
                    // non-blocking (returns a soft-failure, not a thrown error)
                    // so it doesn't stall parallel siblings.
                    const completedToolNames = toolHistory
                      .filter(t => t.success)
                      .map(t => t.name);
                    // Also count tools already run in this batch (earlier in the
                    // parallelOutcomes array that haven't been committed to
                    // toolHistory yet). We use batch-local tracking for this:
                    // — currently only toolHistory is available here because
                    // parallelOutcomes resolves after all Promises; the code-level
                    // gate in tools.ts catches same-turn ordering violations.
                    const prereqViolation = checkPrerequisites(tc.name, completedToolNames);
                    if (prereqViolation) {
                      log('warn', 'orchestration_prereq_violation', { tool: tc.name, completedTools: completedToolNames });
                      // Return as a soft-failure so the LLM gets a clear nudge
                      // to run the missing prereq first. Not thrown — parallel
                      // siblings continue unaffected.
                      return { ok: false, tc, error: prereqViolation } satisfies ParallelOutcome;
                    }

                    // Newsletter layer 1: filter at query source
                    let inputToUse = tc.input;
                    if (
                      tc.name === 'search_gmail' &&
                      filterNewsletters &&
                      typeof inputToUse?.query === 'string' &&
                      !/category:|label:|in:(sent|drafts|spam|trash)/i.test(inputToUse.query)
                    ) {
                      inputToUse = {
                        ...inputToUse,
                        query: `${inputToUse.query} -category:promotions -category:social -category:forums`.trim(),
                      };
                    }

                    // PART 31 — Dedup: if this is a read-only tool and we've
                    // already called it with the same input this run, return
                    // the cached result. Saves the API call + tells the LLM
                    // it already has this data so it stops looping.
                    let result;
                    if (READ_TOOLS_FOR_DEDUP.has(tc.name)) {
                      const cacheKey = makeCacheKey(tc.name, inputToUse);
                      const cached = toolResultCache.get(cacheKey);
                      if (cached) {
                        log('info', 'dedup_cache_hit', { tool: tc.name, key: cacheKey.slice(0, 80) });
                        result = {
                          ...cached,
                          output:
                            `[Cached — you already called ${tc.name} with these params earlier this turn.]\n` +
                            `Stop re-fetching. Use this data and move on.\n\n` +
                            cached.output,
                        };
                      } else {
                        result = await executeTool(tc.name, inputToUse, userId, buildToolContext());
                        if (result.success !== false) {
                          toolResultCache.set(cacheKey, {
                            output: result.output,
                            success: result.success,
                            canvasData: result.canvasData,
                          });
                        }
                      }
                    } else {
                      result = await executeTool(tc.name, inputToUse, userId, buildToolContext());
                    }

                    // Newsletter layer 2: classify what slipped through
                    let extraArchiveCount = 0;
                    if (tc.name === 'search_gmail' && filterNewsletters) {
                      const { annotated, archiveCount } = processGmailResults(result.output);
                      extraArchiveCount = archiveCount;
                      result = { ...result, output: annotated };
                    }

                    logAudit({ userId, runId, toolName: tc.name, inputSummary: JSON.stringify(tc.input).slice(0, 500), outputSummary: result.output.slice(0, 500), durationMs: Date.now() - toolStart, success: true, iteration });
                    // Bulk progress increment — emit at quarter milestones plus
                    // a final 'complete' when the last item lands. Soft-failures
                    // (success:false) still count toward progress since they
                    // represent a completed attempt, not a hung Promise.
                    const tracker = progressTrackers.get(tc.name);
                    if (tracker) {
                      tracker.current++;
                      if (tracker.current === tracker.total) {
                        emit('progress', { phase: 'complete', current: tracker.total, total: tracker.total, label: tracker.label, tool: tc.name, iteration });
                      } else if (tracker.current >= tracker.nextMilestone) {
                        emit('progress', { phase: 'update', current: tracker.current, total: tracker.total, label: tracker.label, tool: tc.name, iteration });
                        tracker.nextMilestone = Math.min(tracker.total - 1, tracker.current + Math.max(1, Math.floor(tracker.total / 4)));
                      }
                    }
                    return { ok: true, tc, result, extraArchiveCount };
                  } catch (err: any) {
                    const errorMsg = err?.message ?? 'Unknown error';
                    logAudit({ userId, runId, toolName: tc.name, inputSummary: JSON.stringify(tc.input).slice(0, 500), durationMs: Date.now() - toolStart, success: false, errorMessage: errorMsg, iteration });
                    // Thrown failures still count toward bulk completion so the
                    // progress bar doesn't stall on errors.
                    const tracker = progressTrackers.get(tc.name);
                    if (tracker) {
                      tracker.current++;
                      if (tracker.current === tracker.total) {
                        emit('progress', { phase: 'complete', current: tracker.total, total: tracker.total, label: tracker.label, tool: tc.name, iteration });
                      }
                    }
                    return { ok: false, tc, error: humanizeError(tc.name, errorMsg) };
                  }
                })
              );

              // Process results in order — preserves deterministic message history
              let mustStop = false;
              for (const outcome of parallelOutcomes) {
                if (!outcome.ok) {
                  const { tc, error: friendly } = outcome;
                  log('error', `tool_result fail`, { tool: tc.name, error: friendly });
                  emit('tool_result', { tool: tc.name, success: false, summary: friendly, iteration });
                  outcomes.push({ tool: tc.name, ok: false, error: friendly });
                  toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: friendly });

                  // ── PART 10 Fix 5: plan_step_failed ────────────────────────
                  // When a plan was approved and a step fails, emit an event so
                  // the UI can show a "Skip and continue, or stop?" card.
                  if (approvedPlanTools !== null && executionPlan) {
                    const dispatchedSoFar = new Set(toolHistory.map(t => t.name));
                    dispatchedSoFar.add(tc.name); // include the failed tool
                    const remainingSteps = executionPlan.steps
                      .filter(s => !s.tools.every(t => dispatchedSoFar.has(t)))
                      .map(s => s.label);
                    if (remainingSteps.length > 0) {
                      emit('plan_step_failed', {
                        failedStep: executionPlan.steps.find(s => s.tools.includes(tc.name))?.label || tc.name,
                        failedTool: tc.name,
                        reason: friendly.slice(0, 300),
                        remainingSteps,
                      });
                    }
                  }
                  continue;
                }

                const { tc, result, extraArchiveCount } = outcome;

                // ── Soft-failure gate ──────────────────────────────────────
                // Tool ran without throwing but explicitly flagged success:false
                // (e.g. integration not connected, upstream 4xx, validation
                // error). Without this, the LLM treats the failure-message
                // string as a normal result and confabulates next steps.
                // Forcing the failure into the tool_result content with a hard
                // acknowledgement instruction breaks that loop.
                if (result.success === false) {
                  const code = result.errorCode || 'tool_failed';
                  // F8 — Internal-only validation errors get a sanitized
                  // instruction so the LLM never echoes the internal field
                  // name into chat.
                  const isInternalOnly = (result as any)._internal_only === true;
                  const failureMsg = isInternalOnly
                    ? `Tool ${tc.name} returned an internal validation error. ` +
                      `Ask the user ONE short clarifying question in plain English to get the missing detail. ` +
                      `NEVER mention error codes, field names, or internal validation in your reply. ` +
                      `Just ask the question and stop.`
                    : `Tool ${tc.name} returned soft-fail (code "${code}"): ${result.output}\n\n` +
                      `PIVOT-ON-FAILURE PROTOCOL:\n` +
                      `1. Pick the BEST alternative tool from the "Pivot ladder" in your system prompt for ${tc.name}.\n` +
                      `2. Call that alternative tool RIGHT NOW in this same turn. Do NOT write text first.\n` +
                      `3. If the alternative succeeds, complete the task with the new data and report the result.\n` +
                      `4. ONLY if the alternative also fails do you write to the user — and then it is "I hit a snag with X — want me to <one concrete next move>?" NEVER "I can't" / "I'm unable to" / "I don't have access to".\n` +
                      `5. NEVER apologize, never refuse, never stop. Try the pivot first.\n\n` +
                      `Banned reply patterns: "I couldn't ...", "I'm unable to ...", "Unfortunately ...", "That's not possible ...", "I don't have permission to ...". Use "I hit a snag" + pivot instead.`;
                  log('warn', `tool_result soft_fail`, { tool: tc.name, code, output: result.output.slice(0, 200) });
                  emit('tool_result', { tool: tc.name, success: false, summary: result.output.slice(0, 300), iteration });
                  outcomes.push({ tool: tc.name, ok: false, error: result.output });
                  toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: failureMsg });

                  // Scope-missing / not-connected recovery: emit a
                  // connector_required card so the user can reconnect inline.
                  // PART 24 broadens this from gmail-only to every connector
                  // so calendar / notion / slack failures also show the card
                  // instead of the LLM writing a confused paragraph.
                  // Also: inject a hard "STOP" instruction into the failure
                  // result the LLM sees so it doesn't narrate the problem
                  // — the card already tells the user everything.
                  const CONNECTOR_FAILURE_MAP: Record<string, { id: string; name: string; description: string }> = {
                    gmail_scope_missing:    { id: 'gmail',  name: 'Gmail',            description: 'Reconnect Gmail — the current token is missing some scopes.' },
                    gmail_not_connected:    { id: 'gmail',  name: 'Gmail',            description: 'Connect Gmail so I can read and draft email.' },
                    gcal_scope_missing:     { id: 'gcal',   name: 'Google Calendar',  description: 'Reconnect Google Calendar — the current token has Gmail scopes but not Calendar scopes.' },
                    gcal_not_connected:     { id: 'gcal',   name: 'Google Calendar',  description: 'Connect Google Calendar so I can read your schedule and book meetings.' },
                    notion_not_connected:   { id: 'notion', name: 'Notion',           description: 'Connect Notion so I can read and write pages.' },
                    notion_scope_missing:   { id: 'notion', name: 'Notion',           description: 'Reconnect Notion — the workspace authorization needs to be refreshed.' },
                    slack_not_connected:    { id: 'slack',  name: 'Slack',            description: 'Connect Slack so I can post messages and read channels.' },
                  };
                  const connectorMeta = CONNECTOR_FAILURE_MAP[code];
                  if (connectorMeta) {
                    if (code === 'gmail_scope_missing') {
                      invalidateGmailScope(userId).catch(() => { /* non-fatal */ });
                    }
                    emit('connector_required', {
                      connectors: [{
                        ...connectorMeta,
                        connected: false,
                      }],
                      waitingForUser: true,
                      reason: code,
                    });
                    // F1.4 — Replace the LLM-facing failure by tool_use_id,
                    // NOT by array index. Previously `toolResults[length-1]`
                    // assumed the last pushed entry was this failure, which
                    // is true in serial code but is a hidden invariant a
                    // future parallel-batch refactor could easily break.
                    const newContent =
                      `Tool ${tc.name} failed: ${connectorMeta.name} is not connected (or scope is missing). ` +
                      `A connector card has ALREADY been shown to the user. ` +
                      `Reply with ONE short sentence acknowledging the missing connection — example: ` +
                      `"I need ${connectorMeta.name} access to do that — reconnect it from the card and I'll continue." ` +
                      `Do NOT write a long paragraph. Do NOT call any more tools.`;
                    const matchIdx = toolResults.findIndex(r => r.tool_use_id === tc.id);
                    if (matchIdx >= 0) {
                      toolResults[matchIdx] = { type: 'tool_result', tool_use_id: tc.id, content: newContent };
                    } else {
                      // Defensive — push if not found (shouldn't happen but
                      // beats silently dropping the failure context).
                      toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: newContent });
                    }
                  }
                  continue;
                }

                archivedCount += extraArchiveCount;

                if (result.canvasData) {
                  if (
                    result.canvasData.type !== 'scheduled_agent' &&
                    result.canvasData.type !== 'integration_required' &&
                    result.canvasData.type !== 'confirmation_required'
                  ) {
                    canvasContent = result.canvasData;
                  }
                  emit('canvas', result.canvasData);
                }

                if (result.requiresConfirmation) {
                  transitionState('CONFIRMING', `request_confirmation:${tc.name}`);
                  toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: result.output });
                  mustStop = true;
                  continue; // collect remaining results into toolResults before stopping
                }

                log('info', `tool_result ok`, { tool: tc.name, outputLen: result.output.length, hasCanvas: !!result.canvasData });
                emit('tool_result', { tool: tc.name, success: true, summary: result.output.slice(0, 300), iteration });
                outcomes.push({ tool: tc.name, ok: true });
                toolHistory.push({ name: tc.name, input: tc.input, success: true });
                toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: result.output });

                // State transition: a write tool just succeeded. Move from
                // EXECUTING (or PLANNING, if the LLM somehow bypassed the
                // gate — shouldn't happen since the executor refuses, but
                // belt-and-braces) into EXECUTING so subsequent writes in
                // the same turn don't get mislabelled.
                if (
                  tc.name === 'send_email' ||
                  tc.name === 'schedule_meeting' ||
                  tc.name === 'send_slack_message' ||
                  tc.name === 'create_notion_page'
                ) {
                  transitionState('EXECUTING', `write_completed:${tc.name}`);
                }

                // ── Deep Integration Auto-Bridge ──────────────────────────
                if (tc.name === 'schedule_meeting' && connectedIntegrations.includes('notion')) {
                  toolResults.push({
                    type: 'tool_result',
                    tool_use_id: `bridge_${tc.id}`,
                    content: '[AUTO-BRIDGE] Meeting created. Notion is connected — automatically log this meeting to Notion now using create_notion_page (database hint: "meetings"). Include: attendees, time, agenda, Meet link. Report "Logged to Notion ✓" after.',
                  } as any);
                }
                // get_sent_emails auto-bridge removed: voice profile is now
                // injected once at the top of the system prompt, so calling
                // get_sent_emails is no longer a "drafting precursor" — it's
                // an analysis call the user explicitly asked for. Forcing
                // draft_reply afterward turned every voice-profile audit into
                // an unsolicited email draft.
                if (tc.name === 'draft_reply' && connectedIntegrations.includes('notion')) {
                  toolResults.push({
                    type: 'tool_result',
                    tool_use_id: `bridge_${tc.id}`,
                    content: '[AUTO-BRIDGE] Email draft saved. Notion is connected — after the user sends this email, automatically log the conversation to Notion (database hint: "contacts" or "meetings"). Include: contact name, date, key discussion points.',
                  } as any);
                }
                if ((tc.name === 'search_gmail' || tc.name === 'read_email') && connectedIntegrations.includes('gcal') && result.output.match(/\b(meeting|schedule|book|calendar|invite|call|sync)\b/i)) {
                  toolResults.push({
                    type: 'tool_result',
                    tool_use_id: `bridge_${tc.id}`,
                    content: '[AUTO-BRIDGE] Email mentions scheduling. Google Calendar is connected — check calendar availability with get_calendar_events before suggesting times or confirming meetings.',
                  } as any);
                }
                if (tc.name === 'get_calendar_events' && connectedIntegrations.includes('notion')) {
                  toolResults.push({
                    type: 'tool_result',
                    tool_use_id: `bridge_cal_${tc.id}`,
                    content: '[AUTO-BRIDGE: CALENDAR MERGE] Google Calendar fetched. Notion is connected — you MUST also call search_notion with query "calendar schedule meetings" to get Notion calendar blocks. Merge both sources into one chronological timeline before making any scheduling decision or reporting availability. Never book based on GCal data alone.',
                  } as any);
                }
              }

              if (mustStop) {
                messages.push({ role: 'user', content: toolResults as any });
                closeStream(totalToolCalls);
                return;
              }
            }

            if (toolResults.length) {
              messages.push({ role: 'user', content: toolResults as any });
            }

            iteration++;

            if (totalToolCalls >= toolCallLimit || Date.now() >= deadlineAt) {
              emit('thinking', { status: 'Preparing final response…' });
              const canvasSchema = TOOL_SCHEMAS.find(s => s.name === 'open_canvas');
              const finalTools = canvasSchema ? [canvasSchema] : [];
              const finalResponse = await callLLM(
                [
                  ...messages,
                  {
                    role: 'user',
                    content:
                      'All data has been gathered. Now write your final response. ' +
                      'CRITICAL: Do NOT list the steps you took or the tools you ran. Do NOT say "Done — completed Searched inbox for..." or list tool names. ' +
                      'Answer the user\'s actual question using the specific content from the tool results. What did you find? What does the email say? What is the answer? ' +
                      'If this task requires a report, summary, or document (anything longer than 3 paragraphs), ' +
                      'call open_canvas with the full content NOW before writing your chat response. ' +
                      'CRITICAL: Do NOT say "the report is in the Canvas panel" unless you actually call open_canvas in this response.',
                  },
                ],
                finalTools,
              );
              // Handle canvas call in the final forced response
              const finalToolCalls = getToolCalls(finalResponse.content);
              const canvasCall = finalToolCalls.find(tc => tc.name === 'open_canvas');
              if (canvasCall) {
                try {
                  const canvasResult = await executeTool('open_canvas', canvasCall.input, userId, buildToolContext());
                  if (canvasResult.canvasData) {
                    canvasContent = canvasResult.canvasData;
                    emit('canvas', canvasResult.canvasData);
                  }
                } catch { /* non-fatal */ }
              }
              let forcedText = sanitizeModelText(getText(finalResponse.content));
              // Allow up to 2 forced retries when the model keeps listing steps instead of answering
              while (isStepListingResponse(forcedText, true) && stepListingRetryCount < 2) {
                stepListingRetryCount++;
                const toolDataSnippet = extractLastToolResults(messages);
                const retryRes = await callLLM(
                  [
                    ...messages,
                    {
                      role: 'user',
                      content: stepListingRetryCount === 1
                        ? 'STOP. You listed what steps you ran, not what you FOUND. Read the tool results above and answer the user\'s question now. What specific information did the emails contain? Write the actual analysis, not a summary of your actions.'
                        : `FINAL ATTEMPT. You must answer using this data:\n\n${toolDataSnippet}\n\nAnswer the user\'s original question using these results. Call open_canvas if this is a report/analysis. Do NOT say "Done" or list steps.`,
                    },
                  ],
                  finalTools,
                );
                const retryText = sanitizeModelText(getText(retryRes.content));
                if (retryText) forcedText = retryText;
              }
              finalText = forcedText;
              break;
            }

            if (taskCount > 0) {
              emit('task_progress', { completedCount: Math.min(iteration, taskCount - 1) });
            }

            emit('thinking', { status: 'Processing results…' });
            continue;
          }

          // ── Case 2a: Intent text without tools — nudge ────────────────────
          if (totalToolCalls === 0 && nudgeCount < MAX_NUDGES && isIntentText(textContent)) {
            nudgeCount++;
            forceNextToolCall = true;
            emit('thinking', { status: 'Working on it…' });
            // Progressively more forceful nudges
            const nudgeMessages = [
              // Nudge 1: Direct instruction
              'Do NOT describe what you will do. Call the actual tools RIGHT NOW to complete this task. Use the tools available to you.',
              // Nudge 2: Emphatic with specific instruction
              'STOP narrating. You must call the tools immediately — search_gmail, open_canvas, create_scheduled_agent, draft_reply, schedule_meeting, or whatever tools are needed. Execute the action, do not describe it.',
              // Nudge 3: Final warning with available tools listed
              `FINAL WARNING: You are narrating actions instead of performing them. You MUST call at least one tool function now. Available tools: ${availableTools.map(t => t.name).join(', ')}. Pick the right one and call it with the correct parameters. Do NOT respond with text.`,
            ];
            messages.push({
              role: 'user',
              content: nudgeMessages[nudgeCount - 1] || nudgeMessages[nudgeMessages.length - 1],
            });
            continue;
          }

          // ── Case 2b: Unfilled placeholders — nudge ────────────────────────
          if (nudgeCount < MAX_NUDGES && hasPlaceholders(textContent)) {
            nudgeCount++;
            forceNextToolCall = true;
            emit('thinking', { status: 'Completing task…' });
            messages.push({
              role: 'user',
              content:
                'Your response contains a bracketed directive instead of a real action — e.g. "[open canvas with the report]", "[draft the reply here]", or "[link here]". ' +
                'Brackets describing an action are never acceptable. Actually call the tool now: ' +
                'if it says open/show canvas, call open_canvas with the full markdown content; ' +
                'if it says draft a reply, call draft_reply with the real body; ' +
                'if it says schedule, call schedule_meeting. ' +
                'Produce the actual result via the tool — do not write the action in brackets.',
            });
            continue;
          }

          // ── Case 2c: Empty response after tool calls — demand a real summary ──
          // The LLM produced only <thinking> with no visible text. Force one retry.
          if (!textContent && totalToolCalls > 0 && nudgeCount < MAX_NUDGES) {
            nudgeCount++;
            emit('thinking', { status: 'Writing summary…' });
            messages.push({
              role: 'user',
              content:
                'You produced no visible text in your response. Write your final reply now. ' +
                'Answer the user\'s question directly using the content from the tool results — what did the emails/data say? ' +
                'Do NOT list the steps you took or the tools you ran. Do NOT say "Done — completed Searched inbox...". ' +
                'Write the actual answer: (1) the key information found, (2) specific details from the content, (3) what the user should do next if relevant. ' +
                'Do NOT use <thinking> tags — write the reply directly.',
            });
            continue;
          }

          // ── Case 2d: Real final answer ────────────────────────────────────
          // If the model reasoned via <thinking> tags, surface that in the card.
          if (thinkingText && thinkingText.length >= 20) {
            emit('narrative', { text: thinkingText, iteration });
          }

          // ── Last resort: if text is still intent and no tools called, force one final attempt ──
          // This catches the case where all nudges were exhausted but the LLM still narrates.
          if (totalToolCalls === 0 && availableTools.length > 0 && isIntentText(textContent)) {
            log('warn', 'All nudges exhausted — attempting forced tool execution as last resort');
            emit('thinking', { status: 'Executing now…' });
            messages.push({
              role: 'user',
              content:
                'You have described what you will do but have not called any tools. ' +
                'The user is waiting for actual results, not descriptions. ' +
                'Call the first tool needed to start the task NOW. ' +
                `Available tools: ${availableTools.map(t => t.name).join(', ')}. ` +
                'You MUST respond with a tool_call, not text.',
            });
            const lastResort = await callLLM(messages, availableTools, { forceToolCall: true });
            messages.push({ role: 'assistant', content: lastResort.content });
            const lastToolCalls = getToolCalls(lastResort.content);

            if (lastToolCalls.length > 0) {
              // Success! Process the tool calls and continue the loop
              const narrativeText = sanitizeModelText(getRawText(lastResort.content));
              if (narrativeText && narrativeText.length >= 20 && narrativeText.length <= 6000 && !isIntentText(narrativeText)) {
                emit('narrative', { text: narrativeText, iteration });
              }

              const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];
              for (const tc of lastToolCalls) {
                if (totalToolCalls >= toolCallLimit) break;
                totalToolCalls++;
                log('info', `tool_call #${totalToolCalls} (last-resort)`, { tool: tc.name, iteration });
                emit('tool_call', { tool: tc.name, params: tc.input, iteration });
                try {
                  let result = await executeTool(tc.name, tc.input, userId, buildToolContext());
                  if (result.success === false) {
                    const code = result.errorCode || 'tool_failed';
                    const failureMsg =
                      `Tool ${tc.name} failed with code "${code}". Reason: ${result.output}\n\n` +
                      `You MUST handle this failure explicitly. Do not pretend it succeeded.`;
                    emit('tool_result', { tool: tc.name, success: false, summary: result.output.slice(0, 300), iteration });
                    outcomes.push({ tool: tc.name, ok: false, error: result.output });
                    toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: failureMsg });
                    continue;
                  }
                  if (result.canvasData) {
                    if (result.canvasData.type !== 'scheduled_agent' && result.canvasData.type !== 'integration_required') {
                      canvasContent = result.canvasData;
                    }
                    emit('canvas', result.canvasData);
                  }
                  emit('tool_result', { tool: tc.name, success: true, summary: result.output.slice(0, 300), iteration });
                  outcomes.push({ tool: tc.name, ok: true });
                  toolHistory.push({ name: tc.name, input: tc.input, success: true });
                  toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: result.output });
                } catch (err: any) {
                  const friendly = humanizeError(tc.name, err?.message ?? 'Unknown error');
                  emit('tool_result', { tool: tc.name, success: false, summary: friendly, iteration });
                  outcomes.push({ tool: tc.name, ok: false, error: friendly });
                  toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: friendly });
                }
              }
              if (toolResults.length) {
                messages.push({ role: 'user', content: toolResults as any });
              }
              iteration++;

              // Now get the final summary from the LLM
              emit('thinking', { status: 'Preparing final response…' });
              const canvasSchema = availableTools.find(t => t.name === 'open_canvas');
              const finalTools = canvasSchema ? [canvasSchema] : [];
              const summaryRes = await callLLM(
                [
                  ...messages,
                  {
                    role: 'user',
                    content:
                      'Write your final response now. Answer the user\'s question using the specific content from the tool results — what did you find? What did the emails say? ' +
                      'Do NOT list steps or tool names ("Done — completed Searched..."). Give the actual information. ' +
                      'If you need to create a document or report, call open_canvas. Be specific about results.',
                  },
                ],
                finalTools,
              );
              const summaryToolCalls = getToolCalls(summaryRes.content);
              const summaryCanvasCall = summaryToolCalls.find(tc => tc.name === 'open_canvas');
              if (summaryCanvasCall) {
                try {
                  const canvasResult = await executeTool('open_canvas', summaryCanvasCall.input, userId, buildToolContext());
                  if (canvasResult.canvasData) {
                    canvasContent = canvasResult.canvasData;
                    emit('canvas', canvasResult.canvasData);
                  }
                } catch { /* non-fatal */ }
              }
              finalText = sanitizeModelText(getText(summaryRes.content));
              break;
            }
          }

          // ── Case 2e: Step-listing response — demand actual answer ─────────
          // LLM listed what tools it ran ("Done — completed Searched inbox for...")
          // instead of answering the user's question with the content it found.
          // Uses its own flag so intent-text nudges don't exhaust this retry.
          if (isStepListingResponse(textContent, totalToolCalls > 0) && stepListingRetryCount < 2) {
            stepListingRetryCount++;
            emit('thinking', { status: 'Preparing answer…' });
            const toolDataSnippet = extractLastToolResults(messages);
            messages.push({
              role: 'user',
              content: stepListingRetryCount === 1
                ? 'STOP. You listed what steps you ran, not what you FOUND. That is not acceptable. ' +
                  'The tool results are already in this conversation — read them and answer the user\'s question now. ' +
                  'What do the emails say? What specific information did you find? ' +
                  'Write a substantive answer using the actual content from the tool results. ' +
                  'If this is a report or analysis, call open_canvas NOW with the full content. ' +
                  'Do NOT mention steps, tool names, searches, or what you did.'
                : `FINAL ATTEMPT. Here is the actual data from your tool results:\n\n${toolDataSnippet}\n\n` +
                  'Use this data to answer the user\'s original question RIGHT NOW. ' +
                  'If the task requires a report, summary, or analysis, call open_canvas with the full content. ' +
                  'Do NOT say "Done", do NOT list steps. Write the actual answer.',
            });
            continue;
          }

          // ── Response quality validator ────────────────────────────────────
          // Reject trivially short or hollow responses when tools ran — forces
          // the model to actually use the data it fetched. Max 2 auto-retries.
          const isTrivialResponse =
            totalToolCalls > 0 &&
            textContent.length < 40 &&
            nudgeCount < MAX_NUDGES;

          if (isTrivialResponse) {
            nudgeCount++;
            emit('thinking', { status: 'Generating detailed response…' });
            messages.push({
              role: 'user',
              content:
                'Your response is too short and doesn\'t use the information from the tool results. ' +
                'Write a complete, specific answer using the actual content you retrieved. ' +
                'Include the relevant details, names, dates, and specifics from what was found.',
            });
            continue;
          }

          // Final safety net: if retries exhausted and the text is STILL
          // step-listing or tool-salad, drop it. A clean empty close beats
          // showing the user "Done — completed Running create scheduled agent".
          if (isStepListingResponse(textContent, totalToolCalls > 0)) {
            log('warn', 'step_listing_text_dropped_after_retries', { preview: textContent.slice(0, 120) });
            finalText = '';
          } else {
            finalText = textContent;
          }
          break;
        }

        if (!finalText) {
          if (isPlanMode) {
            finalText = 'I was unable to generate a plan. Please try again with a more specific request.';
          } else {
            // When the LLM produced no usable text but tools ran successfully,
            // we used to emit "Done — I handled X, Y and Z for you" — a tool-
            // name salad that looked like hallucination to users. Now: if the
            // tools rendered their own canvas/card (which is the usual case
            // for write tools), emit an EMPTY message so the chat stream
            // shows just the card with no filler text above it. The card is
            // self-explanatory.
            const failedCount = outcomes.filter(o => !o.ok).length;
            const succeededCount = outcomes.filter(o => o.ok).length;
            if (canvasContent || succeededCount > 0) {
              // Card already rendered — no chat text needed.
              finalText = '';
            } else if (failedCount > 0 && succeededCount === 0) {
              finalText = 'I hit an error and couldn\'t complete that. Tell me a bit more about what you need and I\'ll try again.';
            } else {
              finalText = '';
            }
          }
        }

        // ── Layer 3 end: emit partial failure as structured SSE event ──────
        const failed = outcomes.filter(o => !o.ok);
        const succeeded = outcomes.filter(o => o.ok);
        if (failed.length > 0 && totalToolCalls > 0) {
          const question = failed.length === 1
            ? `How would you like to handle the ${failed[0].tool} failure?`
            : 'How would you like to handle these failures?';
          emit('partial_failure', {
            done: succeeded.map(o => o.tool),
            failed: failed.map(o => ({ tool: o.tool, error: o.error ?? 'unknown error' })),
            question,
          });
        }

        if (taskCount > 0) {
          emit('task_progress', { completedCount: taskCount });
        }

        // Final state transition before delivering the user-facing message.
        transitionState('REPORTING', 'final_message');

        // F7 — defensive sanitizer pass before emit. Catches raw JSON,
        // `[Cached —]` envelopes, tool-error codes the LLM may have pasted.
        // sanitizeModelText is idempotent so it's safe even after earlier strips.
        finalText = sanitizeModelText(finalText);

        // ── FINAL HALLUCINATION GUARD ────────────────────────────────────
        // The most damaging hallucination is the LLM claiming it did an
        // action ("I've sent the email", "I scheduled the meeting") when
        // no successful tool call backs the claim. We scan finalText for
        // past-tense action verbs and require a matching success. If the
        // claim is unbacked, we replace it with a neutral phrasing so the
        // user is never told "done" for work that didn't happen.
        if (!isPlanMode && finalText.trim()) {
          const succeededTools = new Set(
            outcomes.filter(o => o.ok).map(o => o.tool),
          );
          const succeeded = (names: string[]) => names.some(n => succeededTools.has(n));

          const CLAIM_RULES: Array<{
            re: RegExp;
            requires: string[];
            replacement: string;
            label: string;
          }> = [
            {
              re: /\bI(?:'ve| have)?\s+sent\b[^.\n]*\./gi,
              requires: ['send_email', 'gmail_batch_send_emails', 'send_slack_message', 'slack_send_dm', 'report_send_gmail', 'report_send_slack'],
              replacement: 'I prepared the message but did not actually send it — let me know if you want me to send.',
              label: 'sent',
            },
            {
              re: /\bI(?:'ve| have)?\s+(?:drafted|written|composed)\b[^.\n]*\./gi,
              requires: ['draft_reply', 'draft_cold_email', 'gmail_batch_draft_replies', 'gmail_generate_auto_replies'],
              replacement: 'I have not drafted the message yet — share the recipient and intent and I will draft it.',
              label: 'drafted',
            },
            {
              re: /\bI(?:'ve| have)?\s+(?:scheduled|booked)\b[^.\n]*\./gi,
              requires: ['schedule_meeting', 'calendar_batch_create_events'],
              replacement: 'I have not actually scheduled anything yet — confirm the time and attendees and I will book it.',
              label: 'scheduled',
            },
            {
              re: /\bI(?:'ve| have)?\s+(?:created|logged|saved|added)\b[^.\n]*?\b(?:notion|page|task|database|entry)\b[^.\n]*\./gi,
              requires: ['create_notion_page', 'notion_create_task', 'notion_batch_create_database_entries'],
              replacement: 'I have not created the Notion entry yet — confirm and I will log it.',
              label: 'notion_created',
            },
            {
              re: /\bI(?:'ve| have)?\s+(?:archived|deleted)\b[^.\n]*\./gi,
              requires: ['gmail_archive_thread', 'gmail_auto_archive_threads'],
              replacement: 'I have not archived anything yet — say the word and I will.',
              label: 'archived',
            },
            {
              re: /\bI(?:'ve| have)?\s+(?:cancelled|canceled)\b[^.\n]*\b(?:meeting|event|call)\b[^.\n]*\./gi,
              requires: ['calendar_cancel_event'],
              replacement: 'I have not cancelled that event yet — confirm and I will.',
              label: 'cancelled',
            },
          ];

          for (const rule of CLAIM_RULES) {
            if (!rule.re.test(finalText)) {
              rule.re.lastIndex = 0;
              continue;
            }
            rule.re.lastIndex = 0;
            if (!succeeded(rule.requires)) {
              log('warn', 'hallucination_guard_stripped_claim', { label: rule.label });
              finalText = finalText.replace(rule.re, rule.replacement);
            }
          }
        }

        if (isPlanMode) {
          // PART 42 — post-process the LLM's plan output to recover from the
          // two most common formatting failures on free models:
          //   1. Steps collapsed into one paragraph ("1. Foo 2. Bar 3. Baz")
          //      → split each numbered item onto its own line.
          //   2. ## headings or --- separators run together with surrounding
          //      content → insert the missing newlines.
          //   3. Params-dump pattern (multiple `key: "value"` lines as the
          //      whole body) → wrap with a header so it's at least readable
          //      and log it for later prompt tuning.
          finalText = normalizePlanMarkdown(finalText);
          const titleMatch = finalText.match(/^#\s+(.+)$/m);
          const planTitle = titleMatch ? titleMatch[1].trim() : 'Plan';
          emit('plan', { title: planTitle, markdown: finalText });
        } else if (finalText.trim() || canvasContent) {
          // Only emit a message if there's actually something to show. Empty
          // finalText with no canvas would render as a blank chat bubble.
          emit('message', { content: finalText, canvasContent: canvasContent || undefined });
        }

        closeStream(totalToolCalls);

      } catch (err: any) {
        log('error', 'Unhandled loop error', {
          message: err.message,
          name: err.name,
          stack: err.stack?.slice(0, 500),
          runId,
        });
        emit('error', { message: err.message || 'Something went wrong. Please try again.' });
        // F1.2 — always emit done after error so the client doesn't fall
        // back to its "stream finished unexpectedly" salad path.
        closeStream(0);
      } finally {
        // Idempotent — closeStream() above already closed. This catches
        // any edge case where the try block returned without closing.
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });
}
