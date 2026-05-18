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
    description: 'Save a reply as a Gmail draft. The draft appears in Gmail Drafts and is shown to the user. Use after reading the thread and analyzing the user\'s writing style. Always show the draft content in your reply message.',
    input_schema: {
      type: 'object',
      properties: {
        threadId: { type: 'string', description: 'Gmail thread ID (from read_email results)' },
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Subject (usually "Re: original subject")' },
        body: { type: 'string', description: 'Email body — must match the user\'s writing style' },
        inReplyToMessageId: { type: 'string', description: 'RFC Message-ID for threading (from read_email)' },
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
  open_canvas: null,
  web_search: null,
  send_slack_message: 'slack',
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
  canvasData?: {
    title: string;
    type: string;
    markdown: string;
    draftMeta?: { to?: string; subject?: string; threadId?: string; body?: string };
  };
}

export async function executeTool(
  name: string,
  input: Record<string, any>,
  userId: string
): Promise<ToolResult> {
  switch (name) {
    case 'search_gmail': return searchGmail(userId, input);
    case 'read_email': return readEmail(userId, input);
    case 'get_sent_emails': return getSentEmails(userId, input);
    case 'draft_reply': return draftReply(userId, input);
    case 'send_email': return sendEmail(userId, input);
    case 'schedule_meeting': return scheduleMeeting(userId, input);
    case 'get_calendar_events': return getCalendarEvents(userId, input);
    case 'search_notion': return searchNotion(userId, input);
    case 'open_canvas': return openCanvas(input);
    case 'web_search': return webSearch(input);
    case 'send_slack_message': return sendSlackMessage(userId, input);
    default: return { output: `Unknown tool: ${name}` };
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
  return { output: `Found ${valid.length} email(s) for query "${input.query}":\n\n${lines.join('\n\n')}` };
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

  return {
    output: [
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
    ].join('\n'),
  };
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
  return { output: `${valid.length} recent sent emails for style analysis:\n\n${lines.join('\n\n---\n\n')}` };
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

  return {
    output: `Draft saved successfully!\nDraft ID: ${draft.id}\nPreview: ${previewUrl}\nTo: ${input.to}\nSubject: ${subject}`,
    canvasData: {
      title: `Draft: ${subject}`,
      type: 'email_draft',
      markdown: [
        `**To:** ${input.to}`,
        `**Subject:** ${subject}`,
        '',
        '---',
        '',
        input.body,
        '',
        '---',
        '',
        `✅ [Open draft in Gmail](${previewUrl})`,
      ].join('\n'),
      draftMeta: { to: input.to, subject, threadId: input.threadId, body: input.body },
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
    const err = await res.text().catch(() => '');
    return { output: `Failed to create event (${res.status}): ${err.slice(0, 200)}` };
  }

  const created = await res.json();
  const meetLink = created.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri || '';

  return {
    output: [
      `✅ Meeting created!`,
      `Title: ${created.summary}`,
      `Start: ${created.start?.dateTime}`,
      `End: ${created.end?.dateTime}`,
      `Calendar: ${created.htmlLink}`,
      meetLink ? `Meet: ${meetLink}` : '',
      input.attendees?.length ? `Invites sent to: ${input.attendees.join(', ')}` : '',
    ].filter(Boolean).join('\n'),
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
  if (!res.ok) return { output: `Calendar fetch failed (${res.status}).` };

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

function openCanvas(input: any): ToolResult {
  return {
    output: `Canvas opened: "${input.title}"`,
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
  const max = input.maxResults || 5;

  // Try DuckDuckGo Instant Answer API (free, no key needed)
  try {
    const params = new URLSearchParams({ q: query, format: 'json', no_html: '1', skip_disambig: '1' });
    const res = await fetch(`https://api.duckduckgo.com/?${params}`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      const results: string[] = [];

      if (data.AbstractText) results.push(`Summary: ${data.AbstractText.slice(0, 500)}`);
      if (data.RelatedTopics?.length) {
        for (const t of (data.RelatedTopics as any[]).slice(0, max)) {
          if (t.Text) results.push(`• ${t.Text.slice(0, 300)}`);
        }
      }

      if (results.length) {
        return { output: `Web search results for "${query}":\n\n${results.join('\n\n')}` };
      }
    }
  } catch { /* fallthrough */ }

  return { output: `Web search for "${query}": Could not retrieve live results. Please note this search was attempted.` };
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
