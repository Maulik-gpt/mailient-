/**
 * Arcus Engine — OpenRouter caller with Claude-compatible tool_use.
 *
 * Rotates across three API keys. If all fail, throws with a clear message.
 * Uses only free OpenRouter models.
 */

const MODELS = [
  'openrouter/free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
];

function getKeys(): string[] {
  return [
    process.env.OPENROUTER_API_KEY,
    process.env.OPENROUTER_API_KEY2,
    process.env.OPENROUTER_API_KEY3,
  ].filter(Boolean) as string[];
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentBlock[];
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, any> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

export interface ToolSchema {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface LLMResponse {
  role: 'assistant';
  content: ContentBlock[];
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | string;
}

/**
 * Call the LLM. Rotates keys × models until one succeeds.
 */
export async function callLLM(
  messages: LLMMessage[],
  tools: ToolSchema[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<LLMResponse> {
  const keys = getKeys();
  if (!keys.length) throw new Error('No OpenRouter API keys configured.');

  const body = {
    messages,
    tools,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.3,
  };

  for (const key of keys) {
    for (const model of MODELS) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://mailient.xyz',
            'X-Title': 'Arcus AI',
          },
          body: JSON.stringify({ ...body, model }),
          signal: AbortSignal.timeout(45000),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          if (res.status === 429 || res.status === 402) continue; // rate limit / quota → try next key
          console.error(`[Arcus Engine] ${model} ${res.status}:`, text.slice(0, 200));
          continue;
        }

        const data = await res.json();
        const choice = data.choices?.[0];
        if (!choice) continue;

        const content: ContentBlock[] = [];
        const rawContent = choice.message?.content;

        if (typeof rawContent === 'string') {
          content.push({ type: 'text', text: rawContent });
        } else if (Array.isArray(rawContent)) {
          for (const block of rawContent) {
            if (block.type === 'text') content.push({ type: 'text', text: block.text || '' });
            else if (block.type === 'tool_use') {
              content.push({ type: 'tool_use', id: block.id, name: block.name, input: block.input || {} });
            }
          }
        }

        // Also handle OpenAI-style tool_calls format (OpenRouter normalizes, but just in case)
        const toolCalls = choice.message?.tool_calls;
        if (toolCalls?.length && content.filter(b => b.type === 'tool_use').length === 0) {
          for (const tc of toolCalls) {
            let parsedInput: Record<string, any> = {};
            try { parsedInput = JSON.parse(tc.function?.arguments || '{}'); } catch { /* ok */ }
            content.push({
              type: 'tool_use',
              id: tc.id || `call_${Date.now()}`,
              name: tc.function?.name || '',
              input: parsedInput,
            });
          }
        }

        const stop_reason: string = choice.finish_reason === 'tool_calls' ? 'tool_use' : (choice.finish_reason || 'end_turn');

        return { role: 'assistant', content, stop_reason };
      } catch (err: any) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
          console.warn(`[Arcus Engine] ${model} timed out, trying next.`);
          continue;
        }
        console.error(`[Arcus Engine] ${model} error:`, err.message);
        continue;
      }
    }
  }

  throw new Error('All models and API keys exhausted. Please try again.');
}

/** Extract plain text from a content block array */
export function getText(content: ContentBlock[]): string {
  return content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();
}

/** Extract tool_use blocks */
export function getToolCalls(content: ContentBlock[]): Array<{ type: 'tool_use'; id: string; name: string; input: Record<string, any> }> {
  return content.filter((b): b is { type: 'tool_use'; id: string; name: string; input: Record<string, any> } => b.type === 'tool_use');
}
