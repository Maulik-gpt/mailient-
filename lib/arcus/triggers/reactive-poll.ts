/**
 * Reactive trigger source (Phase 1 — no Pub/Sub).
 *
 * For an agent whose trigger_type is 'event' or 'condition', this reads the
 * agent's source (Gmail in Phase 1) over a window derived from its conditions,
 * normalizes each item, and evaluates the agent's conditions. It returns whether
 * the agent should fire this tick plus the NEW matching items (ids not already
 * in agent_state.processed_event_ids) so the cron can fire the run and persist
 * state.
 *
 * Design rules:
 *  - FAILS OPEN: any error → { shouldFire:false } (never crash the cron tick).
 *  - DEBOUNCED: respects trigger_config.debounce_min and agent_state.last_fired_at.
 *  - CHEAP: capped fetch, metadata-only; the cron only calls this for event
 *    agents that are actually due (last_run_at older than debounce).
 */
// @ts-ignore - JS module
import { DatabaseService } from '../../supabase.js';
// @ts-ignore - TS module without type exports we rely on
import { GmailService } from '../../gmail';
// @ts-ignore - JS module
import { decrypt } from '../../crypto.js';
import { evaluateConditions, parseAmount, type Condition, type NormalizedItem } from '../conditions';

export interface ReactiveAgent {
  id: string;
  user_id: string;
  trigger_type: string;
  trigger_config?: Record<string, any> | null;
  conditions?: Condition[] | null;
  agent_state?: Record<string, any> | null;
}

export interface MatchedEvent {
  id: string;
  signal: string;
  summary: string; // one-line for the run record / report
}

export interface ReactiveResult {
  shouldFire: boolean;
  matchedEvents: MatchedEvent[];
  /** New processed ids to merge into agent_state (capped by the caller). */
  newProcessedIds: string[];
}

const NO_FIRE: ReactiveResult = { shouldFire: false, matchedEvents: [], newProcessedIds: [] };
const MAX_LIST = 25;       // ids fetched from Gmail list
const MAX_DETAILS = 15;    // metadata reads (cost cap per agent per tick)
const PROCESSED_CAP = 200; // bound agent_state growth (enforced by caller)

function debounceMin(agent: ReactiveAgent): number {
  const n = Number(agent.trigger_config?.debounce_min);
  return Number.isFinite(n) && n > 0 ? n : 15;
}

/** Window (days) to scan. Conditions with age_days gte widen it; else ~2 days. */
function lookbackDays(conditions: Condition[]): number {
  let days = 2;
  for (const c of conditions) {
    if (c.field === 'age_days' && (c.op === 'gte' || c.op === 'eq')) {
      const v = Number(c.value);
      if (Number.isFinite(v)) days = Math.max(days, v + 2);
    }
  }
  return Math.min(days, 30);
}

/** Build a cheap Gmail query from conditions to shrink the result set. */
function gmailQuery(conditions: Condition[], days: number): string {
  const parts = [`in:inbox`, `newer_than:${days}d`];
  for (const c of conditions) {
    if (c.field === 'domain' && (c.op === 'contains' || c.op === 'eq')) {
      parts.push(`from:${String(c.value).replace(/^@/, '')}`);
    } else if (c.field === 'sender' && c.op === 'eq') {
      parts.push(`from:${c.value}`);
    } else if (c.field === 'subject' && c.op === 'contains') {
      parts.push(`subject:(${c.value})`);
    }
  }
  return parts.join(' ');
}

function ageDaysFromHeader(dateHeader: string): number | undefined {
  const t = Date.parse(dateHeader);
  if (Number.isNaN(t)) return undefined;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

async function resolveGmail(userId: string): Promise<InstanceType<typeof GmailService> | null> {
  try {
    const db = new DatabaseService();
    const t = await db.getUserTokens(userId);
    if (!t?.encrypted_access_token) return null;
    const accessToken = decrypt(t.encrypted_access_token);
    const refreshToken = t.encrypted_refresh_token ? decrypt(t.encrypted_refresh_token) : '';
    const gmail = new GmailService(accessToken, refreshToken);
    gmail.setUserEmail?.(userId);
    return gmail;
  } catch {
    return null;
  }
}

export async function checkEventAgents(agent: ReactiveAgent): Promise<ReactiveResult> {
  if (agent.trigger_type !== 'event' && agent.trigger_type !== 'condition') return NO_FIRE;

  // Debounce against last fire.
  const lastFired = agent.agent_state?.last_fired_at ? Date.parse(agent.agent_state.last_fired_at) : 0;
  if (lastFired && Date.now() - lastFired < debounceMin(agent) * 60_000) return NO_FIRE;

  const source = (agent.trigger_config?.event_source || 'gmail').toString();
  // Phase 1 implements Gmail. Other sources fall through to no-fire (Phase 2).
  if (source !== 'gmail') return NO_FIRE;

  const gmail = await resolveGmail(agent.user_id);
  if (!gmail) return NO_FIRE; // fail open — no Gmail token

  const conditions = Array.isArray(agent.conditions) ? agent.conditions : [];
  const days = lookbackDays(conditions);
  const processed = new Set<string>(Array.isArray(agent.agent_state?.processed_event_ids) ? agent.agent_state!.processed_event_ids : []);

  try {
    const list = await gmail.getEmails(MAX_LIST, gmailQuery(conditions, days), null);
    const messages: any[] = Array.isArray(list?.messages) ? list.messages : [];
    if (!messages.length) return NO_FIRE;

    const matched: MatchedEvent[] = [];
    const newIds: string[] = [];

    for (const msg of messages.slice(0, MAX_DETAILS)) {
      const key = msg.threadId || msg.id;
      if (!key || processed.has(key)) continue;
      let parsed: any;
      try {
        const details = await gmail.getEmailDetails(msg.id, 'metadata');
        parsed = gmail.parseEmailData(details);
      } catch { continue; }

      const from = (parsed.from || '').toLowerCase();
      const senderMatch = from.match(/<([^<>]+@[^<>]+)>/) || from.match(/([\w.+-]+@[\w-]+\.[\w.-]+)/);
      const sender = senderMatch?.[1] || '';
      const text = `${parsed.subject || ''} ${parsed.snippet || ''}`;
      const item: NormalizedItem = {
        id: key,
        source: 'gmail',
        sender,
        domain: sender.split('@')[1] || '',
        subject: (parsed.subject || '').toLowerCase(),
        snippet: (parsed.snippet || '').toLowerCase(),
        amount: parseAmount(text),
        ageDays: ageDaysFromHeader(parsed.date || ''),
        raw: text,
      };

      const { match, matchedSignal } = evaluateConditions(conditions, item);
      if (!match) continue;
      newIds.push(key);
      matched.push({
        id: key,
        signal: matchedSignal,
        summary: `${parsed.from || sender || 'someone'} — ${parsed.subject || '(no subject)'}`,
      });
    }

    if (!matched.length) return NO_FIRE;
    return { shouldFire: true, matchedEvents: matched, newProcessedIds: newIds };
  } catch {
    return NO_FIRE; // fail open
  }
}

/** Merge new processed ids into the prior list, newest-first, capped. */
export function mergeProcessedIds(prior: unknown, addIds: string[]): string[] {
  const old = Array.isArray(prior) ? prior.map(String) : [];
  const merged = [...addIds, ...old.filter(id => !addIds.includes(id))];
  return merged.slice(0, PROCESSED_CAP);
}
