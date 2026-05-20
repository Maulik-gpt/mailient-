/**
 * Arcus Engine — OpenRouter caller using OpenAI-compatible API format.
 *
 * Concurrency design: race all API keys for ONE model at a time (max N_keys concurrent).
 * Firing all (model × key) pairs simultaneously hammers OpenRouter and triggers
 * IP-level rate limits on every call.
 *
 * Strategy:
 *   1. openrouter/auto — OR picks the best available model internally
 *   2. Sequential free model fallbacks, racing all keys per model
 *   3. Emergency text-only (strip tool schemas, try openrouter/auto + top 2 models)
 */

// ── Logger ─────────────────────────────────────────────────────────────────────

function ts() { return new Date().toISOString().slice(11, 23); }

function log(level: 'info' | 'warn' | 'error', module: string, msg: string, extra?: Record<string, unknown>) {
  const prefix = `[Arcus:${module}] ${ts()}`;
  const line = extra ? `${prefix} ${msg} ${JSON.stringify(extra)}` : `${prefix} ${msg}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

// ── Model lists ────────────────────────────────────────────────────────────────

/**
 * Free tool-capable models, verified live 2026-05-19 against OpenRouter.
 * Ordered: confirmed-responding first, then ones that were rate-limited
 * at probe time but may recover. NOTE: openrouter/auto is NOT usable —
 * these accounts have zero credits and auto only routes to paid models.
 */
const TOOL_CAPABLE_MODELS = [
  // Confirmed clean 200 responses
  'openai/gpt-oss-120b:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'z-ai/glm-4.5-air:free',
  'arcee-ai/trinity-large-thinking:free',
  // Currently rate-limited upstream — retry-worthy fallbacks
  'deepseek/deepseek-v4-flash:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'qwen/qwen3-coder:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-oss-20b:free',
];

const FALLBACK_MODELS = [
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'minimax/minimax-m2.5:free',
];

const ALL_FREE_MODELS = [
  ...TOOL_CAPABLE_MODELS,
  ...FALLBACK_MODELS,
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
  options: { maxTokens?: number; temperature?: number; forceToolCall?: boolean } = {}
): Promise<LLMResponse> {
  const keys = getKeys();
  if (!keys.length) {
    log('error', 'Engine', 'No OpenRouter API keys configured — set OPENROUTER_API_KEY in .env');
    throw new Error('No OpenRouter API keys configured.');
  }

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

  const deadKeys = new Set<string>();

  async function tryOne(key: string, model: string, body: Record<string, any>, timeoutMs = 20000): Promise<LLMResponse | null> {
    if (deadKeys.has(key)) return null;
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
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        if (res.status === 401 || res.status === 403) {
          deadKeys.add(key);
          log('error', 'Engine', `Key dead`, { key: `…${key.slice(-4)}`, status: res.status });
        } else {
          log('warn', 'Engine', `HTTP ${res.status}`, { model, key: `…${key.slice(-4)}`, resp: txt.slice(0, 200) });
        }
        return null;
      }

      const data = await res.json();
      if (data.error) {
        log('warn', 'Engine', `OR error`, {
          model, key: `…${key.slice(-4)}`,
          code: data.error?.code,
          msg: String(data.error?.message ?? data.error ?? '').slice(0, 200),
        });
        return null;
      }

      const parsed = parseOpenAIResponse(data);
      if (!parsed) {
        log('warn', 'Engine', `Empty response`, { model, finish: data.choices?.[0]?.finish_reason });
        return null;
      }

      log('info', 'Engine', `OK`, { model: data.model ?? model, key: `…${key.slice(-4)}`, stop: parsed.stop_reason });
      return parsed;

    } catch (err: any) {
      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
      log('warn', 'Engine', isTimeout ? `Timeout` : `Fetch error`, {
        model, key: `…${key.slice(-4)}`, ms: timeoutMs, ...(isTimeout ? {} : { err: err.message }),
      });
      return null;
    }
  }

  // Race all active keys for a single model — max N_keys concurrent requests.
  async function tryModel(model: string, body: Record<string, any>, timeoutMs = 20000): Promise<LLMResponse | null> {
    const active = keys.filter(k => !deadKeys.has(k));
    if (!active.length) return null;
    log('info', 'Engine', `Trying`, { model, keys: active.length });
    return Promise.any(
      active.map(k => tryOne(k, model, body, timeoutMs).then(r => r ?? Promise.reject(null)))
    ).catch(() => null);
  }

  function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

  // Pass 1: sequential free models, all keys race each. 429s are common on
  // the shared free pool, so we just move to the next model immediately.
  const list = hasTools ? TOOL_CAPABLE_MODELS : ALL_FREE_MODELS;
  log('info', 'Engine', 'Pass 1 — free models', { count: list.length, keys: keys.length, hasTools });
  for (let i = 0; i < list.length; i++) {
    if (i > 0) await sleep(400);
    const result = await tryModel(list[i], baseBody, 18000);
    if (result) return result;
  }

  // Pass 2: brief pause then retry the confirmed-good models (rate limits
  // often clear within a couple seconds on the free pool).
  log('warn', 'Engine', 'Pass 1 failed — 3 s pause then retrying top models');
  await sleep(3000);
  for (const model of TOOL_CAPABLE_MODELS.slice(0, 6)) {
    const result = await tryModel(model, baseBody, 18000);
    if (result) return result;
    await sleep(400);
  }

  // Pass 3: emergency — strip tool schemas, try top models for a text answer.
  log('warn', 'Engine', 'Pass 2 failed — emergency text-only round');
  await sleep(1000);
  const noToolsBody: Record<string, any> = { ...baseBody };
  delete noToolsBody.tools;
  delete noToolsBody.tool_choice;
  for (const model of TOOL_CAPABLE_MODELS.slice(0, 4)) {
    const r = await tryModel(model, noToolsBody, 18000);
    if (r) return r;
    await sleep(400);
  }

  log('error', 'Engine', 'All passes exhausted', {
    keys: keys.length, deadKeys: [...deadKeys].map(k => `…${k.slice(-4)}`),
  });
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

export function getRawText(content: ContentBlock[]): string {
  return content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map(b => b.text)
    .join('\n');
}

export function getText(content: ContentBlock[]): string {
  return sanitizeModelText(getRawText(content));
}

export function getToolCalls(
  content: ContentBlock[]
): Array<{ type: 'tool_use'; id: string; name: string; input: Record<string, any> }> {
  return content.filter(
    (b): b is { type: 'tool_use'; id: string; name: string; input: Record<string, any> } =>
      b.type === 'tool_use'
  );
}
