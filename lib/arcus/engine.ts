/**
 * Arcus Engine — OpenRouter caller using OpenAI-compatible API format.
 *
 * Strategy: race all (model × key) pairs in parallel — first success wins.
 * This replaces the old sequential sweep (which could wait 45 s per model).
 *
 * Round 1 — race all keys × TOOL_CAPABLE_MODELS simultaneously (no delay)
 * Round 2 — 2 s pause, race all keys × ALL_FREE_MODELS (wider net)
 * Round 3 — 1 s pause, try openrouter/auto per key (let OR pick any free model)
 * Emergency — 1 s pause, strip tools, race top models (text-only answer)
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
 * Models that reliably support tool/function calling on OpenRouter free tier.
 * Ordered by quality + availability. IDs verified May 2026.
 */
const TOOL_CAPABLE_MODELS = [
  'deepseek/deepseek-chat-v3-0324:free',
  'google/gemini-2.5-flash-preview:free',
  'meta-llama/llama-4-maverick:free',
  'google/gemini-2.0-flash-001:free',
  'meta-llama/llama-4-scout:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-235b-a22b:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'microsoft/phi-4:free',
  'google/gemma-3-27b-it:free',
];

/**
 * Fallback models — lighter/cheaper, may not support structured tool calls.
 * Used in round 2 and the no-tools emergency round.
 */
const FALLBACK_MODELS = [
  'mistralai/mistral-small-3.2-24b-instruct:free',
  'tngtech/deepseek-r1t-chimera:free',
  'qwen/qwen3-14b:free',
  'qwen/qwen3-8b:free',
  'mistralai/mistral-7b-instruct:free',
];

const ALL_FREE_MODELS = [
  ...TOOL_CAPABLE_MODELS,
  ...FALLBACK_MODELS,
];

/** Top models used in Round 4 text-only emergency (no tools, no tool_choice). */
const EMERGENCY_MODELS = [
  'deepseek/deepseek-chat-v3-0324:free',
  'meta-llama/llama-4-maverick:free',
  'google/gemini-2.5-flash-preview:free',
  'meta-llama/llama-3.3-70b-instruct:free',
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

  // 401/403 keys are dead for this run
  const deadKeys = new Set<string>();

  async function tryOne(key: string, model: string, body: Record<string, any>): Promise<LLMResponse | null> {
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
        signal: AbortSignal.timeout(25000),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        if (res.status === 401 || res.status === 403) {
          deadKeys.add(key);
          log('error', 'Engine', `Key dead`, { key: `…${key.slice(-4)}`, status: res.status });
        } else {
          log('warn', 'Engine', `HTTP ${res.status}`, { model, key: `…${key.slice(-4)}`, body: txt.slice(0, 200) });
        }
        return null;
      }

      const data = await res.json();
      if (data.error) {
        log('warn', 'Engine', `OR error in body`, {
          model,
          key: `…${key.slice(-4)}`,
          code: data.error?.code,
          msg: (data.error?.message ?? '').slice(0, 150),
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
      log('warn', 'Engine', isTimeout ? `Timeout (25s)` : `Fetch error`, {
        model, key: `…${key.slice(-4)}`, ...(isTimeout ? {} : { error: err.message }),
      });
      return null;
    }
  }

  // Race all (model × key) pairs simultaneously — first non-null wins.
  async function race(modelList: string[], body: Record<string, any>): Promise<LLMResponse | null> {
    const active = keys.filter(k => !deadKeys.has(k));
    if (!active.length) return null;
    const pairs = modelList.flatMap(m => active.map(k => ({ m, k })));
    log('info', 'Engine', `Racing`, { pairs: pairs.length, models: modelList.length, keys: active.length });
    return Promise.any(
      pairs.map(({ m, k }) => tryOne(k, m, body).then(r => r ?? Promise.reject(null)))
    ).catch(() => null);
  }

  function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

  // ── Round 1: race all keys × tool-capable free models ────────────────────
  const r1Models = hasTools ? TOOL_CAPABLE_MODELS : ALL_FREE_MODELS;
  const r1 = await race(r1Models, baseBody);
  if (r1) return r1;

  // ── Round 2: 2 s pause, race all keys × full free list ────────────────────
  log('warn', 'Engine', 'Round 1 failed — retrying in 2 s with full free list');
  await sleep(2000);
  const r2 = await race(ALL_FREE_MODELS, baseBody);
  if (r2) return r2;

  // ── Round 3: 1 s pause, openrouter/auto — let OR pick any free model ──────
  log('warn', 'Engine', 'Round 2 failed — trying openrouter/auto');
  await sleep(1000);
  const r3 = await race(['openrouter/auto'], baseBody);
  if (r3) return r3;

  // ── Emergency: strip tools, race top models for a plain text answer ────────
  log('warn', 'Engine', 'Round 3 failed — emergency text-only round');
  await sleep(1000);
  const emergencyBody: Record<string, any> = { ...baseBody };
  delete emergencyBody.tools;
  delete emergencyBody.tool_choice;
  const r4 = await race(EMERGENCY_MODELS, emergencyBody);
  if (r4) return r4;

  log('error', 'Engine', 'All rounds exhausted', {
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
