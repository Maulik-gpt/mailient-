/**
 * Arcus Chat — Main agentic chat endpoint.
 * POST /api/arcus/chat
 *
 * Rebuilds the chat system from scratch:
 * - Tool_use via OpenRouter free models (openrouter/free)
 * - Supermemory v3 for cross-session memory
 * - Full conversation history on every call
 * - Real tool execution (Gmail, Calendar, Notion, Canvas, Web, Slack)
 * - SSE streaming matching ChatInterface.tsx event format
 */

import { NextRequest } from 'next/server';
import { auth } from '../../../../lib/auth.js';
import { runAgentLoop } from '../../../../lib/arcus/loop';
import { buildSystemPrompt, getConnectedIntegrations } from '../../../../lib/arcus/system-prompt';
import { searchMemories, saveConversationTurn } from '../../../../lib/arcus/memory';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Auth
  const session = await auth();
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const userId = session.user.email.toLowerCase();
  const userName = session.user.name?.split(' ')[0] || 'there';

  // Parse body
  let body: {
    message?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    conversationId?: string;
  } = {};
  try { body = await request.json(); } catch { /* empty */ }

  const { message, history = [], conversationId } = body;
  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: 'message is required' }), { status: 400 });
  }

  // Build context (run in parallel for speed)
  const [connectedIntegrations, memories] = await Promise.all([
    getConnectedIntegrations(userId),
    searchMemories(userId, message, 5),
  ]);

  const systemPrompt = buildSystemPrompt({
    userName,
    userId,
    connectedIntegrations,
    memories,
  });

  // Sanitize history (last 20 turns)
  const sanitizedHistory = history
    .slice(-20)
    .filter(h => h.role && h.content?.trim())
    .map(h => ({ role: h.role as 'user' | 'assistant', content: h.content }));

  // Start agentic loop
  const stream = runAgentLoop({
    userId,
    systemPrompt,
    history: sanitizedHistory,
    userMessage: message,
  });

  // After streaming, save to memory async (don't await — don't block the response)
  // We capture the final text from the stream in a background task
  saveMemoryAsync(userId, message, conversationId);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Conversation-Id': conversationId || '',
    },
  });
}

/** Save memory async after response completes — doesn't block streaming */
async function saveMemoryAsync(userId: string, userMessage: string, _conversationId?: string) {
  try {
    // We save just the user message intent now; the full turn is saved in ChatInterface after done
    await saveConversationTurn(userId, userMessage, '');
  } catch {
    // Silent
  }
}
