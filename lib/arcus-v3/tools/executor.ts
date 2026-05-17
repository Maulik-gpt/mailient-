/**
 * Arcus V3 — Tool Executor
 *
 * Implements each tool defined in definitions.ts. All functions are
 * scoped to a single userId and fetch their own tokens from Supabase.
 */

import { getSupabaseAdmin } from '../../supabase.js';
import { decrypt } from '../../crypto.js';

// ── Token helpers ──────────────────────────────────────────────────────────────

async function getToken(userId: string, provider: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('arcus_integrations')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', provider)
      .maybeSingle();
    if (!data?.access_token) return null;
    return decrypt(data.access_token);
  } catch {
    return null;
  }
}

async function getTokenPair(userId: string, provider: string) {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('arcus_integrations')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .eq('provider', provider)
      .maybeSingle();
    if (!data?.access_token) return null;
    return {
      accessToken: decrypt(data.access_token),
      refreshToken: data.refresh_token ? decrypt(data.refresh_token) : null,
    };
  } catch {
    return null;
  }
}

// ── Gmail helpers ──────────────────────────────────────────────────────────────

function decodeBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

function extractBody(payload: any): string {
  if (!payload) return '';

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data).slice(0, 2000);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data).slice(0, 2000);
      }
    }
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }

  return '';
}

function encodeRfc822(to: string, subject: string, body: string, threadId?: string, inReplyToId?: string): string {
  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=UTF-8',
  ];
  if (inReplyToId) {
    lines.push(`In-Reply-To: ${inReplyToId}`);
    lines.push(`References: ${inReplyToId}`);
  }
  lines.push('', body);
  return Buffer.from(lines.join('\r\n')).toString('base64url');
}

// ── Tool implementations ───────────────────────────────────────────────────────

export async function searchGmail(
  userId: string,
  input: { query: string; maxResults?: number }
): Promise<string> {
  const token = await getToken(userId, 'gmail');
  if (!token) return 'Gmail is not connected. Please connect Gmail in Integrations.';

  const max = Math.min(input.maxResults || 10, 20);
  const params = new URLSearchParams({
    q: input.query,
    maxResults: String(max),
    labelIds: 'INBOX',
  });

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }
  );

  if (!res.ok) return `Gmail search failed (${res.status}). Token may be expired.`;

  const data = await res.json();
  const messages: any[] = data.messages || [];
  if (!messages.length) return 'No emails found matching that query.';

  // Fetch metadata for each message
  const details = await Promise.all(
    messages.slice(0, max).map(async ({ id }: { id: string }) => {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
        );
        if (!msgRes.ok) return null;
        const msg = await msgRes.json();
        const headers = msg.payload?.headers || [];
        return {
          id: msg.id,
          threadId: msg.threadId,
          from: getHeader(headers, 'From'),
          subject: getHeader(headers, 'Subject'),
          date: getHeader(headers, 'Date'),
          snippet: msg.snippet?.slice(0, 150) || '',
        };
      } catch {
        return null;
      }
    })
  );

  const valid = details.filter(Boolean);
  if (!valid.length) return 'Found emails but could not read metadata.';

  const lines = valid.map((m: any, i: number) =>
    `${i + 1}. ID: ${m.id} | ThreadID: ${m.threadId}\n   From: ${m.from}\n   Subject: ${m.subject}\n   Date: ${m.date}\n   Preview: ${m.snippet}`
  );

  return `Found ${valid.length} email(s):\n\n${lines.join('\n\n')}`;
}

export async function readEmail(
  userId: string,
  input: { messageId: string }
): Promise<string> {
  const token = await getToken(userId, 'gmail');
  if (!token) return 'Gmail is not connected. Please connect Gmail in Integrations.';

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${input.messageId}?format=full`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }
  );

  if (!res.ok) return `Could not read email (${res.status}).`;

  const msg = await res.json();
  const headers = msg.payload?.headers || [];
  const from = getHeader(headers, 'From');
  const to = getHeader(headers, 'To');
  const subject = getHeader(headers, 'Subject');
  const date = getHeader(headers, 'Date');
  const messageId = getHeader(headers, 'Message-ID');
  const body = extractBody(msg.payload);

  return [
    `Message-ID: ${msg.id}`,
    `Thread-ID: ${msg.threadId}`,
    `RFC-Message-ID: ${messageId}`,
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    '',
    '--- Body ---',
    body || '(no plain text body)',
  ].join('\n');
}

export async function draftReply(
  userId: string,
  input: { threadId: string; to: string; subject?: string; body: string; inReplyToMessageId?: string }
): Promise<string> {
  const token = await getToken(userId, 'gmail');
  if (!token) return 'Gmail is not connected. Please connect Gmail in Integrations.';

  const subject = input.subject || 'Re: (no subject)';
  const raw = encodeRfc822(input.to, subject, input.body, input.threadId, input.inReplyToMessageId);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        raw,
        threadId: input.threadId,
      },
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return `Failed to create draft (${res.status}): ${err.slice(0, 200)}`;
  }

  const draft = await res.json();
  return JSON.stringify({
    success: true,
    draftId: draft.id,
    threadId: input.threadId,
    to: input.to,
    subject,
    body: input.body,
    previewUrl: `https://mail.google.com/mail/u/0/#drafts/${draft.message?.id || ''}`,
  });
}

export async function readNotion(
  userId: string,
  input: { query: string; maxResults?: number }
): Promise<string> {
  const token = await getToken(userId, 'notion');
  if (!token) return 'Notion is not connected. Please connect Notion in Integrations.';

  const max = Math.min(input.maxResults || 5, 10);

  const res = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      query: input.query,
      filter: { value: 'page', property: 'object' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: max,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return `Notion search failed (${res.status}).`;

  const data = await res.json();
  const pages: any[] = data.results || [];
  if (!pages.length) return 'No Notion pages found matching that query.';

  const summaries = pages.map((page: any, i: number) => {
    const title =
      page.properties?.title?.title?.[0]?.plain_text ||
      page.properties?.Name?.title?.[0]?.plain_text ||
      Object.values(page.properties || {}).find((p: any) => p.type === 'title')
        ? (Object.values(page.properties || {}).find((p: any) => p.type === 'title') as any)?.title?.[0]?.plain_text
        : 'Untitled';
    const edited = page.last_edited_time?.split('T')[0] || '';
    const url = page.url || '';
    return `${i + 1}. ${title}\n   Last edited: ${edited}\n   URL: ${url}\n   ID: ${page.id}`;
  });

  return `Found ${pages.length} Notion page(s):\n\n${summaries.join('\n\n')}`;
}

export async function scheduleMeeting(
  userId: string,
  input: {
    title: string;
    startTime: string;
    endTime: string;
    attendees?: string[];
    description?: string;
    createMeetLink?: boolean;
  }
): Promise<string> {
  const tokens = await getTokenPair(userId, 'gcal');
  if (!tokens) return 'Google Calendar is not connected. Please connect it in Integrations.';

  const event: Record<string, any> = {
    summary: input.title,
    start: { dateTime: input.startTime },
    end: { dateTime: input.endTime },
    description: input.description || '',
  };

  if (input.attendees?.length) {
    event.attendees = input.attendees.map(email => ({ email }));
  }

  const createMeet = input.createMeetLink !== false;
  const url = createMeet
    ? 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1'
    : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

  if (createMeet) {
    event.conferenceData = {
      createRequest: {
        requestId: `arcus-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return `Failed to create calendar event (${res.status}): ${err.slice(0, 200)}`;
  }

  const created = await res.json();
  const meetLink = created.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri || '';

  return JSON.stringify({
    success: true,
    eventId: created.id,
    title: created.summary,
    start: created.start?.dateTime,
    end: created.end?.dateTime,
    htmlLink: created.htmlLink,
    meetLink,
  });
}

// ── Canvas — no API call, just signals the stream ─────────────────────────────

export function openCanvas(input: { title: string; type?: string; markdown: string }) {
  return {
    title: input.title,
    type: (input.type as 'document' | 'report' | 'sequence' | 'summary') || 'document',
    markdown: input.markdown,
  };
}

// ── Main dispatcher ────────────────────────────────────────────────────────────

export interface ToolResult {
  output: string;
  canvasData?: { title: string; type: string; markdown: string; meta?: Record<string, any> };
}

export async function executeTool(
  toolName: string,
  toolInput: Record<string, any>,
  userId: string
): Promise<ToolResult> {
  switch (toolName) {
    case 'search_gmail':
      return { output: await searchGmail(userId, toolInput as any) };

    case 'read_email':
      return { output: await readEmail(userId, toolInput as any) };

    case 'draft_reply': {
      const result = await draftReply(userId, toolInput as any);
      try {
        const parsed = JSON.parse(result);
        if (parsed.success) {
          return {
            output: result,
            canvasData: {
              title: `Draft: ${parsed.subject}`,
              type: 'email_draft',
              markdown: parsed.body,
              meta: { to: parsed.to, subject: parsed.subject, body: parsed.body, draftId: parsed.draftId, previewUrl: parsed.previewUrl },
            },
          };
        }
      } catch {
        // fall through
      }
      return { output: result };
    }

    case 'read_notion':
      return { output: await readNotion(userId, toolInput as any) };

    case 'open_canvas': {
      const canvas = openCanvas(toolInput as any);
      return {
        output: `Canvas opened with title: "${canvas.title}"`,
        canvasData: {
          title: canvas.title,
          type: 'notes',
          markdown: canvas.markdown,
        },
      };
    }

    case 'schedule_meeting':
      return { output: await scheduleMeeting(userId, toolInput as any) };

    default:
      return { output: `Unknown tool: ${toolName}` };
  }
}
