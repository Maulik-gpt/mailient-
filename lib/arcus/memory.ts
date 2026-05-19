/**
 * Arcus Memory — Supermemory v3 client.
 *
 * Stores and retrieves structured memories: relationship context,
 * user preferences, behavioral patterns, and conversation history.
 *
 * Memory types stored:
 *   [RELATIONSHIP] — client status, relationship weight, contact context
 *   [PREFERENCE]   — how the user likes things done
 *   [CONTEXT]      — general conversation history
 *
 * Never throws — memory failure must never break the conversation.
 */

const BASE = 'https://api.supermemory.ai/v3';

function getKey(): string | null {
  return process.env.SUPERMEMORY_API_KEY || process.env.DATAFAST_API_KEY || null;
}

// ── Core API ───────────────────────────────────────────────────────────────────

/**
 * Store a single memory entry.
 */
export async function saveMemory(userId: string, content: string, tags?: string[]): Promise<void> {
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
        metadata: { userId, tags: tags ?? [] },
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Silent — never break the conversation
  }
}

/**
 * Search memories relevant to the current user message.
 * Returns a formatted context string to inject into the system prompt.
 */
export async function searchMemories(userId: string, query: string, limit = 6): Promise<string> {
  const key = getKey();
  if (!key) return '';

  try {
    // Try POST search first (some Supermemory versions), fall back to GET
    let results: any[] = [];

    const postRes = await fetch(`${BASE}/memories/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, limit, filters: { userId } }),
      signal: AbortSignal.timeout(5000),
    });

    if (postRes.ok) {
      const data = await postRes.json();
      results = data.results ?? data.memories ?? data.data ?? [];
    } else {
      // Fall back to GET with query params
      const params = new URLSearchParams({ q: query, limit: String(limit), userId });
      const getRes = await fetch(`${BASE}/search?${params}`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(5000),
      });
      if (getRes.ok) {
        const data = await getRes.json();
        results = data.results ?? data.memories ?? data.data ?? [];
      }
    }

    if (!results.length) return '';

    // Separate by type for structured injection
    const relationships: string[] = [];
    const preferences: string[] = [];
    const context: string[] = [];

    for (const r of results.slice(0, limit)) {
      const text: string = (r.content ?? r.text ?? r.memory ?? '').slice(0, 350);
      if (!text) continue;

      if (text.startsWith('[RELATIONSHIP]')) relationships.push(text.replace('[RELATIONSHIP]', '').trim());
      else if (text.startsWith('[PREFERENCE]')) preferences.push(text.replace('[PREFERENCE]', '').trim());
      else context.push(text);
    }

    const sections: string[] = [];
    if (relationships.length) {
      sections.push(`**Relationship context (apply to prioritization and tone):**\n${relationships.map(r => `• ${r}`).join('\n')}`);
    }
    if (preferences.length) {
      sections.push(`**User preferences (apply without being told):**\n${preferences.map(p => `• ${p}`).join('\n')}`);
    }
    if (context.length) {
      sections.push(`**Past context:**\n${context.map(c => `• ${c}`).join('\n')}`);
    }

    return sections.length ? `\n\n## Memory context\n${sections.join('\n\n')}` : '';
  } catch {
    return '';
  }
}

// ── Insight extraction ─────────────────────────────────────────────────────────

// Patterns that signal relationship importance
const CLIENT_PATTERNS = [
  /\b(?:(\w[\w\s]{1,30}?)\s+is\s+(?:our\s+)?(?:biggest|top|main|key|major|important|priority|vip|most\s+important)\s+(?:client|customer|account|partner|contact))/i,
  /\b(?:biggest|top|main|key|major|vip|most\s+important)\s+(?:client|customer|account|partner)(?:[,\s]+(?:is\s+)?(\w[\w\s]{1,30}?))?/i,
  /\b(\w[\w\s]{1,30}?)\s+(?:is|are)\s+(?:a\s+)?(?:high[- ]value|strategic|enterprise|key)\s+(?:client|account|partner|customer)/i,
  /\b(invest(?:or)?|board\s+member|advisor|co[\s-]?founder|ceo|cto|vp)\s+(?:named?\s+)?(\w[\w\s]{1,20}?)\b/i,
];

// Patterns that signal user preferences
const PREFERENCE_PATTERNS = [
  { re: /\bI\s+prefer\s+(.{5,80}?)(?:\.|,|$)/i, label: (m: RegExpMatchArray) => m[1].trim() },
  { re: /\balways\s+(cc|bcc|include|add)\s+(.{3,50}?)(?:\.|,|$)/i, label: (m: RegExpMatchArray) => `Always ${m[1]} ${m[2]}`.trim() },
  { re: /\bnever\s+schedule\s+(.{5,60}?)(?:\.|,|$)/i, label: (m: RegExpMatchArray) => `Never schedule ${m[1]}`.trim() },
  { re: /\bdon'?t\s+(?:send|schedule|use|add)\s+(.{5,60}?)(?:\.|,|$)/i, label: (m: RegExpMatchArray) => `Don't ${m[1]}`.trim() },
  { re: /\bremember\s+(?:that\s+)?(?:I\s+)?(?:prefer|like|want|need)\s+(.{5,80}?)(?:\.|,|$)/i, label: (m: RegExpMatchArray) => m[1].trim() },
  { re: /\bI\s+(?:like|want|need)\s+(.{5,60}?)\s+(?:in\s+my\s+emails?|when\s+(?:replying|writing|drafting))/i, label: (m: RegExpMatchArray) => `Prefer: ${m[1]}`.trim() },
];

/**
 * Extracts high-signal insights from a conversation turn and saves them as
 * structured memories. Called fire-and-forget after each exchange.
 */
export async function extractAndSaveInsights(
  userId: string,
  userMessage: string,
  assistantReply: string,
): Promise<void> {
  const combined = `${userMessage} ${assistantReply}`;
  const saves: Promise<void>[] = [];

  // ── Relationship memories ──────────────────────────────────────────────────
  for (const pattern of CLIENT_PATTERNS) {
    const match = combined.match(pattern);
    if (match) {
      // Extract the name: try capture group 1 or 2
      const name = (match[1] || match[2] || '').trim();
      if (name && name.length > 1 && name.length < 40) {
        saves.push(saveMemory(
          userId,
          `[RELATIONSHIP] ${name} is a high-value client/contact — treat their emails as urgent and prioritize their threads.`,
          ['relationship', 'client'],
        ));
      }
      break; // one relationship memory per turn is enough
    }
  }

  // ── Preference memories ────────────────────────────────────────────────────
  for (const { re, label } of PREFERENCE_PATTERNS) {
    const match = userMessage.match(re); // only from user, not assistant
    if (match) {
      const pref = label(match);
      if (pref && pref.length > 4 && pref.length < 120) {
        saves.push(saveMemory(
          userId,
          `[PREFERENCE] ${pref}`,
          ['preference'],
        ));
      }
    }
  }

  // ── General context ────────────────────────────────────────────────────────
  // Save a compressed summary of the exchange (trimmed to stay useful)
  if (userMessage.trim().length > 10 && assistantReply.trim().length > 10) {
    const summary = `[CONTEXT] User asked: "${userMessage.slice(0, 200).trim()}" — Arcus replied: "${assistantReply.slice(0, 200).trim()}"`;
    saves.push(saveMemory(userId, summary, ['context']));
  }

  await Promise.allSettled(saves);
}

/**
 * Lightweight backwards-compat wrapper. Saves a raw conversation turn as context.
 */
export async function saveConversationTurn(
  userId: string,
  userMessage: string,
  assistantReply: string,
): Promise<void> {
  await extractAndSaveInsights(userId, userMessage, assistantReply);
}
