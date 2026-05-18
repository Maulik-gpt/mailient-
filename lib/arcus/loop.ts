/**
 * Arcus Agentic Loop
 *
 * SSE streaming agentic loop. Calls the LLM, executes tools, loops until done.
 *
 * Key behaviours:
 * - If the model writes "intent text" (describes what it will do) without calling tools,
 *   we inject a nudge and loop again — max 3 nudges to prevent infinite loops.
 * - Only exits when the model produces text with NO tool calls after having done some work,
 *   or when it clearly gives a final answer on first contact.
 * - Soft cap of 20 tool calls. After the cap, forces a final summary.
 *
 * SSE events:
 *   run_start     → { runId, message }
 *   thinking      → { status }
 *   tool_call     → { tool, params, iteration }
 *   tool_result   → { tool, success, summary, iteration }
 *   canvas        → { title, type, markdown, draftMeta? }
 *   message       → { content, canvasContent? }
 *   error         → { message }
 *   done          → { runId, durationMs, totalSteps }
 */

import crypto from 'crypto';
import { callLLM, getText, getToolCalls, sanitizeModelText } from './engine';
import { executeTool, getAvailableTools } from './tools';
import type { LLMMessage } from './engine';

export const MAX_TOOL_CALLS = 20;
const MAX_NUDGES = 3; // max times we re-prompt the model to use tools instead of narrating

// Patterns that indicate the model wrote planning text instead of calling a tool
const INTENT_PATTERN = /^(searching|looking|checking|reading|finding|fetching|let me|i['']ll|i will|i am going to|going to|will (search|check|look|read|find|fetch)|now (searching|checking|reading))/i;

// Placeholders the model inserts when it hasn't actually called a tool yet
const PLACEHOLDER_PATTERN = /\[\s*(I will|will be|to be|once generated|actual.*link|link here|pending|tbd|insert|placeholder|meet link|google meet link|conference link|calendar link|meeting link)\s*[^\]]*?\]/i;

function isIntentText(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && t.length < 500 && INTENT_PATTERN.test(t);
}

function hasPlaceholders(text: string): boolean {
  return PLACEHOLDER_PATTERN.test(text);
}

function sseEvent(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

function encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export interface LoopOptions {
  userId: string;
  systemPrompt: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage: string;
  connectedIntegrations?: string[];
  isPlanMode?: boolean;
}

export function runAgentLoop(opts: LoopOptions): ReadableStream {
  const { userId, systemPrompt, history, userMessage, connectedIntegrations = [], isPlanMode = false } = opts;
  // In plan mode we pass no tools — the AI generates a plan document, not actions
  const availableTools = isPlanMode ? [] : getAvailableTools(connectedIntegrations);
  const runId = crypto.randomUUID();
  const startedAt = Date.now();

  return new ReadableStream({
    async start(controller) {
      const emit = (type: string, data: unknown) => {
        try { controller.enqueue(encode(sseEvent(type, data))); } catch { /* closed */ }
      };

      try {
        emit('run_start', { runId, message: userMessage });

        const messages: LLMMessage[] = [
          { role: 'system', content: systemPrompt },
          ...history.map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: userMessage },
        ];

        let totalToolCalls = 0;
        let nudgeCount = 0;
        let finalText = '';
        let canvasContent: any = null;
        let iteration = 0;

        emit('thinking', { status: 'Thinking…' });

        while (true) {
          const response = await callLLM(messages, availableTools);
          messages.push({ role: 'assistant', content: response.content });

          const toolCalls = getToolCalls(response.content);
          const textContent = sanitizeModelText(getText(response.content));

          // ── Case 1: Model wants to call tools → execute them ──────────────
          if (toolCalls.length > 0) {
            const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];

            for (const tc of toolCalls) {
              if (totalToolCalls >= MAX_TOOL_CALLS) {
                emit('thinking', { status: 'Reached tool call limit. Summarising…' });
                break;
              }

              totalToolCalls++;
              emit('tool_call', { tool: tc.name, params: tc.input, iteration });

              try {
                const result = await executeTool(tc.name, tc.input, userId);

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

                toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: result.output });
              } catch (err: any) {
                emit('tool_result', { tool: tc.name, success: false, summary: err.message, iteration });
                toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: `Error: ${err.message}` });
              }
            }

            if (toolResults.length) {
              messages.push({ role: 'user', content: toolResults as any });
            }

            iteration++;

            // Hit the cap → force a final summary with no tools
            if (totalToolCalls >= MAX_TOOL_CALLS) {
              emit('thinking', { status: 'Preparing final response…' });
              const finalResponse = await callLLM(
                [...messages, { role: 'user', content: 'Please provide your final response now based on everything you have found.' }],
                [],
              );
              finalText = sanitizeModelText(getText(finalResponse.content));
              break;
            }

            // Loop — let the model decide what to do next
            emit('thinking', { status: 'Processing results…' });
            continue;
          }

          // ── Case 2: No tool calls ─────────────────────────────────────────

          // 2a. Model narrated intent instead of acting AND hasn't done any work yet
          //     → nudge it to actually call the tools
          if (totalToolCalls === 0 && nudgeCount < MAX_NUDGES && isIntentText(textContent)) {
            nudgeCount++;
            emit('thinking', { status: 'Working on it…' });
            messages.push({
              role: 'user',
              content: 'Please call the appropriate tools now to complete this task. Do not describe what you will do — use the tools directly.',
            });
            continue;
          }

          // 2b. Model wrote a response with unfilled placeholders (e.g. "[I will provide the link]")
          //     This means it described work it didn't actually do → nudge it to call tools
          if (nudgeCount < MAX_NUDGES && hasPlaceholders(textContent)) {
            nudgeCount++;
            emit('thinking', { status: 'Completing task…' });
            messages.push({
              role: 'user',
              content: 'Your response contains placeholder text like "[I will provide X]" or "[link here]". This is not acceptable. Call the required tool now and provide the actual result. Do not use any placeholder brackets.',
            });
            continue;
          }

          // 2c. Model gave a real final answer → done
          finalText = textContent;
          break;
        }

        if (!finalText) {
          finalText = isPlanMode
            ? 'I was unable to generate a plan. Please try again with a more specific request.'
            : 'Done. Let me know if you need anything else.';
        }

        if (isPlanMode) {
          // Extract title from the first H1 heading in the plan markdown
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
