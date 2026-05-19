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
import { processGmailResults, isInboxTask, isVagueInstruction, isBroadContextTask } from './inbox-pipeline';
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

const INTENT_PATTERN = /^(searching|looking|checking|reading|finding|fetching|let me|i['']ll|i will|i am going to|going to|will (search|check|look|read|find|fetch)|now (searching|checking|reading))/i;
const PLACEHOLDER_PATTERN = /\[\s*(I will|will be|to be|once generated|actual.*link|link here|pending|tbd|insert|placeholder|meet link|google meet link|conference link|calendar link|meeting link)\s*[^\]]*?\]/i;

function isIntentText(text: string): boolean {
  return text.trim().length > 0 && text.trim().length < 500 && INTENT_PATTERN.test(text.trim());
}

function hasPlaceholders(text: string): boolean {
  return PLACEHOLDER_PATTERN.test(text);
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
  } = opts;

  const availableTools = isPlanMode ? [] : getAvailableTools(connectedIntegrations);
  const runId = crypto.randomUUID();
  const startedAt = Date.now();
  const inboxTask = isInboxTask(userMessage);

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
                    'You are a task planner. Given the user\'s request, output a JSON array of 3-5 short action items ' +
                    '(max 10 words each) describing what you will do step-by-step. ' +
                    'Output ONLY the raw JSON array with no extra text, no markdown fences. ' +
                    'Example: ["Search inbox for recent emails","Read top 3 matching threads","Draft a reply matching user tone"]',
                },
                { role: 'user', content: userMessage },
              ],
              [],
              { maxTokens: 200 },
            );
            const raw = getText(tlRes.content).trim();
            const match = raw.match(/\[[\s\S]*\]/);
            if (match) {
              const tasks: string[] = JSON.parse(match[0]);
              if (Array.isArray(tasks) && tasks.length >= 2) {
                const clean = tasks.slice(0, 6).map(t => String(t).trim()).filter(Boolean);
                taskCount = clean.length;
                emit('task_list', { tasks: clean });
              }
            }
          } catch { /* task list is optional */ }
        }

        emit('thinking', { status: 'Thinking…' });

        // ── Main agentic loop ───────────────────────────────────────────────
        while (true) {
          const response = await callLLM(messages, availableTools);
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

            for (const tc of toolCalls) {
              if (tc.name === 'ask_user') continue; // skip — handled above
              if (totalToolCalls >= MAX_TOOL_CALLS) {
                emit('thinking', { status: 'Reached tool call limit. Summarising…' });
                break;
              }

              totalToolCalls++;
              log('info', `tool_call #${totalToolCalls}`, { tool: tc.name, iteration, input: JSON.stringify(tc.input).slice(0, 200) });
              emit('tool_call', { tool: tc.name, params: tc.input, iteration });

              try {
                let result = await executeTool(tc.name, tc.input, userId);

                // ── Layer 2: Inbox pipeline ─────────────────────────────────
                if (tc.name === 'search_gmail' && inboxTask) {
                  const { annotated, archiveCount } = processGmailResults(result.output);
                  archivedCount += archiveCount;
                  result = { ...result, output: annotated };
                }

                if (result.canvasData) {
                  canvasContent = result.canvasData;
                  emit('canvas', result.canvasData);
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

              } catch (err: any) {
                const errorMsg = err?.message ?? 'Unknown error';
                log('error', `tool_result fail`, { tool: tc.name, error: errorMsg, stack: err?.stack?.slice(0, 300) });
                emit('tool_result', { tool: tc.name, success: false, summary: errorMsg, iteration });
                outcomes.push({ tool: tc.name, ok: false, error: errorMsg });
                toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: `Error: ${errorMsg}` });
              }
            }

            if (toolResults.length) {
              messages.push({ role: 'user', content: toolResults as any });
            }

            iteration++;

            if (totalToolCalls >= MAX_TOOL_CALLS) {
              emit('thinking', { status: 'Preparing final response…' });
              const finalResponse = await callLLM(
                [...messages, { role: 'user', content: 'Please provide your final response now based on everything you have found.' }],
                [],
              );
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
            emit('thinking', { status: 'Working on it…' });
            messages.push({
              role: 'user',
              content: 'Please call the appropriate tools now to complete this task. Do not describe what you will do — use the tools directly.',
            });
            continue;
          }

          // ── Case 2b: Unfilled placeholders — nudge ────────────────────────
          if (nudgeCount < MAX_NUDGES && hasPlaceholders(textContent)) {
            nudgeCount++;
            emit('thinking', { status: 'Completing task…' });
            messages.push({
              role: 'user',
              content: 'Your response contains placeholder text like "[I will provide X]" or "[link here]". This is not acceptable. Call the required tool now and provide the actual result. Do not use any placeholder brackets.',
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
          finalText = textContent;
          break;
        }

        if (!finalText) {
          finalText = isPlanMode
            ? 'I was unable to generate a plan. Please try again with a more specific request.'
            : 'I\'ve completed the requested actions. Let me know if you need any changes.';
        }

        // ── Layer 2 end: append archive count ──────────────────────────────
        if (archivedCount > 0) {
          finalText = finalText.trimEnd() + `\n\nArchived ${archivedCount} newsletter${archivedCount !== 1 ? 's' : ''} and promotional email${archivedCount !== 1 ? 's' : ''}.`;
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
