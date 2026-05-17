/**
 * Arcus V3 — Conversational Chat Endpoint
 * POST /api/arcus/v3/chat
 *
 * Accepts a user message, builds full context (Gmail, GCal, Slack, Notion),
 * calls the LLM with the conversational prompt, and streams SSE events back.
 *
 * SSE event format matches what useArcusAgentStream expects:
 *   event: run_start   data: { runId, message }
 *   event: thinking    data: { status }
 *   event: tool_call   data: { tool, params }
 *   event: tool_result data: { tool, success, summary }
 *   event: message     data: { content, canvasContent? }
 *   event: done        data: { runId, durationMs }
 *   event: error       data: { message }
 */

import { NextRequest } from 'next/server';
import { auth } from '../../../../../lib/auth.js';
import { buildContext } from '../../../../../lib/arcus-v3/context-builder';
import { buildConversationalPrompt } from '../../../../../lib/arcus-v3/prompts/conversational';
import { isAllowedAction } from '../../../../../lib/arcus-v3/whitelist';
import { executeStep } from '../../../../../lib/arcus-v3/dispatcher';
import { auditLogger } from '../../../../../lib/audit-logger.js';
import crypto from 'crypto';
import { z } from 'zod';

export const maxDuration = 60;

// ── Output schema ──────────────────────────────────────────────────────────────

const ActionSchema = z.object({
  app: z.enum(['gcal', 'slack', 'notion', 'calcom', 'gmail']),
  action: z.string(),
  params: z.record(z.string(), z.unknown()),
  humanReadable: z.string(),
  requiresApproval: z.boolean().default(false),
});

const ConversationalOutputSchema = z.object({
  reply: z.string(),
  actions: z.array(ActionSchema).default([]),
  canvasContent: z
    .object({
      title: z.string(),
      type: z.enum(['document', 'report', 'sequence', 'summary']),
      markdown: z.string(),
    })
    .nullable()
    .default(null),
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function sseEvent(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function callLLM(system: string, user: string): Promise<string> {
  const keys = [
    process.env.OPENROUTER_API_KEY,
    process.env.OPENROUTER_API_KEY2,
    process.env.OPENROUTER_API_KEY3,
  ].filter(Boolean);

  if (!keys.length) throw new Error('No OpenRouter API keys configured');

  for (const key of keys) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': 'https://mailient.xyz',
          'X-Title': 'Arcus V3',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) continue;
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } catch {
      continue;
    }
  }

  throw new Error('All OpenRouter API keys exhausted');
}

// ── Main handler ───────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const userId = session.user.email.toLowerCase();

  let body: { message?: string; history?: Array<{ role: string; content: string }> } = {};
  try { body = await request.json(); } catch { /* empty body */ }

  const { message, history = [] } = body;
  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: 'message is required' }), { status: 400 });
  }

  const runId = crypto.randomUUID();
  const startedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (type: string, data: unknown) =>
        controller.enqueue(new TextEncoder().encode(sseEvent(type, data)));

      try {
        emit('run_start', { runId, message });

        // 1. Build context (Gmail + GCal + Slack + Notion)
        emit('thinking', { status: 'Reading your inbox and calendar…' });
        const context = await buildContext(userId, 'agentic');
        context.userMessage = message;
        context.conversationHistory = history
          .filter(h => h.role === 'user' || h.role === 'assistant')
          .slice(-10) as Array<{ role: 'user' | 'assistant'; content: string }>;

        // 2. Build prompt + call LLM
        emit('thinking', { status: 'Reasoning…' });
        const prompt = buildConversationalPrompt(context);
        const raw = await callLLM(prompt.system, prompt.user);

        // 3. Parse output
        let parsed: unknown;
        try { parsed = JSON.parse(raw); }
        catch { parsed = { reply: raw, actions: [], canvasContent: null }; }

        const result = ConversationalOutputSchema.safeParse(parsed);
        const output = result.success
          ? result.data
          : { reply: raw || 'Something went wrong. Please try again.', actions: [], canvasContent: null };

        // 4. Execute auto-approved actions (requiresApproval === false)
        const autoActions = output.actions.filter(a => !a.requiresApproval && isAllowedAction(a.app, a.action));
        const pendingActions = output.actions.filter(a => a.requiresApproval || !isAllowedAction(a.app, a.action));

        for (const action of autoActions) {
          emit('tool_call', { tool: `${action.app}.${action.action}`, params: action.params });
          try {
            await executeStep(
              { app: action.app, action: action.action, params: action.params },
              userId
            );
            emit('tool_result', { tool: `${action.app}.${action.action}`, success: true, summary: action.humanReadable });
            await auditLogger.log(userId, `arcus.chat.${action.app}.${action.action}`, { params: action.params });
          } catch (err) {
            emit('tool_result', { tool: `${action.app}.${action.action}`, success: false, summary: (err as Error).message });
          }
        }

        // Emit pending actions needing approval
        for (const action of pendingActions) {
          if (isAllowedAction(action.app, action.action)) {
            emit('approval_required', {
              tool: `${action.app}.${action.action}`,
              params: action.params,
              description: action.humanReadable,
            });
          }
        }

        // 5. Emit the final reply
        emit('message', {
          content: output.reply,
          canvasContent: output.canvasContent,
          pendingActions: pendingActions.filter(a => isAllowedAction(a.app, a.action)),
        });

        emit('done', { runId, durationMs: Date.now() - startedAt });

      } catch (err) {
        emit('error', { message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
