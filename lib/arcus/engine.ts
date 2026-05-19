/**
 * Arcus Engine — OpenRouter caller using OpenAI-compatible API format.
 *
 * Converts tool schemas and message history to OpenAI format before sending,
 * since free models on OpenRouter use the OpenAI API convention.
 * Rotates across three API keys × three models until one succeeds.
 */

const MODELS = [
  'deepseek/deepseek-chat-v3-0324:free',
  'google/gemini-2.5-flash-preview-05-20:free',
  'meta-llama/llama-4-maverick:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash:free',
  'qwen/qwen3-235b-a22b:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'microsoft/phi-4:free',
  'mistralai/mistral-7b-instruct:free',
  'openrouter/auto',
];

function getKeys(): string[] {
  return [
    process.env.OPENROUTER_API_KEY,
    process.env.OPENROUTER_API_KEY2,
    process.env.OPENROUTER_API_KEY3,
  ].filter(Boolean) as string[];
}

// ── Internal types ─────────────────────────────────────────────────────────────

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

// ── Format converters ──────────────────────────────────────────────────────────

/** Convert Anthropic-style tool schemas → OpenAI function tool format */
function toOpenAITools(tools: ToolSchema[]): any[] {
  return tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

/**
 * Convert internal Anthropic-style message history → OpenAI message format.
 *
 * Anthropic:
 *   assistant: [{ type: 'text', text }, { type: 'tool_use', id, name, input }]
 *   user:      [{ type: 'tool_result', tool_use_id, content }]
 *
 * OpenAI:
 *   assistant: { role: 'assistant', content: text, tool_calls: [...] }
 *   tool:      { role: 'tool', tool_call_id, content }
 */
function toOpenAIMessages(messages: LLMMessage[]): any[] {
  const out: any[] = [];

  for (const msg of messages) {
    // Plain string content (system, user, assistant)
    if (typeof msg.content === 'string') {
      out.push({ role: msg.role, content: msg.content });
      continue;
    }

    const blocks = msg.content as ContentBlock[];

    // Tool results live on a 'user' message in Anthropic format.
    // In OpenAI format each becomes a separate 'tool' message.
    const toolResults = blocks.filter(b => b.type === 'tool_result') as Array<{
      type: 'tool_result'; tool_use_id: string; content: string;
    }>;
    if (toolResults.length > 0) {
      for (const tr of toolResults) {
        out.push({
          role: 'tool',
          tool_call_id: tr.tool_use_id,
          content: typeof tr.content === 'string' ? tr.content : JSON.stringify(tr.content),
        });
      }
      continue;
    }

    // Assistant message — may contain text + tool_use blocks
    if (msg.role === 'assistant') {
      const textBlocks = blocks.filter(b => b.type === 'text') as Array<{ type: 'text'; text: string }>;
      const toolUseBlocks = blocks.filter(b => b.type === 'tool_use') as Array<{
        type: 'tool_use'; id: string; name: string; input: Record<string, any>;
      }>;

      const assistantMsg: any = {
        role: 'assistant',
        content: textBlocks.map(b => b.text).join('\n').trim() || null,
      };
      if (toolUseBlocks.length > 0) {
        assistantMsg.tool_calls = toolUseBlocks.map(b => ({
          id: b.id,
          type: 'function',
          function: { name: b.name, arguments: JSON.stringify(b.input) },
        }));
      }
      out.push(assistantMsg);
      continue;
    }

    // Fallback: plain user message from text blocks
    const text = blocks
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('\n');
    out.push({ role: msg.role, content: text });
  }

  return out;
}

// ── LLM caller ─────────────────────────────────────────────────────────────────

export async function callLLM(
  messages: LLMMessage[],
  tools: ToolSchema[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<LLMResponse> {
  const keys = getKeys();
  if (!keys.length) throw new Error('No OpenRouter API keys configured.');

  const openAIMessages = toOpenAIMessages(messages);
  const openAITools = tools.length ? toOpenAITools(tools) : undefined;

  const baseBody: Record<string, any> = {
    messages: openAIMessages,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.3,
  };
  if (openAITools) {
    baseBody.tools = openAITools;
    baseBody.tool_choice = 'auto';
  }

  const attempt = async (): Promise<LLMResponse | null> => {
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
            body: JSON.stringify({ ...baseBody, model }),
            signal: AbortSignal.timeout(45000),
          });

          if (!res.ok) {
            const text = await res.text().catch(() => '');
            if (res.status === 429 || res.status === 402) continue;
            console.error(`[Arcus Engine] ${model} ${res.status}:`, text.slice(0, 200));
            continue;
          }

          const data = await res.json();
          const choice = data.choices?.[0];
          if (!choice) continue;

          const content: ContentBlock[] = [];
          const rawContent = choice.message?.content;

          if (typeof rawContent === 'string' && rawContent.trim()) {
            content.push({ type: 'text', text: rawContent });
          } else if (Array.isArray(rawContent)) {
            for (const block of rawContent) {
              if (block.type === 'text' && block.text) content.push({ type: 'text', text: block.text });
              else if (block.type === 'tool_use') {
                content.push({ type: 'tool_use', id: block.id, name: block.name, input: block.input || {} });
              }
            }
          }

          const toolCalls = choice.message?.tool_calls;
          if (toolCalls?.length) {
            for (const tc of toolCalls) {
              let parsedInput: Record<string, any> = {};
              try { parsedInput = JSON.parse(tc.function?.arguments || '{}'); } catch { /* ok */ }
              content.push({
                type: 'tool_use',
                id: tc.id || `call_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                name: tc.function?.name || '',
                input: parsedInput,
              });
            }
          }

          const stop_reason =
            choice.finish_reason === 'tool_calls' ? 'tool_use'
            : choice.finish_reason === 'stop' ? 'end_turn'
            : (choice.finish_reason || 'end_turn');

          return { role: 'assistant', content, stop_reason };

        } catch (err: any) {
          if (err.name === 'TimeoutError' || err.name === 'AbortError') {
            console.warn(`[Arcus Engine] ${model} timed out.`);
            continue;
          }
          console.error(`[Arcus Engine] ${model} error:`, err.message);
          continue;
        }
      }
    }
    return null;
  };

  // First attempt
  const first = await attempt();
  if (first) return first;

  // Single retry after 3 s — catches transient 429 bursts
  await new Promise(r => setTimeout(r, 3000));
  const second = await attempt();
  if (second) return second;

  throw new Error('All models and API keys exhausted. Please try again.');
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Strip internal model XML tags from text.
 * Free models emit <thinking>, <tool>, <tool_call> etc. — none must reach the user.
 */
export function sanitizeModelText(text: string): string {
  if (!text) return '';

  const CLOSED_TAGS = [
    'thinking', 'thought', 'tool', 'tool_call', 'tool_use', 'tool_result',
    'result', 'output', 'answer', 'reasoning', 'reflection', 'scratchpad',
    'system', 'context', 'instruction', 'plan', 'step',
  ];

  let clean = text;

  for (const tag of CLOSED_TAGS) {
    clean = clean.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
  }
  for (const tag of CLOSED_TAGS) {
    clean = clean.replace(new RegExp(`<\\/?${tag}[^>]*>`, 'gi'), '');
  }

  clean = clean.replace(/^<[^>]{0,30}$/gm, '');

  // Remove unknown open/close tags (preserve safe HTML)
  clean = clean.replace(/<[a-z_]+[^>]*>/gi, m =>
    /^<(br|strong|em|b|i|u|p|div|span|h[1-6]|ul|ol|li|a|code|pre)\b/i.test(m) ? m : '');
  clean = clean.replace(/<\/[a-z_]+>/gi, m =>
    /^<\/(br|strong|em|b|i|u|p|div|span|h[1-6]|ul|ol|li|a|code|pre)>/i.test(m) ? m : '');

  return clean.replace(/\n{3,}/g, '\n\n').trim();
}

/** Extract plain text from a content block array, with sanitization */
export function getText(content: ContentBlock[]): string {
  const raw = content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map(b => b.text)
    .join('\n');
  return sanitizeModelText(raw);
}

/** Extract tool_use blocks */
export function getToolCalls(
  content: ContentBlock[]
): Array<{ type: 'tool_use'; id: string; name: string; input: Record<string, any> }> {
  return content.filter(
    (b): b is { type: 'tool_use'; id: string; name: string; input: Record<string, any> } =>
      b.type === 'tool_use'
  );
}
