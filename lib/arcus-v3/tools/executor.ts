/**
 * Arcus V3 — Tool Executor
 *
 * Implements each tool defined in definitions.ts. All functions are
 * scoped to a single userId and fetch their own tokens from Supabase.
 *
 * Cross-app behavior baked in here (not the LLM's job):
 * - schedule_meeting auto-mirrors to Notion Calendar after GCal create succeeds.
 * - create_notion_page introspects the target DB's schema and maps semantic
 *   fields to real property names, instead of guessing.
 */

import { getSupabaseAdmin } from '../../supabase.js';
import { decrypt } from '../../crypto.js';
import { SupermemoryClient } from '../../supermemory-client.js';

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

function encodeRfc822(to: string, subject: string, body: string, _threadId?: string, inReplyToId?: string): string {
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

// ── Gmail tools ────────────────────────────────────────────────────────────────

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

export async function readThread(
  userId: string,
  input: { threadId: string }
): Promise<string> {
  const token = await getToken(userId, 'gmail');
  if (!token) return 'Gmail is not connected.';

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${input.threadId}?format=full`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) }
  );
  if (!res.ok) return `Could not read thread (${res.status}).`;

  const thread = await res.json();
  const messages: any[] = thread.messages || [];
  if (!messages.length) return 'Thread has no messages.';

  const formatted = messages.map((msg: any, i: number) => {
    const headers = msg.payload?.headers || [];
    const from = getHeader(headers, 'From');
    const date = getHeader(headers, 'Date');
    const subject = getHeader(headers, 'Subject');
    const body = extractBody(msg.payload).slice(0, 1500);
    return `--- Message ${i + 1} ---\nFrom: ${from}\nDate: ${date}\nSubject: ${subject}\n\n${body || '(no plain text)'}`;
  });

  return `Thread ${input.threadId} — ${messages.length} message(s):\n\n${formatted.join('\n\n')}`;
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

export async function sendEmail(
  userId: string,
  input: { to: string; subject: string; body: string; threadId?: string; inReplyToMessageId?: string }
): Promise<string> {
  const token = await getToken(userId, 'gmail');
  if (!token) return 'Gmail is not connected.';

  const raw = encodeRfc822(input.to, input.subject, input.body, input.threadId, input.inReplyToMessageId);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input.threadId ? { raw, threadId: input.threadId } : { raw }),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return `Failed to send email (${res.status}): ${err.slice(0, 200)}`;
  }

  const sent = await res.json();
  return JSON.stringify({
    success: true,
    messageId: sent.id,
    threadId: sent.threadId,
    to: input.to,
    subject: input.subject,
  });
}

// ── Notion helpers ─────────────────────────────────────────────────────────────

interface NotionPropSchema {
  name: string;
  type: string;
  options?: string[];
}

interface NotionDbSchema {
  id: string;
  title: string;
  url?: string;
  properties: NotionPropSchema[];
  titlePropName: string;
}

async function notionFetch(token: string, path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Notion ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

function extractTitle(page: any): string {
  const props = page.properties || {};
  for (const key of Object.keys(props)) {
    const p = props[key];
    if (p?.type === 'title' && Array.isArray(p.title)) {
      return p.title.map((t: any) => t.plain_text || '').join('') || 'Untitled';
    }
  }
  return 'Untitled';
}

async function findNotionDatabase(token: string, hint: string): Promise<NotionDbSchema | null> {
  // Search for databases. Notion's search is fuzzy — pass the hint as a query.
  const searchRes = await notionFetch(token, '/search', {
    method: 'POST',
    body: JSON.stringify({
      query: hint,
      filter: { value: 'database', property: 'object' },
      page_size: 10,
    }),
  });

  const dbs: any[] = searchRes.results || [];
  if (!dbs.length) return null;

  // Rank: title containing the hint word ranks higher.
  const lowerHint = hint.toLowerCase();
  const scored = dbs.map((db: any) => {
    const title = (db.title || []).map((t: any) => t.plain_text || '').join('').toLowerCase();
    let score = 0;
    if (title === lowerHint) score += 100;
    if (title.includes(lowerHint)) score += 50;
    if (lowerHint.split(/\s+/).some(w => w.length > 2 && title.includes(w))) score += 20;
    return { db, score, title };
  });
  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score === 0) {
    // Fallback: just take the first result.
    return parseDbSchema(dbs[0]);
  }
  return parseDbSchema(top.db);
}

function parseDbSchema(db: any): NotionDbSchema {
  const props = db.properties || {};
  let titleProp = 'Name';
  const propList: NotionPropSchema[] = [];

  for (const [name, def] of Object.entries(props)) {
    const d = def as any;
    if (d?.type === 'title') titleProp = name;
    const entry: NotionPropSchema = { name, type: d?.type || 'unknown' };
    if (d?.type === 'select' && d.select?.options) {
      entry.options = d.select.options.map((o: any) => o.name).filter(Boolean);
    }
    if (d?.type === 'status' && d.status?.options) {
      entry.options = d.status.options.map((o: any) => o.name).filter(Boolean);
    }
    if (d?.type === 'multi_select' && d.multi_select?.options) {
      entry.options = d.multi_select.options.map((o: any) => o.name).filter(Boolean);
    }
    propList.push(entry);
  }

  return {
    id: db.id,
    title: (db.title || []).map((t: any) => t.plain_text || '').join('') || 'Untitled DB',
    url: db.url,
    properties: propList,
    titlePropName: titleProp,
  };
}

function findPropByTypes(schema: NotionDbSchema, types: string[]): NotionPropSchema | null {
  for (const t of types) {
    const p = schema.properties.find(p => p.type === t);
    if (p) return p;
  }
  return null;
}

function buildNotionProperties(
  schema: NotionDbSchema,
  fields: { title: string; date?: string; notes?: string; status?: string; url?: string }
): { properties: Record<string, any>; warnings: string[] } {
  const properties: Record<string, any> = {};
  const warnings: string[] = [];

  properties[schema.titlePropName] = {
    title: [{ type: 'text', text: { content: fields.title.slice(0, 2000) } }],
  };

  if (fields.date) {
    const dateProp = findPropByTypes(schema, ['date']);
    if (dateProp) {
      properties[dateProp.name] = { date: { start: fields.date } };
    } else {
      warnings.push("date field skipped — database has no date property");
    }
  }

  if (fields.notes) {
    const notesProp = findPropByTypes(schema, ['rich_text']);
    if (notesProp) {
      properties[notesProp.name] = {
        rich_text: [{ type: 'text', text: { content: fields.notes.slice(0, 2000) } }],
      };
    } else {
      warnings.push("notes field skipped — database has no rich-text property (added to page body instead)");
    }
  }

  if (fields.status) {
    const statusProp = findPropByTypes(schema, ['status', 'select']);
    if (statusProp && statusProp.options) {
      const match = statusProp.options.find(o => o.toLowerCase() === fields.status!.toLowerCase());
      if (match) {
        properties[statusProp.name] = statusProp.type === 'status'
          ? { status: { name: match } }
          : { select: { name: match } };
      } else {
        warnings.push(`status "${fields.status}" skipped — not in DB options (${statusProp.options.join(', ')})`);
      }
    } else {
      warnings.push("status field skipped — database has no status/select property");
    }
  }

  if (fields.url) {
    const urlProp = findPropByTypes(schema, ['url']);
    if (urlProp) {
      properties[urlProp.name] = { url: fields.url };
    }
  }

  return { properties, warnings };
}

function buildNotionChildren(notes: string | undefined, actionItems: string[] | undefined): any[] {
  const children: any[] = [];

  if (notes) {
    // If notes had no DB rich-text prop to land in, render as a paragraph block.
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: notes.slice(0, 2000) } }],
      },
    });
  }

  if (actionItems?.length) {
    children.push({
      object: 'block',
      type: 'heading_3',
      heading_3: { rich_text: [{ type: 'text', text: { content: 'Action items' } }] },
    });
    for (const item of actionItems.slice(0, 20)) {
      children.push({
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: [{ type: 'text', text: { content: item.slice(0, 500) } }],
          checked: false,
        },
      });
    }
  }

  return children;
}

// ── Notion tools ───────────────────────────────────────────────────────────────

export async function readNotion(
  userId: string,
  input: { query: string; maxResults?: number }
): Promise<string> {
  const token = await getToken(userId, 'notion');
  if (!token) return 'Notion is not connected. Please connect Notion in Integrations.';

  const max = Math.min(input.maxResults || 5, 10);

  try {
    const data = await notionFetch(token, '/search', {
      method: 'POST',
      body: JSON.stringify({
        query: input.query,
        filter: { value: 'page', property: 'object' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
        page_size: max,
      }),
    });

    const pages: any[] = data.results || [];
    if (!pages.length) return 'No Notion pages found matching that query.';

    const summaries = pages.map((page: any, i: number) => {
      const title = extractTitle(page);
      const edited = page.last_edited_time?.split('T')[0] || '';
      const url = page.url || '';
      return `${i + 1}. ${title}\n   Last edited: ${edited}\n   URL: ${url}\n   ID: ${page.id}`;
    });

    return `Found ${pages.length} Notion page(s):\n\n${summaries.join('\n\n')}`;
  } catch (err: any) {
    return `Notion search failed: ${err.message}`;
  }
}

export async function createNotionPage(
  userId: string,
  input: {
    databaseHint: string;
    title: string;
    date?: string;
    notes?: string;
    status?: string;
    url?: string;
    actionItems?: string[];
  }
): Promise<string> {
  const token = await getToken(userId, 'notion');
  if (!token) return 'Notion is not connected.';

  try {
    const schema = await findNotionDatabase(token, input.databaseHint);
    if (!schema) {
      return `No Notion database found matching "${input.databaseHint}". The user has no matching database — tell them which database name to use, or ask them to create one.`;
    }

    const { properties, warnings } = buildNotionProperties(schema, {
      title: input.title,
      date: input.date,
      notes: input.notes,
      status: input.status,
      url: input.url,
    });

    // If notes had a target rich-text property, don't duplicate them in body.
    const notesLandedInProperty = warnings.every(w => !w.startsWith('notes field skipped')) && !!input.notes;
    const children = buildNotionChildren(
      notesLandedInProperty ? undefined : input.notes,
      input.actionItems
    );

    const page = await notionFetch(token, '/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: schema.id },
        properties,
        ...(children.length ? { children } : {}),
      }),
    });

    return JSON.stringify({
      success: true,
      pageId: page.id,
      url: page.url,
      database: schema.title,
      databaseId: schema.id,
      warnings,
    });
  } catch (err: any) {
    return `Failed to create Notion page: ${err.message}`;
  }
}

export async function createNotionTask(
  userId: string,
  input: { title: string; dueDate?: string; notes?: string; status?: string }
): Promise<string> {
  return createNotionPage(userId, {
    databaseHint: 'tasks',
    title: input.title,
    date: input.dueDate,
    notes: input.notes,
    status: input.status,
  });
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

async function listGcalEvents(
  accessToken: string,
  rangeStart: string,
  rangeEnd: string
): Promise<any[]> {
  const params = new URLSearchParams({
    timeMin: new Date(rangeStart).toISOString(),
    timeMax: new Date(rangeEnd).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

async function listNotionCalendarEvents(
  token: string,
  rangeStart: string,
  rangeEnd: string
): Promise<Array<{ title: string; date: string; url: string; database: string }>> {
  // Find databases that have a date property — those are calendar-like.
  const searchRes = await notionFetch(token, '/search', {
    method: 'POST',
    body: JSON.stringify({
      filter: { value: 'database', property: 'object' },
      page_size: 20,
    }),
  });

  const dbs: any[] = searchRes.results || [];
  const calendarDbs: Array<{ id: string; title: string; dateProp: string }> = [];

  for (const db of dbs) {
    const schema = parseDbSchema(db);
    const dateProp = findPropByTypes(schema, ['date']);
    if (dateProp) {
      calendarDbs.push({ id: schema.id, title: schema.title, dateProp: dateProp.name });
    }
  }

  // Query up to 3 calendar DBs in parallel; more would be slow.
  const queries = calendarDbs.slice(0, 3).map(async cdb => {
    try {
      const data = await notionFetch(token, `/databases/${cdb.id}/query`, {
        method: 'POST',
        body: JSON.stringify({
          filter: {
            and: [
              { property: cdb.dateProp, date: { on_or_after: rangeStart.split('T')[0] } },
              { property: cdb.dateProp, date: { on_or_before: rangeEnd.split('T')[0] } },
            ],
          },
          page_size: 25,
        }),
      });
      return (data.results || []).map((page: any) => ({
        title: extractTitle(page),
        date: page.properties?.[cdb.dateProp]?.date?.start || '',
        url: page.url || '',
        database: cdb.title,
      }));
    } catch {
      return [];
    }
  });

  const results = await Promise.all(queries);
  return results.flat();
}

// ── Calendar tools ────────────────────────────────────────────────────────────

export async function readCombinedCalendar(
  userId: string,
  input: { rangeStart: string; rangeEnd: string }
): Promise<string> {
  const gcalTokens = await getTokenPair(userId, 'gcal');
  const notionToken = await getToken(userId, 'notion');

  if (!gcalTokens && !notionToken) {
    return 'Neither Google Calendar nor Notion is connected. Connect at least one in Integrations.';
  }

  const [gcalEvents, notionEvents] = await Promise.all([
    gcalTokens
      ? listGcalEvents(gcalTokens.accessToken, input.rangeStart, input.rangeEnd).catch(() => [])
      : Promise.resolve([]),
    notionToken
      ? listNotionCalendarEvents(notionToken, input.rangeStart, input.rangeEnd).catch(() => [])
      : Promise.resolve([]),
  ]);

  const merged = [
    ...gcalEvents.map((e: any) => ({
      source: 'gcal' as const,
      title: e.summary || '(no title)',
      start: e.start?.dateTime || e.start?.date || '',
      end: e.end?.dateTime || e.end?.date || '',
      attendees: (e.attendees || []).map((a: any) => a.email).filter(Boolean),
      url: e.htmlLink || '',
      id: e.id,
    })),
    ...notionEvents.map(e => ({
      source: 'notion' as const,
      title: e.title,
      start: e.date,
      end: '',
      attendees: [] as string[],
      url: e.url,
      id: '',
      database: e.database,
    })),
  ];

  merged.sort((a, b) => (a.start || '').localeCompare(b.start || ''));

  if (!merged.length) {
    return `No events found between ${input.rangeStart} and ${input.rangeEnd}.`;
  }

  // Detect potential conflicts (same time slot in both sources).
  const conflicts: string[] = [];
  for (const g of merged.filter(m => m.source === 'gcal')) {
    const matchInNotion = merged.find(
      m => m.source === 'notion' && m.start.startsWith(g.start.slice(0, 10)) &&
        m.title.toLowerCase() !== g.title.toLowerCase()
    );
    if (matchInNotion) {
      conflicts.push(`Mismatch on ${g.start.slice(0, 10)}: GCal "${g.title}" vs Notion "${matchInNotion.title}"`);
    }
  }

  const lines = merged.map((e, i) =>
    `${i + 1}. [${e.source}] ${e.title}\n   ${e.start}${e.end ? ' → ' + e.end : ''}${e.attendees.length ? '\n   With: ' + e.attendees.join(', ') : ''}`
  );

  let out = `Combined schedule (${merged.length} item(s)):\n\n${lines.join('\n\n')}`;
  if (conflicts.length) {
    out += `\n\nPotential conflicts between calendars:\n${conflicts.map(c => '- ' + c).join('\n')}`;
  }
  return out;
}

// ── Slack helpers ─────────────────────────────────────────────────────────────

async function slackFetch(token: string, path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`https://slack.com/api${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Slack ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack: ${data.error || 'unknown error'}`);
  return data;
}

export async function findSlackUser(
  userId: string,
  input: { email?: string; name?: string }
): Promise<string> {
  const token = await getToken(userId, 'slack');
  if (!token) return 'Slack is not connected.';

  try {
    if (input.email) {
      const params = new URLSearchParams({ email: input.email });
      const data = await slackFetch(token, `/users.lookupByEmail?${params}`);
      const u = data.user;
      return JSON.stringify({
        success: true,
        userId: u.id,
        name: u.real_name || u.name,
        email: u.profile?.email || input.email,
      });
    }

    if (input.name) {
      const data = await slackFetch(token, '/users.list?limit=200');
      const lower = input.name.toLowerCase();
      const match = (data.members || []).find((u: any) =>
        !u.deleted &&
        ((u.real_name || '').toLowerCase().includes(lower) ||
          (u.name || '').toLowerCase().includes(lower) ||
          (u.profile?.display_name || '').toLowerCase().includes(lower))
      );
      if (!match) return `No Slack user found matching "${input.name}".`;
      return JSON.stringify({
        success: true,
        userId: match.id,
        name: match.real_name || match.name,
      });
    }

    return 'find_slack_user requires either email or name.';
  } catch (err: any) {
    return `Slack user lookup failed: ${err.message}`;
  }
}

export async function sendSlackMessage(
  userId: string,
  input: { channel: string; text: string; thread_ts?: string }
): Promise<string> {
  const token = await getToken(userId, 'slack');
  if (!token) return 'Slack is not connected.';

  let channel = input.channel;

  // If channel is a user ID (starts with U), open a DM channel first.
  if (channel.startsWith('U')) {
    try {
      const opened = await slackFetch(token, '/conversations.open', {
        method: 'POST',
        body: JSON.stringify({ users: channel }),
      });
      channel = opened.channel?.id || channel;
    } catch (err: any) {
      return `Could not open DM with ${channel}: ${err.message}`;
    }
  }

  try {
    const body: Record<string, unknown> = { channel, text: input.text };
    if (input.thread_ts) body.thread_ts = input.thread_ts;

    const data = await slackFetch(token, '/chat.postMessage', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return JSON.stringify({
      success: true,
      channel: data.channel,
      ts: data.ts,
      text: input.text.slice(0, 200),
    });
  } catch (err: any) {
    return `Failed to send Slack message: ${err.message}`;
  }
}

// ── Schedule meeting (with Notion Calendar auto-mirror) ───────────────────────

async function mirrorToNotionCalendar(
  userId: string,
  meeting: { title: string; startTime: string; endTime: string; description?: string; attendees?: string[] }
): Promise<{ mirrored: boolean; note: string }> {
  const token = await getToken(userId, 'notion');
  if (!token) return { mirrored: false, note: 'Notion not connected — only Google Calendar updated.' };

  try {
    // Prefer a DB literally called "calendar"; fall back to any DB with a date property.
    let schema = await findNotionDatabase(token, 'calendar');
    if (!schema || !findPropByTypes(schema, ['date'])) {
      // No calendar-named DB — pick any DB with a date property.
      const searchRes = await notionFetch(token, '/search', {
        method: 'POST',
        body: JSON.stringify({
          filter: { value: 'database', property: 'object' },
          page_size: 20,
        }),
      });
      const dbs: any[] = searchRes.results || [];
      for (const db of dbs) {
        const s = parseDbSchema(db);
        if (findPropByTypes(s, ['date'])) {
          schema = s;
          break;
        }
      }
    }

    if (!schema) {
      return { mirrored: false, note: 'No Notion database with a date property found — Notion Calendar not updated.' };
    }

    const attendeeLine = meeting.attendees?.length ? `With: ${meeting.attendees.join(', ')}` : '';
    const notes = [meeting.description, attendeeLine].filter(Boolean).join('\n\n');

    const { properties } = buildNotionProperties(schema, {
      title: meeting.title,
      date: meeting.startTime,
      notes,
    });

    // Notion date property supports start+end — patch the start property to include both.
    const dateProp = findPropByTypes(schema, ['date']);
    if (dateProp) {
      properties[dateProp.name] = { date: { start: meeting.startTime, end: meeting.endTime } };
    }

    const page = await notionFetch(token, '/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: schema.id },
        properties,
      }),
    });

    return {
      mirrored: true,
      note: `Mirrored to Notion database "${schema.title}" (page ${page.id}).`,
    };
  } catch (err: any) {
    return { mirrored: false, note: `Notion mirror failed: ${err.message}` };
  }
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
  if (!tokens) return 'Google Calendar is not connected.';

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
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return `Failed to create calendar event (${res.status}): ${err.slice(0, 200)}`;
  }

  const created = await res.json();
  const meetLink = created.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri || '';

  // Auto-mirror to Notion Calendar. Partial failure here is non-fatal —
  // the user gets a clear note in the result.
  const mirror = await mirrorToNotionCalendar(userId, {
    title: input.title,
    startTime: input.startTime,
    endTime: input.endTime,
    description: input.description,
    attendees: input.attendees,
  });

  return JSON.stringify({
    success: true,
    eventId: created.id,
    title: created.summary,
    start: created.start?.dateTime,
    end: created.end?.dateTime,
    htmlLink: created.htmlLink,
    meetLink,
    notionMirror: mirror,
  });
}

// ── Memory ────────────────────────────────────────────────────────────────────

const supermemory = new SupermemoryClient();

export async function searchMemory(
  userId: string,
  input: { query: string; limit?: number }
): Promise<string> {
  const results = await supermemory.getMemories(userId, input.query, input.limit || 5);
  if (!results.length) return 'No memories found for that query.';

  const lines = results.map((r: any, i: number) => {
    const text = r.text || r.content || JSON.stringify(r).slice(0, 200);
    return `${i + 1}. ${text.slice(0, 300)}`;
  });
  return `Recalled ${results.length} relevant memory item(s):\n\n${lines.join('\n\n')}`;
}

export async function addMemory(
  userId: string,
  input: { content: string; category?: string }
): Promise<string> {
  const result = await supermemory.addMemory(userId, input.content, {
    category: input.category || 'context',
    source: 'arcus_chat',
  });
  if (!result) return 'Memory not saved (Supermemory unavailable).';
  return `Memory saved: "${input.content.slice(0, 120)}"`;
}

// ── Canvas + Approval (no API calls — they signal the stream) ─────────────────

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
  approvalRequest?: { summary: string; actions: string[] };
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

    case 'read_thread':
      return { output: await readThread(userId, toolInput as any) };

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

    case 'send_email':
      return { output: await sendEmail(userId, toolInput as any) };

    case 'read_notion':
      return { output: await readNotion(userId, toolInput as any) };

    case 'create_notion_page':
      return { output: await createNotionPage(userId, toolInput as any) };

    case 'create_notion_task':
      return { output: await createNotionTask(userId, toolInput as any) };

    case 'read_combined_calendar': {
      const out = await readCombinedCalendar(userId, toolInput as any);
      // Substantial output — render to canvas as well as returning to LLM.
      return {
        output: out,
        canvasData: {
          title: 'Combined schedule',
          type: 'summary',
          markdown: out,
        },
      };
    }

    case 'schedule_meeting':
      return { output: await scheduleMeeting(userId, toolInput as any) };

    case 'find_slack_user':
      return { output: await findSlackUser(userId, toolInput as any) };

    case 'send_slack_message':
      return { output: await sendSlackMessage(userId, toolInput as any) };

    case 'search_memory':
      return { output: await searchMemory(userId, toolInput as any) };

    case 'add_memory':
      return { output: await addMemory(userId, toolInput as any) };

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

    case 'request_approval': {
      const summary = String(toolInput.summary || '');
      const actions: string[] = Array.isArray(toolInput.actions) ? toolInput.actions : [];
      return {
        output:
          `APPROVAL_REQUESTED. You have stated your plan. STOP NOW — do not call any more tools. ` +
          `End your turn with a chat message that contains: (1) the plan in one sentence, ` +
          `(2) the bullet list of steps if useful, (3) ending with "OK to proceed?" or similar. ` +
          `Wait for the user's reply on the next turn before executing.`,
        approvalRequest: { summary, actions },
      };
    }

    default:
      return { output: `Unknown tool: ${toolName}` };
  }
}
