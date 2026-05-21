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
import type { LLMMessage } from './engine';

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

// ── Error humanizer ────────────────────────────────────────────────────────────
//
// Raw tool errors (stack traces, "403", "fetch failed", AbortError) must never
// reach the user or even the LLM verbatim — they make Arcus feel broken and
// mechanical. This converts them into a plain-English explanation plus a
// concrete alternative the model can act on or relay.

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
  } = opts;

  const availableTools = isPlanMode ? [] : getAvailableTools(connectedIntegrations);
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
        // Before generating a plan, give the AI a chance to ask the user
        // clarifying questions. Only skipped when answers are already in history.
        if (isPlanMode) {
          emit('thinking', { status: 'Checking if I need more details…' });

          const alreadyAnswered = history.some(h =>
            h.role === 'user' && /^Q:[\s\S]*\nA:/.test(h.content)
          );

          if (!alreadyAnswered) {
            const clarifyRes = await callLLM(
              [
                {
                  role: 'system',
                  content:
                    'You are about to create a detailed plan for the user. ' +
                    'Before you do, decide: is the request clear enough to plan immediately, ' +
                    'or are there 1-3 key unknowns that would significantly change the plan? ' +
                    'If genuinely ambiguous, call the ask_user tool with concise questions (each with 2-3 short options where applicable). ' +
                    'If the request is clear enough, respond with ONLY the word "proceed" — no other text.',
                },
                ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
                { role: 'user', content: userMessage },
              ],
              [ASK_USER_SCHEMA],
              { maxTokens: 400, temperature: 0.2 },
            );

            const clarifyToolCalls = getToolCalls(clarifyRes.content);
            const askCall = clarifyToolCalls.find(tc => tc.name === 'ask_user');
            if (askCall) {
              const questions = askCall.input?.questions ?? [];
              if (questions.length > 0) {
                emit('question', { questions, runId });
                emit('done', { runId, durationMs: Date.now() - startedAt, totalSteps: 0 });
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

        // ── Pre-loop: generate task list ────────────────────────────────────
        const messages: LLMMessage[] = [
          { role: 'system', content: systemPrompt },
          ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
          { role: 'user', content: userMessage },
        ];

        let totalToolCalls = 0;
        let nudgeCount = 0;
        let finalText = '';
        let canvasContent: any = null;
        let iteration = 0;
        let taskCount = 0;
        let archivedCount = 0;
        const outcomes: ToolOutcome[] = [];
        let forceNextToolCall = false;

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

          // Notion: recent activity
          if (connectedIntegrations.includes('notion')) {
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

        if (!isPlanMode && availableTools.length > 0) {
          try {
            const tlRes = await callLLM(
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
            );
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
          } catch { /* task list is optional */ }
        }

        emit('thinking', { status: 'Thinking…' });

        // ── Main agentic loop ───────────────────────────────────────────────
        while (true) {
          // Inject budget counter so the model always knows its remaining allowance
          const budgetUsed = totalToolCalls;
          const budgetLeft = toolCallLimit - budgetUsed;
          const budgetMsg = budgetLeft <= 3
            ? `[TOOL BUDGET: ${budgetUsed}/${toolCallLimit} used — ${budgetLeft} calls remaining. RESERVE these for report delivery. Stop executing new tasks and write your final report NOW.]`
            : `[TOOL BUDGET: ${budgetUsed}/${toolCallLimit} used — ${budgetLeft} calls remaining. Planning phase: use 1-2. Execution: use remaining. Reserve 3 for report/Notion log.]`;
          if (messages.at(-1)?.role !== 'user') {
            messages.push({ role: 'user', content: budgetMsg } as any);
          } else {
            // Append to the last user message so we don't break the alternating pattern
            const last = messages[messages.length - 1] as any;
            if (typeof last.content === 'string' && !last.content.startsWith('[TOOL BUDGET')) {
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
            for (const tc of toolCalls) {
              if (tc.name === 'ask_user') continue; // skip — handled above
              if (totalToolCalls >= toolCallLimit || overDeadline) {
                emit('thinking', {
                  status: overDeadline
                    ? 'Time budget reached — finalising the report…'
                    : 'Reached tool call limit. Summarising…',
                });
                break;
              }

              totalToolCalls++;
              log('info', `tool_call #${totalToolCalls}`, { tool: tc.name, iteration, input: JSON.stringify(tc.input).slice(0, 200) });
              emit('tool_call', { tool: tc.name, params: tc.input, iteration });

              try {
                // ── Newsletter logic, layer 1: filter at the SOURCE ─────────
                // Gmail already classifies promotions/social/forums far more
                // reliably than any snippet regex. Exclude those categories in
                // the query itself so promos never enter the result set —
                // unless the user is explicitly hunting for them, or already
                // scoped the query to a category/label themselves.
                if (
                  tc.name === 'search_gmail' &&
                  filterNewsletters &&
                  typeof tc.input?.query === 'string' &&
                  !/category:|label:|in:(sent|drafts|spam|trash)/i.test(tc.input.query)
                ) {
                  tc.input = {
                    ...tc.input,
                    query: `${tc.input.query} -category:promotions -category:social -category:forums`.trim(),
                  };
                }

                let result = await executeTool(tc.name, tc.input, userId);

                // ── Newsletter logic, layer 2: classify what slipped through ─
                // Safety net for promos that escape Gmail's category filter
                // (e.g. marketing sent to the Primary tab).
                if (tc.name === 'search_gmail' && filterNewsletters) {
                  const { annotated, archiveCount } = processGmailResults(result.output);
                  archivedCount += archiveCount;
                  result = { ...result, output: annotated };
                }

                if (result.canvasData) {
                  // Don't overwrite canvasContent with inline-card types
                  // (scheduled_agent, integration_required, confirmation_required — rendered as cards, not the canvas panel)
                  if (
                    result.canvasData.type !== 'scheduled_agent' &&
                    result.canvasData.type !== 'integration_required' &&
                    result.canvasData.type !== 'confirmation_required'
                  ) {
                    canvasContent = result.canvasData;
                  }
                  emit('canvas', result.canvasData);
                }

                // If the tool requires user confirmation, end this run immediately.
                // The frontend shows the ConfirmationCard; when the user responds,
                // processAgentLoopMessage is called again with the full history.
                if (result.requiresConfirmation) {
                  toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: result.output });
                  messages.push({ role: 'user', content: toolResults as any });
                  emit('done', { runId, durationMs: Date.now() - startedAt, totalSteps: totalToolCalls });
                  controller.close();
                  return;
                }

                log('info', `tool_result ok`, { tool: tc.name, outputLen: result.output.length, hasCanvas: !!result.canvasData });
                emit('tool_result', {
                  tool: tc.name,
                  success: true,
                  summary: result.output.slice(0, 300),
                  iteration,
                });

                outcomes.push({ tool: tc.name, ok: true });
                toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: result.output });

                // ── Deep Integration Auto-Bridge ────────────────────────────
                // When a tool completes that has cross-integration implications,
                // inject a hint so the LLM auto-bridges to connected tools.
                // This eliminates the user needing to say "also log to Notion"
                // or "also check my calendar" — it happens automatically.
                if (tc.name === 'schedule_meeting' && connectedIntegrations.includes('notion')) {
                  toolResults.push({
                    type: 'tool_result',
                    tool_use_id: `bridge_${tc.id}`,
                    content: '[AUTO-BRIDGE] Meeting created. Notion is connected — automatically log this meeting to Notion now using create_notion_page (database hint: "meetings"). Include: attendees, time, agenda, Meet link. Report "Logged to Notion ✓" after.',
                  } as any);
                }
                // After studying the user's writing style, the ONLY valid next step is
                // draft_reply. Free models tend to stop here and hallucinate "Done" —
                // this bridge makes the requirement explicit in the message history.
                if (tc.name === 'get_sent_emails') {
                  toolResults.push({
                    type: 'tool_result',
                    tool_use_id: `bridge_${tc.id}`,
                    content: '[WRITING STYLE READY — ACTION REQUIRED] You now have the user\'s writing style, tone, and voice. The task is NOT complete. You MUST call draft_reply immediately with the full email body written in the user\'s voice. Do NOT output any text message. Do NOT say "Done" or "Completed". Call draft_reply NOW.',
                  } as any);
                }

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

                // FIX 7: Calendar merging — whenever GCal is fetched, also pull
                // Notion calendar data so scheduling decisions use both sources.
                if (tc.name === 'get_calendar_events' && connectedIntegrations.includes('notion')) {
                  toolResults.push({
                    type: 'tool_result',
                    tool_use_id: `bridge_cal_${tc.id}`,
                    content: '[AUTO-BRIDGE: CALENDAR MERGE] Google Calendar fetched. Notion is connected — you MUST also call search_notion with query "calendar schedule meetings" to get Notion calendar blocks. Merge both sources into one chronological timeline before making any scheduling decision or reporting availability. Never book based on GCal data alone.',
                  } as any);
                }

              } catch (err: any) {
                const errorMsg = err?.message ?? 'Unknown error';
                const friendly = humanizeError(tc.name, errorMsg);
                log('error', `tool_result fail`, { tool: tc.name, error: errorMsg, stack: err?.stack?.slice(0, 300) });
                emit('tool_result', { tool: tc.name, success: false, summary: friendly, iteration });
                outcomes.push({ tool: tc.name, ok: false, error: friendly });
                toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: friendly });
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
                  const canvasResult = await executeTool('open_canvas', canvasCall.input, userId);
                  if (canvasResult.canvasData) {
                    canvasContent = canvasResult.canvasData;
                    emit('canvas', canvasResult.canvasData);
                  }
                } catch { /* non-fatal */ }
              }
              finalText = sanitizeModelText(getText(finalResponse.content));
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
                'You produced no visible text in your response. Write your final reply now: ' +
                '(1) one sentence confirming what you accomplished, ' +
                '(2) the key result with specific details (subject line, opening sentences of any draft, etc.), ' +
                '(3) one sentence telling the user what to do next. ' +
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
                  let result = await executeTool(tc.name, tc.input, userId);
                  if (result.canvasData) {
                    if (result.canvasData.type !== 'scheduled_agent' && result.canvasData.type !== 'integration_required') {
                      canvasContent = result.canvasData;
                    }
                    emit('canvas', result.canvasData);
                  }
                  emit('tool_result', { tool: tc.name, success: true, summary: result.output.slice(0, 300), iteration });
                  outcomes.push({ tool: tc.name, ok: true });
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
                      'Write your final response now. Confirm what you completed and provide the key details. ' +
                      'If you need to create a document or report, call open_canvas. Be specific about results.',
                  },
                ],
                finalTools,
              );
              const summaryToolCalls = getToolCalls(summaryRes.content);
              const summaryCanvasCall = summaryToolCalls.find(tc => tc.name === 'open_canvas');
              if (summaryCanvasCall) {
                try {
                  const canvasResult = await executeTool('open_canvas', summaryCanvasCall.input, userId);
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
