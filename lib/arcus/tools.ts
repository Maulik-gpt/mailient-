/**
 * Arcus Tools — All tool definitions and implementations.
 *
 * Each tool:
 *  1. Has a ToolSchema (sent to Claude so it knows what it can call)
 *  2. Has an implementation function that takes userId + input and returns a string result
 *
 * Tools never throw — they return error strings that Claude can reason about.
 */

import { getSupabaseAdmin } from '../supabase.js';
import { decrypt, encrypt } from '../crypto.js';
import { annotateEmailWithSignals, annotateSearchResultsWithSignals } from './inbox-pipeline';
import { getConnectedIntegrations } from './system-prompt';
import type { ToolSchema } from './engine';

// ── Token helpers ──────────────────────────────────────────────────────────────

/**
 * Refresh a Google access token using the stored refresh token.
 * Stores the new access token back in user_tokens.
 * Returns the new access token, or null if refresh fails.
 */
async function refreshGoogleToken(userId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const uid = userId.toLowerCase();

    const { data } = await supabase
      .from('user_tokens')
      .select('encrypted_refresh_token')
      .or(`user_id.ilike."${uid}",google_email.ilike."${uid}"`)
      .maybeSingle();

    if (!data?.encrypted_refresh_token) return null;

    const refreshToken = decrypt(data.encrypted_refresh_token);
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const newToken = json.access_token;
    if (!newToken) return null;

    // Persist new token
    await supabase
      .from('user_tokens')
      .update({
        encrypted_access_token: encrypt(newToken),
        access_token_expires_at: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .or(`user_id.ilike."${uid}",google_email.ilike."${uid}"`);

    return newToken;
  } catch {
    return null;
  }
}

async function getGmailToken(userId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const uid = userId.toLowerCase();

    // 1. arcus_integrations (V3 OAuth flow)
    const { data: v3 } = await supabase
      .from('arcus_integrations')
      .select('access_token')
      .eq('user_id', uid)
      .eq('provider', 'gmail')
      .maybeSingle();
    if (v3?.access_token) return decrypt(v3.access_token);

    // 2. integration_credentials (legacy OAuth flow)
    const { data: legacy } = await supabase
      .from('integration_credentials')
      .select('encrypted_access_token')
      .eq('user_id', uid)
      .eq('provider', 'google')
      .maybeSingle();
    if (legacy?.encrypted_access_token) return decrypt(legacy.encrypted_access_token);

    // 3. user_tokens (populated automatically on Google login via NextAuth)
    const { data: ut } = await supabase
      .from('user_tokens')
      .select('encrypted_access_token')
      .or(`user_id.ilike."${uid}",google_email.ilike."${uid}"`)
      .maybeSingle();
    if (ut?.encrypted_access_token) return decrypt(ut.encrypted_access_token);

    return null;
  } catch {
    return null;
  }
}

async function getGcalToken(userId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const uid = userId.toLowerCase();

    // 1. arcus_integrations (V3 OAuth flow)
    const { data: v3 } = await supabase
      .from('arcus_integrations')
      .select('access_token')
      .eq('user_id', uid)
      .eq('provider', 'gcal')
      .maybeSingle();
    if (v3?.access_token) return decrypt(v3.access_token);

    // 2. integration_credentials (legacy OAuth flow)
    const { data: legacy } = await supabase
      .from('integration_credentials')
      .select('encrypted_access_token')
      .eq('user_id', uid)
      .eq('provider', 'google_calendar')
      .maybeSingle();
    if (legacy?.encrypted_access_token) return decrypt(legacy.encrypted_access_token);

    // 3. user_tokens (Google login covers Calendar scope too)
    const { data: ut } = await supabase
      .from('user_tokens')
      .select('encrypted_access_token')
      .or(`user_id.ilike."${uid}",google_email.ilike."${uid}"`)
      .maybeSingle();
    if (ut?.encrypted_access_token) return decrypt(ut.encrypted_access_token);

    return null;
  } catch {
    return null;
  }
}

// Shown when the Calendar API rejects the token for lack of calendar scope.
// This happens when the only Google token on file is the Gmail/login token
// (no calendar.events scope). The fix is a dedicated Calendar reconnect.
const CALENDAR_SCOPE_MESSAGE =
  'Google Calendar access needs to be re-authorized. The current Google connection only has email permissions, not calendar permissions. ' +
  'Tell the user: "I need calendar access to do that. Click the connectors button in the prompt box, choose Google Calendar, and complete the Google sign-in — then ask me again."';

function isScopeError(status: number): boolean {
  return status === 403 || status === 401;
}

async function getNotionToken(userId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('arcus_integrations')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', 'notion')
      .maybeSingle();
    if (data?.access_token) return decrypt(data.access_token);
    return null;
  } catch {
    return null;
  }
}

async function getSlackToken(userId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('arcus_integrations')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', 'slack')
      .maybeSingle();
    if (data?.access_token) return decrypt(data.access_token);
    return null;
  } catch {
    return null;
  }
}

// ── Gmail helpers ──────────────────────────────────────────────────────────────

function b64decode(s: string): string {
  try {
    return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  } catch { return ''; }
}

function getHeader(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

function extractBody(payload: any, maxLen = 3000): string {
  if (!payload) return '';
  if (payload.body?.data) return b64decode(payload.body.data).slice(0, maxLen);
  if (payload.parts) {
    for (const p of payload.parts) {
      if (p.mimeType === 'text/plain' && p.body?.data) return b64decode(p.body.data).slice(0, maxLen);
    }
    for (const p of payload.parts) { const r = extractBody(p, maxLen); if (r) return r; }
  }
  return '';
}

function buildRaw(to: string, subject: string, body: string, threadId?: string, inReplyTo?: string): string {
  const lines = [`To: ${to}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset=UTF-8'];
  if (inReplyTo) { lines.push(`In-Reply-To: ${inReplyTo}`); lines.push(`References: ${inReplyTo}`); }
  lines.push('', body);
  return Buffer.from(lines.join('\r\n')).toString('base64url');
}

// ── Tool schemas ───────────────────────────────────────────────────────────────

export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    name: 'search_gmail',
    description: 'Search the user\'s Gmail inbox. Use Gmail search operators: from:, to:, subject:, is:unread, is:starred, has:attachment, after:YYYY/MM/DD, newer_than:Nd, label:. Returns email summaries with IDs. ALWAYS call this before reading or replying to emails.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Gmail search query. E.g. "from:client@co.com is:unread newer_than:7d"' },
        maxResults: { type: 'number', description: 'Max emails to return (default 10, max 25)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_email',
    description: 'Read the full content of an email including body, sender, thread history. Pass messageId from search_gmail. Use to get full context before drafting a reply.',
    input_schema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'Gmail message ID from search_gmail results' },
      },
      required: ['messageId'],
    },
  },
  {
    name: 'get_sent_emails',
    description: 'Get the user\'s recent sent emails to analyze their writing style, tone, and voice. Use this before drafting any reply to match their style perfectly.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of sent emails to fetch (default 30, max 50)' },
      },
    },
  },
  {
    name: 'draft_reply',
    description: 'Save a Gmail draft AND display it inline in the chat for the user to review and send with one click. MANDATORY sequence before calling this: (1) read the thread with read_email, (2) call get_sent_emails to load the user\'s voice profile — this is NON-NEGOTIABLE, never skip it, (3) schedule any meeting to get the Meet link. The body parameter MUST be written in the user\'s exact voice as described in the VOICE PROFILE block returned by get_sent_emails — copy their greeting style, sentence length, sign-off, formality level, and any characteristic phrases verbatim. Do NOT write a generic professional email. STOP after calling this — do NOT call send_email. The user will send from the inline draft preview.',
    input_schema: {
      type: 'object',
      properties: {
        threadId: { type: 'string', description: 'Gmail thread ID (from read_email results)' },
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Subject (usually "Re: original subject")' },
        body: { type: 'string', description: 'Email body — written in the user\'s voice. Include Google Meet link if a meeting was scheduled.' },
        inReplyToMessageId: { type: 'string', description: 'RFC Message-ID for threading (from read_email)' },
        recipientName: { type: 'string', description: 'Display name of the recipient (e.g. "Priya") — used in the draft preview UI' },
      },
      required: ['threadId', 'to', 'body'],
    },
  },
  {
    name: 'send_email',
    description: 'Send an email immediately via Gmail. Only use when user explicitly says to SEND (not just draft). Requires user approval in the UI first — show the email content and ask for approval before calling this.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body' },
        threadId: { type: 'string', description: 'Thread ID if this is a reply' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'schedule_meeting',
    description: 'Create a Google Calendar event with a Google Meet link. Checks availability first. Returns the calendar event link and Meet URL.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Meeting title' },
        startTime: { type: 'string', description: 'Start time ISO 8601 with timezone e.g. "2024-01-15T14:00:00-05:00"' },
        endTime: { type: 'string', description: 'End time ISO 8601 with timezone' },
        attendees: { type: 'array', items: { type: 'string' }, description: 'Attendee email addresses' },
        description: { type: 'string', description: 'Meeting agenda or description' },
      },
      required: ['title', 'startTime', 'endTime'],
    },
  },
  {
    name: 'get_calendar_events',
    description: 'Get upcoming Google Calendar events to check availability and understand the user\'s schedule.',
    input_schema: {
      type: 'object',
      properties: {
        daysAhead: { type: 'number', description: 'How many days ahead to look (default 7)' },
        maxResults: { type: 'number', description: 'Max events (default 20)' },
      },
    },
  },
  {
    name: 'search_notion',
    description: 'Search the user\'s Notion workspace for pages, databases, or specific content. Returns titles and summaries.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for Notion' },
        maxResults: { type: 'number', description: 'Max results (default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'open_canvas',
    description: 'Open the built-in Canvas Panel — a beautiful full-screen document viewer on the right side. ALWAYS available, requires no integration. Use for ANYTHING longer than 3 paragraphs: email drafts, reports, analyses, summaries, action plans, weekly digests. Never render long content in chat — use open_canvas instead. To include custom visual charts/graphs in your canvas content, use these exact code block schemas:\n1. Bar chart: ```bar-chart\ntitle: Chart Title\nlabels: ["Mon", "Tue", ...]\nlabel: Label 1\ndata: [10, 20, ...]\nlabel: Label 2\ndata: [15, 25, ...]\n```\n2. Line chart: ```line-chart\ntitle: Chart Title\nlabels: ["Mon", "Tue", ...]\nlabel: Label 1\ndata: [10, 20, ...]\n```\n3. Pie/Donut chart: ```pie-chart\ntitle: Chart Title\nLabel 1: 10\nLabel 2: 20\n```',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Canvas panel title shown in the header' },
        type: {
          type: 'string',
          enum: ['email_draft', 'report', 'notes', 'analysis', 'action_plan'],
          description: 'Content type — determines the canvas icon and actions',
        },
        markdown: { type: 'string', description: 'Full markdown content. Use headers, bullets, bold for structure.' },
        draftMeta: {
          type: 'object',
          description: 'For email_draft type: { to, subject, body, threadId } so the Send button works',
          properties: {
            to: { type: 'string' },
            subject: { type: 'string' },
            threadId: { type: 'string' },
          },
        },
      },
      required: ['title', 'markdown'],
    },
  },
  {
    name: 'web_search',
    description: 'Search the internet for current information, news, company details, or any topic. Returns clean summarized results.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        maxResults: { type: 'number', description: 'Max results (default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'send_slack_message',
    description: 'Send a Slack message to the user\'s DM or a channel. Only works if the user has connected Slack. Use for real-time notifications about important emails or completed tasks.',
    input_schema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Channel name or "dm" for direct message to the user' },
        text: { type: 'string', description: 'Message text (markdown supported)' },
      },
      required: ['channel', 'text'],
    },
  },
  {
    name: 'fetch_notion_schema',
    description: 'ALWAYS call this BEFORE create_notion_page when writing to a database. Fetches the exact property names and types from the Notion database schema so you never use wrong field names. Returns the database_id to pass as parentId and the exact property names to pass in the properties object.',
    input_schema: {
      type: 'object',
      properties: {
        database: { type: 'string', description: 'Database name hint, e.g. "meetings", "tasks", "contacts"' },
        parentId: { type: 'string', description: 'Optional exact database ID if you already have it' },
      },
      required: ['database'],
    },
  },
  {
    name: 'create_notion_page',
    description: 'Create a new page in the user\'s Notion workspace. IMPORTANT: Always call fetch_notion_schema first to get exact field names — never hardcode them. Pass the database_id returned by fetch_notion_schema as parentId. Pass any additional database properties (date, status, tags, etc.) as a key/value object in the properties field using the EXACT names from the schema.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Page title, e.g. "Meeting with Priya — 2024-01-15" or "Task: Send proposal"' },
        content: { type: 'string', description: 'Full page content in plain text or markdown. Include all relevant details: contact, date, discussion points, action items, links.' },
        database: { type: 'string', description: 'Hint for which Notion database to log into, e.g. "meetings", "tasks", "contacts", "calendar". Arcus will search for a matching database.' },
        parentId: { type: 'string', description: 'Exact Notion database ID returned by fetch_notion_schema. Prefer this over the database hint.' },
        properties: {
          type: 'object',
          description: 'Additional database fields to set — use EXACT property names from fetch_notion_schema. Values: string for text/select/date, array of strings for multi_select, number for number, boolean for checkbox.',
          additionalProperties: true,
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'create_scheduled_agent',
    description: 'Create a real, persistent background scheduled agent that the cron runner will execute on a recurring schedule. ALWAYS available. Call this AFTER you have written and opened the agent specification document via open_canvas. This actually creates the agent in the database — it is not a draft. Provide a clear name, a detailed task_description written as a direct instruction to the future agent (what to do every run, what to filter, what to deliver), and a valid 5-field cron expression.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Short human name for the agent, e.g. "Mailient Whale Scout Daily Harvest"' },
        task_description: { type: 'string', description: 'The full instruction the agent runs every time it fires. Write it as a direct, self-contained command including all filtering rules, data sources, and what to deliver.' },
        cron_schedule: { type: 'string', description: '5-field cron expression "m h dom mon dow" in the user\'s local time, e.g. "5 5 * * *" for daily at 05:05.' },
        output_channel: { type: 'string', enum: ['gmail', 'slack', 'both'], description: 'Where the report is delivered. Default "gmail".' },
        slack_channel: { type: 'string', description: 'Slack channel name (only if output_channel is slack or both).' },
        skip_confirmations: { type: 'boolean', description: 'If true, the agent acts (sends/publishes) without asking for approval. Default false.' },
        expires_at: { type: 'string', description: 'Optional ISO date (YYYY-MM-DD) after which the agent auto-pauses. Omit for no expiry.' },
      },
      required: ['name', 'task_description', 'cron_schedule'],
    },
  },
  {
    name: 'request_confirmation',
    description: 'Pause execution and show the user a confirmation card before performing a major action. Call this BEFORE: send_email (direct send), schedule_meeting (create calendar event), send_slack_message to any channel, create_notion_page. Do NOT use for draft_reply (drafts are reviewed in the UI). After calling, STOP — do not call any more tools in this turn. When the user confirms, proceed with the action in the next run.',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'Short label for the action, e.g. "Send email", "Create calendar event", "Post to Slack"' },
        description: { type: 'string', description: 'One sentence describing exactly what will happen.' },
        details: {
          type: 'object',
          description: 'Key field/value pairs shown to the user (e.g. { "To": "john@example.com", "Subject": "Project update", "Channel": "#general" })',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['action', 'description'],
    },
  },
  {
    name: 'ask_user',
    description: 'Ask the user clarifying questions before proceeding. Use this ONLY when the instruction is genuinely ambiguous and you cannot make a reasonable default decision. Keep questions concise. Provide 2-3 short option labels when the answer space is bounded; omit options for open-ended questions. Maximum 3 questions per call.',
    input_schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          description: 'One to three questions to ask the user.',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'The question text.' },
              options: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: 2-3 short predefined choice labels. Always omit if any answer is valid.',
              },
            },
            required: ['text'],
          },
        },
      },
      required: ['questions'],
    },
  },
];

// ── Integration → tool mapping ─────────────────────────────────────────────────
// null = always available (no integration needed)
const TOOL_INTEGRATION_MAP: Record<string, string | null> = {
  search_gmail: 'gmail',
  read_email: 'gmail',
  get_sent_emails: 'gmail',
  draft_reply: 'gmail',
  send_email: 'gmail',
  schedule_meeting: 'gcal',
  get_calendar_events: 'gcal',
  search_notion: 'notion',
  fetch_notion_schema: 'notion',
  create_notion_page: 'notion',
  open_canvas: null,
  web_search: null,
  send_slack_message: 'slack',
  create_scheduled_agent: null,
  ask_user: null,
};

/**
 * Returns only the tool schemas the user can actually use,
 * based on which integrations they have connected.
 * Tools with no required integration are always included.
 */
export function getAvailableTools(connectedIntegrations: string[]): ToolSchema[] {
  const connected = new Set(connectedIntegrations);
  return TOOL_SCHEMAS.filter(schema => {
    const required = TOOL_INTEGRATION_MAP[schema.name];
    return required === null || connected.has(required);
  });
}

// ── Tool implementations ───────────────────────────────────────────────────────

export interface ToolResult {
  output: string;
  requiresConfirmation?: boolean;
  canvasData?: {
    title: string;
    type: string;
    markdown: string;
    draftMeta?: { to?: string; subject?: string; threadId?: string; body?: string; recipientName?: string };
    pageMeta?: { url?: string; pageId?: string; contentPreview?: string; meetLink?: string; startTime?: string; attendees?: string[]; [key: string]: any };
  };
}

function ts() { return new Date().toISOString().slice(11, 23); }

export async function executeTool(
  name: string,
  input: Record<string, any>,
  userId: string
): Promise<ToolResult> {
  const start = Date.now();
  try {
    let result: ToolResult;
    switch (name) {
      case 'search_gmail':      result = await searchGmail(userId, input); break;
      case 'read_email':        result = await readEmail(userId, input); break;
      case 'get_sent_emails':   result = await getSentEmails(userId, input); break;
      case 'draft_reply':       result = await draftReply(userId, input); break;
      case 'send_email':        result = await sendEmail(userId, input); break;
      case 'request_confirmation': result = await requestConfirmation(input); break;
      case 'schedule_meeting':  result = await scheduleMeeting(userId, input); break;
      case 'get_calendar_events': result = await getCalendarEvents(userId, input); break;
      case 'search_notion':      result = await searchNotion(userId, input); break;
      case 'fetch_notion_schema': result = await fetchNotionSchemaForAgent(userId, input); break;
      case 'create_notion_page': result = await createNotionPage(userId, input); break;
      case 'open_canvas':       result = openCanvas(input); break;
      case 'web_search':        result = await webSearch(input); break;
      case 'send_slack_message': result = await sendSlackMessage(userId, input); break;
      case 'create_scheduled_agent': result = await createScheduledAgent(userId, input); break;
      default:
        console.warn(`[Arcus:Tools] ${ts()} Unknown tool requested: "${name}"`);
        return { output: `Unknown tool: ${name}` };
    }
    console.log(`[Arcus:Tools] ${ts()} ${name} ok (${Date.now() - start}ms) output=${result.output.length}chars`);
    return result;
  } catch (err: any) {
    console.error(`[Arcus:Tools] ${ts()} ${name} FAILED (${Date.now() - start}ms)`, {
      error: err.message,
      stack: err.stack?.slice(0, 400),
      input: JSON.stringify(input).slice(0, 200),
      userId,
    });
    throw err;
  }
}

// ── Implementations ────────────────────────────────────────────────────────────

async function searchGmail(userId: string, input: any): Promise<ToolResult> {
  let token = await getGmailToken(userId);
  if (!token) return { output: 'Gmail is not connected. Ask the user to connect Gmail in Settings → Integrations.' };

  const max = Math.min(input.maxResults || 10, 25);
  const params = new URLSearchParams({ q: input.query, maxResults: String(max) });
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`;

  let listRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
  if (listRes.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) { token = newToken; listRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) }); }
  }
  if (!listRes.ok) return { output: `Gmail search failed (${listRes.status}).` };

  const listData = await listRes.json();
  const messages: any[] = listData.messages || [];
  if (!messages.length) return { output: 'No emails found matching that query.' };

  const details = await Promise.all(messages.slice(0, max).map(async ({ id }: any) => {
    try {
      const r = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=Message-ID`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
      );
      if (!r.ok) return null;
      const m = await r.json();
      const h = m.payload?.headers || [];
      return { id: m.id, threadId: m.threadId, from: getHeader(h, 'From'), subject: getHeader(h, 'Subject'), date: getHeader(h, 'Date'), snippet: (m.snippet || '').slice(0, 200) };
    } catch { return null; }
  }));

  const valid = details.filter(Boolean);
  if (!valid.length) return { output: 'Found emails but could not read metadata.' };

  const lines = valid.map((m: any, i: number) =>
    `${i + 1}. [ID: ${m.id}] [Thread: ${m.threadId}]\n   From: ${m.from}\n   Subject: ${m.subject}\n   Date: ${m.date}\n   Preview: ${m.snippet}`
  );
  const rawOutput = `Found ${valid.length} email(s) for query "${input.query}":\n\n${lines.join('\n\n')}`;

  // Pattern Recognition Intelligence: annotate results with booking links, calendar invites,
  // time-sensitive demands, and revenue opportunities so the LLM surfaces them immediately.
  return { output: annotateSearchResultsWithSignals(rawOutput) };
}

async function readEmail(userId: string, input: any): Promise<ToolResult> {
  let token = await getGmailToken(userId);
  if (!token) return { output: 'Gmail is not connected.' };

  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${input.messageId}?format=full`;
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
  if (res.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) { token = newToken; res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) }); }
  }
  if (!res.ok) return { output: `Could not read email (${res.status}).` };

  const m = await res.json();
  const h = m.payload?.headers || [];
  const body = extractBody(m.payload);
  const rfcId = getHeader(h, 'Message-ID');

  const rawOutput = [
    `Message-ID: ${m.id}`,
    `Thread-ID: ${m.threadId}`,
    `RFC-Message-ID: ${rfcId}`,
    `From: ${getHeader(h, 'From')}`,
    `To: ${getHeader(h, 'To')}`,
    `Subject: ${getHeader(h, 'Subject')}`,
    `Date: ${getHeader(h, 'Date')}`,
    '',
    '--- Body ---',
    body || '(no plain text body)',
  ].join('\n');

  // Pattern Recognition Intelligence: annotate with booking links, calendar invites,
  // time-sensitive demands, and revenue opportunities detected in the email body.
  return { output: annotateEmailWithSignals(rawOutput) };
}

async function getSentEmails(userId: string, input: any): Promise<ToolResult> {
  let token = await getGmailToken(userId);
  if (!token) return { output: 'Gmail is not connected.' };

  const limit = Math.min(input.limit || 30, 50);
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}&labelIds=SENT`;
  let listRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
  if (listRes.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) { token = newToken; listRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) }); }
  }
  if (!listRes.ok) return { output: `Could not fetch sent emails (${listRes.status}).` };

  const listData = await listRes.json();
  const messages: any[] = (listData.messages || []).slice(0, limit);
  if (!messages.length) return { output: 'No sent emails found.' };

  const details = await Promise.all(messages.slice(0, 15).map(async ({ id }: any) => {
    try {
      const r = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
      );
      if (!r.ok) return null;
      const m = await r.json();
      const h = m.payload?.headers || [];
      const body = extractBody(m.payload, 500);
      return { subject: getHeader(h, 'Subject'), to: getHeader(h, 'To'), body };
    } catch { return null; }
  }));

  const valid = details.filter(Boolean);
  const lines = valid.map((m: any) => `To: ${m.to}\nSubject: ${m.subject}\n${m.body}`);

  // Append the user's saved voice profile so the LLM has it right before writing the draft body.
  let voiceGuide = '';
  try {
    const { voiceProfileService } = await import('../voice-profile-service.js');
    const profile = await voiceProfileService.getVoiceProfile(userId);
    if (profile && profile.status !== 'default') {
      const prompt = voiceProfileService.generateVoicePrompt(profile);
      if (prompt && typeof prompt === 'string' && prompt.trim()) {
        voiceGuide = `

════════════════════════════════════════
VOICE PROFILE — APPLY THIS EXACTLY WHEN WRITING THE DRAFT BODY:
${prompt.trim()}

You have just read the user's real sent emails above. Cross-reference the samples with the profile. The draft body MUST match both — do not default to a generic professional tone.
════════════════════════════════════════`;
      }
    }
  } catch {
    // non-fatal — proceed without voice guide
  }

  return { output: `${valid.length} recent sent emails for style analysis:\n\n${lines.join('\n\n---\n\n')}${voiceGuide}` };
}

async function draftReply(userId: string, input: any): Promise<ToolResult> {
  let token = await getGmailToken(userId);
  if (!token) return { output: 'Gmail is not connected.' };

  const subject = input.subject || 'Re: (no subject)';
  const raw = buildRaw(input.to, subject, input.body, input.threadId, input.inReplyToMessageId);
  const draftBody = JSON.stringify({ message: { raw, threadId: input.threadId } });

  let res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: draftBody,
    signal: AbortSignal.timeout(12000),
  });
  if (res.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) {
      token = newToken;
      res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: draftBody,
        signal: AbortSignal.timeout(12000),
      });
    }
  }

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return { output: `Failed to save draft (${res.status}): ${err.slice(0, 200)}` };
  }

  const draft = await res.json();
  const previewUrl = `https://mail.google.com/mail/u/0/#drafts/${draft.message?.id || ''}`;

  const displayName = input.recipientName || input.to.split('@')[0];

  return {
    output: `Draft saved to Gmail successfully.\nTo: ${displayName} <${input.to}>\nSubject: ${subject}\n\nDraft body (first 400 chars):\n${input.body.slice(0, 400)}${input.body.length > 400 ? '...' : ''}\n\nNow write your final response: confirm what you did, include the subject line and the opening lines of the draft verbatim, and tell the user to review and send from the draft panel. Do NOT call send_email.`,
    canvasData: {
      title: `Draft: ${subject}`,
      type: 'email_draft',
      markdown: [
        `**To:** ${displayName} <${input.to}>`,
        `**Subject:** ${subject}`,
        '',
        '---',
        '',
        input.body,
        '',
        '---',
        '',
        `[Open in Gmail](${previewUrl})`,
      ].join('\n'),
      draftMeta: { to: input.to, subject, threadId: input.threadId, body: input.body, recipientName: displayName },
    },
  };
}

async function sendEmail(userId: string, input: any): Promise<ToolResult> {
  let token = await getGmailToken(userId);
  if (!token) return { output: 'Gmail is not connected.' };

  const raw = buildRaw(input.to, input.subject, input.body, input.threadId);
  const reqBody: Record<string, any> = { raw };
  if (input.threadId) reqBody.threadId = input.threadId;
  const sendBodyStr = JSON.stringify(reqBody);

  let res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: sendBodyStr,
    signal: AbortSignal.timeout(12000),
  });
  if (res.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) {
      token = newToken;
      res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: sendBodyStr,
        signal: AbortSignal.timeout(12000),
      });
    }
  }

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return { output: `Failed to send email (${res.status}): ${err.slice(0, 200)}` };
  }

  const sent = await res.json();
  return { output: `Email sent successfully! Message ID: ${sent.id}\nTo: ${input.to}\nSubject: ${input.subject}` };
}

async function scheduleMeeting(userId: string, input: any): Promise<ToolResult> {
  let token = await getGcalToken(userId);
  if (!token) return { output: 'Google Calendar is not connected. Ask the user to connect it in Settings → Integrations.' };

  const event: Record<string, any> = {
    summary: input.title,
    start: { dateTime: input.startTime },
    end: { dateTime: input.endTime },
    description: input.description || '',
    conferenceData: {
      createRequest: { requestId: `arcus-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } },
    },
  };

  if (input.attendees?.length) {
    event.attendees = input.attendees.map((e: string) => ({ email: e }));
  }

  const calUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all';
  const eventBodyStr = JSON.stringify(event);

  let res = await fetch(calUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: eventBodyStr,
    signal: AbortSignal.timeout(12000),
  });
  if (res.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) {
      token = newToken;
      res = await fetch(calUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: eventBodyStr,
        signal: AbortSignal.timeout(12000),
      });
    }
  }

  if (!res.ok) {
    if (isScopeError(res.status)) return { output: CALENDAR_SCOPE_MESSAGE };
    const err = await res.text().catch(() => '');
    return { output: `Failed to create event (${res.status}): ${err.slice(0, 200)}` };
  }

  const created = await res.json();
  const meetLink = created.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri || '';

  return {
    output: [
      `Meeting created: "${created.summary}"`,
      `Start: ${created.start?.dateTime}`,
      meetLink ? `Meet: ${meetLink}` : '',
      input.attendees?.length ? `Attendees: ${input.attendees.join(', ')}` : '',
      `Now confirm to the user what was scheduled and provide the meet link.`,
    ].filter(Boolean).join('\n'),
    canvasData: {
      title: created.summary || input.title || 'Meeting',
      type: 'calendar_event',
      markdown: '',
      pageMeta: {
        url: created.htmlLink,
        meetLink,
        startTime: created.start?.dateTime,
        attendees: input.attendees || [],
        contentPreview: input.description || '',
      },
    },
  };
}

async function getCalendarEvents(userId: string, input: any): Promise<ToolResult> {
  let token = await getGcalToken(userId);
  if (!token) return { output: 'Google Calendar is not connected.' };

  const days = input.daysAhead || 7;
  const max = input.maxResults || 20;
  const now = new Date();
  const end = new Date(now.getTime() + days * 86400000);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(max),
  });

  const calEventsUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`;
  let res = await fetch(calEventsUrl, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
  if (res.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) { token = newToken; res = await fetch(calEventsUrl, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }); }
  }
  if (!res.ok) {
    if (isScopeError(res.status)) return { output: CALENDAR_SCOPE_MESSAGE };
    return { output: `Calendar fetch failed (${res.status}).` };
  }

  const data = await res.json();
  const events = data.items || [];
  if (!events.length) return { output: 'No upcoming events in the next ' + days + ' days.' };

  const lines = events.map((e: any, i: number) => {
    const start = e.start?.dateTime || e.start?.date || 'Unknown';
    const attendees = (e.attendees || []).map((a: any) => a.email).join(', ');
    return `${i + 1}. ${e.summary || '(no title)'}\n   When: ${start}\n   Attendees: ${attendees || 'None'}`;
  });

  return { output: `${events.length} upcoming events:\n\n${lines.join('\n\n')}` };
}

async function searchNotion(userId: string, input: any): Promise<ToolResult> {
  const token = await getNotionToken(userId);
  if (!token) return { output: 'Notion is not connected. Ask the user to connect Notion in Settings → Integrations.' };

  const max = Math.min(input.maxResults || 5, 10);
  const res = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
    body: JSON.stringify({
      query: input.query,
      filter: { value: 'page', property: 'object' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: max,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return { output: `Notion search failed (${res.status}).` };

  const data = await res.json();
  const pages = data.results || [];
  if (!pages.length) return { output: 'No Notion pages found for that query.' };

  const lines = pages.map((p: any, i: number) => {
    const titleProp = Object.values(p.properties || {}).find((pr: any) => pr.type === 'title') as any;
    const title = titleProp?.title?.[0]?.plain_text || 'Untitled';
    return `${i + 1}. ${title}\n   ID: ${p.id}\n   URL: ${p.url}\n   Last edited: ${p.last_edited_time?.split('T')[0] || ''}`;
  });

  return { output: `Found ${pages.length} Notion page(s):\n\n${lines.join('\n\n')}` };
}

// ── Notion schema introspection helpers ────────────────────────────────────────

interface NotionPropInfo { name: string; type: string; options?: string[] }

function parseNotionDbSchema(db: any): NotionPropInfo[] {
  const props = db.properties || {};
  return Object.entries(props).map(([name, val]: [string, any]) => ({
    name,
    type: val.type as string,
    options: val.select?.options?.map((o: any) => o.name)
      ?? val.status?.options?.map((o: any) => o.name)
      ?? [],
  }));
}

function findNotionProp(schema: NotionPropInfo[], types: string[]): NotionPropInfo | undefined {
  return schema.find(p => types.includes(p.type));
}

function buildNotionDbProperties(
  schema: NotionPropInfo[],
  title: string,
  agentProps: Record<string, any> = {},
  skipped: string[],
): Record<string, any> {
  const props: Record<string, any> = {};

  const titleProp = findNotionProp(schema, ['title']);
  if (titleProp) {
    props[titleProp.name] = { title: [{ type: 'text', text: { content: title.slice(0, 2000) } }] };
  } else {
    skipped.push('title (no title-type property in schema)');
  }

  // Map agent-provided extra props to real schema fields
  for (const [key, value] of Object.entries(agentProps)) {
    const schemaProp = schema.find(p => p.name.toLowerCase() === key.toLowerCase());
    if (!schemaProp) {
      skipped.push(`"${key}" (not in database schema)`);
      continue;
    }
    try {
      switch (schemaProp.type) {
        case 'rich_text':
          props[schemaProp.name] = { rich_text: [{ type: 'text', text: { content: String(value).slice(0, 2000) } }] };
          break;
        case 'select':
          props[schemaProp.name] = { select: { name: String(value) } };
          break;
        case 'multi_select': {
          const vals = Array.isArray(value) ? value : String(value).split(',').map((v: string) => v.trim());
          props[schemaProp.name] = { multi_select: vals.map((v: string) => ({ name: v })) };
          break;
        }
        case 'date':
          props[schemaProp.name] = { date: { start: String(value) } };
          break;
        case 'number':
          props[schemaProp.name] = { number: Number(value) };
          break;
        case 'checkbox':
          props[schemaProp.name] = { checkbox: Boolean(value) };
          break;
        case 'url':
          props[schemaProp.name] = { url: String(value) };
          break;
        case 'email':
          props[schemaProp.name] = { email: String(value) };
          break;
        case 'phone_number':
          props[schemaProp.name] = { phone_number: String(value) };
          break;
        case 'status':
          props[schemaProp.name] = { status: { name: String(value) } };
          break;
        default:
          skipped.push(`"${key}" (type "${schemaProp.type}" mapping not supported — write it in content instead)`);
      }
    } catch {
      skipped.push(`"${key}" (failed to map value)`);
    }
  }

  return props;
}

// ── fetch_notion_schema (agent-callable) ───────────────────────────────────────

async function fetchNotionSchemaForAgent(userId: string, input: any): Promise<ToolResult> {
  const token = await getNotionToken(userId);
  if (!token) return { output: 'Notion is not connected. Ask the user to connect Notion in Settings → Integrations.' };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };

  let dbId = input.parentId ?? null;
  let dbTitle = input.database ?? 'unknown';

  if (!dbId) {
    try {
      const searchRes = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: input.database,
          filter: { value: 'database', property: 'object' },
          page_size: 8,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const results: any[] = searchData.results ?? [];
        const hint = (input.database as string).toLowerCase();
        const scored = results.map((r: any) => {
          const t = (r.title?.[0]?.plain_text ?? '').toLowerCase();
          return { r, score: t === hint ? 2 : t.includes(hint) ? 1 : 0 };
        }).sort((a: any, b: any) => b.score - a.score);
        const best = scored[0]?.r;
        if (best) {
          dbId = best.id;
          dbTitle = best.title?.[0]?.plain_text ?? input.database;
        }
      }
    } catch { /* fallthrough */ }
  }

  if (!dbId) {
    return { output: `Could not find a Notion database matching "${input.database}". Try a broader name like "meetings", "tasks", or "contacts". Use search_notion to discover available database names.` };
  }

  const schema = await fetchNotionDbSchema(headers, dbId);
  if (!schema) {
    return { output: `Found database "${dbTitle}" but could not read its schema. Notion may not have granted access to this database.` };
  }

  const schemaLines = schema.map(p => {
    const opts = p.options?.length ? ` — options: [${p.options.slice(0, 10).join(', ')}]` : '';
    return `  • "${p.name}" (${p.type})${opts}`;
  }).join('\n');

  return {
    output: `Notion database schema for "${dbTitle}":\ndatabase_id: ${dbId}\n\nProperties:\n${schemaLines}\n\nNow call create_notion_page with parentId: "${dbId}" and properties using these EXACT names.`,
  };
}

async function fetchNotionDbSchema(
  headers: Record<string, string>,
  dbId: string,
): Promise<NotionPropInfo[] | null> {
  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const db = await res.json();
    return parseNotionDbSchema(db);
  } catch {
    return null;
  }
}

// ── createNotionPage ────────────────────────────────────────────────────────────

async function createNotionPage(userId: string, input: any): Promise<ToolResult> {
  const token = await getNotionToken(userId);
  if (!token) return { output: 'Notion is not connected. Ask the user to connect Notion in Settings → Integrations.' };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };

  const skipped: string[] = [];

  // ── Step 1: Resolve parent (explicit ID → database search → free-form page) ──
  let parentBlock: Record<string, any> | null = null;
  let dbSchema: NotionPropInfo[] | null = null;

  if (input.parentId) {
    parentBlock = { type: 'database_id', database_id: input.parentId };
    dbSchema = await fetchNotionDbSchema(headers, input.parentId);
  } else if (input.database) {
    try {
      const searchRes = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: input.database,
          filter: { value: 'database', property: 'object' },
          page_size: 8,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        // Score results: prefer exact title match, then partial
        const results: any[] = searchData.results ?? [];
        const hint = (input.database as string).toLowerCase();
        const scored = results.map((r: any) => {
          const t = (r.title?.[0]?.plain_text ?? '').toLowerCase();
          return { r, score: t === hint ? 2 : t.includes(hint) ? 1 : 0 };
        }).sort((a: any, b: any) => b.score - a.score);
        const best = scored[0]?.r;
        if (best) {
          parentBlock = { type: 'database_id', database_id: best.id };
          dbSchema = await fetchNotionDbSchema(headers, best.id);
        }
      }
    } catch { /* fallthrough */ }
  }

  // Fallback: free-form page anywhere in the workspace
  if (!parentBlock) {
    try {
      const fallbackRes = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ filter: { value: 'page', property: 'object' }, page_size: 1 }),
        signal: AbortSignal.timeout(8000),
      });
      if (fallbackRes.ok) {
        const fb = await fallbackRes.json();
        const pg = fb.results?.[0];
        if (pg) {
          parentBlock = { type: 'page_id', page_id: pg.id };
          skipped.push(`database hint "${input.database}" (not found — created as free-form page)`);
        }
      }
    } catch { /* fallthrough */ }
  }

  if (!parentBlock) {
    return { output: `Failed to create Notion page: could not locate a database matching "${input.database ?? 'unknown'}" and no fallback page found. Ensure Notion is connected with workspace access.` };
  }

  // ── Step 2: Build properties from real schema ─────────────────────────────
  const isDatabase = parentBlock.type === 'database_id';
  let properties: Record<string, any>;

  if (isDatabase && dbSchema) {
    properties = buildNotionDbProperties(dbSchema, input.title ?? 'Untitled', input.properties ?? {}, skipped);
  } else {
    // Free-form page or no schema available — use generic title property
    properties = { title: { title: [{ type: 'text', text: { content: (input.title ?? 'Untitled').slice(0, 2000) } }] } };
  }

  // ── Step 3: Build children blocks from content ────────────────────────────
  const rawContent: string = input.content ?? '';
  const children = rawContent
    .split(/\n{2,}/)
    .map((chunk: string) => chunk.trim())
    .filter(Boolean)
    .slice(0, 90)
    .map((text: string) => ({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: text.slice(0, 2000) } }] },
    }));

  // ── Step 4: Create the page ───────────────────────────────────────────────
  const pageBody: Record<string, any> = { parent: parentBlock, properties, children };

  let createRes = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers,
    body: JSON.stringify(pageBody),
    signal: AbortSignal.timeout(15000),
  });

  // On schema rejection, fall back to free-form page under any workspace page
  if (!createRes.ok && isDatabase && (createRes.status === 400 || createRes.status === 422)) {
    const errDetail = await createRes.text().catch(() => '');
    skipped.push(`database parent rejected (${createRes.status}: ${errDetail.slice(0, 120)}) — fell back to free-form page`);
    try {
      const fpRes = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ filter: { value: 'page', property: 'object' }, page_size: 1 }),
        signal: AbortSignal.timeout(8000),
      });
      if (fpRes.ok) {
        const fb = await fpRes.json();
        const pg = fb.results?.[0];
        if (pg) {
          const retryBody = {
            parent: { type: 'page_id', page_id: pg.id },
            properties: { title: { title: [{ type: 'text', text: { content: (input.title ?? 'Untitled').slice(0, 2000) } }] } },
            children,
          };
          createRes = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers,
            body: JSON.stringify(retryBody),
            signal: AbortSignal.timeout(12000),
          });
        }
      }
    } catch { /* fallthrough */ }
  }

  if (!createRes.ok) {
    const err = await createRes.text().catch(() => '');
    const skipNote = skipped.length ? ` Fields skipped: ${skipped.join('; ')}.` : '';
    return { output: `Failed to create Notion page "${input.title}" (${createRes.status}): ${err.slice(0, 200)}.${skipNote}` };
  }

  const created = await createRes.json();
  const contentPreview = rawContent
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 160);

  const skipNote = skipped.length
    ? ` Note: ${skipped.join('; ')}.`
    : '';

  return {
    output: `Notion page created: "${input.title}"\nURL: ${created.url}${skipNote}`,
    canvasData: {
      title: input.title,
      type: 'notion_page',
      markdown: rawContent,
      pageMeta: { url: created.url, pageId: created.id, contentPreview },
    },
  };
}

function openCanvas(input: any): ToolResult {
  if (!input.markdown?.trim()) {
    return { output: 'Error: open_canvas requires non-empty markdown content. Write the full document content and pass it in the markdown parameter, then call open_canvas again.' };
  }
  const isAgentSpec = input.type === 'report' && (
    input.title?.toLowerCase().includes('agent') ||
    input.markdown?.toLowerCase().includes('agent objective') ||
    input.markdown?.toLowerCase().includes('cron')
  );
  return {
    output: isAgentSpec
      ? `Canvas opened: "${input.title}". The specification is now visible to the user. IMPORTANT: You must now immediately call create_scheduled_agent to register this agent in the system. The agent is NOT yet created — open_canvas only displayed the spec.`
      : `Canvas opened: "${input.title}"`,
    canvasData: {
      title: input.title,
      type: input.type || 'notes',
      markdown: input.markdown,
      draftMeta: input.draftMeta,
    },
  };
}

async function webSearch(input: any): Promise<ToolResult> {
  const query = input.query;
  const max = Math.min(input.maxResults || 6, 10);

  const fmt = (items: string[]) =>
    `Web search results for "${query}":\n\n${items.join('\n\n')}`;

  // Layer 1: Serper.dev — Google-quality results (requires SERPER_API_KEY)
  if (process.env.SERPER_API_KEY) {
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: max }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const items: string[] = [];
        if (data.answerBox?.answer) items.push(`**Answer:** ${data.answerBox.answer}`);
        for (const r of (data.organic || []).slice(0, max)) {
          items.push(`**${r.title}**\n${r.snippet}\n${r.link}`);
        }
        if (items.length) return { output: fmt(items) };
      }
    } catch { /* fallthrough */ }
  }

  // Layer 2: Brave Search API (requires BRAVE_SEARCH_API_KEY)
  if (process.env.BRAVE_SEARCH_API_KEY) {
    try {
      const params = new URLSearchParams({ q: query, count: String(max) });
      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
        headers: { Accept: 'application/json', 'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const items: string[] = [];
        for (const r of (data.web?.results || []).slice(0, max)) {
          items.push(`**${r.title}**\n${r.description}\n${r.url}`);
        }
        if (items.length) return { output: fmt(items) };
      }
    } catch { /* fallthrough */ }
  }

  // Layer 3: DuckDuckGo HTML search — parse real result snippets
  try {
    const params = new URLSearchParams({ q: query, kl: 'us-en' });
    const res = await fetch(`https://html.duckduckgo.com/html/?${params}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Arcus/1.0)', Accept: 'text/html' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const html = await res.text();
      const items: string[] = [];
      // Extract result titles and snippets via regex
      const blocks = [...html.matchAll(/class="result__body"[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)];
      const titles = [...html.matchAll(/class="result__a"[^>]*>([\s\S]*?)<\/a>/g)];
      const urls = [...html.matchAll(/class="result__url"[^>]*>([\s\S]*?)<\/span>/g)];
      const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").trim();
      for (let i = 0; i < Math.min(max, titles.length); i++) {
        const title = strip(titles[i]?.[1] ?? '');
        const snippet = strip(blocks[i]?.[1] ?? '');
        const url = strip(urls[i]?.[1] ?? '');
        if (title) items.push([title, snippet, url].filter(Boolean).join('\n'));
      }
      if (items.length) return { output: fmt(items) };
    }
  } catch { /* fallthrough */ }

  // Layer 4: DuckDuckGo Instant Answer (last resort — knowledge base only)
  try {
    const params = new URLSearchParams({ q: query, format: 'json', no_html: '1', skip_disambig: '1' });
    const res = await fetch(`https://api.duckduckgo.com/?${params}`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      const items: string[] = [];
      if (data.AbstractText) items.push(`**Summary:** ${data.AbstractText.slice(0, 600)}`);
      for (const t of (data.RelatedTopics as any[] || []).slice(0, max)) {
        if (t.Text) items.push(`• ${t.Text.slice(0, 300)}`);
      }
      if (items.length) return { output: fmt(items) };
    }
  } catch { /* fallthrough */ }

  return { output: `Web search for "${query}": All search providers are temporarily unavailable. Try rephrasing the query or breaking it into a more specific term.` };
}

async function sendSlackMessage(userId: string, input: any): Promise<ToolResult> {
  const token = await getSlackToken(userId);
  if (!token) return { output: 'Slack is not connected. Ask the user to connect Slack in Settings → Integrations.' };

  // Get DM channel with the user themselves for "dm" target
  let channelId = input.channel;
  if (input.channel === 'dm' || input.channel === 'self') {
    try {
      const identityRes = await fetch('https://slack.com/api/auth.test', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const identity = await identityRes.json();
      if (identity.ok && identity.user_id) {
        const dmRes = await fetch('https://slack.com/api/conversations.open', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: identity.user_id }),
        });
        const dmData = await dmRes.json();
        if (dmData.ok) channelId = dmData.channel.id;
      }
    } catch { /* fallthrough */ }
  }

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: channelId, text: input.text, mrkdwn: true }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return { output: `Slack message failed (${res.status}).` };
  const data = await res.json();
  if (!data.ok) return { output: `Slack error: ${data.error}` };
  return { output: `Slack message sent to ${input.channel} ✅` };
}

// ── Scheduled agent creation ───────────────────────────────────────────────────

const INTEGRATION_DETECTION: Record<string, RegExp> = {
  gmail: /\b(gmail|email|mail|inbox|newsletter|draft|outreach|cold[\s-]?outreach|send.*email|email.*send|unread)\b/i,
  gcal:  /\b(calendar|meeting|schedule|event|appointment|book.*meeting|meet.*link|google[\s-]?meet)\b/i,
  slack: /\b(slack|slack[\s-]?message|slack[\s-]?dm|post.*slack|slack.*channel)\b/i,
  notion: /\b(notion|notes|page|database|write.*notion|notion.*page|notion.*db)\b/i,
};

function detectRequiredIntegrations(taskDescription: string, outputChannel: string): string[] {
  const needed = new Set<string>();
  for (const [key, re] of Object.entries(INTEGRATION_DETECTION)) {
    if (re.test(taskDescription)) needed.add(key);
  }
  if (outputChannel === 'gmail' || outputChannel === 'email') needed.add('gmail');
  if (outputChannel === 'slack') needed.add('slack');
  return [...needed];
}

const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Human-readable label for the cron patterns the create form / LLM produce. */
function cronToLabel(cron: string): string {
  const p = cron.trim().split(/\s+/);
  if (p.length !== 5) return `Schedule: ${cron}`;
  const [min, hour, , , dow] = p;
  const hh = /^\d+$/.test(hour) ? hour.padStart(2, '0') : hour;
  const mm = /^\d+$/.test(min) ? min.padStart(2, '0') : min;
  if (hour.startsWith('*/')) return `Every ${hour.slice(2)} hour(s)`;
  if (min.startsWith('*/')) return `Every ${min.slice(2)} minute(s)`;
  const at = `${hh}:${mm}`;
  if (dow === '*') return `Daily at ${at}`;
  if (/^\d$/.test(dow)) return `Weekly on ${DOW_NAMES[Number(dow)]} at ${at}`;
  return `At ${at} (${cron})`;
}

/** Returns the TZ offset in minutes for `tz` at `date` (positive = ahead of UTC). */
function getUtcOffsetMinutes(tz: string, date: Date): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    const get = (t: string) => parseInt(fmt.formatToParts(date).find(p => p.type === t)?.value ?? '0');
    const localAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
    return (localAsUtc - date.getTime()) / 60000;
  } catch { return 0; }
}

/** Next fire time for the given cron, interpreted in the user's timezone, as a UTC ISO string. */
function nextRunIso(cron: string, tz = 'UTC'): string | null {
  const p = cron.trim().split(/\s+/);
  if (p.length !== 5) return null;
  const [minS, hourS, , , dowS] = p;
  const now = new Date();
  const next = new Date(now);

  // Interval-based patterns have no timezone meaning — use UTC
  if (hourS.startsWith('*/')) {
    const step = parseInt(hourS.slice(2)) || 1;
    next.setMinutes(/^\d+$/.test(minS) ? parseInt(minS) : 0, 0, 0);
    while (next <= now || next.getUTCHours() % step !== 0) next.setHours(next.getHours() + 1);
    return next.toISOString();
  }
  if (minS.startsWith('*/')) {
    const step = parseInt(minS.slice(2)) || 15;
    next.setSeconds(0, 0);
    do { next.setMinutes(next.getMinutes() + 1); } while (next <= now || next.getMinutes() % step !== 0);
    return next.toISOString();
  }

  const h = parseInt(hourS), m = parseInt(minS);
  if (isNaN(h) || isNaN(m)) return null;

  // Shift `now` into the user's TZ coordinate space
  const offsetMin = getUtcOffsetMinutes(tz, now);
  const nowLocal = new Date(now.getTime() + offsetMin * 60000);
  const y = nowLocal.getUTCFullYear(), mo = nowLocal.getUTCMonth(), d = nowLocal.getUTCDate();
  let targetLocal = new Date(Date.UTC(y, mo, d, h, m, 0, 0));

  if (/^\d$/.test(dowS)) {
    const targetDow = Number(dowS);
    while (targetLocal <= nowLocal || targetLocal.getUTCDay() !== targetDow) {
      targetLocal = new Date(targetLocal.getTime() + 86_400_000);
    }
  } else if (targetLocal <= nowLocal) {
    targetLocal = new Date(targetLocal.getTime() + 86_400_000);
  }

  return new Date(targetLocal.getTime() - offsetMin * 60000).toISOString();
}

async function getUserTimezone(userId: string): Promise<string> {
  try {
    const { getSupabaseAdmin } = await import('../supabase.js');
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('user_profiles')
      .select('preferences')
      .ilike('user_id', userId)
      .maybeSingle();
    return (data?.preferences as Record<string, unknown>)?.timezone as string || 'UTC';
  } catch { return 'UTC'; }
}

async function requestConfirmation(input: any): Promise<ToolResult> {
  const details: Record<string, string> = {};
  if (input.details && typeof input.details === 'object') {
    for (const [k, v] of Object.entries(input.details)) {
      if (v !== null && v !== undefined && v !== '') details[k] = String(v);
    }
  }
  return {
    output: `Confirmation requested. Waiting for user to approve: "${input.action}". Do NOT call any more tools — the loop will stop here.`,
    requiresConfirmation: true,
    canvasData: {
      title: input.action || 'Confirm action',
      type: 'confirmation_required',
      markdown: '',
      pageMeta: {
        action: input.action || 'Action',
        description: input.description || '',
        details,
      },
    },
  };
}

async function createScheduledAgent(userId: string, input: any): Promise<ToolResult> {
  if (!input?.name?.trim() || !input?.task_description?.trim()) {
    return { output: 'Cannot create the agent — a name and a task description are both required.' };
  }
  const cron = (input.cron_schedule || '0 7 * * *').trim();
  if (cron.split(/\s+/).length !== 5) {
    return { output: `Invalid cron schedule "${cron}". It must have exactly 5 space-separated fields (m h dom mon dow).` };
  }

  // ── Integration gate ────────────────────────────────────────────────────────
  const required = detectRequiredIntegrations(input.task_description, input.output_channel || 'gmail');
  if (required.length > 0) {
    const connected = await getConnectedIntegrations(userId);
    const missing = required.filter(r => !connected.includes(r));
    if (missing.length > 0) {
      return {
        output: `Cannot create the scheduled agent yet — the following integrations are required but not connected: ${missing.join(', ')}. Ask the user to connect them using the card below, then call create_scheduled_agent again.`,
        canvasData: {
          title: input.name.trim(),
          type: 'integration_required',
          markdown: '',
          pageMeta: {
            required,
            connected: required.filter(r => connected.includes(r)),
            missing,
            agentParams: {
              name: input.name.trim(),
              task_description: input.task_description.trim(),
              cron_schedule: cron,
              output_channel: input.output_channel || 'gmail',
              slack_channel: input.slack_channel || null,
              skip_confirmations: input.skip_confirmations ?? false,
              expires_at: input.expires_at || null,
            },
          } as any,
        },
      };
    }
  }
  // ── End integration gate ────────────────────────────────────────────────────

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('arcus_agents')
    .insert({
      user_id: userId.toLowerCase(),
      name: input.name.trim(),
      task_description: input.task_description.trim(),
      cron_schedule: cron,
      output_channel: input.output_channel || 'gmail',
      slack_channel: input.slack_channel || null,
      skip_confirmations: input.skip_confirmations ?? false,
      expires_at: input.expires_at || null,
      status: 'active',
    })
    .select()
    .single();

  if (error?.code === '42P01') {
    return { output: 'The agents table is not set up in the database yet. Tell the user the scheduled-agents feature needs the arcus_agents migration applied.' };
  }
  if (error) {
    return { output: `Failed to create the scheduled agent: ${error.message}` };
  }

  const scheduleLabel = cronToLabel(cron);
  const userTz = await getUserTimezone(userId);
  const nextRun = nextRunIso(cron, userTz);
  const nextRunLabel = nextRun
    ? new Date(nextRun).toLocaleString('en-US', {
        timeZone: userTz,
        weekday: 'long', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    : null;

  return {
    output: [
      `Scheduled agent "${data.name}" created successfully and is now LIVE.`,
      `Schedule: ${scheduleLabel} (cron: ${cron})`,
      nextRunLabel ? `Next run: ${nextRunLabel}` : '',
      `Delivery: ${data.output_channel}`,
      `Now write a short confirmation to the user telling them the agent is live, when it will next run, and how the report will be delivered. Do NOT call any more tools.`,
    ].filter(Boolean).join('\n'),
    canvasData: {
      title: data.name,
      type: 'scheduled_agent',
      markdown: '',
      pageMeta: {
        pageId: data.id,
        contentPreview: data.task_description,
        // schedule + delivery info packed into existing fields so no new ToolResult shape is needed
        url: '',
        startTime: nextRun || undefined,
        attendees: [scheduleLabel, cron, data.output_channel, String(!!data.skip_confirmations), data.status],
      },
    },
  };
}
