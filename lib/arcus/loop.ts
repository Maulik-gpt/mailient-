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
import { callLLM, getText, getToolCalls, sanitizeModelText } from './engine';
import { executeTool, getAvailableTools, TOOL_SCHEMAS } from './tools';
import { processGmailResults, isInboxTask, isVagueInstruction } from './inbox-pipeline';
import type { LLMMessage } from './engine';

const ASK_USER_SCHEMA = TOOL_SCHEMAS.find(s => s.name === 'ask_user')!;

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
          const textContent = sanitizeModelText(getText(response.content));

          // ── Case 1: Tool calls ────────────────────────────────────────────
          if (toolCalls.length > 0) {
            if (textContent && textContent.length >= 20 && textContent.length <= 2000 && !isIntentText(textContent)) {
              emit('narrative', { text: textContent, iteration });
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

                emit('tool_result', {
                  tool: tc.name,
                  success: true,
                  summary: result.output.slice(0, 300),
                  iteration,
                });

                // ── Layer 3: Track outcome ──────────────────────────────────
                outcomes.push({ tool: tc.name, ok: true });
                toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: result.output });

              } catch (err: any) {
                const errorMsg = err?.message ?? 'Unknown error';
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

          // ── Case 2c: Real final answer ────────────────────────────────────
          finalText = textContent;
          break;
        }

        if (!finalText) {
          finalText = isPlanMode
            ? 'I was unable to generate a plan. Please try again with a more specific request.'
            : 'Done. Let me know if you need anything else.';
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
        console.error('[Arcus Loop] Error:', err.message);
        emit('error', { message: err.message || 'Something went wrong. Please try again.' });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });
}
