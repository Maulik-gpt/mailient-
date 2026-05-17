/**
 * Arcus V3 — Agentic Chat Endpoint
 * POST /api/arcus/v3/chat
 *
 * Real agentic loop using Claude tool_use via OpenRouter.
 * Streams SSE events matching useArcusAgentStream's expected format.
 *
 * Event types:
 *   run_start        → { runId, message }
 *   thinking         → { status }
 *   tool_call        → { tool, params, iteration }
 *   tool_result      → { tool, success, summary, iteration }
 *   message          → { content, canvasContent? }
 *   error            → { message }
 *   done             → { runId, durationMs, totalSteps }
 */

import { NextRequest } from 'next/server';
import { auth } from '../../../../../lib/auth.js';
import { getSupabaseAdmin } from '../../../../../lib/supabase.js';
import { decrypt } from '../../../../../lib/crypto.js';
import { ARCUS_TOOLS } from '../../../../../lib/arcus-v3/tools/definitions';
import { executeTool } from '../../../../../lib/arcus-v3/tools/executor';
import { storeMessage, getConversationHistory } from '../../../../../lib/arcus-v3/memory';
import crypto from 'crypto';

export const maxDuration = 60;

const MAX_ITERATIONS = 6;

// ── SSE helpers ────────────────────────────────────────────────────────────────

function sseEvent(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ── OpenRouter call ────────────────────────────────────────────────────────────

async function callLLM(
  messages: Array<{ role: string; content: any }>,
  tools: any[]
): Promise<any> {
  const keys = [
    process.env.OPENROUTER_API_KEY,
    process.env.OPENROUTER_API_KEY2,
    process.env.OPENROUTER_API_KEY3,
  ].filter(Boolean);

  for (const key of keys) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': 'https://mailient.xyz',
          'X-Title': 'Arcus AI',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages,
          tools,
          max_tokens: 4000,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(35000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(`[Arcus] OpenRouter ${res.status}:`, body.slice(0, 200));
        continue;
      }

      const data = await res.json();
      return data.choices?.[0]?.message || null;
    } catch (err) {
      console.error('[Arcus] LLM call error:', (err as Error).message);
      continue;
    }
  }

  throw new Error('All API keys exhausted or timed out.');
}

// ── User context helper ────────────────────────────────────────────────────────

async function getUserIntegrations(userId: string): Promise<string> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('arcus_integrations')
      .select('provider')
      .eq('user_id', userId);
    const connected = (data || []).map((r: any) => r.provider);
    return connected.length
      ? `Connected integrations: ${connected.join(', ')}.`
      : 'No integrations connected yet.';
  } catch {
    return '';
  }
}

async function getRecentEmailSummary(userId: string): Promise<string> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('arcus_integrations')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', 'gmail')
      .maybeSingle();
    if (!data?.access_token) return '';
    const token = decrypt(data.access_token);

    const res = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&labelIds=INBOX&q=is:unread',
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return '';
    const listData = await res.json();
    const count = listData.resultSizeEstimate || 0;
    return `You have approximately ${count} unread emails in your inbox.`;
  } catch {
    return '';
  }
}

// ── Content helpers ────────────────────────────────────────────────────────────

function extractTextFromContent(content: any): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text || '')
      .join('\n');
  }
  return '';
}

function hasToolUse(content: any): boolean {
  if (!Array.isArray(content)) return false;
  return content.some((b: any) => b.type === 'tool_use');
}

function getToolUseBlocks(content: any): any[] {
  if (!Array.isArray(content)) return [];
  return content.filter((b: any) => b.type === 'tool_use');
}

// ── System prompt ──────────────────────────────────────────────────────────────

function buildSystemPrompt(integrationInfo: string, emailSummary: string, userName: string): string {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return `You are Arcus, an intelligent AI assistant built into Mailient — an email and productivity app.

Today is ${today}. The user's name is ${userName || 'there'}.

${integrationInfo}
${emailSummary}

Your job is to help users manage their inbox, draft replies, schedule meetings, update notes, and stay on top of their work. You have access to real tools — use them proactively when the user asks about emails, meetings, or notes.

Guidelines:
- When the user asks about emails, ALWAYS use search_gmail or read_email first. Don't guess.
- When asked to draft or write a reply, use draft_reply to save it to Gmail. Then open_canvas to show the draft.
- For long content (reports, summaries, email drafts), always use open_canvas.
- Be concise in chat. Let the canvas hold the detailed content.
- If an integration isn't connected, tell the user how to connect it (Settings → Integrations).
- Never fabricate email content. Only report what you actually find with tools.
- Chain tools naturally: search → read → draft → canvas.`;
}

// ── Main handler ───────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const userId = session.user.email.toLowerCase();
  const userName = session.user.name?.split(' ')[0] || '';

  let body: {
    message?: string;
    history?: Array<{ role: string; content: string }>;
    conversationId?: string;
  } = {};
  try {
    body = await request.json();
  } catch { /* empty body */ }

  const { message, history = [], conversationId } = body;
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

        // ── 1. Load context ──────────────────────────────────────────────────
        emit('thinking', { status: 'Loading your workspace context…' });

        const [integrationInfo, emailSummary, dbHistory] = await Promise.all([
          getUserIntegrations(userId),
          getRecentEmailSummary(userId),
          conversationId
            ? getConversationHistory(userId, conversationId, 20)
            : Promise.resolve([]),
        ]);

        // Merge: DB history (cross-session) + client history (in-session), deduplicate by position
        // Client history takes precedence since it's the most recent state
        const baseHistory: Array<{ role: 'user' | 'assistant'; content: string }> =
          history.length > 0
            ? (history as Array<{ role: 'user' | 'assistant'; content: string }>).slice(-20)
            : dbHistory.slice(-20);

        // ── 2. Build messages for LLM ────────────────────────────────────────
        const systemPrompt = buildSystemPrompt(integrationInfo, emailSummary, userName);

        const llmMessages: Array<{ role: string; content: any }> = [
          ...baseHistory.map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: message },
        ];

        // ── 3. Agentic loop ──────────────────────────────────────────────────
        emit('thinking', { status: 'Reasoning about your request…' });

        let iteration = 0;
        let finalText = '';
        let canvasContent: { title: string; type: string; markdown: string; meta?: Record<string, any> } | null = null;
        let totalSteps = 0;

        // Prepend system as first user message since OpenRouter needs system role
        const messagesWithSystem = [
          { role: 'system', content: systemPrompt },
          ...llmMessages,
        ];

        while (iteration < MAX_ITERATIONS) {
          const assistantMsg = await callLLM(messagesWithSystem, ARCUS_TOOLS);
          if (!assistantMsg) throw new Error('LLM returned empty response.');

          // Add assistant's response to message history for next iteration
          messagesWithSystem.push({
            role: 'assistant',
            content: assistantMsg.content,
          });

          const toolBlocks = getToolUseBlocks(assistantMsg.content);
          const textContent = extractTextFromContent(assistantMsg.content);

          if (!hasToolUse(assistantMsg.content)) {
            // No more tool calls — this is the final text response
            finalText = textContent;
            break;
          }

          // Execute each tool call
          const toolResults: Array<{ type: string; tool_use_id: string; content: string }> = [];

          for (const toolBlock of toolBlocks) {
            totalSteps++;
            const toolName = toolBlock.name;
            const toolInput = toolBlock.input || {};

            emit('tool_call', {
              tool: toolName,
              params: toolInput,
              iteration,
            });

            try {
              const result = await executeTool(toolName, toolInput, userId);

              // Capture canvas data if tool returned it
              if (result.canvasData) {
                canvasContent = result.canvasData;
              }

              emit('tool_result', {
                tool: toolName,
                success: true,
                summary: result.output.slice(0, 200),
                iteration,
              });

              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolBlock.id,
                content: result.output,
              });
            } catch (err) {
              const errMsg = (err as Error).message;
              emit('tool_result', {
                tool: toolName,
                success: false,
                summary: errMsg,
                iteration,
              });
              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolBlock.id,
                content: `Error: ${errMsg}`,
              });
            }
          }

          // Feed tool results back as user message (Anthropic format)
          messagesWithSystem.push({
            role: 'user',
            content: toolResults,
          });

          iteration++;
        }

        if (!finalText) {
          finalText = 'I completed the requested actions. Let me know if you need anything else.';
        }

        // ── 4. Persist to memory ─────────────────────────────────────────────
        if (conversationId) {
          await Promise.all([
            storeMessage(userId, conversationId, 'user', message),
            storeMessage(userId, conversationId, 'assistant', finalText),
          ]).catch(() => {});
        }

        // ── 5. Emit final message ─────────────────────────────────────────────
        emit('message', {
          content: finalText,
          canvasContent: canvasContent || undefined,
          iteration,
        });

        emit('done', {
          runId,
          durationMs: Date.now() - startedAt,
          totalSteps,
        });
      } catch (err) {
        console.error('[Arcus V3 Chat] Error:', (err as Error).message);
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
