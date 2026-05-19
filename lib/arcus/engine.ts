/**
 * Arcus Engine — OpenRouter caller using OpenAI-compatible API format.
 *
 * Converts tool schemas and message history to OpenAI format before sending.
 * Retry strategy:
 *   - Round 1: all keys × tool-capable models (no delay)
 *   - Round 2: all keys × all free models (3 s delay)
 *   - Round 3: all keys × tool-capable models again (8 s delay)
 * Keys that return 401/403 are skipped for the remainder of the run.
 * Models that return 429/402 accumulate a soft-skip count; after 2 hits in a
 * run they are skipped in later rounds to avoid hammering rate-limited slots.
 */

// ── Model lists ────────────────────────────────────────────────────────────────

/**
 * Models that reliably support tool/function calling.
 * Ordered by quality + free-tier availability.
 */
const TOOL_CAPABLE_MODELS = [
  'deepseek/deepseek-chat-v3-0324:free',
  'google/gemini-2.5-flash-preview-05-20:free',
  'meta-llama/llama-4-maverick:free',
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.0-flash:free',
  'meta-llama/llama-4-scout:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-235b-a22b:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'microsoft/phi-4-reasoning-plus:free',
  'microsoft/phi-4:free',
  'nvidia/llama-3.1-nemotron-ultra-253b-v1:free',
];

/**
 * Fallback text-only models. Fast and cheap but don't call tools.
 * Used in round 2 when all tool-capable models are exhausted.
 */
const FALLBACK_MODELS = [
  'mistralai/mistral-small-3.2-24b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'tngtech/deepseek-r1t-chimera:free',
  'qwen/qwen3-14b:free',
  'qwen/qwen3-8b:free',
];

function getKeys(): string[] {
  return [
    process.env.OPENROUTER_API_KEY,
    process.env.OPENROUTER_API_KEY2,
    process.env.OPENROUTER_API_KEY3,
    process.env.OPENROUTER_API_KEY4,
    process.env.OPENROUTER_API_KEY5,
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

function toOpenAIMessages(messages: LLMMessage[]): any[] {
  const out: any[] = [];

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      out.push({ role: msg.role, content: msg.content });
      continue;
    }

    const blocks = msg.content as ContentBlock[];

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

    const text = blocks
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('\n');
    out.push({ role: msg.role, content: text });
  }

  return out;
}

// ── Response parser ────────────────────────────────────────────────────────────

function parseOpenAIResponse(data: any): LLMResponse | null {
  const choice = data.choices?.[0];
  if (!choice) return null;

  const content: ContentBlock[] = [];
  const rawContent = choice.message?.content;

  if (typeof rawContent === 'string' && rawContent.trim()) {
    content.push({ type: 'text', text: rawContent });
  } else if (Array.isArray(rawContent)) {
    for (const block of rawContent) {
      if (block.type === 'text' && block.text) {
        content.push({ type: 'text', text: block.text });
      } else if (block.type === 'tool_use') {
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

  if (content.length === 0) return null;

  const stop_reason =
    choice.finish_reason === 'tool_calls' ? 'tool_use'
    : choice.finish_reason === 'stop' ? 'end_turn'
    : (choice.finish_reason || 'end_turn');

  return { role: 'assistant', content, stop_reason };
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
  const hasTools = !!openAITools;

  const baseBody: Record<string, any> = {
    messages: openAIMessages,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.3,
  };
  if (openAITools) {
    baseBody.tools = openAITools;
    baseBody.tool_choice = 'auto';
  }

  // Per-run tracking
  const deadKeys = new Set<string>();             // 401/403 — auth failure
  const rateLimitedModels = new Map<string, number>(); // model → 429 count

  async function tryModel(key: string, model: string): Promise<LLMResponse | null> {
    if (deadKeys.has(key)) return null;

    const rateHits = rateLimitedModels.get(model) ?? 0;
    if (rateHits >= 2) return null; // deprioritise after 2 consecutive 429s

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
        const body = await res.text().catch(() => '');

        if (res.status === 401 || res.status === 403) {
          deadKeys.add(key);
          console.warn(`[Arcus Engine] Key ending …${key.slice(-4)} is invalid (${res.status}).`);
          return null;
        }

        if (res.status === 429 || res.status === 402) {
          rateLimitedModels.set(model, rateHits + 1);
          return null;
        }

        // 400 bad request (unsupported feature on this model — e.g. tool calls)
        if (res.status === 400) {
          console.warn(`[Arcus Engine] ${model} returned 400 — skipping.`);
          return null;
        }

        console.warn(`[Arcus Engine] ${model} HTTP ${res.status}: ${body.slice(0, 120)}`);
        return null;
      }

      const data = await res.json();

      // OpenRouter sometimes wraps an error in a 200
      if (data.error) {
        const code = data.error?.code ?? data.error?.status;
        if (code === 429 || code === 402 || data.error?.message?.includes('rate limit')) {
          rateLimitedModels.set(model, rateHits + 1);
        }
        console.warn(`[Arcus Engine] ${model} error payload:`, data.error?.message ?? JSON.stringify(data.error).slice(0, 120));
        return null;
      }

      const parsed = parseOpenAIResponse(data);
      if (!parsed) {
        console.warn(`[Arcus Engine] ${model} returned empty content.`);
        return null;
      }

      // Reset rate-limit counter on success
      rateLimitedModels.delete(model);
      return parsed;

    } catch (err: any) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        console.warn(`[Arcus Engine] ${model} timed out.`);
      } else {
        console.warn(`[Arcus Engine] ${model} fetch error: ${err.message}`);
      }
      return null;
    }
  }

  async function sweepModels(models: string[]): Promise<LLMResponse | null> {
    for (const key of keys) {
      if (deadKeys.has(key)) continue;
      for (const model of models) {
        const result = await tryModel(key, model);
        if (result) return result;
      }
    }
    return null;
  }

  function sleep(ms: number) {
    return new Promise<void>(r => setTimeout(r, ms));
  }

  // ── Round 1: tool-capable models, no delay ────────────────────────────────
  const round1Models = hasTools ? TOOL_CAPABLE_MODELS : [...TOOL_CAPABLE_MODELS, ...FALLBACK_MODELS];
  const r1 = await sweepModels(round1Models);
  if (r1) return r1;

  // ── Round 2: all models including fallbacks (3 s pause) ───────────────────
  await sleep(3000);
  const round2Models = [...TOOL_CAPABLE_MODELS, ...FALLBACK_MODELS];
  // Reset rate-limit hits so models get a fresh chance after the pause
  rateLimitedModels.clear();
  const r2 = await sweepModels(round2Models);
  if (r2) return r2;

  // ── Round 3: tool-capable only, 8 s total from start (5 s more) ──────────
  await sleep(5000);
  rateLimitedModels.clear();
  const r3 = await sweepModels(TOOL_CAPABLE_MODELS);
  if (r3) return r3;

  throw new Error('All models are currently busy. Please try again in a moment.');
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Strip internal model XML tags from text.
 * Free models emit <thinking>, <tool>, <tool_call> etc.
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

  clean = clean.replace(/<[a-z_]+[^>]*>/gi, m =>
    /^<(br|strong|em|b|i|u|p|div|span|h[1-6]|ul|ol|li|a|code|pre)\b/i.test(m) ? m : '');
  clean = clean.replace(/<\/[a-z_]+>/gi, m =>
    /^<\/(br|strong|em|b|i|u|p|div|span|h[1-6]|ul|ol|li|a|code|pre)>/i.test(m) ? m : '');

  return clean.replace(/\n{3,}/g, '\n\n').trim();
}

export function getText(content: ContentBlock[]): string {
  const raw = content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map(b => b.text)
    .join('\n');
  return sanitizeModelText(raw);
}

export function getToolCalls(
  content: ContentBlock[]
): Array<{ type: 'tool_use'; id: string; name: string; input: Record<string, any> }> {
  return content.filter(
    (b): b is { type: 'tool_use'; id: string; name: string; input: Record<string, any> } =>
      b.type === 'tool_use'
  );
}
