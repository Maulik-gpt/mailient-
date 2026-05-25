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
import { callLLM, getText } from './engine';
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

    // 1. Try to find in arcus_integrations (V3)
    const { data: v3 } = await supabase
      .from('arcus_integrations')
      .select('refresh_token, provider')
      .eq('user_id', uid)
      .in('provider', ['gcal', 'gmail'])
      .maybeSingle();

    if (v3?.refresh_token) {
      const refreshToken = decrypt(v3.refresh_token);
      const newToken = await performGoogleRefresh(refreshToken);
      if (newToken) {
        await supabase
          .from('arcus_integrations')
          .update({
            access_token: encrypt(newToken),
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', uid)
          .eq('provider', v3.provider);
        return newToken;
      }
    }

    // 2. Try to find in integration_credentials (legacy V2)
    const { data: legacy } = await supabase
      .from('integration_credentials')
      .select('encrypted_refresh_token, refresh_token, provider')
      .eq('user_id', uid)
      .in('provider', ['google_calendar', 'google'])
      .maybeSingle();

    if (legacy) {
      const encryptedRf = legacy.encrypted_refresh_token || (legacy.refresh_token ? encrypt(legacy.refresh_token) : null);
      if (encryptedRf) {
        const refreshToken = decrypt(encryptedRf);
        const newToken = await performGoogleRefresh(refreshToken);
        if (newToken) {
          await supabase
            .from('integration_credentials')
            .update({
              encrypted_access_token: encrypt(newToken),
              access_token: newToken,
              expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', uid)
            .eq('provider', legacy.provider);
          return newToken;
        }
      }
    }

    // 3. Fallback to user_tokens
    const { data: ut } = await supabase
      .from('user_tokens')
      .select('encrypted_refresh_token')
      .or(`user_id.ilike."${uid}",google_email.ilike."${uid}"`)
      .maybeSingle();

    if (ut?.encrypted_refresh_token) {
      const refreshToken = decrypt(ut.encrypted_refresh_token);
      const newToken = await performGoogleRefresh(refreshToken);
      if (newToken) {
        await supabase
          .from('user_tokens')
          .update({
            encrypted_access_token: encrypt(newToken),
            access_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .or(`user_id.ilike."${uid}",google_email.ilike."${uid}"`);
        return newToken;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function performGoogleRefresh(refreshToken: string): Promise<string | null> {
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
  return json.access_token || null;
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
    description: 'Get the user\'s recent sent emails to analyze their writing style, tone, and voice. Only call this if get_voice_profile returns no stored profile. Do NOT call this just because the user asked about their voice profile — call get_voice_profile first.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of sent emails to fetch (default 30, max 50)' },
      },
    },
  },
  {
    name: 'get_voice_profile',
    description: 'Read the user\'s saved voice/writing style profile from the database. Call this FIRST when: (1) the user asks about their voice profile, writing style, or tone, (2) before drafting any email reply to check for a stored profile. Returns the full voice profile including tone, greeting patterns, closing patterns, vocabulary, and sample phrases. If no profile has been saved yet, it will say so — only then should you fall back to get_sent_emails to build one. NEVER call get_sent_emails just to answer "do you have access to my voice profile?" — use this tool instead.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'draft_reply',
    description: 'Save a Gmail draft reply to an existing email thread AND display it inline in the chat for the user to review and send. ONLY call this when the user explicitly asks to REPLY TO or RESPOND TO a specific existing email. NEVER use this for summaries or reports — use open_canvas. MANDATORY sequence before calling: (1) read_email to get the thread content, (2) get_recipient_context to load relationship context, calendar, and Notion notes, (3) get_voice_profile to load the stored voice/writing style profile — if it returns no profile, THEN call get_sent_emails to build one, (4) schedule any meeting if needed. Write the body using the voice profile AND the recipient context gathered in steps 2-3. STOP after calling — do NOT call send_email.',
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
  // ── Feature: Follow-up Radar ─────────────────────────────────────────────────
  {
    name: 'check_followups',
    description: 'Scan sent emails for threads that have NOT received a reply — surfaces what the user is waiting on. Use proactively when asked "what needs follow-up", "anything I\'m waiting on", or as part of a morning briefing. Returns threads sorted by how long they\'ve been waiting.',
    input_schema: {
      type: 'object',
      properties: {
        days:       { type: 'number', description: 'Days back to scan sent mail (default 7, max 21)' },
        maxResults: { type: 'number', description: 'Max sent threads to scan (default 15)' },
      },
    },
  },
  // ── Feature: Recipient Context ────────────────────────────────────────────────
  {
    name: 'get_recipient_context',
    description: 'Fetch rich context about an email recipient before drafting — upcoming meetings with them, Notion notes, and relationship memory. MANDATORY: call this BEFORE draft_reply whenever you have the recipient\'s email address. This ensures every draft is contextually aware of the relationship.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Recipient\'s email address' },
        name:  { type: 'string', description: 'Recipient\'s name (improves Notion search)' },
      },
      required: ['email'],
    },
  },
  // ── Feature: Relationship Memory ─────────────────────────────────────────────
  {
    name: 'get_contact_context',
    description: 'Look up stored relationship memory for a contact — notes, interaction history, tags. Use whenever preparing to reach out to someone or when context about a person is needed.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Contact email address' },
      },
      required: ['email'],
    },
  },
  {
    name: 'remember_about_contact',
    description: 'Save a note or fact about a contact to long-term relationship memory. Use whenever you learn something important — their preferences, company, a promise made, their timezone, communication style. This powers the CRM layer.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Contact email address' },
        name:  { type: 'string', description: 'Contact display name' },
        note:  { type: 'string', description: 'What to remember about this person' },
        tags:  { type: 'array', items: { type: 'string' }, description: 'Optional tags, e.g. ["client", "vip", "partner"]' },
      },
      required: ['email', 'note'],
    },
  },
  // ── Feature: Delegation Rules ─────────────────────────────────────────────────
  {
    name: 'get_delegation_rules',
    description: 'List the user\'s active delegation rules — standing instructions like "whenever someone asks for a meeting, propose 3 times". Show these when the user asks to see or manage their rules.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'create_delegation_rule',
    description: 'Create a delegation rule — a standing instruction Arcus will apply automatically to matching emails. Use when the user says "whenever X happens, do Y". Rules run during proactive triage.',
    input_schema: {
      type: 'object',
      properties: {
        name:             { type: 'string', description: 'Short rule name, e.g. "Auto-propose meeting times"' },
        trigger_keywords: { type: 'array', items: { type: 'string' }, description: 'Keywords that trigger the rule in email subject/body' },
        trigger_from:     { type: 'string', description: 'Optional: only trigger for emails from this address/domain' },
        action_type:      { type: 'string', enum: ['draft_reply', 'notify', 'label'], description: 'What to do when triggered' },
        action_config:    { type: 'object', description: 'Action details — e.g. { template: "reply draft text" } or { label: "urgent" }' },
      },
      required: ['name', 'action_type'],
    },
  },
  {
    name: 'update_canvas',
    description: 'Update the content already displayed in the Canvas Panel — use when the user asks to rewrite, revise, shorten, expand, or apply any change to an existing canvas document. The panel will blur-fade from old content to new. Use this instead of open_canvas when a canvas is already open. Provide the complete updated markdown — not just the changed section.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Canvas title (can keep existing or change it)' },
        type: {
          type: 'string',
          enum: ['email_draft', 'report', 'notes', 'analysis', 'action_plan'],
          description: 'Content type (keep the same unless the type itself is changing)',
        },
        markdown: { type: 'string', description: 'Full updated markdown content — complete replacement, not a diff.' },
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
  {
    name: 'digest_newsletters',
    description: "Solve newsletter overload: find the newsletters/promotional digests cluttering the user's inbox, condense them into ONE clean digest of what actually matters (per-source key takeaways + any links worth clicking), and optionally clear them out of the inbox so the user's mind is clear. Use when the user mentions being subscribed to too many newsletters, having no time to read them, or wanting a cleaner inbox. The digest renders in the Canvas panel. IMPORTANT: archiving moves emails out of the inbox — set archive:true ONLY after the user has confirmed (use request_confirmation first when they haven't explicitly said to clear/archive them). For a recurring weekly catch-up, pair this with create_scheduled_agent and set sendEmail:true so the digest is emailed.",
    input_schema: {
      type: 'object',
      properties: {
        daysBack: { type: 'number', description: 'How many days back to scan for newsletters (default 7, max 30).' },
        archive: { type: 'boolean', description: 'If true, archive the newsletters out of the inbox and mark them read after digesting. Only set true once the user has confirmed.' },
        sendEmail: { type: 'boolean', description: 'If true, also email the digest to the user (use for scheduled/weekly runs).' },
      },
    },
  },
];

// ── Integration → tool mapping ─────────────────────────────────────────────────
// null = always available (no integration needed)
const TOOL_INTEGRATION_MAP: Record<string, string | null> = {
  search_gmail: 'gmail',
  read_email: 'gmail',
  get_sent_emails: 'gmail',
  get_voice_profile: null,
  draft_reply: 'gmail',
  send_email: 'gmail',
  schedule_meeting: 'gcal',
  get_calendar_events: 'gcal',
  search_notion: 'notion',
  fetch_notion_schema: 'notion',
  create_notion_page: 'notion',
  open_canvas: null,
  update_canvas: null,
  web_search: null,
  send_slack_message: 'slack',
  create_scheduled_agent: null,
  ask_user: null,
  check_followups: 'gmail',
  digest_newsletters: 'gmail',
  get_recipient_context: null,
  get_contact_context: null,
  remember_about_contact: null,
  get_delegation_rules: null,
  create_delegation_rule: null,
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
    draftMeta?: { to?: string; subject?: string; threadId?: string; body?: string; recipientName?: string; gmailDraftId?: string };
    pageMeta?: { url?: string; pageId?: string; contentPreview?: string; meetLink?: string; startTime?: string; attendees?: string[]; [key: string]: any };
    isUpdate?: boolean;
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
      case 'get_voice_profile': result = await getVoiceProfileTool(userId); break;
      case 'draft_reply':       result = await draftReply(userId, input); break;
      case 'send_email':        result = await sendEmail(userId, input); break;
      case 'request_confirmation': result = await requestConfirmation(input); break;
      case 'schedule_meeting':  result = await scheduleMeeting(userId, input); break;
      case 'get_calendar_events': result = await getCalendarEvents(userId, input); break;
      case 'search_notion':      result = await searchNotion(userId, input); break;
      case 'fetch_notion_schema': result = await fetchNotionSchemaForAgent(userId, input); break;
      case 'create_notion_page': result = await createNotionPage(userId, input); break;
      case 'open_canvas':           result = openCanvas(input); break;
      case 'update_canvas':         result = updateCanvas(input); break;
      case 'web_search':            result = await webSearch(input); break;
      case 'send_slack_message':    result = await sendSlackMessage(userId, input); break;
      case 'create_scheduled_agent': result = await createScheduledAgent(userId, input); break;
      case 'check_followups':       result = await checkFollowups(userId, input); break;
      case 'digest_newsletters':    result = await digestNewsletters(userId, input); break;
      case 'get_recipient_context': result = await getRecipientContext(userId, input); break;
      case 'get_contact_context':   result = await getContactContext(userId, input); break;
      case 'remember_about_contact': result = await rememberAboutContact(userId, input); break;
      case 'get_delegation_rules':  result = await getDelegationRules(userId); break;
      case 'create_delegation_rule': result = await createDelegationRule(userId, input); break;
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
    const profile = await voiceProfileService.getVoiceProfile(userId) as any;
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

async function getVoiceProfileTool(userId: string): Promise<ToolResult> {
  try {
    const { voiceProfileService } = await import('../voice-profile-service.js');
    const profile = await voiceProfileService.getVoiceProfile(userId) as any;

    if (!profile || profile.status === 'default') {
      return {
        output: `No saved voice profile found for this user yet. To build one, call get_sent_emails — it will analyze the user's recent sent mail and generate a voice profile automatically. Once built, subsequent calls to get_voice_profile will return the stored profile.`,
      };
    }

    const prompt = voiceProfileService.generateVoicePrompt(profile) as string | undefined;
    const lines: string[] = [
      `Voice profile found (last updated: ${profile.updated_at ?? profile.created_at ?? 'unknown'})`,
      '',
      prompt?.trim() ?? '(profile exists but no formatted prompt generated)',
    ];

    // Include high-level metadata when available
    if (profile.tone) lines.push(`\nTone: ${profile.tone}`);
    if (profile.greeting_patterns?.length) lines.push(`Typical greetings: ${profile.greeting_patterns.join(', ')}`);
    if (profile.closing_patterns?.length) lines.push(`Typical closings: ${profile.closing_patterns.join(', ')}`);
    if (profile.vocabulary?.length) lines.push(`Signature vocabulary: ${profile.vocabulary.join(', ')}`);

    return { output: lines.join('\n') };
  } catch (err: any) {
    return { output: `Failed to read voice profile: ${err.message}` };
  }
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
  // Feature 4: Update contact on draft interaction
  touchContact(userId, input.to, displayName);

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
      draftMeta: { to: input.to, subject, threadId: input.threadId, body: input.body, recipientName: displayName, gmailDraftId: draft.id },
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
  // Feature 3: Voice auto-learning — fire-and-forget, never blocks send
  if (input.body) learnFromSentEmail(userId, input.body, input.subject || '');
  // Feature 4: Update contact memory on every send
  if (input.to) touchContact(userId, input.to, input.recipientName || '');
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
  if (res.status === 401 || res.status === 403) {
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
  if (res.status === 401 || res.status === 403) {
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

function updateCanvas(input: any): ToolResult {
  if (!input.markdown?.trim()) {
    return { output: 'Error: update_canvas requires non-empty markdown content.' };
  }
  return {
    output: `Canvas updated: "${input.title}"`,
    canvasData: {
      title: input.title,
      type: input.type || 'notes',
      markdown: input.markdown,
      isUpdate: true,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 1: Follow-up Radar
// ══════════════════════════════════════════════════════════════════════════════

async function checkFollowups(userId: string, input: any): Promise<ToolResult> {
  let token = await getGmailToken(userId);
  if (!token) return { output: 'Gmail is not connected.' };

  const days = Math.min(input.days || 7, 21);
  const maxCheck = Math.min(input.maxResults || 15, 20);
  const sentQuery = `in:sent newer_than:${days}d`;
  const sentUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(sentQuery)}&maxResults=${maxCheck}`;

  let sentRes = await fetch(sentUrl, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
  if (sentRes.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) { token = newToken; sentRes = await fetch(sentUrl, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) }); }
  }
  if (!sentRes.ok) return { output: `Could not check sent mail (${sentRes.status}).` };

  const sentData = await sentRes.json();
  const sentMessages: any[] = sentData.messages || [];
  if (!sentMessages.length) return { output: `No sent emails in the last ${days} days.` };

  type FollowUp = { subject: string; to: string; sentDate: string; daysWaiting: number; threadId: string };
  const awaiting: FollowUp[] = [];
  const seenThreads = new Set<string>();

  for (const { id } of sentMessages.slice(0, maxCheck)) {
    try {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
      );
      if (!msgRes.ok) continue;
      const msg = await msgRes.json();
      const { threadId } = msg;
      if (seenThreads.has(threadId)) continue;
      seenThreads.add(threadId);

      const h = msg.payload?.headers || [];
      const to = getHeader(h, 'To');
      const subject = getHeader(h, 'Subject');
      const dateStr = getHeader(h, 'Date');
      const sentMs = new Date(dateStr).getTime() || Date.now();
      const daysWaiting = Math.round((Date.now() - sentMs) / 86400000);
      if (daysWaiting < 1) continue;

      // Check if thread has any replies from external senders after our send
      const threadRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=From`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
      );
      if (!threadRes.ok) continue;
      const thread = await threadRes.json();
      const msgs: any[] = thread.messages || [];

      const hasReply = msgs.some((m: any) => {
        if (m.id === id) return false;
        const from = (getHeader(m.payload?.headers || [], 'From') || '').toLowerCase();
        const internalDate = parseInt(m.internalDate || '0');
        return internalDate > sentMs && !from.includes(userId.toLowerCase());
      });

      if (!hasReply && subject && to) {
        awaiting.push({ subject, to, sentDate: dateStr, daysWaiting, threadId });
      }
    } catch { continue; }
  }

  if (!awaiting.length) return { output: `All your recent sent emails have received replies. Inbox is clear — no follow-ups needed.` };

  const sorted = awaiting.sort((a, b) => b.daysWaiting - a.daysWaiting);
  const lines = sorted.map((f, i) =>
    `${i + 1}. **${f.subject}**\n   To: ${f.to}\n   Sent: ${f.sentDate}\n   Waiting: ${f.daysWaiting} day${f.daysWaiting !== 1 ? 's' : ''} with no reply\n   Thread: ${f.threadId}`
  );
  return { output: `${sorted.length} thread${sorted.length !== 1 ? 's' : ''} awaiting reply:\n\n${lines.join('\n\n')}` };
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 2: Recipient Context (cross-app intelligence before every draft)
// ══════════════════════════════════════════════════════════════════════════════

async function getRecipientContext(userId: string, input: any): Promise<ToolResult> {
  const recipientEmail: string = (input.email || '').trim();
  const recipientName: string = input.name || recipientEmail.split('@')[0];
  if (!recipientEmail) return { output: 'Recipient email is required.' };

  const parts: string[] = [];

  // 1. Google Calendar — upcoming events with this person
  try {
    const calToken = await getGmailToken(userId); // same Google OAuth token
    if (calToken) {
      const now = new Date().toISOString();
      const future = new Date(Date.now() + 30 * 86400000).toISOString();
      const calUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(future)}&q=${encodeURIComponent(recipientEmail)}&maxResults=5&singleEvents=true&orderBy=startTime`;
      const calRes = await fetch(calUrl, { headers: { Authorization: `Bearer ${calToken}` }, signal: AbortSignal.timeout(8000) });
      if (calRes.ok) {
        const calData = await calRes.json();
        const events: any[] = calData.items || [];
        if (events.length) {
          const evLines = events.map((e: any) => {
            const start = e.start?.dateTime || e.start?.date || '';
            const d = new Date(start);
            return `  - "${e.summary}" on ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
          });
          parts.push(`**Upcoming meetings with ${recipientName}:**\n${evLines.join('\n')}`);
        } else {
          parts.push(`**Calendar:** No upcoming meetings with ${recipientName} in the next 30 days.`);
        }
      }
    }
  } catch { /* non-fatal */ }

  // 2. Notion — notes/pages about this person
  try {
    const supabase = getSupabaseAdmin();
    const { data: notionInteg } = await supabase
      .from('arcus_integrations')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', 'notion')
      .maybeSingle();
    if (notionInteg?.access_token) {
      const notionToken = decrypt(notionInteg.access_token);
      const searchRes = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: { Authorization: `Bearer ${notionToken}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: recipientName, page_size: 3 }),
        signal: AbortSignal.timeout(8000),
      });
      if (searchRes.ok) {
        const notionData = await searchRes.json();
        const pages: any[] = notionData.results || [];
        if (pages.length) {
          const titles = pages.map((p: any) => {
            const tp = p.properties?.title || p.properties?.Name;
            const t = tp?.title?.[0]?.plain_text || tp?.rich_text?.[0]?.plain_text || 'Untitled';
            return `  - ${t}`;
          });
          parts.push(`**Notion notes about ${recipientName}:**\n${titles.join('\n')}`);
        }
      }
    }
  } catch { /* non-fatal */ }

  // 3. Relationship memory
  try {
    const supabase = getSupabaseAdmin();
    const { data: contact } = await supabase
      .from('arcus_contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_email', recipientEmail.toLowerCase())
      .maybeSingle();
    if (contact) {
      const memParts = [
        contact.notes ? `Notes: ${contact.notes}` : null,
        contact.email_count ? `Emails exchanged: ${contact.email_count}` : null,
        contact.last_contact_at ? `Last contact: ${new Date(contact.last_contact_at).toLocaleDateString()}` : null,
        contact.tags?.length ? `Tags: ${contact.tags.join(', ')}` : null,
      ].filter(Boolean);
      if (memParts.length) {
        parts.push(`**Relationship memory:**\n${memParts.map(p => `  - ${p}`).join('\n')}`);
      }
    }
  } catch { /* table may not exist yet */ }

  if (!parts.length) return { output: `No context found for ${recipientEmail}. No upcoming meetings, Notion notes, or relationship memory. Proceed with drafting.` };
  return { output: `Context for ${recipientName} <${recipientEmail}>:\n\n${parts.join('\n\n')}` };
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 3: Voice Profile Auto-Learning (fire-and-forget after every send)
// ══════════════════════════════════════════════════════════════════════════════

function learnFromSentEmail(userId: string, body: string, subject: string): void {
  (async () => {
    try {
      const lines = body.split('\n').filter((l: string) => l.trim());
      const greeting = lines[0]?.trim().slice(0, 60) || '';
      const signoff = [...lines].reverse().find((l: string) =>
        l.trim().length < 35 && /^(thanks|best|cheers|regards|warm|sincerely|kind|take care|talk soon|looking forward)/i.test(l.trim())
      ) || '';
      const sentences = body.split(/[.!?]+/).filter((s: string) => s.trim().split(/\s+/).length > 3);
      const avgWords = sentences.length
        ? Math.round(sentences.reduce((acc: number, s: string) => acc + s.trim().split(/\s+/).length, 0) / sentences.length)
        : 12;
      const hasCasual = /\b(hey|hi there|thanks!|sounds good|cool|awesome|yep|nope)\b/i.test(body);
      const hasFormal = /\b(dear|kindly|herewith|please find|enclosed|pursuant)\b/i.test(body);
      const formality = hasFormal ? 'formal' : hasCasual ? 'casual' : 'semi-formal';

      const supabase = getSupabaseAdmin();
      const { data: existing } = await supabase
        .from('user_voice_profiles')
        .select('voice_profile')
        .eq('user_id', userId.toLowerCase())
        .maybeSingle();

      const prev = (existing?.voice_profile as any) || {};
      const prevCount = prev.email_count || 0;

      // Blend new signals (weighted average — recent emails count more)
      const blended = {
        ...prev,
        greeting_patterns: {
          ...(prev.greeting_patterns || {}),
          preferred_greetings: greeting
            ? [...new Set([greeting, ...(prev.greeting_patterns?.preferred_greetings || [])]).values()].slice(0, 5)
            : (prev.greeting_patterns?.preferred_greetings || []),
        },
        closing_patterns: {
          ...(prev.closing_patterns || {}),
          preferred_closings: signoff
            ? [...new Set([signoff, ...(prev.closing_patterns?.preferred_closings || [])]).values()].slice(0, 5)
            : (prev.closing_patterns?.preferred_closings || []),
        },
        language_patterns: {
          ...(prev.language_patterns || {}),
          avg_length: prevCount > 0
            ? Math.round((((prev.language_patterns?.avg_length || avgWords) * prevCount) + avgWords) / (prevCount + 1))
            : avgWords,
          inferred_formality: formality,
        },
        email_count: prevCount + 1,
        learning: { autoImprove: true, lastAnalysis: new Date().toISOString() },
        status: 'learned',
      };

      await supabase.from('user_voice_profiles').upsert(
        { user_id: userId.toLowerCase(), voice_profile: blended, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    } catch { /* completely non-fatal */ }
  })();
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 4: Relationship Memory
// ══════════════════════════════════════════════════════════════════════════════

// Silent contact upsert — called automatically on send/draft
function touchContact(userId: string, email: string, name: string): void {
  (async () => {
    try {
      const supabase = getSupabaseAdmin();
      const { data: existing } = await supabase
        .from('arcus_contacts')
        .select('email_count, contact_name')
        .eq('user_id', userId)
        .eq('contact_email', email.toLowerCase())
        .maybeSingle();

      await supabase.from('arcus_contacts').upsert({
        user_id: userId,
        contact_email: email.toLowerCase(),
        contact_name: existing?.contact_name || name || email.split('@')[0],
        last_contact_at: new Date().toISOString(),
        email_count: (existing?.email_count || 0) + 1,
      }, { onConflict: 'user_id,contact_email' });
    } catch { /* table may not exist — non-fatal */ }
  })();
}

async function getContactContext(userId: string, input: any): Promise<ToolResult> {
  const email = (input.email || '').toLowerCase();
  if (!email) return { output: 'Email address required.' };

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('arcus_contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_email', email)
      .maybeSingle();

    if (!data) return { output: `No relationship memory yet for ${email}.` };

    const lines = [
      `**Contact:** ${data.contact_name || email}`,
      `**Email:** ${data.contact_email}`,
      data.last_contact_at ? `**Last contact:** ${new Date(data.last_contact_at).toLocaleDateString()}` : null,
      data.email_count     ? `**Emails exchanged:** ${data.email_count}` : null,
      data.notes           ? `**Notes:** ${data.notes}` : null,
      data.tags?.length    ? `**Tags:** ${data.tags.join(', ')}` : null,
    ].filter(Boolean);
    return { output: lines.join('\n') };
  } catch {
    return { output: `No relationship memory for ${email} (run migration: supabase/migrations/arcus_contacts.sql).` };
  }
}

async function rememberAboutContact(userId: string, input: any): Promise<ToolResult> {
  const email = (input.email || '').toLowerCase();
  if (!email) return { output: 'Email address required.' };

  try {
    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from('arcus_contacts')
      .select('notes, tags')
      .eq('user_id', userId)
      .eq('contact_email', email)
      .maybeSingle();

    // Append note to existing notes
    const prevNotes = existing?.notes || '';
    const newNotes = prevNotes
      ? `${prevNotes}\n[${new Date().toLocaleDateString()}] ${input.note}`
      : `[${new Date().toLocaleDateString()}] ${input.note}`;

    const prevTags: string[] = existing?.tags || [];
    const newTags = input.tags ? [...new Set([...prevTags, ...input.tags])] : prevTags;

    const { error } = await supabase.from('arcus_contacts').upsert({
      user_id: userId,
      contact_email: email,
      contact_name: input.name || undefined,
      notes: newNotes,
      tags: newTags,
      last_contact_at: new Date().toISOString(),
    }, { onConflict: 'user_id,contact_email' });

    if (error) throw error;
    return { output: `Saved to relationship memory for ${input.name || email}: "${input.note}"` };
  } catch (err: any) {
    return { output: `Could not save contact note: ${err.message}` };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 6: Delegation Rules
// ══════════════════════════════════════════════════════════════════════════════

async function getDelegationRules(userId: string): Promise<ToolResult> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('arcus_delegation_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!data?.length) return { output: 'No delegation rules set up yet. Use create_delegation_rule to add one.' };

    const lines = data.map((r: any, i: number) =>
      `${i + 1}. **${r.name}** [${r.action_type}]\n   Triggers: ${r.trigger_keywords?.join(', ') || 'any email'}${r.trigger_from ? ` · From: ${r.trigger_from}` : ''}`
    );
    return { output: `${data.length} active delegation rule${data.length !== 1 ? 's' : ''}:\n\n${lines.join('\n\n')}` };
  } catch {
    return { output: 'Delegation rules not yet set up (run migration: supabase/migrations/arcus_delegation_rules.sql).' };
  }
}

async function createDelegationRule(userId: string, input: any): Promise<ToolResult> {
  if (!input.name || !input.action_type) return { output: 'Rule name and action_type are required.' };

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('arcus_delegation_rules').insert({
      user_id: userId,
      name: input.name,
      trigger_keywords: input.trigger_keywords || [],
      trigger_from: input.trigger_from || null,
      action_type: input.action_type,
      action_config: input.action_config || {},
      is_active: true,
    });
    if (error) throw error;
    return { output: `Delegation rule "${input.name}" created. Arcus will now automatically ${input.action_type} when triggered.` };
  } catch (err: any) {
    return { output: `Could not create rule: ${err.message}` };
  }
}

async function webSearch(input: any): Promise<ToolResult> {
  const query = input.query;
  const max = Math.min(input.maxResults || 6, 10);

  const lowerQuery = query.toLowerCase();
  if (lowerQuery.includes('mailient')) {
    return {
      output: `Web search results for "${query}":

Mailient is an advanced, AI-powered email intelligence and productivity platform built for founders, consultants, and busy professionals who value time and clarity. It acts as an autonomous executive intelligence layer between users and their workspaces.

Core Features:
1. Sift AI: Triage and inbox sweep, categorizes and filters out newsletters/promotions, extracts key highlights and priority items.
2. Arcus AI: An autonomous executive assistant capable of analyzing threads, executing workflows, managing calendars, and managing Notion/Slack integrations.
3. Tone Writing / Voice Profile: Creates a Neural Voice Profile by analyzing the last 90 days of sent emails to draft responses that match the user's exact writing style, greeting, and signature.
4. Unified Workflow (Canvas): A beautiful interactive workspace panel for reviewing meeting preps, schedules, drafts, and comprehensive summaries.
5. Scheduled Background Agents: Allows users to create persistent background agents that run on customizable cron schedules (e.g., "sweep my inbox every morning at 7am and draft replies to client emails").
6. Cross-Platform Sync: Smooth coordination across Gmail, Google Calendar, Notion, Notion Calendar, Slack, and Cal.com.
7. Zero-Knowledge Encryption: Client-side AES-256-GCM encryption ensures email content is encrypted in the browser and remains completely private.

Pricing Plans (No free tier exists):
• Monthly Plan: $29/month. Includes unlimited AI Drafts, Sift Analysis, Arcus queries, background agents, scheduling, and a Gold Founder Badge.
• Annual Plan: $16.58/month ($199 billed annually). Saves 40% (2 months free). Includes everything in Monthly, priority AI processing, and a Gold Founder Badge.
• Lifetime Founder Plan: $499 one-time payment. Pay once, own forever. Includes everything in Annual plus a VIP Diamond Slack channel, dedicated support, and the Diamond Founder Badge.

Founder & Team:
• Built by Maulik (a 14-year-old high-agency founder). You can contact him at maulik@mailient.xyz or @mailientz on X. Currently tailored for individual founders and power users, with team support on the roadmap.`
    };
  }

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

// ── Newsletter digest ────────────────────────────────────────────────────────
// Solves "subscribed to too many newsletters, no time to read them": find the
// newsletters cluttering the inbox, distill them into one digest, and optionally
// archive them out. Shared by the digest_newsletters tool AND the Sift card.

interface NewsletterItem {
  id: string;
  from: string;
  senderName: string;
  subject: string;
  snippet: string;
  body: string;
  hasUnsub: boolean;
}

export interface NewsletterDigestResult {
  count: number;
  senders: string[];
  markdown: string;
  archived: number;
  emailed: boolean;
  daysBack: number;
}

function parseSenderName(from: string): string {
  if (!from) return 'Unknown';
  const m = from.match(/^\s*"?([^"<]+?)"?\s*<.+>$/);
  if (m && m[1].trim()) return m[1].trim();
  return (from.split('@')[0] || from).replace(/[<>"]/g, '').trim() || from;
}

async function summarizeNewsletterBatch(newsletters: NewsletterItem[], daysBack: number): Promise<string> {
  const blocks = newsletters.map((n, i) =>
    `#${i + 1} FROM: ${n.senderName} | SUBJECT: ${n.subject}\nEXCERPT: ${n.snippet}${n.body ? `\nBODY: ${n.body.slice(0, 800)}` : ''}`
  ).join('\n\n---\n\n');

  const sys = `You are Arcus, an inbox copilot. The user is subscribed to many newsletters and has no time to read them. Distill the newsletters below into ONE tight digest so they get all the value in under 60 seconds. Output GitHub-flavored markdown only — no preamble.

## 📰 Newsletter digest — last ${daysBack} days
A 1-2 sentence overview of the themes across these newsletters.

### Worth your time
- 3-6 bullets, each a genuinely useful takeaway, insight, or opportunity worth knowing. Lead with the substance (numbers, names, what actually happened), not the source. Skip pure promotions.

### By source
One line per newsletter: **Sender — Subject**: one-sentence takeaway. Merge multiple emails from the same sender into one line.

Rules: Be concrete and specific — never write "this newsletter discusses X". If an item is purely promotional with no real signal, group those under a brief "Mostly promotional" note instead of inventing value. No closing fluff.`;

  const user = `Here are ${newsletters.length} newsletters from the user's inbox:\n\n${blocks}`;

  const res = await callLLM(
    [{ role: 'system', content: sys }, { role: 'user', content: user }],
    [],
    { maxTokens: 1800, temperature: 0.3 }
  );
  return getText(res.content).trim() || 'Could not generate a digest right now — please try again.';
}

async function archiveMessages(userId: string, token: string, ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify';
  const body = JSON.stringify({ ids, removeLabelIds: ['INBOX', 'UNREAD'] });
  const headers = (t: string) => ({ Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });
  let res = await fetch(url, { method: 'POST', headers: headers(token), body, signal: AbortSignal.timeout(12000) });
  if (res.status === 401) {
    const nt = await refreshGoogleToken(userId);
    if (nt) res = await fetch(url, { method: 'POST', headers: headers(nt), body, signal: AbortSignal.timeout(12000) });
  }
  return res.ok ? ids.length : 0;
}

function digestMarkdownToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s: string) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:#2563eb;">$1</a>');
  let html = '';
  let inList = false;
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    if (/^###\s+/.test(line)) { if (inList) { html += '</ul>'; inList = false; } html += `<h3 style="margin:18px 0 6px;font-size:15px;">${inline(line.replace(/^###\s+/, ''))}</h3>`; }
    else if (/^##\s+/.test(line)) { if (inList) { html += '</ul>'; inList = false; } html += `<h2 style="margin:0 0 8px;font-size:18px;">${inline(line.replace(/^##\s+/, ''))}</h2>`; }
    else if (/^[-*]\s+/.test(line)) { if (!inList) { html += '<ul style="margin:6px 0 12px;padding-left:20px;">'; inList = true; } html += `<li style="margin:4px 0;line-height:1.5;">${inline(line.replace(/^[-*]\s+/, ''))}</li>`; }
    else if (line === '') { if (inList) { html += '</ul>'; inList = false; } }
    else { if (inList) { html += '</ul>'; inList = false; } html += `<p style="margin:8px 0;line-height:1.5;">${inline(line)}</p>`; }
  }
  if (inList) html += '</ul>';
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">${html}<hr style="margin-top:24px;border:none;border-top:1px solid #eee;"/><p style="color:#999;font-size:12px;">Sent by Arcus AI · Mailient</p></div>`;
}

async function emailNewsletterDigest(userId: string, markdown: string, count: number): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Arcus AI <arcus@mailient.xyz>',
      to: userId,
      subject: `📰 Your newsletter digest — ${count} caught up`,
      html: digestMarkdownToHtml(markdown),
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Find → summarize → (optionally) clear newsletters. Reusable by the Arcus tool
 * and the Sift newsletters card. Throws 'GMAIL_NOT_CONNECTED' if no Gmail token.
 */
export async function runNewsletterDigest(
  userId: string,
  opts: { daysBack?: number; archive?: boolean; sendEmail?: boolean } = {}
): Promise<NewsletterDigestResult> {
  const daysBack = Math.min(Math.max(Math.round(opts.daysBack || 7), 1), 30);
  let token = await getGmailToken(userId);
  if (!token) throw new Error('GMAIL_NOT_CONNECTED');

  // Gmail's own category tabs are a reliable newsletter signal; List-Unsubscribe
  // (RFC 2369) confirms a message is a bulk mailing.
  const q = `in:inbox newer_than:${daysBack}d (category:promotions OR category:updates OR category:forums)`;
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${new URLSearchParams({ q, maxResults: '40' })}`;
  let listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
  if (listRes.status === 401) {
    const nt = await refreshGoogleToken(userId);
    if (nt) { token = nt; listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) }); }
  }
  if (!listRes.ok) throw new Error(`Gmail search failed (${listRes.status})`);

  const ids: string[] = ((await listRes.json()).messages || []).map((m: any) => m.id);
  if (!ids.length) return { count: 0, senders: [], markdown: '', archived: 0, emailed: false, daysBack };

  const detail = await Promise.all(ids.slice(0, 25).map(async (id): Promise<NewsletterItem | null> => {
    try {
      const r = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
      );
      if (!r.ok) return null;
      const m = await r.json();
      const h = m.payload?.headers || [];
      const from = getHeader(h, 'From');
      return {
        id: m.id,
        from,
        senderName: parseSenderName(from),
        subject: getHeader(h, 'Subject') || '(no subject)',
        snippet: (m.snippet || '').slice(0, 200),
        body: extractBody(m.payload, 1200),
        hasUnsub: !!getHeader(h, 'List-Unsubscribe'),
      };
    } catch { return null; }
  }));

  const newsletters = detail.filter((n): n is NewsletterItem => n !== null);
  if (!newsletters.length) return { count: 0, senders: [], markdown: '', archived: 0, emailed: false, daysBack };

  const senders = Array.from(new Set(newsletters.map(n => n.senderName)));
  const markdown = await summarizeNewsletterBatch(newsletters, daysBack);

  const archived = opts.archive ? await archiveMessages(userId, token, newsletters.map(n => n.id)) : 0;
  const emailed = opts.sendEmail ? await emailNewsletterDigest(userId, markdown, newsletters.length) : false;

  return { count: newsletters.length, senders, markdown, archived, emailed, daysBack };
}

async function digestNewsletters(userId: string, input: any): Promise<ToolResult> {
  const token = await getGmailToken(userId);
  if (!token) return { output: 'Gmail is not connected. Ask the user to connect Gmail in Settings → Integrations.' };

  let r: NewsletterDigestResult;
  try {
    r = await runNewsletterDigest(userId, {
      daysBack: input?.daysBack,
      archive: !!input?.archive,
      sendEmail: !!input?.sendEmail,
    });
  } catch (e: any) {
    if (e.message === 'GMAIL_NOT_CONNECTED') return { output: 'Gmail is not connected.' };
    return { output: `Could not build the newsletter digest: ${e.message}` };
  }

  if (r.count === 0) {
    return { output: `No newsletters found in the last ${r.daysBack} days — the inbox is already clear of them. Tell the user there was nothing to digest.` };
  }

  const lines = [
    `Digested ${r.count} newsletter${r.count === 1 ? '' : 's'} from ${r.senders.length} source${r.senders.length === 1 ? '' : 's'} (last ${r.daysBack} days).`,
    r.archived > 0 ? `Archived ${r.archived} out of the inbox and marked them read.` : 'Left them in the inbox (not archived).',
    r.emailed ? 'Emailed the digest to the user.' : '',
    'The full digest is shown in the Canvas panel. Write a 1-2 sentence summary to the user — how many you condensed and whether you cleared them. Do NOT call more tools.',
  ].filter(Boolean);

  return {
    output: lines.join('\n'),
    canvasData: { title: 'Newsletter digest', type: 'report', markdown: r.markdown },
  };
}
