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
// @ts-ignore
import { auth as nextAuth } from '../../../../lib/auth.js';
// @ts-ignore
const auth: any = nextAuth;
import { runAgentLoop } from '../../../../lib/arcus/loop';
import { buildSystemPrompt, getConnectedIntegrations } from '../../../../lib/arcus/system-prompt';
import { searchMemories, extractAndSaveInsights } from '../../../../lib/arcus/memory';

export const maxDuration = 60;

function buildPlanSystemPrompt(userName: string, connectedIntegrations: string[]): string {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const INTEGRATION_LABELS: Record<string, string> = {
    gmail: 'Gmail',
    gcal: 'Google Calendar',
    notion: 'Notion',
    slack: 'Slack',
  };
  const ALL_KNOWN = Object.keys(INTEGRATION_LABELS);

  const connected = connectedIntegrations.filter(k => INTEGRATION_LABELS[k]);
  const notConnected = ALL_KNOWN.filter(k => !connected.includes(k));

  const alwaysAvailable = ['Web Search (built-in)', 'Canvas document viewer (built-in)'];
  const connectedLabels = connected.map(k => INTEGRATION_LABELS[k]);
  const notConnectedLabels = notConnected.map(k => INTEGRATION_LABELS[k]);

  const integrationSection = [
    '## Tools available to execute this plan',
    'Always available: ' + alwaysAvailable.join(', '),
    connected.length ? 'Connected integrations: ' + connectedLabels.join(', ') : 'No third-party integrations connected.',
    notConnected.length
      ? `NOT connected (do NOT plan steps that require these): ${notConnectedLabels.join(', ')}. Also do NOT plan steps using Microsoft 365, Outlook, Excel, Teams, Jira, HubSpot, Salesforce, Asana, Trello, or any other external app not listed above.`
      : '',
  ].filter(Boolean).join('\n');

  return `You are Arcus, a strategic planning expert. Today is ${today}. The user's name is ${userName}.

Your only job right now is to create a comprehensive, well-structured action plan.

${integrationSection}

## CRITICAL — Only plan what can actually be executed
- Every action item in the plan MUST be achievable using only the tools listed above.
- If an integration is not connected, do NOT include steps that require it.
- Do NOT include steps that say "use Microsoft 365", "log in to Outlook", "open Excel", "use HubSpot", or reference any app not listed as available above.
- Plan around what IS available. If email is needed and Gmail is connected, use Gmail. If no calendar is connected, skip scheduling steps or note the user must do it manually.

## Output rules — CRITICAL
- Output ONLY the plan document as markdown. No preamble, no "here is your plan", no explanation before or after.
- Start immediately with "# [Plan Title]" on the first line.
- EVERY heading (#, ##, ###, etc.) MUST be on its own separate line — NEVER inline within a sentence or paragraph.
- EVERY "---" separator MUST be on its own line with a blank line before and after — NEVER inside a sentence or list item.
- Use H1 (#) for the plan title only — one per document.
- Use H2 (##) for major phases or sections — each on its own line.
- Use H3 (###) for sub-sections — each on its own line.
- Use bullet points (- ) for action items, resources, or lists.
- Use --- on its own line to separate major sections.
- Maximum 5000 characters total.
- NEVER use emojis. Zero emojis allowed in any part of the plan.
- NEVER use bracketed placeholders. Every item must be concrete and specific.
- Write in direct, professional language. No hedging.
- WRONG example: "Use Gmail for email. --- ## Phase 2: Schedule" — heading and separator inline
- CORRECT example: each ## heading and each --- appear on their own dedicated lines with blank lines around them.

## Plan structure guidance
A good plan contains:
1. A clear title and objective
2. Context / background analysis
3. Numbered phases or steps
4. Specific action items under each phase
5. Success criteria or expected outcomes

Do not call any tools. Output the plan markdown directly now.`;
}

function ts() { return new Date().toISOString().slice(11, 23); }
function log(level: 'info' | 'warn' | 'error', msg: string, extra?: Record<string, unknown>) {
  const line = extra
    ? `[Arcus:Route] ${ts()} ${msg} ${JSON.stringify(extra)}`
    : `[Arcus:Route] ${ts()} ${msg}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export async function POST(request: NextRequest) {
  const reqStart = Date.now();

  // Auth
  const session = await auth();
  if (!session?.user?.email) {
    log('warn', 'Unauthorized request — no session');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const userId = session.user.email.toLowerCase();
  const userName = session.user.name?.split(' ')[0] || 'there';

  // Parse body
  let body: {
    message?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    conversationId?: string;
    isPlanMode?: boolean;
  } = {};
  try {
    body = await request.json();
  } catch (e: any) {
    log('error', 'Failed to parse request body', { error: e.message });
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { message, history = [], conversationId, isPlanMode = false } = body;
  if (!message?.trim()) {
    log('warn', 'Empty message received', { userId });
    return new Response(JSON.stringify({ error: 'message is required' }), { status: 400 });
  }

  log('info', 'Request received', {
    userId,
    isPlanMode,
    historyTurns: history.length,
    msgPreview: message.slice(0, 80),
    conversationId,
  });

  // Build context (run in parallel for speed)
  let connectedIntegrations: string[] = [];
  let memories = '';
  let personalityData = '';
  try {
    [connectedIntegrations, memories, personalityData] = await Promise.all([
      getConnectedIntegrations(userId),
      searchMemories(userId, message, 5),
      fetchPersonality(userId),
    ]);
    log('info', 'Context ready', { integrations: connectedIntegrations, memoryChars: memories.length });
  } catch (e: any) {
    log('error', 'Context build failed — continuing with empty context', { error: e.message, stack: e.stack?.slice(0, 300) });
  }

  const systemPrompt = isPlanMode
    ? buildPlanSystemPrompt(userName, connectedIntegrations)
    : buildSystemPrompt({ userName, userId, connectedIntegrations, memories, personality: personalityData });

  // Sanitize history (last 20 turns)
  const sanitizedHistory = history
    .slice(-20)
    .filter(h => h.role && h.content?.trim())
    .map(h => ({ role: h.role as 'user' | 'assistant', content: h.content }));

  log('info', 'Starting agent loop', { tools: connectedIntegrations, historyKept: sanitizedHistory.length, setupMs: Date.now() - reqStart, systemPromptChars: systemPrompt.length });

  let stream: ReadableStream;
  try {
    stream = runAgentLoop({
      userId,
      systemPrompt,
      history: sanitizedHistory,
      userMessage: message,
      connectedIntegrations,
      isPlanMode,
    });
  } catch (e: any) {
    log('error', 'runAgentLoop threw synchronously', { error: e.message, stack: e.stack?.slice(0, 300) });
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }

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
    await extractAndSaveInsights(userId, userMessage, '');
  } catch (e: any) {
    console.warn(`[Arcus:Route] ${ts()} Memory save failed (non-fatal)`, { error: e.message });
  }
}

/** Fetch user's Arcus personality setting from user_profiles.preferences */
async function fetchPersonality(userId: string): Promise<string> {
  try {
    const { getSupabaseAdmin } = await import('../../../../lib/supabase.js');
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('user_profiles')
      .select('preferences')
      .ilike('user_id', userId)
      .maybeSingle();
    const prefs = (data?.preferences as Record<string, unknown>) || {};
    return (prefs.arcus_personality as string) || '';
  } catch {
    return '';
  }
}
