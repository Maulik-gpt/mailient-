/**
 * Arcus Agentic Loop
 *
 * Pure SSE streaming agentic loop. Calls Claude with tools.
 * Keeps looping until Claude produces text with no tool calls.
 * Claude decides when it's done — no hard iteration limit on reasoning.
 * Soft cap of 20 tool calls to prevent runaway loops.
 *
 * SSE event types (matching what ChatInterface.tsx handles):
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
}

/**
 * Run the agentic loop. Returns a ReadableStream of SSE events.
 */
export function runAgentLoop(opts: LoopOptions): ReadableStream {
  const { userId, systemPrompt, history, userMessage, connectedIntegrations = [] } = opts;
  const availableTools = getAvailableTools(connectedIntegrations);
  const runId = crypto.randomUUID();
  const startedAt = Date.now();

  return new ReadableStream({
    async start(controller) {
      const emit = (type: string, data: unknown) => {
        try { controller.enqueue(encode(sseEvent(type, data))); } catch { /* stream closed */ }
      };

      try {
        emit('run_start', { runId, message: userMessage });

        // Build message array
        const messages: LLMMessage[] = [
          { role: 'system', content: systemPrompt },
          ...history.map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: userMessage },
        ];

        let totalToolCalls = 0;
        let finalText = '';
        let canvasContent: any = null;
        let iteration = 0;

        emit('thinking', { status: 'Reasoning about your request…' });

        while (true) {
          const response = await callLLM(messages, availableTools);

          // Add assistant message to history
          messages.push({ role: 'assistant', content: response.content });

          const toolCalls = getToolCalls(response.content);
          const textContent = sanitizeModelText(getText(response.content));

          if (!toolCalls.length || response.stop_reason === 'end_turn') {
            // Done — this is the final response
            finalText = textContent;
            break;
          }

          // Execute each tool
          const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];

          for (const tc of toolCalls) {
            if (totalToolCalls >= MAX_TOOL_CALLS) {
              emit('thinking', { status: 'Reached tool call limit. Synthesizing results…' });
              break;
            }

            totalToolCalls++;
            emit('tool_call', { tool: tc.name, params: tc.input, iteration });

            try {
              const result = await executeTool(tc.name, tc.input, userId);

              // If this tool produced canvas data, capture it and emit canvas event
              if (result.canvasData) {
                canvasContent = result.canvasData;
                emit('canvas', result.canvasData);
              }

              emit('tool_result', {
                tool: tc.name,
                success: true,
                summary: result.output.slice(0, 250),
                iteration,
              });

              toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: result.output });
            } catch (err: any) {
              emit('tool_result', {
                tool: tc.name,
                success: false,
                summary: err.message,
                iteration,
              });
              toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: `Error: ${err.message}` });
            }
          }

          if (toolResults.length) {
            messages.push({ role: 'user', content: toolResults as any });
          }

          iteration++;

          if (totalToolCalls >= MAX_TOOL_CALLS) {
            // Force a final response after hitting the cap
            emit('thinking', { status: 'Preparing final response…' });
            const finalResponse = await callLLM(
              [...messages, { role: 'user', content: 'Please provide your final response now based on everything you\'ve done.' }],
              [] // No tools — force text response
            );
            finalText = sanitizeModelText(getText(finalResponse.content));
            break;
          }
        }

        if (!finalText) {
          finalText = 'I completed the requested actions. Let me know if you need anything else.';
        }

        emit('message', {
          content: finalText,
          canvasContent: canvasContent || undefined,
        });

        emit('done', {
          runId,
          durationMs: Date.now() - startedAt,
          totalSteps: totalToolCalls,
        });

      } catch (err: any) {
        console.error('[Arcus Loop] Error:', err.message);
        emit('error', { message: err.message || 'Something went wrong. Please try again.' });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });
}
