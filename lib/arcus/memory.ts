/**
 * Arcus Memory — Supermemory v3 client.
 *
 * Base URL: https://api.supermemory.ai/v3
 * Key: SUPERMEMORY_API_KEY (falls back to DATAFAST_API_KEY)
 *
 * Never throws — memory failure must never break the conversation.
 */

const BASE = 'https://api.supermemory.ai/v3';

function getKey(): string | null {
  return process.env.SUPERMEMORY_API_KEY || process.env.DATAFAST_API_KEY || null;
}

/**
 * Search memories relevant to the current user message.
 * Returns formatted context string to inject into the system prompt.
 */
export async function searchMemories(userId: string, query: string, limit = 5): Promise<string> {
  const key = getKey();
  if (!key) return '';

  try {
    const res = await fetch(`${BASE}/memories/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        limit,
        filters: { userId },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return '';
    const data = await res.json();
    const results: any[] = data.results || data.memories || data.data || [];
    if (!results.length) return '';

    const lines = results
      .slice(0, limit)
      .map((r: any) => r.content || r.text || r.memory || '')
      .filter(Boolean)
      .map((s: string) => `• ${s.slice(0, 300)}`);

    return lines.length ? `\n\n## Relevant memories\n${lines.join('\n')}` : '';
  } catch {
    return '';
  }
}

/**
 * Store a memory. Fire-and-forget — failure is silent.
 */
export async function saveMemory(userId: string, content: string): Promise<void> {
  const key = getKey();
  if (!key || !content?.trim()) return;

  try {
    await fetch(`${BASE}/memories`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content.slice(0, 2000),
        metadata: { userId },
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Silent
  }
}

/**
 * Store a conversation turn (both sides). Called after every exchange.
 */
export async function saveConversationTurn(
  userId: string,
  userMessage: string,
  assistantReply: string
): Promise<void> {
  const content = `User: ${userMessage.slice(0, 500)}\nArcus: ${assistantReply.slice(0, 500)}`;
  await saveMemory(userId, content);
}
