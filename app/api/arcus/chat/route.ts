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
import { shouldDispatchParallelVAs } from '../../../../lib/arcus/inbox-pipeline';
import { searchMemories, extractAndSaveInsights } from '../../../../lib/arcus/memory';
import { verifyGmailScopes } from '../../../../lib/arcus/gmail-scope';
// @ts-ignore
import { subscriptionService, FEATURE_TYPES } from '../../../../lib/subscription-service.js';

export const maxDuration = 60;

function buildPlanSystemPrompt(userName: string, connectedIntegrations: string[]): string {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const INTEGRATION_LABELS: Record<string, string> = {
    gmail: 'Gmail',
    gcal: 'Google Calendar',
    notion: 'Notion',
    notion_calendar: 'Notion Calendar',
    slack: 'Slack',
  };
  const ALL_KNOWN = Object.keys(INTEGRATION_LABELS);

  const connected = connectedIntegrations.filter(k => INTEGRATION_LABELS[k]);
  // notion and notion_calendar share OAuth — if either is connected, don't list the other as missing
  const hasAnyNotion = connected.some(k => k === 'notion' || k === 'notion_calendar');
  const notConnected = ALL_KNOWN.filter(k => {
    if (connected.includes(k)) return false;
    if (hasAnyNotion && (k === 'notion' || k === 'notion_calendar')) return false;
    return true;
  });

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

## Output rules — STRICT, NON-NEGOTIABLE

- Output ONLY the plan document as markdown. No preamble, no "here is your plan", no explanation before or after.
- Start immediately with "# [Plan Title]" on the first line.
- EVERY heading (#, ##, ###) on its own line. EVERY "---" on its own line with blanks around it.
- Use H1 (#) once for the plan title. H2 (##) for sections. H3 (###) for sub-sections. Bullets (- ) for items.
- Maximum 5000 characters.
- NEVER use emojis. NEVER use bracketed placeholders like [TBD] or [insert X here]. Every item is concrete.

## Steps section — USE arcus-steps JSON BLOCK (mandatory)

The Steps section MUST be a fenced arcus-steps JSON block — NEVER inline-numbered prose like "1. Foo 2. Bar 3. Baz" (which renders as a wall of text). The canvas renderer parses arcus-steps and lays out each step with its own status dot. Each step has a short label (3-6 words) + a one-line description.

Example of the EXACT format the Steps section must follow:

\`\`\`arcus-steps
{ "steps": [
    { "label": "Search Gmail for newsletters", "description": "Use search_gmail with query 'category:promotions newer_than:7d'." },
    { "label": "Read top 20 candidates", "description": "Use gmail_bulk_read_threads to pull bodies in one call." },
    { "label": "Summarize into digest", "description": "Group by sender, bullet the most important items per source." },
    { "label": "Save digest to Notion", "description": "Use create_notion_page with title 'Newsletter Digest — <date>'." }
] }
\`\`\`

## Anti-patterns — these MUST NOT appear in the output

ANTI-PATTERN 1 — params dump. The plan is for a HUMAN to read. Do NOT output bare key/value lines like:
  name: "Newsletter Digest"
  cron_schedule: "0 2 * * *"
  output_channel: "gmail"
These are tool inputs, not a plan. Translate them into narrative: "The agent runs nightly at 2:00 AM, delivers the digest to your Gmail inbox."

ANTI-PATTERN 2 — inline-numbered steps. Do NOT collapse the Steps section into a single paragraph like "1. Search Gmail 2. Read threads 3. Summarize". Use the arcus-steps JSON block above — every step gets its own row.

ANTI-PATTERN 3 — inline headings or separators. Do NOT write "Use Gmail. ## Phase 2: Schedule the run." Headings and \`---\` MUST each be on their own line with blank lines around them.

ANTI-PATTERN 4 — recap of what the user said. Do NOT begin with "You asked me to plan X" or "Based on your request to do Y". Skip directly to the plan.

## Plan structure — use this exact skeleton

\`\`\`markdown
# <Concrete Plan Title>

## Objective
<one or two sentences — what this plan achieves>

## Steps
\\\`\\\`\\\`arcus-steps
{ "steps": [
    { "label": "...", "description": "..." }
] }
\\\`\\\`\\\`

## Expected Output
<one paragraph describing what the user will see when the plan executes — concrete artifacts, links, counts>

## Time Estimate
<one line, e.g. "Daily — 2-3 minutes per run" or "One-time — 20-30 minutes">
\`\`\`

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
    attachments?: Array<{ name: string; url: string; type: string; size?: number }>;
  } = {};
  try {
    body = await request.json();
  } catch (e: any) {
    log('error', 'Failed to parse request body', { error: e.message });
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { message, history = [], conversationId, isPlanMode = false, attachments = [] } = body;
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
  let voiceContext = '';
  let preferenceMemories = '';
  try {
    // Phase C — Enrich the memory context with TWO parallel queries:
    //   1. searchMemories(message)  — semantic match to current message
    //   2. searchMemories('[PREFERENCE]') — explicit preference memories
    // Past code only queried (1), so the LLM might miss a saved preference
    // that doesn't semantically overlap with the current message ("never
    // schedule weekends" wouldn't surface on a Monday "schedule X" query).
    [connectedIntegrations, memories, preferenceMemories, personalityData, voiceContext] = await Promise.all([
      getConnectedIntegrations(userId),
      searchMemories(userId, message, 5),
      searchMemories(userId, '[PREFERENCE]', 8),
      fetchPersonality(userId),
      getVoiceContext(userId),
    ]);
    // Combine, dedup by line content
    if (preferenceMemories && !memories.includes(preferenceMemories.slice(0, 100))) {
      memories = [memories, preferenceMemories].filter(Boolean).join('\n\n');
    }
    log('info', 'Context ready', { integrations: connectedIntegrations, memoryChars: memories.length, voiceProfileChars: voiceContext.length });
  } catch (e: any) {
    log('error', 'Context build failed — continuing with empty context', { error: e.message, stack: e.stack?.slice(0, 300) });
  }

  // PART 23: split the two signals.
  //   - voice (sent-mail derived) → personality: drives email body STYLE.
  //   - free-text user instructions → userInstructions: BINDING RULES.
  // The old code concatenated them under one "voice profile" header which
  // made the LLM treat behavioral rules ("never schedule before 9am") as
  // writing-style hints. They're now two separate prompt blocks with
  // distinct semantics.
  // PART 38b — narrow the prompt's Tool inventory section in lockstep with
  // PART 39b's getAvailableTools VA filter. Same classifier (PART 37) drives
  // both: ≥2 VAs relevant → both prompt and tool surface narrow to those VAs.
  // Plan mode and zero/one-VA turns get the full inventory (no filter).
  const vaDispatch = isPlanMode
    ? { fire: false, vas: [], reason: 'none' as const }
    : shouldDispatchParallelVAs(message);
  const promptVAFilter = vaDispatch.fire && vaDispatch.vas.length >= 2 ? vaDispatch.vas : undefined;

  const systemPrompt = isPlanMode
    ? buildPlanSystemPrompt(userName, connectedIntegrations)
    : buildSystemPrompt({
        userName,
        userId,
        connectedIntegrations,
        memories,
        personality: voiceContext || undefined,
        userInstructions: personalityData || undefined,
        relevantVAs: promptVAFilter,
      });

  // Auto-extract "remember X" / "save this" / "from now on..." from the
  // user's message and persist it as a memory in-band. Fire-and-forget so
  // memory writes never block the response stream. Patterns are deliberately
  // conservative — false positives create noise in the user's settings card.
  (async () => {
    try {
      // F7.2 — Tightened patterns. The previous "always X" / "never X"
      // matched everyday speech like "Always loved that movie" → saved as
      // a behavioral rule. Now the always/never pattern REQUIRES an
      // assistive-action verb after it (cc, bcc, include, notify, send,
      // schedule, draft, use, sign, reply, archive, mention) so it only
      // triggers on instructions to the AI, not casual prose.
      const ASSISTIVE_VERBS = '(?:cc|bcc|include|add|attach|notify|alert|send|schedule|book|draft|use|sign|reply|respond|archive|label|tag|mention|file|forward|copy|set|prefer|treat|prioritize|skip|ignore|hide)';
      const REMEMBER_PATTERNS: Array<{ re: RegExp; group: number }> = [
        // "remember that <fact>", "remember <fact>"
        { re: /\bremember\s+(?:that\s+|this:\s*)?(.{8,300}?)(?:[.!?]\s*$|[.!?]\s+\w)/i, group: 1 },
        // "please remember <fact>", "can you remember <fact>"
        { re: /\b(?:please|can you|could you)\s+remember\s+(?:that\s+)?(.{8,300}?)(?:[.!?]\s*$|[.!?]\s+\w)/i, group: 1 },
        // "save this to memory: <fact>"
        { re: /\b(?:save\s+(?:this\s+)?(?:to|in|as)\s+memory|note\s+for\s+(?:later|me))[:\s]+(.{8,300}?)(?:[.!?]\s*$|[.!?]\s+\w)/i, group: 1 },
        // "from now on, <rule>"
        { re: /\bfrom\s+now\s+on[,:\s]+(.{8,300}?)(?:[.!?]\s*$|[.!?]\s+\w)/i, group: 1 },
        // "always <assistive verb> ..." / "never <assistive verb> ..." at start of message
        { re: new RegExp(`^\\s*(always|never)\\s+${ASSISTIVE_VERBS}\\s+(.{8,300}?)(?:[.!?]\\s*$|[.!?]\\s+\\w)`, 'i'), group: 0 },
      ];
      for (const { re, group } of REMEMBER_PATTERNS) {
        const m = message.match(re);
        if (m) {
          const fact = (group === 0 ? m[0] : m[group])?.trim();
          if (fact && fact.length >= 8 && fact.length <= 300) {
            const { saveMemory } = await import('../../../../lib/arcus/memory');
            await saveMemory(userId, fact, ['user-stated'], 'user');
            log('info', 'Auto-extracted user memory', { fact: fact.slice(0, 120) });
            break; // one extraction per message — avoid double-saves
          }
        }
      }
    } catch (e: any) {
      log('warn', 'Auto-extract memory failed', { error: e.message });
    }
  })();

  // Sanitize history (last 20 turns)
  const sanitizedHistory = history
    .slice(-20)
    .filter(h => h.role && h.content?.trim())
    .map(h => ({ role: h.role as 'user' | 'assistant', content: h.content }));

  // ── Gmail scope preflight ──────────────────────────────────────────────────
  // Cached 1h. The moment Google says 403 we replace the would-be loop with a
  // tiny SSE stream that emits a connector_required card and a final message
  // telling the user to reconnect. Saves the LLM from calling search_gmail
  // mid-turn and surfacing the bare 403 string.
  if (connectedIntegrations.includes('gmail')) {
    const scopeCheck = await verifyGmailScopes(userId);
    if (!scopeCheck.ok && scopeCheck.reason === 'scope_missing') {
      log('warn', 'Gmail scope preflight failed — short-circuiting with connector_required', { userId });
      const enc = new TextEncoder();
      const preflightStream = new ReadableStream({
        start(controller) {
          const emit = (type: string, data: unknown) =>
            controller.enqueue(enc.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
          const runId = `preflight-${Date.now()}`;
          emit('run_start', { runId, message });
          emit('connector_required', {
            connectors: [{
              id: 'gmail',
              name: 'Gmail',
              description: 'Your Gmail token is missing the scopes Arcus needs. Reconnecting takes 5 seconds and lets me search your inbox, draft, and send mail.',
              connected: false,
            }],
            waitingForUser: true,
            reason: 'gmail_scope_missing',
          });
          emit('message', {
            content:
              "I can't reach your Gmail yet — the connection is missing some permissions. " +
              "Click **Reconnect Gmail** on the card above (or open the connectors button in the prompt box) and complete the Google sign-in. " +
              "Then ask me again and I'll pick up right where you left off.",
          });
          emit('done', { runId, durationMs: Date.now() - reqStart, totalSteps: 0 });
          controller.close();
        },
      });
      return new Response(preflightStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Conversation-Id': conversationId || '',
        },
      });
    }
  }

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
      conversationId,
      userInstructions: personalityData || undefined,
      attachments,
    });
  } catch (e: any) {
    log('error', 'runAgentLoop threw synchronously', { error: e.message, stack: e.stack?.slice(0, 300) });
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }

  saveMemoryAsync(userId, message, conversationId);

  // Fire-and-forget usage tracking (non-blocking)
  subscriptionService.incrementFeatureUsage(userId, FEATURE_TYPES.ARCUS_AI).catch(() => {});

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

/**
 * Resolve the user's learned writing voice into a prompt block.
 *
 * Reads the real `user_voice_profiles` profile. If the user has never had one
 * built, bootstraps it once from their last 50 sent emails so that the very
 * first draft already sounds like them. The whole bootstrap is time-boxed so a
 * cold profile can never blow the request's streaming budget.
 */
async function getVoiceContext(userId: string): Promise<string> {
  try {
    const { voiceProfileService } = await import('../../../../lib/voice-profile-service.js');

    let profile: any = await voiceProfileService.getVoiceProfile(userId);

    // Only bootstrap when the user has genuinely never been profiled. A saved
    // 'default' profile means we already tried — don't hammer Gmail every turn.
    if (!profile) {
      profile = await bootstrapVoiceProfile(userId, voiceProfileService);
    }

    if (!profile || profile.status === 'default') return '';

    const prompt = voiceProfileService.generateVoicePrompt(profile);
    return typeof prompt === 'string' ? prompt.trim() : '';
  } catch (e: any) {
    log('warn', 'Voice profile load failed (non-fatal)', { error: e.message });
    return '';
  }
}

/**
 * One-time voice-profile bootstrap from the user's sent mail.
 * Returns the saved profile, or null if it could not be built. Always persists
 * *something* (even a default) so subsequent turns short-circuit instead of
 * re-running this expensive path on every message.
 */
async function bootstrapVoiceProfile(userId: string, voiceProfileService: any): Promise<any | null> {
  try {
    const { getSupabaseAdmin } = await import('../../../../lib/supabase.js');
    const { decrypt } = await import('../../../../lib/crypto.js');
    const supabase = getSupabaseAdmin();

    const { data } = await supabase
      .from('arcus_integrations')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .eq('provider', 'gmail')
      .maybeSingle();

    if (!data?.access_token) return null; // Gmail not connected — try again later

    const accessToken = decrypt(data.access_token);
    const refreshToken = data.refresh_token ? decrypt(data.refresh_token) : '';

    const { GmailService } = await import('../../../../lib/gmail');
    const gmail = new GmailService(accessToken, refreshToken);

    // Time-box the whole fetch+analyze+save so a slow mailbox cannot stall chat.
    const TIMEOUT = Symbol('timeout');
    const built = await Promise.race([
      (async () => {
        const sentEmails = await voiceProfileService.fetchSentEmails(gmail, 50);
        if (!Array.isArray(sentEmails) || sentEmails.length < 3) {
          // Persist a default so we don't retry this every single message.
          const def = voiceProfileService.getDefaultVoiceProfile();
          await voiceProfileService.saveVoiceProfile(userId, def);
          return null;
        }
        const profile = await voiceProfileService.analyzeVoiceProfile(sentEmails);
        await voiceProfileService.saveVoiceProfile(userId, profile);
        log('info', 'Voice profile auto-generated from sent mail', { emails: sentEmails.length });
        return profile;
      })(),
      new Promise(resolve => setTimeout(() => resolve(TIMEOUT), 22000)),
    ]);

    if (built === TIMEOUT) {
      log('warn', 'Voice profile bootstrap timed out — using generic voice this turn');
      return null;
    }
    return built;
  } catch (e: any) {
    log('warn', 'Voice profile bootstrap failed (non-fatal)', { error: e.message });
    return null;
  }
}
