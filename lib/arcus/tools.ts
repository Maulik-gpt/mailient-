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
import {
  recordPendingApproval,
  consumeApproval,
  normalizeTargetKey,
  type ApprovalActionType,
} from './session-state';

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
    description:
      'Search Gmail metadata only — returns id, threadId, From, Subject, Date, snippet for each match. ' +
      'Does NOT return full bodies; call read_email for body. ' +
      'Output: plain-text list of numbered email summaries, or "No emails found matching that query." when empty. ' +
      'Errors (success:false): gmail_not_connected, upstream_gmail.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Gmail search query using Gmail operators. Examples: "from:client@co.com is:unread", "subject:proposal newer_than:7d", "has:attachment after:2026/01/01".' },
        maxResults: { type: 'number', description: 'Max emails (1-25, default 10).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_email',
    description:
      'Fetch a single email\'s full content given its message id. Required before any claim about a specific email\'s body. ' +
      'Output: plain text with Message-ID, Thread-ID, RFC-Message-ID, From, To, Subject, Date, then the body. ' +
      'Errors (success:false): gmail_not_connected, not_found (status 404), upstream_gmail.',
    input_schema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'Gmail message id from search_gmail.' },
      },
      required: ['messageId'],
    },
  },
  {
    name: 'get_sent_emails',
    description:
      'Return raw text of the user\'s recent sent emails for writing-style analysis. ' +
      'Call ONLY when the user explicitly asks to audit/describe their voice — the voice profile is already injected at prompt-start every turn. ' +
      'Output: plain-text dump of up to N sent emails plus the formatted voice profile block. ' +
      'Errors (success:false): gmail_not_connected, upstream_gmail, no_sent_mail.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Sent emails to fetch (1-50, default 30).' },
      },
    },
  },
  {
    name: 'get_voice_profile',
    description:
      'Return the saved voice profile object for INSPECTION ONLY (user asks "do you have my voice profile?"). ' +
      'Do NOT call before drafting — voice profile is already in this prompt. ' +
      'Output: plain text with profile fields (tone, greetings, closings, vocabulary). ' +
      'Errors (success:false): voice_profile_missing, voice_profile_read_failed.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'voice_profile_generate',
    description:
      'Rebuild the user\'s saved voice profile from their last 90 days of sent mail. ' +
      'Use when the user explicitly asks to retrain, rebuild, or refresh their voice — or when their existing profile is stale and they\'ve sent significant new mail. ' +
      'Slow: 10-30s. Time-boxed at 30s; on timeout returns success:false. The newly built profile is saved and used by the NEXT turn\'s system-prompt injection (not the current turn). ' +
      'Output: confirmation text with sample count and the new profile\'s tone/greeting/closing summary. ' +
      'Errors (success:false): gmail_not_connected, insufficient_sent_mail (under 20 sent emails), voice_profile_generate_failed.',
    input_schema: {
      type: 'object',
      properties: {
        sampleSize: { type: 'number', description: 'Number of sent emails to analyse (20-200, default 90).' },
      },
    },
  },
  {
    name: 'voice_profile_update',
    description:
      'Patch specific fields on the saved voice profile. Use after user feedback like "I never write Best, M — it\'s always Cheers, M" or "drop the dashes, I never use them". ' +
      'Shallow-merges the `updates` object into the stored profile (top-level fields overwrite; arrays replace, do not concat). ' +
      'Output: confirmation text + a diff summary of the changed fields. ' +
      'Errors (success:false): voice_profile_missing (no profile to patch), validation_error (empty updates), voice_profile_update_failed.',
    input_schema: {
      type: 'object',
      properties: {
        updates: {
          type: 'object',
          description: 'Partial profile object. Recognised top-level fields: tone, greeting_patterns (string[]), closing_patterns (string[]), vocabulary (string[]), avoid_phrases (string[]), average_length, formality.',
          additionalProperties: true,
        },
      },
      required: ['updates'],
    },
  },
  {
    name: 'draft_cold_email',
    description:
      'Save a Gmail draft for a NEW outbound email (no existing thread). Renders the same draft card as draft_reply; user reviews and sends from the card. ' +
      'Soft-write — no request_confirmation gate. ' +
      'Prerequisites: get_recipient_context if you have any prior history with the recipient. The system prompt already carries the voice profile. ' +
      'Output: confirmation text + canvasData.draftMeta with the 5-dim voice critique composite (voiceScore) and a one-line voiceCritique. ' +
      'Errors (success:false): gmail_not_connected, validation_error (missing to/subject/body), draft_save_failed.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address.' },
        subject: { type: 'string', description: 'Subject line — make it concrete and short.' },
        body: { type: 'string', description: 'Plain-text email body written in the user\'s voice. Open with a hook, close with one explicit ask.' },
        recipientName: { type: 'string', description: 'Display name for the draft card.' },
        purpose: { type: 'string', description: 'One sentence describing what the email is meant to achieve — improves the appropriate_tone and clear_cta critique scores.' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'draft_review',
    description:
      'Score an email draft against the saved voice profile on five dimensions: sounds_like_user / appropriate_tone / clear_cta / correct_length / no_hallucinated_claims (each 0-100). ' +
      'Returns a composite + per-dimension breakdown + up to 3 concrete suggestions. ' +
      'Call this when the user asks "is this draft any good?", before sending a high-stakes message, or after manually editing a draft. draft_reply and draft_cold_email already auto-run this internally on save. ' +
      'Output: plain-text scorecard with composite, each dimension, suggestions, and a critique line for sub-85 composites. ' +
      'Errors (success:false): validation_error (empty draft), voice_profile_missing (no profile to score against — call voice_profile_generate first).',
    input_schema: {
      type: 'object',
      properties: {
        draft: { type: 'string', description: 'The full email body to score.' },
        context: { type: 'string', description: 'Optional: 1-3 sentences of context (recipient, situation, goal) — improves appropriate_tone and clear_cta dimensions.' },
      },
      required: ['draft'],
    },
  },
  {
    name: 'draft_reply',
    description:
      'Save a Gmail draft reply (does NOT send) and render it inline as a draft card. ' +
      'Prerequisites: read_email for the thread you\'re replying to, get_recipient_context for the recipient. ' +
      'Body must use the voice profile in this prompt. ' +
      'Output: confirmation text + canvasData.draftMeta with voiceScore/voiceCritique from the post-draft voice critique. ' +
      'Errors (success:false): gmail_not_connected, draft_save_failed. ' +
      'Never use this for summaries — use open_canvas. After calling, do NOT call send_email; the user reviews and sends from the card.',
    input_schema: {
      type: 'object',
      properties: {
        threadId: { type: 'string', description: 'Gmail thread id from read_email.' },
        to: { type: 'string', description: 'Recipient email address.' },
        subject: { type: 'string', description: 'Subject line (usually "Re: original subject").' },
        body: { type: 'string', description: 'Plain-text email body written in the user\'s voice. Include Meet link if a meeting was scheduled.' },
        inReplyToMessageId: { type: 'string', description: 'RFC Message-ID from read_email for proper threading.' },
        recipientName: { type: 'string', description: 'Display name for the draft card.' },
      },
      required: ['threadId', 'to', 'body'],
    },
  },
  {
    name: 'send_email',
    description:
      'Send an email immediately. GATED: requires a prior request_confirmation that the user approved with matching to+subject; the executor refuses otherwise with code "confirmation_required". ' +
      'Output: success line with Message ID, recipient, subject. ' +
      'Errors (success:false): confirmation_required, gmail_not_connected, send_failed.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address — must match the To field passed to request_confirmation.' },
        subject: { type: 'string', description: 'Subject line — must match the Subject passed to request_confirmation.' },
        body: { type: 'string', description: 'Final email body in plain text.' },
        threadId: { type: 'string', description: 'Thread id if this is a reply.' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'gmail_read_thread',
    description:
      'Fetch every message in a Gmail thread by threadId — full bodies, senders, recipients, dates, attachment metadata. ' +
      'Use when you need the back-and-forth context, not just one message (read_email returns a single message by messageId). ' +
      'Output: plain text with thread-level header, then each message numbered with its From / To / Date / RFC-Message-ID / body. ' +
      'Errors (success:false): gmail_not_connected, not_found (status 404), upstream_gmail.',
    input_schema: {
      type: 'object',
      properties: {
        threadId: { type: 'string', description: 'Gmail thread id from search_gmail or read_email.' },
      },
      required: ['threadId'],
    },
  },
  {
    name: 'gmail_get_labels',
    description:
      'List every label in the user\'s Gmail account (system labels like INBOX/SENT plus user labels). ' +
      'Call this before gmail_apply_label so you reference real label ids, not names. ' +
      'Output: numbered list of "<labelName>  [id: <labelId>  type: system|user]". ' +
      'Errors (success:false): gmail_not_connected, upstream_gmail.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'gmail_apply_label',
    description:
      'Add one or more existing labels to a thread. Reversible write — does not require request_confirmation. ' +
      'Prerequisite: gmail_get_labels (so labelIds you pass actually exist). ' +
      'Output: "Applied <N> label(s) to thread <threadId>." ' +
      'Errors (success:false): gmail_not_connected, upstream_gmail, validation_error.',
    input_schema: {
      type: 'object',
      properties: {
        threadId: { type: 'string', description: 'Gmail thread id.' },
        labelIds: { type: 'array', items: { type: 'string' }, description: 'Label ids from gmail_get_labels (NOT names).' },
      },
      required: ['threadId', 'labelIds'],
    },
  },
  {
    name: 'gmail_archive_thread',
    description:
      'Archive a thread (remove the INBOX label). Reversible write — emails remain in All Mail and can be searched/restored. Does not require request_confirmation for single threads. ' +
      'For bulk newsletter archives use digest_newsletters instead. ' +
      'Output: "Archived thread <threadId>." ' +
      'Errors (success:false): gmail_not_connected, upstream_gmail, validation_error.',
    input_schema: {
      type: 'object',
      properties: {
        threadId: { type: 'string', description: 'Gmail thread id to archive.' },
      },
      required: ['threadId'],
    },
  },
  {
    name: 'gmail_get_profile',
    description:
      'Return the authenticated Gmail account\'s email address, total message count, and total thread count. ' +
      'Use to know who Arcus is acting as, or to ground claims about inbox volume. ' +
      'Output: plain text with "Email: <addr>", "Messages: <n>", "Threads: <n>". ' +
      'Errors (success:false): gmail_not_connected, upstream_gmail.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'schedule_meeting',
    description:
      'Create a Google Calendar event with an auto-generated Google Meet link and send invites to attendees. ' +
      'GATED: requires a prior request_confirmation with matching attendees and start time. ' +
      'Prerequisites: get_calendar_events to verify the slot is free (and Notion calendar via search_notion when connected). ' +
      'Output: confirmation text + canvasData.pageMeta with htmlLink and Meet URL. ' +
      'Errors (success:false): confirmation_required, gcal_not_connected, gcal_scope_missing, gcal_create_failed.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title shown on the calendar.' },
        startTime: { type: 'string', description: 'ISO 8601 start time WITH timezone offset, e.g. "2026-05-26T14:00:00-04:00".' },
        endTime: { type: 'string', description: 'ISO 8601 end time WITH timezone offset.' },
        attendees: { type: 'array', items: { type: 'string' }, description: 'Attendee email addresses; they receive Google Calendar invites.' },
        description: { type: 'string', description: 'Agenda or notes shown in the event description.' },
      },
      required: ['title', 'startTime', 'endTime'],
    },
  },
  {
    name: 'get_calendar_events',
    description:
      'List the user\'s Google Calendar events in a forward window. Required before any claim about a slot being free. ' +
      'Output: plain-text list with title, start time, attendees, or "No upcoming events..." when empty. ' +
      'Errors (success:false): gcal_not_connected, gcal_scope_missing, upstream_gcal.',
    input_schema: {
      type: 'object',
      properties: {
        daysAhead: { type: 'number', description: 'Forward window in days (default 7).' },
        maxResults: { type: 'number', description: 'Max events (default 20).' },
      },
    },
  },
  {
    name: 'calendar_get_availability',
    description:
      'Compute the user\'s FREE time-slots in a window using Google\'s freeBusy API. Required before proposing a meeting time — never guess a slot. ' +
      'Output: plain text listing busy ranges (with titles when fetchable) and the computed free ranges within the window. ' +
      'Errors (success:false): gcal_not_connected, gcal_scope_missing, upstream_gcal, validation_error. ' +
      'Note: queries the primary calendar only; Notion Calendar merge is handled by the LLM via search_notion when notion is connected.',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'ISO 8601 start of window WITH timezone offset, e.g. "2026-05-26T09:00:00-04:00".' },
        endDate: { type: 'string', description: 'ISO 8601 end of window WITH timezone offset.' },
        timezone: { type: 'string', description: 'IANA timezone (default the request\'s default), e.g. "America/New_York".' },
        minSlotMinutes: { type: 'number', description: 'Minimum free-slot length to report in minutes (default 30).' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'calendar_cancel_event',
    description:
      'Cancel a Google Calendar event and send cancellation invites to all attendees. ' +
      'GATED: requires a prior request_confirmation with matching eventId — attendees receive an email so this is irreversible from their POV. ' +
      'Output: "Cancelled event <eventId>. Notified <N> attendee(s)." ' +
      'Errors (success:false): confirmation_required, gcal_not_connected, gcal_scope_missing, not_found, upstream_gcal, validation_error.',
    input_schema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'Google Calendar event id from schedule_meeting / get_calendar_events.' },
        reason: { type: 'string', description: 'Optional one-line reason — currently logged but Google Calendar does not include it in the cancellation invite body.' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'search_notion',
    description:
      'Search the Notion workspace for pages whose title or content matches the query. ' +
      'Output: plain-text list of matching pages with title, id, url, last edited date. ' +
      'Errors (success:false): notion_not_connected, upstream_notion. ' +
      'Empty result returns success:true with "No Notion pages found...".',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text query — Notion does full-text search on title and content.' },
        maxResults: { type: 'number', description: 'Max results (1-10, default 5).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'open_canvas',
    description:
      'Render a long document (report, prep doc, schedule, analysis, full email draft for review) in the side Canvas panel. ' +
      'Use whenever the user-facing output would exceed 3 paragraphs — long content NEVER goes in chat. ' +
      'Output: confirmation text + canvasData with title/type/markdown. ' +
      'Errors (success:false): validation_error (empty markdown). ' +
      'Inline charts use fenced code blocks: ```bar-chart / ```line-chart / ```pie-chart — see input.markdown description for exact syntax.',
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
    description:
      'Scan recent sent mail for threads with no external reply — surfaces what the user is waiting on. ' +
      'Output: list of awaiting threads sorted by days waiting (longest first), or "All your recent sent emails have received replies." ' +
      'Errors (success:false): gmail_not_connected, upstream_gmail.',
    input_schema: {
      type: 'object',
      properties: {
        days:       { type: 'number', description: 'Days back to scan sent mail (1-21, default 7).' },
        maxResults: { type: 'number', description: 'Max sent threads to scan (default 15).' },
      },
    },
  },
  // ── Feature: Recipient Context ────────────────────────────────────────────────
  {
    name: 'get_recipient_context',
    description:
      'Aggregate everything known about a recipient: upcoming GCal meetings with them, Notion pages mentioning them, and stored relationship memory. ' +
      'REQUIRED before draft_reply for any recipient whose email you have. ' +
      'Output: plain text grouped by source (Calendar / Notion / Memory) — or "No context found..." when empty (still success:true). ' +
      'Errors (success:false): validation_error.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Recipient\'s email address.' },
        name:  { type: 'string', description: 'Recipient\'s display name (improves Notion match quality).' },
      },
      required: ['email'],
    },
  },
  {
    name: 'memory_search',
    description:
      'Search Supermemory for relevant context about a person, topic, or previous interaction. Call at the start of any task involving a known contact, project, or recurring concern so prior decisions and preferences inform the work. ' +
      'Returns raw memory items so you can quote them; for the system-prompt summary form, the chat route already injects relevant memories every turn. ' +
      'Output: numbered list of "<text>  [score: <n?>  when: <iso?>  tags: <csv?>]"; or "No memories found." ' +
      'Errors (success:false): validation_error, memory_unavailable (no SUPERMEMORY_API_KEY set).',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text query — name, topic, project, decision.' },
        limit: { type: 'number', description: 'Max items (1-20, default 8).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'memory_save',
    description:
      'Save a fact, decision, or interaction summary to Supermemory. Use at the end of any significant interaction or after the user states something worth remembering ("Priya is our biggest client", "always cc legal on contracts"). ' +
      'Stored under the current user. Tag with one or more categories so future searches can filter. Soft-write — no approval gate (the LLM is persisting observations, not contacting third parties). ' +
      'Output: "Saved to memory: \\"<first 100 chars>\\"" or a failure reason. ' +
      'Errors (success:false): validation_error, memory_unavailable.',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The fact, summary, or context to remember. Prefix with [RELATIONSHIP], [PREFERENCE], or leave plain for general context.' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional categorisation tags, e.g. ["client", "vip"] or ["preference"].' },
      },
      required: ['content'],
    },
  },
  {
    name: 'memory_get_contact_profile',
    description:
      'Aggregate everything Arcus knows about one contact: the persisted relationship row (notes / tags / email count / last contact) PLUS Supermemory items mentioning their email or name. ' +
      'Output: plain-text card with the relationship row first, then a numbered list of related Supermemory items, or "No history exists for <email>." when both are empty. ' +
      'Errors (success:false): validation_error.',
    input_schema: {
      type: 'object',
      properties: {
        contactEmail: { type: 'string', description: 'Contact email address (lowercased internally).' },
        name: { type: 'string', description: 'Optional display name to broaden the Supermemory search.' },
      },
      required: ['contactEmail'],
    },
  },
  {
    name: 'get_contact_context',
    description:
      'Look up the persisted relationship-memory row for a contact (notes, tag list, email count, last contact). ' +
      'Output: plain-text contact card or "No relationship memory yet for <email>." ' +
      'Errors (success:false): validation_error, migration_missing.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Contact email address.' },
      },
      required: ['email'],
    },
  },
  {
    name: 'remember_about_contact',
    description:
      'Append a durable note (and optional tags) to a contact\'s relationship-memory row. Use when the user states a fact about someone worth keeping. ' +
      'Output: "Saved to relationship memory for ..." ' +
      'Errors (success:false): validation_error, contact_save_failed.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Contact email address (lowercased before storage).' },
        name:  { type: 'string', description: 'Display name to set/update.' },
        note:  { type: 'string', description: 'Free-text fact to remember.' },
        tags:  { type: 'array', items: { type: 'string' }, description: 'Optional tags, e.g. ["client", "vip"].' },
      },
      required: ['email', 'note'],
    },
  },
  {
    name: 'get_delegation_rules',
    description:
      'List active delegation rules — standing instructions Arcus applies during proactive triage. ' +
      'Output: numbered list of rules with name, action type, triggers; or "No delegation rules set up yet." ' +
      'Errors (success:false): migration_missing.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'create_delegation_rule',
    description:
      'Persist a new delegation rule. Use when the user says "whenever X happens, do Y." ' +
      'Output: "Delegation rule \\"X\\" created..." ' +
      'Errors (success:false): validation_error (missing name or action_type), rule_save_failed.',
    input_schema: {
      type: 'object',
      properties: {
        name:             { type: 'string', description: 'Short rule name shown to the user.' },
        trigger_keywords: { type: 'array', items: { type: 'string' }, description: 'Keywords matched against incoming email subject/body.' },
        trigger_from:     { type: 'string', description: 'Optional: only trigger for emails from this address or domain.' },
        action_type:      { type: 'string', enum: ['draft_reply', 'notify', 'label'], description: 'What to do when the rule triggers.' },
        action_config:    { type: 'object', description: 'Action parameters, e.g. { template: "..." } or { label: "urgent" }.' },
      },
      required: ['name', 'action_type'],
    },
  },
  {
    name: 'update_canvas',
    description:
      'Replace the currently-open Canvas document with new markdown. Use when the user asks to rewrite/revise/shorten/expand an existing canvas. ' +
      'Provide the FULL updated markdown, not a diff. ' +
      'Output: "Canvas updated: ..." + canvasData.isUpdate = true. ' +
      'Errors (success:false): validation_error (empty markdown).',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'New title (or repeat the existing title).' },
        type: { type: 'string', enum: ['email_draft', 'report', 'notes', 'analysis', 'action_plan'], description: 'Document type.' },
        markdown: { type: 'string', description: 'Complete replacement markdown.' },
      },
      required: ['title', 'markdown'],
    },
  },
  {
    name: 'web_search',
    description:
      'Web search via Serper/Brave/DuckDuckGo with automatic provider fallback. Returns summaries — not full pages. ' +
      'Output: "Web search results for X:" followed by numbered hits with title, snippet, URL. ' +
      'Errors (success:false): web_search_unavailable (all providers down).',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query.' },
        maxResults: { type: 'number', description: 'Max results (1-10, default 6).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'send_slack_message',
    description:
      'Post a Slack message to a channel or DM the user themselves. For DMs to OTHER users use slack_send_dm. ' +
      'GATED: requires a prior request_confirmation with matching Channel detail. ' +
      'Output: "Slack message sent to <channel>." ' +
      'Errors (success:false): confirmation_required, slack_not_connected, upstream_slack.',
    input_schema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Channel name (e.g. "#general") or "dm" to DM the user themselves.' },
        text: { type: 'string', description: 'Message body in Slack mrkdwn.' },
      },
      required: ['channel', 'text'],
    },
  },
  {
    name: 'slack_find_user',
    description:
      'Look up a Slack user by email (preferred) or display name. REQUIRED before slack_send_dm — never guess a Slack user id. ' +
      'Output: plain text with "User: <name>  id: <U…>  email: <addr>"  for one match, OR a numbered list for multiple name matches. ' +
      'Errors (success:false): slack_not_connected, validation_error, user_not_found, upstream_slack.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Email address to look up (uses Slack\'s users.lookupByEmail — exact match, fastest path).' },
        name: { type: 'string', description: 'Display name or real name fragment when email is unknown. Returns up to 5 matches.' },
      },
    },
  },
  {
    name: 'slack_send_dm',
    description:
      'Open a DM conversation with a specific Slack user and post a message. ' +
      'Prerequisites: slack_find_user to resolve the userId. ' +
      'GATED: requires a prior request_confirmation with matching User detail. ' +
      'Output: "Sent DM to <userId>." plus the message permalink. ' +
      'Errors (success:false): confirmation_required, slack_not_connected, validation_error, upstream_slack.',
    input_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Slack user id (starts with U…) from slack_find_user.' },
        text: { type: 'string', description: 'Message body in Slack mrkdwn.' },
      },
      required: ['userId', 'text'],
    },
  },
  {
    name: 'slack_get_channels',
    description:
      'List the public and private channels the Slack bot has access to (excludes archived and DMs). ' +
      'Output: numbered list of "<name>  [id: <C…>  type: public|private  members: <n>]". ' +
      'Errors (success:false): slack_not_connected, upstream_slack.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max channels to return (1-200, default 100).' },
      },
    },
  },
  {
    name: 'fetch_notion_schema',
    description:
      'Resolve a database hint to a real Notion database id and return its property schema. ' +
      'REQUIRED before create_notion_page when writing to a database. ' +
      'Output: plain text with database_id and a property table (name + type + options). ' +
      'Errors (success:false): notion_not_connected, notion_db_not_found, notion_schema_unreadable.',
    input_schema: {
      type: 'object',
      properties: {
        database: { type: 'string', description: 'Database hint, e.g. "meetings", "tasks", "contacts".' },
        parentId: { type: 'string', description: 'Exact database id if you already have one — skips the search.' },
      },
      required: ['database'],
    },
  },
  {
    name: 'notion_read_page',
    description:
      'Fetch a Notion page\'s full content as markdown plus its property values. Recursively walks child blocks (paragraphs, headings, lists, todos, quotes, code, dividers). ' +
      'Output: plain text with the page URL, the property name/value pairs, then the body markdown. ' +
      'Errors (success:false): notion_not_connected, validation_error, not_found, upstream_notion.',
    input_schema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'Notion page id (with or without dashes) or a Notion page URL.' },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'notion_create_task',
    description:
      'Create a task in the user\'s tasks database — convenience wrapper over create_notion_page with task-specific fields. ' +
      'GATED: shares the create_notion_page approval gate, so request_confirmation with action "Create Notion page" and Title detail is required first. ' +
      'Auto-resolves the tasks database via the "tasks" hint and maps dueDate / priority onto the first matching schema property. ' +
      'Output: confirmation text + canvasData with the new page URL. ' +
      'Errors (success:false): confirmation_required, notion_not_connected, notion_db_not_found, notion_create_failed.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title — what needs to be done.' },
        dueDate: { type: 'string', description: 'Optional ISO 8601 date (YYYY-MM-DD or full timestamp).' },
        description: { type: 'string', description: 'Optional task body — context, sub-steps, related links.' },
        priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Urgent'], description: 'Optional priority — mapped onto the first select/status property whose options include this label.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'notion_get_calendar_events',
    description:
      'Read pages from a Notion database that has a date property, filtered to a time window. Use to merge Notion-tracked calendar entries with Google Calendar. ' +
      'Auto-discovers a database from the hint (default "calendar") or accepts an explicit databaseId. ' +
      'Output: plain text listing each event with date, title, and any "attendees" / "people" property values. ' +
      'Errors (success:false): notion_not_connected, validation_error, notion_db_not_found, notion_schema_unreadable, upstream_notion.',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'ISO 8601 start of window.' },
        endDate: { type: 'string', description: 'ISO 8601 end of window.' },
        database: { type: 'string', description: 'Hint for which Notion database to read; default "calendar". Ignored when databaseId is set.' },
        databaseId: { type: 'string', description: 'Exact Notion database id — preferred when known.' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'create_notion_page',
    description:
      'Create a page in a Notion database (or as a free-form page if no database match). ' +
      'GATED: requires a prior request_confirmation with matching Database+Title. ' +
      'Prerequisites: fetch_notion_schema first — pass the returned id as parentId and the EXACT property names from the schema in `properties`. ' +
      'Output: confirmation text + canvasData.pageMeta with the page URL. ' +
      'Errors (success:false): confirmation_required, notion_not_connected, notion_db_not_found, notion_create_failed.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Page title.' },
        content: { type: 'string', description: 'Full page body in plain text / markdown.' },
        database: { type: 'string', description: 'Database hint when parentId is unknown — Arcus searches for a matching db.' },
        parentId: { type: 'string', description: 'Exact database id from fetch_notion_schema — preferred over `database` hint.' },
        properties: {
          type: 'object',
          description: 'Per-property values keyed by EXACT schema property name. Strings for text/select/date/url, string[] for multi_select, number for number, boolean for checkbox.',
          additionalProperties: true,
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'create_scheduled_agent',
    description:
      'Register a persistent background agent that runs on a cron schedule via Vercel Cron. ' +
      'Insert the row IMMEDIATELY after writing the spec to canvas — the agent is live the moment this returns. ' +
      'Output: confirmation text + canvasData (type "scheduled_agent") with the next run time. ' +
      'Errors (success:false): validation_error (missing name/task/cron, bad cron format), migration_missing, agent_create_failed. ' +
      'If required integrations aren\'t connected, returns success:true with canvasData.type "integration_required" and asks the user to connect them.',
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
    description:
      'Show the user a confirmation card and pause the loop. REQUIRED before any of: send_email, schedule_meeting, send_slack_message, create_notion_page — the executor refuses those write calls without a matching approved row. ' +
      'After calling, STOP — do not call any more tools this turn. Transitions state to CONFIRMING. ' +
      'Output: confirmation message + canvasData with type "confirmation_required" and an approvalId the UI POSTs to /api/arcus/approval/confirm. ' +
      'No failure path under normal use — always success:true.',
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
    description:
      'Ask 1-3 clarifying questions when the instruction is genuinely ambiguous and a reasonable default does not exist. ' +
      'Loop emits a `question` SSE event and ends the turn. ' +
      'Output: emits a question event; tool result content is short. ' +
      'No failure path. Do NOT use ask_user when context, history, or sensible defaults can resolve the ambiguity — answer questions cost the user time.',
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
    description:
      'Find recent newsletter/promotional emails, condense them into one Canvas digest, and (optionally) archive them. ' +
      'Use when the user explicitly asks to digest, clear, or summarize newsletters. ' +
      'Output: summary text + canvasData (type "report") with the digest. Reports the digested count, archived count, and whether emailed. ' +
      'Errors (success:false): gmail_not_connected, digest_failed. ' +
      'archive:true is a write — set it only after the user has explicitly approved archiving (omit it on the first call and offer to clear after).',
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
  gmail_read_thread: 'gmail',
  gmail_get_labels: 'gmail',
  gmail_apply_label: 'gmail',
  gmail_archive_thread: 'gmail',
  gmail_get_profile: 'gmail',
  get_sent_emails: 'gmail',
  get_voice_profile: null,
  voice_profile_generate: 'gmail',
  voice_profile_update: null,
  draft_reply: 'gmail',
  draft_cold_email: 'gmail',
  draft_review: null,
  send_email: 'gmail',
  schedule_meeting: 'gcal',
  get_calendar_events: 'gcal',
  calendar_get_availability: 'gcal',
  calendar_cancel_event: 'gcal',
  search_notion: 'notion',
  fetch_notion_schema: 'notion',
  create_notion_page: 'notion',
  notion_read_page: 'notion',
  notion_create_task: 'notion',
  notion_get_calendar_events: 'notion',
  open_canvas: null,
  update_canvas: null,
  web_search: null,
  send_slack_message: 'slack',
  slack_find_user: 'slack',
  slack_send_dm: 'slack',
  slack_get_channels: 'slack',
  create_scheduled_agent: null,
  ask_user: null,
  check_followups: 'gmail',
  digest_newsletters: 'gmail',
  get_recipient_context: null,
  get_contact_context: null,
  remember_about_contact: null,
  memory_search: null,
  memory_save: null,
  memory_get_contact_profile: null,
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
  /**
   * False on any soft-failure path the tool handled gracefully (missing
   * integration, upstream 4xx/5xx, empty result with no useful data, validation
   * error). Undefined or true means the tool produced usable data.
   *
   * The agentic loop reads this directly — it is what the LLM uses to decide
   * whether to surface a failure to the user or proceed. Without it, the loop
   * trusts the LLM's narration of a "success" string and confabulates next
   * steps as if the tool returned real data.
   */
  success?: boolean;
  /**
   * Stable short identifier for the failure class — e.g. `gmail_not_connected`,
   * `upstream_4xx`, `not_found`, `validation_error`, `confirmation_required`.
   * Surfaced to the LLM in the failure-acknowledgement bridge so it can pick
   * the right recovery path (reconnect prompt vs. retry vs. alternative tool).
   */
  errorCode?: string;
  requiresConfirmation?: boolean;
  canvasData?: {
    title: string;
    type: string;
    markdown: string;
    draftMeta?: {
      to?: string;
      subject?: string;
      threadId?: string;
      body?: string;
      recipientName?: string;
      gmailDraftId?: string;
      /**
       * 0-100 score from the post-draft voice-profile critique. Surfaced on
       * the draft card so the user knows when a draft drifted from their
       * voice (typically when < 70). Computed inside draftReply via a
       * second LLM pass against the injected voice profile.
       */
      voiceScore?: number;
      /** Short reason behind a low score; surfaced under the score badge. */
      voiceCritique?: string;
    };
    pageMeta?: { url?: string; pageId?: string; contentPreview?: string; meetLink?: string; startTime?: string; attendees?: string[]; [key: string]: any };
    isUpdate?: boolean;
  };
}

/**
 * Build a structured soft-failure result. The loop reads `success: false` and
 * injects a hard failure-acknowledgement message back to the LLM so it cannot
 * continue as if the call succeeded. `message` lands in the tool result the
 * LLM sees; `code` is for branch logic and telemetry.
 */
function failureResult(message: string, code: string): ToolResult {
  return { success: false, errorCode: code, output: message };
}

function ts() { return new Date().toISOString().slice(11, 23); }

export interface ToolContext {
  /**
   * Stable conversation identifier — used to scope session approval lookups
   * for write tools (send_email, schedule_meeting, send_slack_message,
   * create_notion_page). Omitted on background-agent runs, in which case the
   * approval gate fails open.
   */
  conversationId?: string;
}

export async function executeTool(
  name: string,
  input: Record<string, any>,
  userId: string,
  context: ToolContext = {},
): Promise<ToolResult> {
  const start = Date.now();
  try {
    let result: ToolResult;
    switch (name) {
      case 'search_gmail':      result = await searchGmail(userId, input); break;
      case 'read_email':        result = await readEmail(userId, input); break;
      case 'gmail_read_thread': result = await gmailReadThread(userId, input); break;
      case 'gmail_get_labels':  result = await gmailGetLabels(userId); break;
      case 'gmail_apply_label': result = await gmailApplyLabel(userId, input); break;
      case 'gmail_archive_thread': result = await gmailArchiveThread(userId, input); break;
      case 'gmail_get_profile': result = await gmailGetProfile(userId); break;
      case 'get_sent_emails':   result = await getSentEmails(userId, input); break;
      case 'get_voice_profile': result = await getVoiceProfileTool(userId); break;
      case 'voice_profile_generate': result = await voiceProfileGenerate(userId, input); break;
      case 'voice_profile_update': result = await voiceProfileUpdate(userId, input); break;
      case 'draft_reply':       result = await draftReply(userId, input); break;
      case 'draft_cold_email':  result = await draftColdEmail(userId, input); break;
      case 'draft_review':      result = await draftReviewTool(userId, input); break;
      case 'send_email':        result = await sendEmail(userId, input, context); break;
      case 'request_confirmation': result = await requestConfirmation(input, userId, context); break;
      case 'schedule_meeting':  result = await scheduleMeeting(userId, input, context); break;
      case 'get_calendar_events': result = await getCalendarEvents(userId, input); break;
      case 'calendar_get_availability': result = await calendarGetAvailability(userId, input); break;
      case 'calendar_cancel_event': result = await calendarCancelEvent(userId, input, context); break;
      case 'search_notion':      result = await searchNotion(userId, input); break;
      case 'fetch_notion_schema': result = await fetchNotionSchemaForAgent(userId, input); break;
      case 'create_notion_page': result = await createNotionPage(userId, input, context); break;
      case 'notion_read_page':   result = await notionReadPage(userId, input); break;
      case 'notion_create_task': result = await notionCreateTask(userId, input, context); break;
      case 'notion_get_calendar_events': result = await notionGetCalendarEvents(userId, input); break;
      case 'open_canvas':           result = openCanvas(input); break;
      case 'update_canvas':         result = updateCanvas(input); break;
      case 'web_search':            result = await webSearch(input); break;
      case 'send_slack_message':    result = await sendSlackMessage(userId, input, context); break;
      case 'slack_find_user':       result = await slackFindUser(userId, input); break;
      case 'slack_send_dm':         result = await slackSendDm(userId, input, context); break;
      case 'slack_get_channels':    result = await slackGetChannels(userId, input); break;
      case 'create_scheduled_agent': result = await createScheduledAgent(userId, input); break;
      case 'check_followups':       result = await checkFollowups(userId, input); break;
      case 'digest_newsletters':    result = await digestNewsletters(userId, input); break;
      case 'get_recipient_context': result = await getRecipientContext(userId, input); break;
      case 'get_contact_context':   result = await getContactContext(userId, input); break;
      case 'remember_about_contact': result = await rememberAboutContact(userId, input); break;
      case 'memory_search':         result = await memorySearchTool(userId, input); break;
      case 'memory_save':           result = await memorySaveTool(userId, input); break;
      case 'memory_get_contact_profile': result = await memoryGetContactProfile(userId, input); break;
      case 'get_delegation_rules':  result = await getDelegationRules(userId); break;
      case 'create_delegation_rule': result = await createDelegationRule(userId, input); break;
      default:
        console.warn(`[Arcus:Tools] ${ts()} Unknown tool requested: "${name}"`);
        return failureResult(`Unknown tool: ${name}`, 'unknown_tool');
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
  if (!token) return failureResult('Gmail is not connected. Ask the user to connect Gmail in Settings → Integrations.', 'gmail_not_connected');

  const max = Math.min(input.maxResults || 10, 25);
  const params = new URLSearchParams({ q: input.query, maxResults: String(max) });
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`;

  let listRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
  if (listRes.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) { token = newToken; listRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) }); }
  }
  if (!listRes.ok) return failureResult(`Gmail search failed (${listRes.status}).`, 'upstream_gmail');

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
  if (!valid.length) return failureResult('Found emails but could not read metadata.', 'upstream_gmail');

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
  if (!token) return failureResult('Gmail is not connected.', 'gmail_not_connected');

  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${input.messageId}?format=full`;
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
  if (res.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) { token = newToken; res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) }); }
  }
  if (!res.ok) return failureResult(`Could not read email (${res.status}).`, res.status === 404 ? 'not_found' : 'upstream_gmail');

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

// ── gmail_read_thread ─────────────────────────────────────────────────────────
// Whole-thread fetch — every message in chronological order. The spec's
// "single source of truth for email content." Single-message reads stay on
// read_email; this is for the back-and-forth case.
async function gmailReadThread(userId: string, input: any): Promise<ToolResult> {
  const threadId = (input.threadId || '').trim();
  if (!threadId) return failureResult('threadId is required.', 'validation_error');

  let token = await getGmailToken(userId);
  if (!token) return failureResult('Gmail is not connected.', 'gmail_not_connected');

  const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=full`;
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
  if (res.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) { token = newToken; res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }); }
  }
  if (!res.ok) {
    return failureResult(`Could not read thread (${res.status}).`, res.status === 404 ? 'not_found' : 'upstream_gmail');
  }

  const thread = await res.json();
  const msgs: any[] = thread.messages || [];
  if (!msgs.length) return failureResult(`Thread ${threadId} has no messages.`, 'not_found');

  const lines: string[] = [
    `Thread-ID: ${thread.id}`,
    `History-ID: ${thread.historyId}`,
    `Messages: ${msgs.length}`,
    '',
  ];
  msgs.forEach((m: any, i: number) => {
    const h = m.payload?.headers || [];
    const body = extractBody(m.payload);
    lines.push(`--- Message ${i + 1} of ${msgs.length} ---`);
    lines.push(`Message-ID: ${m.id}`);
    lines.push(`RFC-Message-ID: ${getHeader(h, 'Message-ID')}`);
    lines.push(`From: ${getHeader(h, 'From')}`);
    lines.push(`To: ${getHeader(h, 'To')}`);
    const cc = getHeader(h, 'Cc');
    if (cc) lines.push(`Cc: ${cc}`);
    lines.push(`Subject: ${getHeader(h, 'Subject')}`);
    lines.push(`Date: ${getHeader(h, 'Date')}`);
    // Attachment metadata only — never download attachment content
    const parts = collectAttachmentMeta(m.payload);
    if (parts.length) {
      lines.push(`Attachments: ${parts.map(a => `${a.filename} (${a.mimeType}, ${a.size}B)`).join('; ')}`);
    }
    lines.push('');
    lines.push(body || '(no plain text body)');
    lines.push('');
  });

  return { output: annotateEmailWithSignals(lines.join('\n')) };
}

// Walk the MIME tree of a Gmail message payload and collect attachment metadata.
// Returns [] for messages with no attachments. Body content is never returned.
function collectAttachmentMeta(payload: any): Array<{ filename: string; mimeType: string; size: number }> {
  const out: Array<{ filename: string; mimeType: string; size: number }> = [];
  const walk = (p: any) => {
    if (!p) return;
    if (p.filename && p.body?.attachmentId) {
      out.push({ filename: p.filename, mimeType: p.mimeType || 'application/octet-stream', size: p.body.size || 0 });
    }
    (p.parts || []).forEach(walk);
  };
  walk(payload);
  return out;
}

// ── gmail_get_labels ──────────────────────────────────────────────────────────
async function gmailGetLabels(userId: string): Promise<ToolResult> {
  let token = await getGmailToken(userId);
  if (!token) return failureResult('Gmail is not connected.', 'gmail_not_connected');

  const url = 'https://gmail.googleapis.com/gmail/v1/users/me/labels';
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
  if (res.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) { token = newToken; res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }); }
  }
  if (!res.ok) return failureResult(`Could not list labels (${res.status}).`, 'upstream_gmail');

  const data = await res.json();
  const labels: any[] = data.labels || [];
  if (!labels.length) return { output: 'No labels found.' };

  const lines = labels.map((l: any, i: number) =>
    `${i + 1}. ${l.name}  [id: ${l.id}  type: ${l.type || 'user'}]`,
  );
  return { output: `${labels.length} label(s):\n${lines.join('\n')}` };
}

// ── gmail_apply_label ─────────────────────────────────────────────────────────
async function gmailApplyLabel(userId: string, input: any): Promise<ToolResult> {
  const threadId = (input.threadId || '').trim();
  const labelIds: string[] = Array.isArray(input.labelIds) ? input.labelIds.filter((s: any) => typeof s === 'string' && s.trim()) : [];
  if (!threadId) return failureResult('threadId is required.', 'validation_error');
  if (!labelIds.length) return failureResult('labelIds (non-empty array of label ids from gmail_get_labels) is required.', 'validation_error');

  let token = await getGmailToken(userId);
  if (!token) return failureResult('Gmail is not connected.', 'gmail_not_connected');

  const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}/modify`;
  const body = JSON.stringify({ addLabelIds: labelIds });
  let res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) {
      token = newToken;
      res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(10000),
      });
    }
  }
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return failureResult(`Apply label failed (${res.status}): ${err.slice(0, 200)}`, 'upstream_gmail');
  }
  return { output: `Applied ${labelIds.length} label(s) to thread ${threadId}.` };
}

// ── gmail_archive_thread ──────────────────────────────────────────────────────
// Reversible — just removes the INBOX label. Emails stay in All Mail and can
// be searched/restored. No request_confirmation gate for single threads.
async function gmailArchiveThread(userId: string, input: any): Promise<ToolResult> {
  const threadId = (input.threadId || '').trim();
  if (!threadId) return failureResult('threadId is required.', 'validation_error');

  let token = await getGmailToken(userId);
  if (!token) return failureResult('Gmail is not connected.', 'gmail_not_connected');

  const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}/modify`;
  const body = JSON.stringify({ removeLabelIds: ['INBOX'] });
  let res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) {
      token = newToken;
      res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(10000),
      });
    }
  }
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return failureResult(`Archive failed (${res.status}): ${err.slice(0, 200)}`, 'upstream_gmail');
  }
  return { output: `Archived thread ${threadId}.` };
}

// ── gmail_get_profile ─────────────────────────────────────────────────────────
async function gmailGetProfile(userId: string): Promise<ToolResult> {
  let token = await getGmailToken(userId);
  if (!token) return failureResult('Gmail is not connected.', 'gmail_not_connected');

  const url = 'https://gmail.googleapis.com/gmail/v1/users/me/profile';
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
  if (res.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) { token = newToken; res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }); }
  }
  if (!res.ok) return failureResult(`Could not read profile (${res.status}).`, 'upstream_gmail');

  const p = await res.json();
  return {
    output: [
      `Email: ${p.emailAddress}`,
      `Messages: ${p.messagesTotal}`,
      `Threads: ${p.threadsTotal}`,
      `History-ID: ${p.historyId}`,
    ].join('\n'),
  };
}

async function getSentEmails(userId: string, input: any): Promise<ToolResult> {
  let token = await getGmailToken(userId);
  if (!token) return failureResult('Gmail is not connected.', 'gmail_not_connected');

  const limit = Math.min(input.limit || 30, 50);
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}&labelIds=SENT`;
  let listRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
  if (listRes.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) { token = newToken; listRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) }); }
  }
  if (!listRes.ok) return failureResult(`Could not fetch sent emails (${listRes.status}).`, 'upstream_gmail');

  const listData = await listRes.json();
  const messages: any[] = (listData.messages || []).slice(0, limit);
  if (!messages.length) return failureResult('No sent emails found — voice profile cannot be built from empty sent mail.', 'no_sent_mail');

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
      return failureResult(
        `No saved voice profile found for this user yet. To build one, call get_sent_emails — it will analyze the user's recent sent mail and generate a voice profile automatically. Once built, subsequent calls to get_voice_profile will return the stored profile.`,
        'voice_profile_missing',
      );
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
    return failureResult(`Failed to read voice profile: ${err.message}`, 'voice_profile_read_failed');
  }
}

// ── voice_profile_generate ────────────────────────────────────────────────────
// On-demand rebuild from sent mail. The chat route auto-bootstraps once on a
// user's first turn; this tool exists so the LLM can rebuild later when the
// user explicitly asks ("refresh my voice profile", "retrain on my recent
// emails"). 30s hard ceiling — the chat route's bootstrap uses 22s but we get
// slightly more headroom because the user is actively waiting for this one.
async function voiceProfileGenerate(userId: string, input: any): Promise<ToolResult> {
  const sampleSize = Math.max(20, Math.min(200, Number(input?.sampleSize) || 90));

  try {
    // @ts-ignore — JS module, no .d.ts
    const { voiceProfileService } = await import('../voice-profile-service.js');

    // Need a Gmail handle to fetch sent mail.
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('arcus_integrations')
      .select('access_token, refresh_token')
      .eq('user_id', userId.toLowerCase())
      .eq('provider', 'gmail')
      .maybeSingle();

    if (!data?.access_token) {
      return failureResult('Gmail is not connected — cannot generate a voice profile without sent mail access.', 'gmail_not_connected');
    }

    const accessToken = decrypt(data.access_token);
    const refreshToken = data.refresh_token ? decrypt(data.refresh_token) : '';
    // @ts-ignore — JS module
    const { GmailService } = await import('../gmail');
    const gmail = new GmailService(accessToken, refreshToken);

    const TIMEOUT = Symbol('timeout');
    const built = await Promise.race([
      (async () => {
        const sent = await voiceProfileService.fetchSentEmails(gmail, sampleSize);
        if (!Array.isArray(sent) || sent.length < 20) {
          return { tooFew: sent?.length ?? 0 };
        }
        const profile = await voiceProfileService.analyzeVoiceProfile(sent);
        await voiceProfileService.saveVoiceProfile(userId, profile);
        return { profile, count: sent.length };
      })(),
      new Promise((resolve) => setTimeout(() => resolve(TIMEOUT), 30000)),
    ]);

    if (built === TIMEOUT) {
      return failureResult('Voice profile generation timed out after 30s. Try again, or send a few more emails first.', 'voice_profile_generate_failed');
    }
    const result = built as { profile?: any; count?: number; tooFew?: number };
    if (typeof result.tooFew === 'number') {
      return failureResult(
        `Need at least 20 sent emails to build a voice profile — found ${result.tooFew}. Send a few more emails (or use the manual Voice Settings to set defaults) and try again.`,
        'insufficient_sent_mail',
      );
    }

    const p = result.profile;
    const summary = [
      `Voice profile rebuilt from ${result.count} sent emails.`,
      p.tone ? `Tone: ${p.tone}` : null,
      p.greeting_patterns?.length ? `Greetings: ${p.greeting_patterns.slice(0, 3).join(', ')}` : null,
      p.closing_patterns?.length ? `Closings: ${p.closing_patterns.slice(0, 3).join(', ')}` : null,
      p.formality ? `Formality: ${p.formality}` : null,
      '',
      'The new profile is saved and will be injected into the system prompt on the NEXT turn (it does not retroactively change drafts in this turn).',
    ].filter(Boolean).join('\n');

    return { output: summary };
  } catch (err: any) {
    return failureResult(`Voice profile generation failed: ${err.message}`, 'voice_profile_generate_failed');
  }
}

// ── voice_profile_update ──────────────────────────────────────────────────────
// Shallow merge of user-specified patches into the stored profile. Arrays
// REPLACE (do not concat) so the user can remove an unwanted phrase by passing
// the array without it. The merged profile is saved and used from the next
// turn's prompt injection onward.
async function voiceProfileUpdate(userId: string, input: any): Promise<ToolResult> {
  const updates = (input && typeof input.updates === 'object' && input.updates) ? input.updates : null;
  if (!updates || !Object.keys(updates).length) {
    return failureResult('updates must be a non-empty object — e.g. { closing_patterns: ["Cheers, M"] }.', 'validation_error');
  }

  try {
    // @ts-ignore — JS module
    const { voiceProfileService } = await import('../voice-profile-service.js');
    const current: any = await voiceProfileService.getVoiceProfile(userId);
    if (!current || current.status === 'default') {
      return failureResult('No saved voice profile to update. Call voice_profile_generate first.', 'voice_profile_missing');
    }

    // Shallow merge — arrays replace, primitives overwrite, objects overwrite.
    // We deliberately do NOT deep-merge so removing items from a list works.
    const merged: Record<string, any> = { ...current };
    const changed: string[] = [];
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined) continue;
      merged[k] = v;
      changed.push(k);
    }
    merged.updated_at = new Date().toISOString();

    await voiceProfileService.saveVoiceProfile(userId, merged);

    const diffLines = changed.map((k) => {
      const before = current[k];
      const after = merged[k];
      const fmt = (x: any) => Array.isArray(x) ? `[${x.slice(0, 3).join(', ')}${x.length > 3 ? `, +${x.length - 3} more` : ''}]` : JSON.stringify(x);
      return `  • ${k}: ${fmt(before)} → ${fmt(after)}`;
    });
    return {
      output: [
        `Voice profile updated (${changed.length} field${changed.length === 1 ? '' : 's'} changed):`,
        ...diffLines,
        '',
        'The patched profile takes effect on the next turn.',
      ].join('\n'),
    };
  } catch (err: any) {
    return failureResult(`Voice profile update failed: ${err.message}`, 'voice_profile_update_failed');
  }
}

/**
 * Five-dimension draft review. Composite + per-dimension scores + targeted
 * suggestions. Used in two places:
 *   1. Auto-run from draftReply / draftColdEmail — composite becomes the
 *      voiceScore badge on the draft card, lowest-scoring dimension feeds the
 *      critique line. Time-boxed; on timeout/failure the draft still ships
 *      without a badge (best-effort).
 *   2. Exposed as the draft_review tool so the LLM can request a deeper audit
 *      on any draft, including drafts the user hand-edited.
 */
export interface DraftReview {
  composite: number;
  dimensions: {
    sounds_like_user: number;
    appropriate_tone: number;
    clear_cta: number;
    correct_length: number;
    no_hallucinated_claims: number;
  };
  suggestions: string[];
  /** One-line summary surfaced under the voice badge when composite < 70. */
  critique: string;
}

const REVIEW_SYSTEM_PROMPT =
  'You are a strict editor scoring an email draft on five dimensions. Output ONLY raw JSON, no markdown fences, no preamble. Shape:\n' +
  '{\n' +
  '  "dimensions": {\n' +
  '    "sounds_like_user": <0-100 — how indistinguishable the draft is from the user\'s real writing per the voice profile>,\n' +
  '    "appropriate_tone": <0-100 — does the tone match the recipient/context>,\n' +
  '    "clear_cta": <0-100 — is there a clear next step or ask>,\n' +
  '    "correct_length": <0-100 — neither too long nor too curt for the context>,\n' +
  '    "no_hallucinated_claims": <0-100 — 100 means every factual claim is supported by the supplied context; lower if the draft asserts unverified specifics>\n' +
  '  },\n' +
  '  "suggestions": [<up to 3 short, concrete rewrites or removals; empty array if composite >= 85>],\n' +
  '  "critique": "<one short sentence naming the most pressing dimension to fix; empty if composite >= 85>"\n' +
  '}\n' +
  'Scoring guide: 90+ ships as-is. 70-89 minor polish. Below 70 needs review before sending. Be strict — generic-AI tone, hedging language, "I hope this finds you well" greetings, and unsupported specifics all cost points.';

function normalizeDim(n: any): number {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
}

async function reviewDraft(
  userId: string,
  body: string,
  contextHint?: string,
): Promise<DraftReview | null> {
  try {
    // @ts-ignore — JS module
    const { voiceProfileService } = await import('../voice-profile-service.js');
    const profile = (await voiceProfileService.getVoiceProfile(userId)) as any;
    if (!profile || profile.status === 'default') return null;
    const voicePrompt = (voiceProfileService.generateVoicePrompt(profile) as string | undefined)?.trim();
    if (!voicePrompt) return null;

    const TIMEOUT = Symbol('timeout');
    const race = await Promise.race([
      callLLM(
        [
          { role: 'system', content: REVIEW_SYSTEM_PROMPT },
          {
            role: 'user',
            content:
              `USER VOICE PROFILE:\n${voicePrompt}\n\n` +
              (contextHint ? `CONTEXT:\n${contextHint.slice(0, 2000)}\n\n` : '') +
              `DRAFT BODY:\n${body.slice(0, 4000)}\n\nReturn the JSON now.`,
          },
        ],
        [],
        { maxTokens: 400, temperature: 0.1 },
      ),
      new Promise((resolve) => setTimeout(() => resolve(TIMEOUT), 8000)),
    ]);

    if (race === TIMEOUT) return null;
    const text = getText((race as any).content).trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const d = parsed.dimensions || {};
    const dimensions = {
      sounds_like_user: normalizeDim(d.sounds_like_user),
      appropriate_tone: normalizeDim(d.appropriate_tone),
      clear_cta: normalizeDim(d.clear_cta),
      correct_length: normalizeDim(d.correct_length),
      no_hallucinated_claims: normalizeDim(d.no_hallucinated_claims),
    };
    const composite = Math.round(
      (dimensions.sounds_like_user +
        dimensions.appropriate_tone +
        dimensions.clear_cta +
        dimensions.correct_length +
        dimensions.no_hallucinated_claims) /
        5,
    );
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((s: any) => typeof s === 'string').map((s: string) => s.trim().slice(0, 200)).slice(0, 5)
      : [];
    const critique = typeof parsed.critique === 'string' ? parsed.critique.trim().slice(0, 200) : '';
    return { composite, dimensions, suggestions, critique };
  } catch {
    return null;
  }
}

/**
 * Standalone draft_review tool — wraps reviewDraft so the LLM can audit any
 * email draft on demand, not just the ones auto-run during draftReply.
 */
async function draftReviewTool(userId: string, input: any): Promise<ToolResult> {
  const draft = typeof input?.draft === 'string' ? input.draft : '';
  if (!draft.trim()) return failureResult('draft (non-empty string) is required.', 'validation_error');
  const context = typeof input?.context === 'string' ? input.context : undefined;

  const review = await reviewDraft(userId, draft, context);
  if (!review) {
    return failureResult(
      'Could not score the draft — voice profile may be missing or the critique pass timed out. Try voice_profile_generate first.',
      'voice_profile_missing',
    );
  }

  const dims = review.dimensions;
  const lines = [
    `Composite voice match: ${review.composite}/100`,
    '',
    'Dimensions:',
    `  • Sounds like user:        ${dims.sounds_like_user}/100`,
    `  • Appropriate tone:        ${dims.appropriate_tone}/100`,
    `  • Clear call-to-action:    ${dims.clear_cta}/100`,
    `  • Correct length:          ${dims.correct_length}/100`,
    `  • No hallucinated claims:  ${dims.no_hallucinated_claims}/100`,
  ];
  if (review.suggestions.length) {
    lines.push('', 'Suggestions:');
    review.suggestions.forEach((s) => lines.push(`  • ${s}`));
  }
  if (review.critique && review.composite < 85) {
    lines.push('', `Critique: ${review.critique}`);
  }

  return { output: lines.join('\n') };
}

async function draftReply(userId: string, input: any): Promise<ToolResult> {
  let token = await getGmailToken(userId);
  if (!token) return failureResult('Gmail is not connected.', 'gmail_not_connected');

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
    return failureResult(`Failed to save draft (${res.status}): ${err.slice(0, 200)}`, 'draft_save_failed');
  }

  const draft = await res.json();
  const previewUrl = `https://mail.google.com/mail/u/0/#drafts/${draft.message?.id || ''}`;

  const displayName = input.recipientName || input.to.split('@')[0];
  // Feature 4: Update contact on draft interaction
  touchContact(userId, input.to, displayName);

  // Post-draft 5-dim voice critique. Time-boxed and best-effort — if it
  // fails the draft still ships, the user just won't see a score badge.
  const review = await reviewDraft(userId, input.body || '');

  // Surface composite + lowest-dimension callout to the LLM so its final chat
  // sentence can hedge or ship clean. The badge on the draft card shows the
  // composite; voiceCritique surfaces critique + first suggestion underneath.
  const lowScoreNote = review && review.composite < 70
    ? `\n\nVOICE MATCH: ${review.composite}/100. ${review.critique || ''}` +
      (review.suggestions[0] ? ` Suggestion: ${review.suggestions[0]}` : '') +
      ' Mention this score to the user and suggest a quick review before sending.'
    : review
      ? `\n\nVOICE MATCH: ${review.composite}/100. The draft sounds like the user.`
      : '';

  // Combine critique + top suggestion for the under-badge UI line.
  const combinedCritique = review
    ? [review.critique, review.suggestions[0]].filter(Boolean).join(' — ').slice(0, 240)
    : undefined;

  return {
    output: `Draft saved to Gmail successfully.\nTo: ${displayName} <${input.to}>\nSubject: ${subject}\n\nDraft body (first 400 chars):\n${input.body.slice(0, 400)}${input.body.length > 400 ? '...' : ''}\n\nNow write your final response: confirm what you did, include the subject line and the opening lines of the draft verbatim, and tell the user to review and send from the draft panel. Do NOT call send_email.${lowScoreNote}`,
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
      draftMeta: {
        to: input.to,
        subject,
        threadId: input.threadId,
        body: input.body,
        recipientName: displayName,
        gmailDraftId: draft.id,
        voiceScore: review?.composite,
        voiceCritique: combinedCritique,
      },
    },
  };
}

// ── draft_cold_email ──────────────────────────────────────────────────────────
// New outbound email (no thread). Same Gmail draft save + voice critique as
// draft_reply, but composes a fresh subject + body for a recipient the user
// hasn't necessarily emailed before. Soft-write — user reviews and sends from
// the draft card; no request_confirmation gate.
async function draftColdEmail(userId: string, input: any): Promise<ToolResult> {
  const to = (input.to || '').trim();
  const subject = (input.subject || '').trim();
  const body = (input.body || '').trim();
  if (!to || !subject || !body) {
    return failureResult('to, subject, and body are all required.', 'validation_error');
  }

  let token = await getGmailToken(userId);
  if (!token) return failureResult('Gmail is not connected.', 'gmail_not_connected');

  const raw = buildRaw(to, subject, body);
  const draftBodyJson = JSON.stringify({ message: { raw } });

  let res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: draftBodyJson,
    signal: AbortSignal.timeout(12000),
  });
  if (res.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) {
      token = newToken;
      res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: draftBodyJson,
        signal: AbortSignal.timeout(12000),
      });
    }
  }
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return failureResult(`Failed to save draft (${res.status}): ${err.slice(0, 200)}`, 'draft_save_failed');
  }

  const draft = await res.json();
  const previewUrl = `https://mail.google.com/mail/u/0/#drafts/${draft.message?.id || ''}`;
  const displayName = input.recipientName || to.split('@')[0];
  touchContact(userId, to, displayName);

  // Surface input.purpose to the critique so it knows what the email is meant
  // to achieve (matters for the clear_cta and appropriate_tone dimensions).
  const review = await reviewDraft(userId, body, input.purpose);
  const lowScoreNote = review && review.composite < 70
    ? `\n\nVOICE MATCH: ${review.composite}/100. ${review.critique || ''}` +
      (review.suggestions[0] ? ` Suggestion: ${review.suggestions[0]}` : '')
    : review
      ? `\n\nVOICE MATCH: ${review.composite}/100. Sounds like the user.`
      : '';
  const combinedCritique = review
    ? [review.critique, review.suggestions[0]].filter(Boolean).join(' — ').slice(0, 240)
    : undefined;

  return {
    output: `Cold-outreach draft saved to Gmail.\nTo: ${displayName} <${to}>\nSubject: ${subject}\n\nDraft body (first 400 chars):\n${body.slice(0, 400)}${body.length > 400 ? '...' : ''}\n\nReview the draft below and hit Send when ready. Do NOT call send_email.${lowScoreNote}`,
    canvasData: {
      title: `Draft: ${subject}`,
      type: 'email_draft',
      markdown: [
        `**To:** ${displayName} <${to}>`,
        `**Subject:** ${subject}`,
        '',
        '---',
        '',
        body,
        '',
        '---',
        '',
        `[Open in Gmail](${previewUrl})`,
      ].join('\n'),
      draftMeta: {
        to,
        subject,
        body,
        recipientName: displayName,
        gmailDraftId: draft.id,
        voiceScore: review?.composite,
        voiceCritique: combinedCritique,
      },
    },
  };
}

async function sendEmail(userId: string, input: any, context: ToolContext = {}): Promise<ToolResult> {
  // Executor-level confirmation gate. The system prompt tells the LLM to call
  // request_confirmation first, but prompt rules drift — the gate here makes
  // it non-negotiable. consumeApproval fails open if the migration isn't
  // applied or Supabase is unreachable, so existing deployments don't break.
  if (context.conversationId) {
    const targetKey = normalizeTargetKey('send_email', input);
    const { approved, failedOpen } = await consumeApproval({
      conversationId: context.conversationId,
      userId,
      actionType: 'send_email',
      targetKey,
    });
    if (!approved && !failedOpen) {
      return failureResult(
        `Refusing to send. No approved request_confirmation found for sending an email to ${input.to || 'this recipient'} with subject "${input.subject || ''}". You MUST call request_confirmation first with details { To: "${input.to || ''}", Subject: "${input.subject || ''}" }, wait for the user to click Confirm, and only then call send_email.`,
        'confirmation_required',
      );
    }
  }

  let token = await getGmailToken(userId);
  if (!token) return failureResult('Gmail is not connected.', 'gmail_not_connected');

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
    return failureResult(`Failed to send email (${res.status}): ${err.slice(0, 200)}`, 'send_failed');
  }

  const sent = await res.json();
  // Feature 3: Voice auto-learning — fire-and-forget, never blocks send
  if (input.body) learnFromSentEmail(userId, input.body, input.subject || '');
  // Feature 4: Update contact memory on every send
  if (input.to) touchContact(userId, input.to, input.recipientName || '');
  return { output: `Email sent successfully! Message ID: ${sent.id}\nTo: ${input.to}\nSubject: ${input.subject}` };
}

async function scheduleMeeting(userId: string, input: any, context: ToolContext = {}): Promise<ToolResult> {
  if (context.conversationId) {
    const targetKey = normalizeTargetKey('schedule_meeting', input);
    const { approved, failedOpen } = await consumeApproval({
      conversationId: context.conversationId,
      userId,
      actionType: 'schedule_meeting',
      targetKey,
    });
    if (!approved && !failedOpen) {
      const att = Array.isArray(input.attendees) ? input.attendees.join(', ') : '';
      return failureResult(
        `Refusing to create event. No approved request_confirmation found for scheduling "${input.title || ''}" at ${input.startTime || ''}${att ? ` with ${att}` : ''}. Call request_confirmation first with the meeting details, wait for the user to click Confirm, then retry.`,
        'confirmation_required',
      );
    }
  }

  let token = await getGcalToken(userId);
  if (!token) return failureResult('Google Calendar is not connected. Ask the user to connect it in Settings → Integrations.', 'gcal_not_connected');

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
    if (isScopeError(res.status)) return failureResult(CALENDAR_SCOPE_MESSAGE, 'gcal_scope_missing');
    const err = await res.text().catch(() => '');
    return failureResult(`Failed to create event (${res.status}): ${err.slice(0, 200)}`, 'gcal_create_failed');
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
  if (!token) return failureResult('Google Calendar is not connected.', 'gcal_not_connected');

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
    if (isScopeError(res.status)) return failureResult(CALENDAR_SCOPE_MESSAGE, 'gcal_scope_missing');
    return failureResult(`Calendar fetch failed (${res.status}).`, 'upstream_gcal');
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

// ── calendar_get_availability ─────────────────────────────────────────────────
// Uses GCal's freeBusy endpoint (purpose-built for this) and inverts the busy
// set against the requested window to produce free slots >= minSlotMinutes.
// Also fetches event titles for the busy ranges so the LLM can quote them when
// explaining a conflict ("you have 'Standup' at 10am").
async function calendarGetAvailability(userId: string, input: any): Promise<ToolResult> {
  const startIso = (input.startDate || '').trim();
  const endIso = (input.endDate || '').trim();
  if (!startIso || !endIso) return failureResult('startDate and endDate (ISO 8601) are required.', 'validation_error');
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return failureResult('startDate and endDate must be valid ISO 8601 timestamps with endDate after startDate.', 'validation_error');
  }
  const minSlotMs = Math.max(5, Number(input.minSlotMinutes) || 30) * 60 * 1000;
  const tz = (input.timezone || 'UTC').trim() || 'UTC';

  let token = await getGcalToken(userId);
  if (!token) return failureResult('Google Calendar is not connected.', 'gcal_not_connected');

  // 1) freeBusy — gives us the busy ranges only
  const fbBody = JSON.stringify({
    timeMin: new Date(start).toISOString(),
    timeMax: new Date(end).toISOString(),
    timeZone: tz,
    items: [{ id: 'primary' }],
  });
  let fbRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: fbBody,
    signal: AbortSignal.timeout(10000),
  });
  if (fbRes.status === 401 || fbRes.status === 403) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) {
      token = newToken;
      fbRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: fbBody,
        signal: AbortSignal.timeout(10000),
      });
    }
  }
  if (!fbRes.ok) {
    if (isScopeError(fbRes.status)) return failureResult(CALENDAR_SCOPE_MESSAGE, 'gcal_scope_missing');
    return failureResult(`freeBusy fetch failed (${fbRes.status}).`, 'upstream_gcal');
  }
  const fbData = await fbRes.json();
  const busyRaw: Array<{ start: string; end: string }> = fbData.calendars?.primary?.busy || [];

  // 2) Pull events in the window to attach titles to the busy ranges (best-effort)
  const eventTitles = new Map<string, string>(); // key = `${start}|${end}` -> title
  try {
    const params = new URLSearchParams({
      timeMin: new Date(start).toISOString(),
      timeMax: new Date(end).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '50',
    });
    const evRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) },
    );
    if (evRes.ok) {
      const data = await evRes.json();
      for (const e of (data.items || []) as any[]) {
        const s = e.start?.dateTime || (e.start?.date ? `${e.start.date}T00:00:00Z` : null);
        const en = e.end?.dateTime || (e.end?.date ? `${e.end.date}T00:00:00Z` : null);
        if (s && en) eventTitles.set(`${new Date(s).toISOString()}|${new Date(en).toISOString()}`, e.summary || '(no title)');
      }
    }
  } catch { /* non-fatal — busy ranges still report without titles */ }

  // 3) Normalize, clip, and sort busy ranges; then invert to find free slots
  const clipped = busyRaw
    .map(b => ({ s: Math.max(start, Date.parse(b.start)), e: Math.min(end, Date.parse(b.end)) }))
    .filter(b => Number.isFinite(b.s) && Number.isFinite(b.e) && b.e > b.s)
    .sort((a, b) => a.s - b.s);

  // Merge overlaps so the free-slot inversion is correct
  const merged: Array<{ s: number; e: number }> = [];
  for (const b of clipped) {
    const last = merged[merged.length - 1];
    if (last && b.s <= last.e) last.e = Math.max(last.e, b.e);
    else merged.push({ s: b.s, e: b.e });
  }

  const free: Array<{ s: number; e: number }> = [];
  let cursor = start;
  for (const b of merged) {
    if (b.s - cursor >= minSlotMs) free.push({ s: cursor, e: b.s });
    cursor = Math.max(cursor, b.e);
  }
  if (end - cursor >= minSlotMs) free.push({ s: cursor, e: end });

  const fmt = (ms: number) => {
    try {
      return new Date(ms).toLocaleString('en-US', {
        timeZone: tz,
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      });
    } catch { return new Date(ms).toISOString(); }
  };

  const busyLines = merged.length
    ? merged.map(b => {
        const title = eventTitles.get(`${new Date(b.s).toISOString()}|${new Date(b.e).toISOString()}`);
        return `  • ${fmt(b.s)} → ${fmt(b.e)}${title ? `  (${title})` : ''}`;
      })
    : ['  (none)'];

  const freeLines = free.length
    ? free.map(f => `  • ${fmt(f.s)} → ${fmt(f.e)}  (${Math.round((f.e - f.s) / 60000)} min)`)
    : [`  (no free slots ≥ ${Math.round(minSlotMs / 60000)} min in this window)`];

  return {
    output: [
      `Availability ${fmt(start)} → ${fmt(end)} (${tz})`,
      '',
      'Busy:',
      ...busyLines,
      '',
      `Free (slots ≥ ${Math.round(minSlotMs / 60000)} min):`,
      ...freeLines,
    ].join('\n'),
  };
}

// ── calendar_cancel_event ─────────────────────────────────────────────────────
// Gated by the same session-approval mechanism as send_email. Notifying
// attendees is irreversible (you can't unsend a cancellation email), so this
// is treated as Tier 3 — explicit confirm per event.
async function calendarCancelEvent(userId: string, input: any, context: ToolContext = {}): Promise<ToolResult> {
  const eventId = (input.eventId || '').trim();
  if (!eventId) return failureResult('eventId is required.', 'validation_error');

  if (context.conversationId) {
    const targetKey = normalizeTargetKey('cancel_event', input);
    const { approved, failedOpen } = await consumeApproval({
      conversationId: context.conversationId,
      userId,
      actionType: 'cancel_event',
      targetKey,
    });
    if (!approved && !failedOpen) {
      return failureResult(
        `Refusing to cancel. No approved request_confirmation found for cancelling event ${eventId}. Call request_confirmation first with action "Cancel event" and details { EventId: "${eventId}" }, wait for the user to Confirm, then retry.`,
        'confirmation_required',
      );
    }
  }

  let token = await getGcalToken(userId);
  if (!token) return failureResult('Google Calendar is not connected.', 'gcal_not_connected');

  // Fetch attendee count first (best-effort) so the success message is informative.
  let attendeeCount = 0;
  try {
    const evRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) },
    );
    if (evRes.ok) {
      const ev = await evRes.json();
      attendeeCount = (ev.attendees || []).length;
    }
  } catch { /* non-fatal */ }

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`;
  let res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 401 || res.status === 403) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) {
      token = newToken;
      res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      });
    }
  }
  if (!res.ok) {
    if (res.status === 404 || res.status === 410) return failureResult(`Event ${eventId} not found.`, 'not_found');
    if (isScopeError(res.status)) return failureResult(CALENDAR_SCOPE_MESSAGE, 'gcal_scope_missing');
    const err = await res.text().catch(() => '');
    return failureResult(`Cancel failed (${res.status}): ${err.slice(0, 200)}`, 'upstream_gcal');
  }

  const reason = input.reason ? ` Reason: ${input.reason}.` : '';
  return {
    output: `Cancelled event ${eventId}.${attendeeCount ? ` Notified ${attendeeCount} attendee(s).` : ''}${reason}`,
  };
}

async function searchNotion(userId: string, input: any): Promise<ToolResult> {
  const token = await getNotionToken(userId);
  if (!token) return failureResult('Notion is not connected. Ask the user to connect Notion in Settings → Integrations.', 'notion_not_connected');

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

  if (!res.ok) return failureResult(`Notion search failed (${res.status}).`, 'upstream_notion');

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
  if (!token) return failureResult('Notion is not connected. Ask the user to connect Notion in Settings → Integrations.', 'notion_not_connected');

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
    return failureResult(`Could not find a Notion database matching "${input.database}". Try a broader name like "meetings", "tasks", or "contacts". Use search_notion to discover available database names.`, 'notion_db_not_found');
  }

  const schema = await fetchNotionDbSchema(headers, dbId);
  if (!schema) {
    return failureResult(`Found database "${dbTitle}" but could not read its schema. Notion may not have granted access to this database.`, 'notion_schema_unreadable');
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

async function createNotionPage(userId: string, input: any, context: ToolContext = {}): Promise<ToolResult> {
  if (context.conversationId) {
    const targetKey = normalizeTargetKey('create_notion_page', input);
    const { approved, failedOpen } = await consumeApproval({
      conversationId: context.conversationId,
      userId,
      actionType: 'create_notion_page',
      targetKey,
    });
    if (!approved && !failedOpen) {
      return failureResult(
        `Refusing to create the Notion page. No approved request_confirmation found for creating "${input.title || 'this page'}" in database "${input.database || input.parentId || 'unknown'}". Call request_confirmation first with details { Database: "${input.database || ''}", Title: "${input.title || ''}" }, wait for the user to click Confirm, then retry.`,
        'confirmation_required',
      );
    }
  }

  const token = await getNotionToken(userId);
  if (!token) return failureResult('Notion is not connected. Ask the user to connect Notion in Settings → Integrations.', 'notion_not_connected');

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
    return failureResult(`Failed to create Notion page: could not locate a database matching "${input.database ?? 'unknown'}" and no fallback page found. Ensure Notion is connected with workspace access.`, 'notion_db_not_found');
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
    return failureResult(`Failed to create Notion page "${input.title}" (${createRes.status}): ${err.slice(0, 200)}.${skipNote}`, 'notion_create_failed');
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

// ── notion_read_page ──────────────────────────────────────────────────────────
// Fetch page properties + recursively walk child blocks; convert to markdown.
// Notion page ids in the URL form (with or without dashes) both work — we
// normalize before calling the API.
function normalizeNotionId(raw: string): string {
  // Accept page urls and ids with or without dashes
  const idMatch = (raw || '').match(/[0-9a-fA-F]{32}|[0-9a-fA-F-]{36}/);
  if (!idMatch) return raw;
  const stripped = idMatch[0].replace(/-/g, '');
  if (stripped.length !== 32) return raw;
  return `${stripped.slice(0, 8)}-${stripped.slice(8, 12)}-${stripped.slice(12, 16)}-${stripped.slice(16, 20)}-${stripped.slice(20)}`;
}

// Render a Notion rich_text array as plain text (annotations stripped — we
// keep markdown bold/italic later as needed but for now just text).
function richTextToString(rt: any[]): string {
  if (!Array.isArray(rt)) return '';
  return rt.map((r: any) => r.plain_text || '').join('');
}

// Convert a single Notion block to markdown. Returns '' for unsupported types.
function notionBlockToMarkdown(block: any, depth = 0): string {
  const indent = '  '.repeat(depth);
  const t = block.type;
  const data = block[t] || {};
  switch (t) {
    case 'paragraph':
      return `${indent}${richTextToString(data.rich_text)}`;
    case 'heading_1':
      return `${indent}# ${richTextToString(data.rich_text)}`;
    case 'heading_2':
      return `${indent}## ${richTextToString(data.rich_text)}`;
    case 'heading_3':
      return `${indent}### ${richTextToString(data.rich_text)}`;
    case 'bulleted_list_item':
      return `${indent}- ${richTextToString(data.rich_text)}`;
    case 'numbered_list_item':
      return `${indent}1. ${richTextToString(data.rich_text)}`;
    case 'to_do': {
      const check = data.checked ? '[x]' : '[ ]';
      return `${indent}- ${check} ${richTextToString(data.rich_text)}`;
    }
    case 'quote':
      return `${indent}> ${richTextToString(data.rich_text)}`;
    case 'code':
      return `${indent}\`\`\`${data.language || ''}\n${richTextToString(data.rich_text)}\n${indent}\`\`\``;
    case 'divider':
      return `${indent}---`;
    case 'callout':
      return `${indent}> ${richTextToString(data.rich_text)}`;
    case 'toggle':
      return `${indent}▸ ${richTextToString(data.rich_text)}`;
    case 'image': {
      const url = data.file?.url || data.external?.url || '';
      const caption = richTextToString(data.caption);
      return `${indent}![${caption}](${url})`;
    }
    case 'bookmark':
      return `${indent}🔖 ${data.url || ''}`;
    case 'child_page':
      return `${indent}📄 ${data.title || '(child page)'}`;
    case 'child_database':
      return `${indent}🗄️ ${data.title || '(child database)'}`;
    default:
      return '';
  }
}

async function fetchAllChildren(
  headers: Record<string, string>,
  blockId: string,
  depth = 0,
  maxDepth = 4,
): Promise<string[]> {
  if (depth > maxDepth) return ['  '.repeat(depth) + '… (nested deeper than 4 levels — truncated)'];
  const lines: string[] = [];
  let cursor: string | undefined;
  let pagesFetched = 0;
  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${blockId}/children`);
    url.searchParams.set('page_size', '100');
    if (cursor) url.searchParams.set('start_cursor', cursor);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      lines.push('  '.repeat(depth) + `(could not read child blocks: ${res.status})`);
      break;
    }
    const data = await res.json();
    const blocks: any[] = data.results || [];
    for (const b of blocks) {
      const md = notionBlockToMarkdown(b, depth);
      if (md) lines.push(md);
      if (b.has_children) {
        const childLines = await fetchAllChildren(headers, b.id, depth + 1, maxDepth);
        lines.push(...childLines);
      }
    }
    cursor = data.has_more ? data.next_cursor : undefined;
    pagesFetched++;
    if (pagesFetched > 5) break; // hard cap so a giant page can't blow the budget
  } while (cursor);
  return lines;
}

function notionPropertyValueToString(prop: any): string {
  if (!prop) return '';
  switch (prop.type) {
    case 'title':
    case 'rich_text':
      return richTextToString(prop[prop.type]);
    case 'number':
      return prop.number != null ? String(prop.number) : '';
    case 'select':
      return prop.select?.name || '';
    case 'multi_select':
      return (prop.multi_select || []).map((o: any) => o.name).join(', ');
    case 'status':
      return prop.status?.name || '';
    case 'date': {
      const s = prop.date?.start;
      const e = prop.date?.end;
      return e ? `${s} → ${e}` : (s || '');
    }
    case 'checkbox':
      return prop.checkbox ? '✓' : '✗';
    case 'url':
      return prop.url || '';
    case 'email':
      return prop.email || '';
    case 'phone_number':
      return prop.phone_number || '';
    case 'people':
      return (prop.people || []).map((p: any) => p.name || p.id).join(', ');
    case 'relation':
      return (prop.relation || []).length ? `${prop.relation.length} relation(s)` : '';
    case 'created_time':
      return prop.created_time || '';
    case 'last_edited_time':
      return prop.last_edited_time || '';
    default:
      return `(${prop.type})`;
  }
}

async function notionReadPage(userId: string, input: any): Promise<ToolResult> {
  const rawId = (input.pageId || '').trim();
  if (!rawId) return failureResult('pageId is required.', 'validation_error');
  const pageId = normalizeNotionId(rawId);

  const token = await getNotionToken(userId);
  if (!token) return failureResult('Notion is not connected. Ask the user to connect Notion in Settings → Integrations.', 'notion_not_connected');

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  // 1) Page properties
  const pageRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, { headers, signal: AbortSignal.timeout(10000) });
  if (pageRes.status === 404) return failureResult(`Notion page ${rawId} not found (or not shared with the integration).`, 'not_found');
  if (!pageRes.ok) return failureResult(`Could not read page (${pageRes.status}).`, 'upstream_notion');
  const page = await pageRes.json();

  // Pull the title — find the title-typed property and stringify it
  let title = '(untitled)';
  for (const [name, val] of Object.entries(page.properties || {}) as Array<[string, any]>) {
    if (val.type === 'title') {
      title = richTextToString(val.title) || name;
      break;
    }
  }

  const propLines: string[] = [];
  for (const [name, val] of Object.entries(page.properties || {}) as Array<[string, any]>) {
    if (val.type === 'title') continue;
    const v = notionPropertyValueToString(val);
    if (v) propLines.push(`  • ${name}: ${v}`);
  }

  // 2) Body blocks → markdown
  const bodyLines = await fetchAllChildren(headers, pageId, 0);

  const output = [
    `Notion page: ${title}`,
    `URL: ${page.url}`,
    `Last edited: ${page.last_edited_time}`,
    '',
    propLines.length ? 'Properties:' : 'Properties: (none non-title)',
    ...(propLines.length ? propLines : []),
    '',
    '--- Body ---',
    ...(bodyLines.length ? bodyLines : ['(empty page)']),
  ].join('\n');

  return { output };
}

// ── notion_create_task ────────────────────────────────────────────────────────
// Convenience wrapper. Delegates to createNotionPage with database hint
// "tasks", maps the task-shaped fields onto generic properties. Shares the
// 'create_notion_page' approval gate — no separate ActionType.
async function notionCreateTask(userId: string, input: any, context: ToolContext = {}): Promise<ToolResult> {
  const title = (input.title || '').trim();
  if (!title) return failureResult('title is required.', 'validation_error');

  const properties: Record<string, any> = {};

  // Most user task databases use a "Due", "Date", or "Deadline" date property —
  // create_notion_page's buildNotionDbProperties matches by name. We pass the
  // value under several common keys; only the one that matches the schema is
  // applied, the rest land in `skipped` (which we suppress for tasks).
  if (input.dueDate) {
    const v = String(input.dueDate);
    properties['Due'] = v;
    properties['Date'] = v;
    properties['Deadline'] = v;
  }

  if (input.priority) {
    properties['Priority'] = input.priority;
  }

  return createNotionPage(userId, {
    title,
    content: input.description || '',
    database: 'tasks',
    properties,
  }, context);
}

// ── notion_get_calendar_events ────────────────────────────────────────────────
// Read pages from a Notion database with a date property, filtered to a window.
// The merge-with-GCal job stays on the LLM — this tool just returns Notion-side
// rows; calendar_get_availability returns the GCal-side rows.
async function notionGetCalendarEvents(userId: string, input: any): Promise<ToolResult> {
  const startIso = (input.startDate || '').trim();
  const endIso = (input.endDate || '').trim();
  if (!startIso || !endIso) return failureResult('startDate and endDate (ISO 8601) are required.', 'validation_error');
  if (!Number.isFinite(Date.parse(startIso)) || !Number.isFinite(Date.parse(endIso))) {
    return failureResult('startDate and endDate must be valid ISO 8601 timestamps.', 'validation_error');
  }

  const token = await getNotionToken(userId);
  if (!token) return failureResult('Notion is not connected.', 'notion_not_connected');

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  // 1) Resolve database id
  let dbId = (input.databaseId || '').trim();
  const dbHint = (input.database || 'calendar').trim();
  if (!dbId) {
    try {
      const searchRes = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: dbHint,
          filter: { value: 'database', property: 'object' },
          page_size: 8,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (searchRes.ok) {
        const data = await searchRes.json();
        const results: any[] = data.results || [];
        const hintLower = dbHint.toLowerCase();
        const best = results.map((r: any) => {
          const t = (r.title?.[0]?.plain_text ?? '').toLowerCase();
          return { r, score: t === hintLower ? 2 : t.includes(hintLower) ? 1 : 0 };
        }).sort((a: any, b: any) => b.score - a.score)[0]?.r;
        if (best) dbId = best.id;
      }
    } catch { /* fallthrough */ }
  }
  if (!dbId) {
    return failureResult(`Could not find a Notion database matching "${dbHint}". Pass databaseId explicitly or use a broader hint.`, 'notion_db_not_found');
  }

  // 2) Introspect schema to find the date property name
  const schema = await fetchNotionDbSchema(headers, dbId);
  if (!schema) return failureResult(`Found database "${dbHint}" but could not read its schema.`, 'notion_schema_unreadable');
  const dateProp = schema.find(p => p.type === 'date');
  if (!dateProp) {
    return failureResult(
      `Database "${dbHint}" has no date property — nothing to treat as a calendar event. Properties available: ${schema.map(p => `${p.name} (${p.type})`).join(', ')}.`,
      'notion_schema_unreadable',
    );
  }
  const titleProp = schema.find(p => p.type === 'title');

  // 3) Query with a date filter (on_or_after start, on_or_before end)
  const queryBody = JSON.stringify({
    page_size: 50,
    filter: {
      and: [
        { property: dateProp.name, date: { on_or_after: startIso } },
        { property: dateProp.name, date: { on_or_before: endIso } },
      ],
    },
    sorts: [{ property: dateProp.name, direction: 'ascending' }],
  });
  const qRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST',
    headers,
    body: queryBody,
    signal: AbortSignal.timeout(12000),
  });
  if (!qRes.ok) {
    const err = await qRes.text().catch(() => '');
    return failureResult(`Notion query failed (${qRes.status}): ${err.slice(0, 200)}`, 'upstream_notion');
  }
  const qData = await qRes.json();
  const rows: any[] = qData.results || [];
  if (!rows.length) {
    return { output: `No Notion calendar entries in "${dbHint}" between ${startIso} and ${endIso}.` };
  }

  // 4) Render
  const peopleProp = schema.find(p => p.type === 'people');
  const lines = rows.map((row: any, i: number) => {
    const title = titleProp ? richTextToString(row.properties?.[titleProp.name]?.title || []) : '(no title)';
    const dateVal = row.properties?.[dateProp.name]?.date;
    const when = dateVal?.end ? `${dateVal.start} → ${dateVal.end}` : (dateVal?.start || '(no date)');
    const att = peopleProp ? (row.properties?.[peopleProp.name]?.people || []).map((p: any) => p.name || p.id).join(', ') : '';
    return `${i + 1}. ${title || '(untitled)'}\n   When: ${when}${att ? `\n   ${peopleProp!.name}: ${att}` : ''}\n   URL: ${row.url}`;
  });

  return {
    output: `${rows.length} Notion entr${rows.length === 1 ? 'y' : 'ies'} in "${dbHint}" (date property: ${dateProp.name}):\n\n${lines.join('\n\n')}`,
  };
}

function openCanvas(input: any): ToolResult {
  if (!input.markdown?.trim()) {
    return failureResult('Error: open_canvas requires non-empty markdown content. Write the full document content and pass it in the markdown parameter, then call open_canvas again.', 'validation_error');
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
    return failureResult('Error: update_canvas requires non-empty markdown content.', 'validation_error');
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
  if (!token) return failureResult('Gmail is not connected.', 'gmail_not_connected');

  const days = Math.min(input.days || 7, 21);
  const maxCheck = Math.min(input.maxResults || 15, 20);
  const sentQuery = `in:sent newer_than:${days}d`;
  const sentUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(sentQuery)}&maxResults=${maxCheck}`;

  let sentRes = await fetch(sentUrl, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
  if (sentRes.status === 401) {
    const newToken = await refreshGoogleToken(userId);
    if (newToken) { token = newToken; sentRes = await fetch(sentUrl, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) }); }
  }
  if (!sentRes.ok) return failureResult(`Could not check sent mail (${sentRes.status}).`, 'upstream_gmail');

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
  if (!recipientEmail) return failureResult('Recipient email is required.', 'validation_error');

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
  if (!email) return failureResult('Email address required.', 'validation_error');

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
    return failureResult(`No relationship memory for ${email} (run migration: supabase/migrations/arcus_contacts.sql).`, 'migration_missing');
  }
}

async function rememberAboutContact(userId: string, input: any): Promise<ToolResult> {
  const email = (input.email || '').toLowerCase();
  if (!email) return failureResult('Email address required.', 'validation_error');

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
    return failureResult(`Could not save contact note: ${err.message}`, 'contact_save_failed');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Supermemory tool wrappers — expose memory_search / memory_save /
// memory_get_contact_profile as first-class tools the LLM can invoke. The chat
// route already pre-fetches relevant memories every turn into the prompt;
// these tools are for explicit reads/writes (auditing memory, saving facts on
// demand, building a contact dossier).
// ══════════════════════════════════════════════════════════════════════════════

async function memorySearchTool(userId: string, input: any): Promise<ToolResult> {
  const query = (input?.query || '').trim();
  if (!query) return failureResult('query is required.', 'validation_error');
  const limit = Math.max(1, Math.min(20, Number(input?.limit) || 8));

  // @ts-ignore — JS module path
  const { searchMemoriesRaw } = await import('./memory');
  // The memory module returns [] when SUPERMEMORY_API_KEY is missing — same as
  // "no memories found" from the LLM's POV, but we surface the distinction so
  // the user can be told to configure the key.
  if (!process.env.SUPERMEMORY_API_KEY && !process.env.DATAFAST_API_KEY) {
    return failureResult('Supermemory is not configured — SUPERMEMORY_API_KEY env var missing.', 'memory_unavailable');
  }

  const items = await searchMemoriesRaw(userId, query, limit);
  if (!items.length) return { output: `No memories found for "${query}".` };

  const lines = items.map((m: any, i: number) => {
    const meta: string[] = [];
    if (typeof m.score === 'number') meta.push(`score: ${m.score.toFixed(2)}`);
    if (m.timestamp) meta.push(`when: ${m.timestamp}`);
    if (m.tags?.length) meta.push(`tags: ${m.tags.join(',')}`);
    const metaStr = meta.length ? `  [${meta.join('  ')}]` : '';
    return `${i + 1}. ${m.text}${metaStr}`;
  });
  return { output: `${items.length} memor${items.length === 1 ? 'y' : 'ies'} for "${query}":\n\n${lines.join('\n\n')}` };
}

async function memorySaveTool(userId: string, input: any): Promise<ToolResult> {
  const content = (input?.content || '').trim();
  if (!content) return failureResult('content is required.', 'validation_error');
  if (!process.env.SUPERMEMORY_API_KEY && !process.env.DATAFAST_API_KEY) {
    return failureResult('Supermemory is not configured — SUPERMEMORY_API_KEY env var missing.', 'memory_unavailable');
  }
  const tags = Array.isArray(input?.tags) ? input.tags.filter((t: any) => typeof t === 'string' && t.trim()).map((t: string) => t.trim()) : [];

  // @ts-ignore — JS module path
  const { saveMemory } = await import('./memory');
  await saveMemory(userId, content, tags.length ? tags : undefined);
  return {
    output: `Saved to memory: "${content.slice(0, 100)}${content.length > 100 ? '…' : ''}"${tags.length ? ` (tags: ${tags.join(', ')})` : ''}`,
  };
}

async function memoryGetContactProfile(userId: string, input: any): Promise<ToolResult> {
  const email = (input?.contactEmail || '').trim().toLowerCase();
  const name = (input?.name || '').trim();
  if (!email) return failureResult('contactEmail is required.', 'validation_error');

  const sections: string[] = [];

  // 1) Persisted relationship row from arcus_contacts (best-effort; the
  // migration may not be applied yet)
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('arcus_contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_email', email)
      .maybeSingle();
    if (data) {
      const row = [
        `**Relationship row**`,
        `Contact: ${data.contact_name || email}`,
        data.last_contact_at ? `Last contact: ${new Date(data.last_contact_at).toLocaleDateString()}` : null,
        data.email_count ? `Emails exchanged: ${data.email_count}` : null,
        data.notes ? `Notes: ${data.notes}` : null,
        data.tags?.length ? `Tags: ${data.tags.join(', ')}` : null,
      ].filter(Boolean).join('\n');
      sections.push(row);
    }
  } catch { /* table may not exist — non-fatal */ }

  // 2) Supermemory items mentioning the email or display name
  if (process.env.SUPERMEMORY_API_KEY || process.env.DATAFAST_API_KEY) {
    try {
      // @ts-ignore — JS module path
      const { searchMemoriesRaw } = await import('./memory');
      const queries = [email];
      if (name) queries.push(name);
      const all: any[] = [];
      for (const q of queries) {
        const items = await searchMemoriesRaw(userId, q, 6);
        for (const item of items) {
          if (!all.some((a) => a.text === item.text)) all.push(item);
        }
      }
      if (all.length) {
        const lines = all.slice(0, 10).map((m: any, i: number) => {
          const ts = m.timestamp ? `  (${m.timestamp})` : '';
          return `  ${i + 1}. ${m.text}${ts}`;
        });
        sections.push(`**Supermemory items mentioning ${name || email}**\n${lines.join('\n')}`);
      }
    } catch { /* non-fatal */ }
  }

  if (!sections.length) {
    return { output: `No history exists for ${email}.` };
  }
  return { output: sections.join('\n\n') };
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
    return failureResult('Delegation rules not yet set up (run migration: supabase/migrations/arcus_delegation_rules.sql).', 'migration_missing');
  }
}

async function createDelegationRule(userId: string, input: any): Promise<ToolResult> {
  if (!input.name || !input.action_type) return failureResult('Rule name and action_type are required.', 'validation_error');

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
    return failureResult(`Could not create rule: ${err.message}`, 'rule_save_failed');
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

  return failureResult(`Web search for "${query}": All search providers are temporarily unavailable. Try rephrasing the query or breaking it into a more specific term.`, 'web_search_unavailable');
}

async function sendSlackMessage(userId: string, input: any, context: ToolContext = {}): Promise<ToolResult> {
  if (context.conversationId) {
    const targetKey = normalizeTargetKey('send_slack_message', input);
    const { approved, failedOpen } = await consumeApproval({
      conversationId: context.conversationId,
      userId,
      actionType: 'send_slack_message',
      targetKey,
    });
    if (!approved && !failedOpen) {
      return failureResult(
        `Refusing to post to Slack. No approved request_confirmation found for posting to ${input.channel || 'this channel'}. Call request_confirmation first with details { Channel: "${input.channel || ''}" }, wait for the user to click Confirm, then retry.`,
        'confirmation_required',
      );
    }
  }

  const token = await getSlackToken(userId);
  if (!token) return failureResult('Slack is not connected. Ask the user to connect Slack in Settings → Integrations.', 'slack_not_connected');

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

  if (!res.ok) return failureResult(`Slack message failed (${res.status}).`, 'upstream_slack');
  const data = await res.json();
  if (!data.ok) return failureResult(`Slack error: ${data.error}`, 'upstream_slack');
  return { output: `Slack message sent to ${input.channel} ✅` };
}

// ── slack_find_user ───────────────────────────────────────────────────────────
// Email path uses users.lookupByEmail (exact, fast). Name path uses users.list
// and filters client-side — Slack has no native name search.
async function slackFindUser(userId: string, input: any): Promise<ToolResult> {
  const email = (input?.email || '').trim();
  const name = (input?.name || '').trim();
  if (!email && !name) return failureResult('email or name is required.', 'validation_error');

  const token = await getSlackToken(userId);
  if (!token) return failureResult('Slack is not connected.', 'slack_not_connected');

  // Path A: email — exact lookup
  if (email) {
    const url = `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return failureResult(`Slack lookup failed (${res.status}).`, 'upstream_slack');
    const data = await res.json();
    if (data.ok && data.user) {
      const u = data.user;
      return {
        output: `User: ${u.profile?.real_name || u.real_name || u.name}  id: ${u.id}  email: ${u.profile?.email || email}`,
      };
    }
    if (data.error === 'users_not_found') {
      return failureResult(`No Slack user with email ${email}.`, 'user_not_found');
    }
    return failureResult(`Slack lookup error: ${data.error || 'unknown'}.`, 'upstream_slack');
  }

  // Path B: name — paginate users.list, score by name substring
  const matches: Array<{ id: string; name: string; email: string; score: number }> = [];
  const nameLower = name.toLowerCase();
  let cursor: string | undefined;
  let pages = 0;
  do {
    const params = new URLSearchParams({ limit: '200' });
    if (cursor) params.set('cursor', cursor);
    const res = await fetch(`https://slack.com/api/users.list?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return failureResult(`Slack users.list failed (${res.status}).`, 'upstream_slack');
    const data = await res.json();
    if (!data.ok) return failureResult(`Slack error: ${data.error || 'unknown'}.`, 'upstream_slack');
    for (const u of (data.members || []) as any[]) {
      if (u.deleted || u.is_bot) continue;
      const dn = (u.profile?.display_name || '').toLowerCase();
      const rn = (u.profile?.real_name || u.real_name || '').toLowerCase();
      const un = (u.name || '').toLowerCase();
      const hay = `${dn} ${rn} ${un}`;
      const idx = hay.indexOf(nameLower);
      if (idx >= 0) {
        matches.push({
          id: u.id,
          name: u.profile?.real_name || u.real_name || u.name,
          email: u.profile?.email || '',
          score: dn === nameLower ? 3 : rn === nameLower ? 3 : idx,
        });
      }
    }
    cursor = data.response_metadata?.next_cursor || '';
    pages++;
  } while (cursor && pages < 5); // hard cap: 1000 users scanned

  if (!matches.length) return failureResult(`No Slack user matching "${name}".`, 'user_not_found');

  matches.sort((a, b) => (a.score === b.score ? a.name.localeCompare(b.name) : a.score - b.score));
  const top = matches.slice(0, 5);
  if (top.length === 1) {
    const m = top[0];
    return { output: `User: ${m.name}  id: ${m.id}${m.email ? `  email: ${m.email}` : ''}` };
  }
  const lines = top.map((m, i) => `${i + 1}. ${m.name}  id: ${m.id}${m.email ? `  email: ${m.email}` : ''}`);
  return { output: `${top.length} matches for "${name}":\n${lines.join('\n')}\n\nPick the right id and pass it as userId to slack_send_dm.` };
}

// ── slack_send_dm ─────────────────────────────────────────────────────────────
// Opens (or reuses) the DM channel with the target user, then posts. Gated
// by its own ApprovalActionType so the gate match key is the userId, not a
// channel name.
async function slackSendDm(userId: string, input: any, context: ToolContext = {}): Promise<ToolResult> {
  const targetUserId = (input?.userId || '').trim();
  const text = (input?.text || '').trim();
  if (!targetUserId) return failureResult('userId is required (use slack_find_user to resolve).', 'validation_error');
  if (!text) return failureResult('text is required.', 'validation_error');

  if (context.conversationId) {
    const targetKey = normalizeTargetKey('send_slack_dm', input);
    const { approved, failedOpen } = await consumeApproval({
      conversationId: context.conversationId,
      userId,
      actionType: 'send_slack_dm',
      targetKey,
    });
    if (!approved && !failedOpen) {
      return failureResult(
        `Refusing to send DM. No approved request_confirmation found for DM to ${targetUserId}. Call request_confirmation first with action "Send Slack DM" and details { User: "${targetUserId}" }, then retry after the user clicks Confirm.`,
        'confirmation_required',
      );
    }
  }

  const token = await getSlackToken(userId);
  if (!token) return failureResult('Slack is not connected.', 'slack_not_connected');

  // 1) conversations.open — idempotent, returns the existing IM channel id if one exists
  const openRes = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ users: targetUserId }),
    signal: AbortSignal.timeout(8000),
  });
  if (!openRes.ok) return failureResult(`Could not open Slack DM (${openRes.status}).`, 'upstream_slack');
  const openData = await openRes.json();
  if (!openData.ok || !openData.channel?.id) {
    return failureResult(`Slack DM open failed: ${openData.error || 'unknown'}.`, 'upstream_slack');
  }
  const dmChannel = openData.channel.id;

  // 2) chat.postMessage to the DM channel
  const postRes = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: dmChannel, text, mrkdwn: true }),
    signal: AbortSignal.timeout(10000),
  });
  if (!postRes.ok) return failureResult(`DM post failed (${postRes.status}).`, 'upstream_slack');
  const postData = await postRes.json();
  if (!postData.ok) return failureResult(`Slack error: ${postData.error || 'unknown'}.`, 'upstream_slack');

  // 3) Permalink — best-effort; if it fails we still return success
  let permalink = '';
  try {
    const plRes = await fetch(
      `https://slack.com/api/chat.getPermalink?channel=${encodeURIComponent(dmChannel)}&message_ts=${encodeURIComponent(postData.ts)}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) },
    );
    if (plRes.ok) {
      const pl = await plRes.json();
      if (pl.ok && pl.permalink) permalink = pl.permalink;
    }
  } catch { /* non-fatal */ }

  return {
    output: `Sent DM to ${targetUserId} at ts ${postData.ts}.${permalink ? `\nPermalink: ${permalink}` : ''}`,
  };
}

// ── slack_get_channels ────────────────────────────────────────────────────────
async function slackGetChannels(userId: string, input: any): Promise<ToolResult> {
  const limit = Math.max(1, Math.min(200, Number(input?.limit) || 100));
  const token = await getSlackToken(userId);
  if (!token) return failureResult('Slack is not connected.', 'slack_not_connected');

  const params = new URLSearchParams({
    types: 'public_channel,private_channel',
    exclude_archived: 'true',
    limit: String(Math.min(limit, 200)),
  });
  const res = await fetch(`https://slack.com/api/conversations.list?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return failureResult(`Slack channels.list failed (${res.status}).`, 'upstream_slack');
  const data = await res.json();
  if (!data.ok) return failureResult(`Slack error: ${data.error || 'unknown'}.`, 'upstream_slack');

  const channels: any[] = (data.channels || []).slice(0, limit);
  if (!channels.length) return { output: 'No channels accessible to the Slack bot.' };

  const lines = channels.map((c: any, i: number) =>
    `${i + 1}. #${c.name}  [id: ${c.id}  type: ${c.is_private ? 'private' : 'public'}  members: ${c.num_members ?? '?'}]`,
  );
  return { output: `${channels.length} channel(s):\n${lines.join('\n')}` };
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

async function requestConfirmation(input: any, userId: string, context: ToolContext = {}): Promise<ToolResult> {
  const details: Record<string, string> = {};
  if (input.details && typeof input.details === 'object') {
    for (const [k, v] of Object.entries(input.details)) {
      if (v !== null && v !== undefined && v !== '') details[k] = String(v);
    }
  }

  // Infer which write action this confirmation gates so the executor-level
  // gate in sendEmail/scheduleMeeting/sendSlackMessage/createNotionPage can
  // match it. The LLM's `action` string is freeform ("Send email", "Post to
  // Slack"), so we use a coarse keyword classifier.
  const lower = (input.action || '').toLowerCase();
  let actionType: ApprovalActionType | null = null;
  if (/\bsend\b.*\bemail\b|\bemail\b.*\bsend\b|\bsend\b.*\breply\b/.test(lower)) actionType = 'send_email';
  else if (/\bcancel\b.*\b(event|meeting|invite|calendar)\b/.test(lower)) actionType = 'cancel_event';
  else if (/\bschedule\b|\bmeeting\b|\bcalendar\b.*\bevent\b|\bbook\b/.test(lower)) actionType = 'schedule_meeting';
  else if (/\bslack\b.*\bdm\b|\bdirect\b.*\bmessage\b|\bdm\b\s+\w+/.test(lower)) actionType = 'send_slack_dm';
  else if (/\bslack\b|\bchannel\b/.test(lower)) actionType = 'send_slack_message';
  else if (/\bnotion\b|\bpage\b|\bdatabase\b/.test(lower)) actionType = 'create_notion_page';

  let approvalId: string | null = null;
  if (actionType && context.conversationId) {
    // Reconstruct an input-shape from details so normalizeTargetKey can hash
    // the same key the write tool will produce when it runs.
    const detailsLower: Record<string, any> = {};
    for (const [k, v] of Object.entries(details)) detailsLower[k.toLowerCase()] = v;
    // Map common detail labels to the field names the write tools use.
    if (actionType === 'send_email') {
      detailsLower.to = detailsLower.to || detailsLower.recipient || detailsLower['to:'];
      detailsLower.subject = detailsLower.subject || detailsLower['subject:'];
    } else if (actionType === 'send_slack_message') {
      detailsLower.channel = detailsLower.channel || detailsLower.to || detailsLower.recipient;
    } else if (actionType === 'send_slack_dm') {
      detailsLower.userId = detailsLower.userid || detailsLower.user_id || detailsLower.user || detailsLower.to || detailsLower.recipient;
    } else if (actionType === 'create_notion_page') {
      detailsLower.database = detailsLower.database || detailsLower.db;
      detailsLower.title = detailsLower.title || detailsLower.name;
    } else if (actionType === 'schedule_meeting') {
      detailsLower.startTime = detailsLower.starttime || detailsLower.when || detailsLower.start;
      const att = detailsLower.attendees || detailsLower.with || detailsLower.attendee;
      if (typeof att === 'string') detailsLower.attendees = att.split(/[,;]/).map((s: string) => s.trim());
    } else if (actionType === 'cancel_event') {
      detailsLower.eventId = detailsLower.eventid || detailsLower.event_id || detailsLower.id || detailsLower.event;
    }
    const targetKey = normalizeTargetKey(actionType, detailsLower);
    approvalId = await recordPendingApproval({
      conversationId: context.conversationId,
      userId,
      actionType,
      targetKey,
      actionLabel: input.action,
    });
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
        // Picked up by ConfirmationCard.onAction — POSTed to /api/arcus/approval/confirm
        // when the user clicks Confirm so the executor-level gate can match.
        approvalId,
      },
    },
  };
}

async function createScheduledAgent(userId: string, input: any): Promise<ToolResult> {
  if (!input?.name?.trim() || !input?.task_description?.trim()) {
    return failureResult('Cannot create the agent — a name and a task description are both required.', 'validation_error');
  }
  const cron = (input.cron_schedule || '0 7 * * *').trim();
  if (cron.split(/\s+/).length !== 5) {
    return failureResult(`Invalid cron schedule "${cron}". It must have exactly 5 space-separated fields (m h dom mon dow).`, 'validation_error');
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
    return failureResult('The agents table is not set up in the database yet. Tell the user the scheduled-agents feature needs the arcus_agents migration applied.', 'migration_missing');
  }
  if (error) {
    return failureResult(`Failed to create the scheduled agent: ${error.message}`, 'agent_create_failed');
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
  if (!token) return failureResult('Gmail is not connected. Ask the user to connect Gmail in Settings → Integrations.', 'gmail_not_connected');

  let r: NewsletterDigestResult;
  try {
    r = await runNewsletterDigest(userId, {
      daysBack: input?.daysBack,
      archive: !!input?.archive,
      sendEmail: !!input?.sendEmail,
    });
  } catch (e: any) {
    if (e.message === 'GMAIL_NOT_CONNECTED') return failureResult('Gmail is not connected.', 'gmail_not_connected');
    return failureResult(`Could not build the newsletter digest: ${e.message}`, 'digest_failed');
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
