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
import { processGmailResults, isVagueInstruction, isBroadContextTask } from './inbox-pipeline';
import { invalidateGmailScope } from './gmail-scope';
import { getSupabaseAdmin } from '../supabase.js';
import { buildExecutionPlan, planToHint, checkPrerequisites } from './orchestrator';
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
function log(level: 'info' | 'warn' | 'error', msg: string, extra?: Record<string, unknown>) {
  const prefix = `[Arcus:Loop] ${ts()}`;
  const line = extra ? `${prefix} ${msg} ${JSON.stringify(extra)}` : `${prefix} ${msg}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const MAX_TOOL_CALLS = 20;
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
// Patterns: "Done — completed Searched inbox for...", "Done — I handled search gmail...",
// or any response whose first sentence is just a tool recap with no substantive content.
const STEP_LIST_PATTERN = /^(done\s*[—–-]\s*(completed|i handled|i ran|executed|performed)\s+(?:searched|search|read|fetch|check|look|scan|get)|done\s*[—–-]\s*(?:searched\s+inbox|read\s+email|fetch|checked\s+calendar)|i\s+(?:searched|read|fetched|checked|scanned)\s+(?:the\s+)?(?:inbox|gmail|calendar|notion|slack)\s+(?:for|and)\b)/i;

// A step-listing response has short length with no real info, or starts with a step recap
// and the whole body is just a comma-separated list of tool actions.
function isStepListingResponse(text: string, toolsWereCalled: boolean): boolean {
  if (!toolsWereCalled) return false;
  const t = text.trim();
  if (!t || t.length > 1200) return false; // Long responses likely have real content
  if (STEP_LIST_PATTERN.test(t)) return true;
  // Catch the pattern: "Done — I handled X, Y and Z for you." with only tool names
  if (/^done\s*[—–-]/i.test(t) && /\bfor you\b/i.test(t) && t.length < 300) {
    // Check if the text is primarily a list of actions/tool names
    const hasRealContent = /\b(found|says|email|subject|from|body|content|result|message|reply|thread|schedule|event|meeting|note|page|slack|notion)\b/i.test(t);
    if (!hasRealContent) return true;
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
  } = opts;
  // Tracks every successful tool call this run so PART 4 Rule 1 (draft_reply
  // requires a preceding read_email/gmail_read_thread) and Rule 3
  // (schedule_meeting requires a preceding calendar fetch) can verify the
  // LLM actually fetched ground truth before acting.
  const toolHistory: Array<{ name: string; input: any; success: boolean }> = [];

  const availableTools = isPlanMode ? [] : getAvailableTools(connectedIntegrations, isBackgroundAgent);
  const toolCallLimit =
    typeof maxToolCalls === 'number' && maxToolCalls > 0
      ? Math.min(maxToolCalls, MAX_TOOL_CALLS)
      : MAX_TOOL_CALLS;
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
                    `If the request is specific enough to plan immediately, respond with ONLY the word "proceed" — nothing else.`,
                },
                ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
                { role: 'user', content: userMessage },
              ],
              [ASK_USER_SCHEMA],
              { maxTokens: 300, temperature: 0.1 },
            );

            const clarifyToolCalls = getToolCalls(clarifyRes.content);
            const askCall = clarifyToolCalls.find(tc => tc.name === 'ask_user');
            if (askCall) {
              const questions = (askCall.input?.questions ?? []).filter((q: any) => q?.text?.trim());
              if (questions.length > 0) {
                emit('question', { questions, runId });
                emit('done', { runId, durationMs: Date.now() - startedAt, totalSteps: 0, hadQuestion: true });
                controller.close();
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
          emit('done', { runId, durationMs: Date.now() - startedAt, totalSteps: 0 });
          controller.close();
          return;
        }

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

        const messages: LLMMessage[] = [
          { role: 'system', content: systemPrompt + planModeInstruction },
          ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
          { role: 'user', content: userMessage },
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

        // ── Context Switching Elimination: Unified context sweep ───────────
        // For broad tasks ("morning brief", "prepare for tomorrow", "what did I miss"),
        // pre-fetch from all connected integrations in parallel BEFORE the LLM
        // starts reasoning. This gives the LLM a unified view across platforms
        // and eliminates the need for sequential tool calls just to gather context.
        const broadTask = !isPlanMode && isBroadContextTask(userMessage);
        if (broadTask && connectedIntegrations.length > 0) {
          emit('thinking', { status: 'Gathering context across your connected tools…' });
          log('info', 'Unified context sweep triggered', { integrations: connectedIntegrations });

          const sweepResults: string[] = [];
          const sweepPromises: Promise<void>[] = [];

          // Gmail: recent unread emails
          if (connectedIntegrations.includes('gmail')) {
            sweepPromises.push(
              executeTool('search_gmail', { query: 'is:unread newer_than:2d', maxResults: 10 }, userId)
                .then(r => { sweepResults.push(`## Recent Unread Emails\n${r.output}`); })
                .catch(() => { sweepResults.push('## Recent Unread Emails\n(Could not fetch — Gmail may need reconnection)'); })
            );
          }

          // Calendar: next 3 days
          if (connectedIntegrations.includes('gcal')) {
            sweepPromises.push(
              executeTool('get_calendar_events', { daysAhead: 3, maxResults: 15 }, userId)
                .then(r => { sweepResults.push(`## Upcoming Calendar (3 days)\n${r.output}`); })
                .catch(() => { sweepResults.push('## Upcoming Calendar\n(Could not fetch — Calendar may need reconnection)'); })
            );
          }

          // Notion: recent activity (notion_calendar uses the same token)
          if (connectedIntegrations.includes('notion') || connectedIntegrations.includes('notion_calendar')) {
            sweepPromises.push(
              executeTool('search_notion', { query: '', maxResults: 5 }, userId)
                .then(r => { sweepResults.push(`## Recent Notion Pages\n${r.output}`); })
                .catch(() => { sweepResults.push('## Recent Notion Pages\n(Could not fetch)'); })
            );
          }

          await Promise.allSettled(sweepPromises);

          if (sweepResults.length > 0) {
            // Inject the unified context as a system message so the LLM can
            // synthesize across all platforms in its first response.
            const contextBlock = sweepResults.join('\n\n---\n\n');
            messages.push({
              role: 'user',
              content: [
                '[UNIFIED CONTEXT SWEEP — pre-fetched from connected integrations]',
                'The following data was gathered in parallel from the user\'s connected tools.',
                'Use this context to give a comprehensive, cross-platform answer.',
                'You do NOT need to call these tools again unless you need more detail.',
                '',
                contextBlock,
              ].join('\n'),
            } as any);
            log('info', 'Context sweep injected', { sections: sweepResults.length, totalChars: contextBlock.length });
            totalToolCalls += sweepPromises.length; // count pre-fetches toward the limit
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
                emit('done', { runId, durationMs: Date.now() - startedAt, totalSteps: totalToolCalls });
                controller.close();
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

                    let result = await executeTool(tc.name, inputToUse, userId, buildToolContext());

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
                  // FIX 2 — enforce exact user-facing acknowledgement format.
                  // The LLM MUST say "I couldn't [action] because [reason].
                  // Would you like me to [alternative]?" before doing anything
                  // else. Generic "I'll try a different approach" without naming
                  // the failure is not acceptable.
                  const friendlyAction = tc.name.replace(/_/g, ' ');
                  const failureMsg =
                    `Tool ${tc.name} failed with code "${code}". Reason: ${result.output}\n\n` +
                    `MANDATORY RESPONSE FORMAT — use this exact structure in your next message:\n` +
                    `"I couldn't ${friendlyAction} because [plain-English reason from the error above]. Would you like me to [specific alternative action]?"\n\n` +
                    `Rules:\n` +
                    `- Name the exact action that failed (not a generic "that step").\n` +
                    `- State the reason in plain English — no error codes, no technical jargon.\n` +
                    `- Offer one concrete alternative (retry, use a different tool, skip this step, ask the user to reconnect).\n` +
                    `- Do NOT continue the task, call more tools, or fabricate data from this tool.\n` +
                    `- Do NOT say "I'll try a different approach" without first acknowledging the failure to the user.`;
                  log('warn', `tool_result soft_fail`, { tool: tc.name, code, output: result.output.slice(0, 200) });
                  emit('tool_result', { tool: tc.name, success: false, summary: result.output.slice(0, 300), iteration });
                  outcomes.push({ tool: tc.name, ok: false, error: result.output });
                  toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: failureMsg });

                  // Gmail scope-missing recovery: invalidate the preflight cache
                  // so the next chat turn re-probes, and emit a connector_required
                  // card so the user can reconnect inline without leaving the chat.
                  // No retry this turn — scope changes require user OAuth consent.
                  if (code === 'gmail_scope_missing') {
                    invalidateGmailScope(userId).catch(() => { /* non-fatal */ });
                    emit('connector_required', {
                      connectors: [{
                        id: 'gmail',
                        name: 'Gmail',
                        description:
                          'Reconnect Gmail so I can finish that task — the current token is missing some scopes.',
                        connected: false,
                      }],
                      waitingForUser: true,
                      reason: 'gmail_scope_missing',
                    });
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
                emit('done', { runId, durationMs: Date.now() - startedAt, totalSteps: totalToolCalls });
                controller.close();
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

          finalText = textContent;
          break;
        }

        if (!finalText) {
          if (isPlanMode) {
            finalText = 'I was unable to generate a plan. Please try again with a more specific request.';
          } else {
            // Build a natural recap from what actually happened rather than a
            // canned line, so the close never feels mechanical.
            const okTools = [...new Set(outcomes.filter(o => o.ok).map(o => o.tool.replace(/_/g, ' ')))];
            if (okTools.length > 0) {
              const list = okTools.length === 1
                ? okTools[0]
                : `${okTools.slice(0, -1).join(', ')} and ${okTools[okTools.length - 1]}`;
              finalText = `Done — I handled ${list} for you. Let me know if you'd like any changes.`;
            } else {
              finalText = 'I wasn\'t able to complete that this time. Tell me a bit more and I\'ll take another run at it.';
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

        if (isPlanMode) {
          const titleMatch = finalText.match(/^#\s+(.+)$/m);
          const planTitle = titleMatch ? titleMatch[1].trim() : 'Plan';
          emit('plan', { title: planTitle, markdown: finalText });
        } else {
          emit('message', { content: finalText, canvasContent: canvasContent || undefined });
        }

        emit('done', { runId, durationMs: Date.now() - startedAt, totalSteps: totalToolCalls });

      } catch (err: any) {
        log('error', 'Unhandled loop error', {
          message: err.message,
          name: err.name,
          stack: err.stack?.slice(0, 500),
          runId,
        });
        emit('error', { message: err.message || 'Something went wrong. Please try again.' });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });
}
