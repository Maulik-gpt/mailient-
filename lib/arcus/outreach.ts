/**
 * Arcus Outreach — the outreach employee's engine.
 *
 * The full loop lives here: validate + create a campaign, RESEARCH each
 * recipient, DRAFT a genuinely individual email in the user's voice, guard
 * deliverability (domain health, ramp-up curve, daily caps, send windows,
 * jitter, suppression), dispatch paced sends through the existing
 * arcus_scheduled_emails queue, and sync outcomes back.
 *
 * Design laws:
 *  - NOTHING is ever enqueued to send before the user explicitly approves the
 *    campaign (approval is an HTTP action, never a tool — the model cannot
 *    trigger a send).
 *  - Every stage is chunked + resumable: a 429'd model or a cold serverless
 *    tick never loses rows — status transitions are the source of truth.
 *  - Personalization IS the spam defense: unique, researched, plain-text
 *    bodies from the user's real voice profile.
 *
 * Reuses: enqueueScheduledEmail / drainScheduledEmails (paced delivery),
 * voiceProfileService (voice), detectGenericFiller (filler lint),
 * callLLM (engine with multi-key fallback).
 */

import { callLLM, getText } from './engine';
import { detectGenericFiller } from './autonomy';
import { enqueueScheduledEmail } from './scheduled-send';
import { getGmailToken, refreshGoogleToken, getGcalToken } from './tools/http-tokens';
import { buildRaw } from './tools/encoding-helpers';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_RECIPIENTS_PER_CAMPAIGN = 200;
const SUPPRESSION_WINDOW_DAYS = 30;      // don't cold-email the same person twice within this window
const DRAFT_BATCH_SIZE = 8;              // recipients composed per LLM call (429-resilient chunks)
const DISPATCH_BATCH_PER_TICK = 5;       // sends topped up into the queue per cron tick per campaign
const SEND_JITTER_MIN_MS = 3 * 60_000;   // 3–8 min between sends
const SEND_JITTER_MAX_MS = 8 * 60_000;
const RESEARCH_FETCH_TIMEOUT_MS = 6_000;
const VOICE_SCORE_SAMPLE_EVERY = 8;      // voice-score 1 in N drafts (plus the first few)

const NOREPLY_RE = /^(no[-._]?reply|do[-._]?not[-._]?reply|notifications?|mailer-daemon|postmaster)@/i;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Freemail domains have no company site to research and no SPF the user controls.
const FREEMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'live.com', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com',
  'zoho.com', 'gmx.com', 'yandex.com', 'mail.com',
]);

// Spam-trigger phrases for the deliverability lint (deliberately short + high-signal;
// this is a linter, not a filter — flagged drafts are shown to the user, not blocked).
const SPAM_TRIGGERS: Array<{ re: RegExp; label: string }> = [
  { re: /\bact now\b/i, label: '"act now"' },
  { re: /\b100% free\b/i, label: '"100% free"' },
  { re: /\bguaranteed?\b/i, label: '"guaranteed"' },
  { re: /\brisk[- ]free\b/i, label: '"risk-free"' },
  { re: /\blimited time\b/i, label: '"limited time"' },
  { re: /\bclick here\b/i, label: '"click here"' },
  { re: /\bbuy now\b/i, label: '"buy now"' },
  { re: /\bwinner\b/i, label: '"winner"' },
  { re: /\$\$\$|!!!/, label: 'repeated $/!' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CampaignRecipientInput {
  email: string;
  name?: string;
  company?: string;
  context?: Record<string, unknown>;
}

export interface CreateCampaignInput {
  name: string;
  brief: string;
  recipients: CampaignRecipientInput[];
  dailyCap?: number;
  researchDepth?: 'light' | 'standard' | 'deep';
  subjectHint?: string;
}

export interface CreateCampaignResult {
  ok: boolean;
  campaignId?: string;
  accepted?: number;
  excluded?: Array<{ email: string; reason: string }>;
  domainHealth?: DomainHealth;
  error?: string;
}

export interface DomainHealth {
  domain: string;
  freemail: boolean;
  spf: boolean | null;      // null = check failed (network), not "missing"
  dmarc: boolean | null;
  checkedAt: string;
  advice: string | null;    // plain-language fix, when something's missing
}

interface EvidenceChip { source: string; fact: string }

// ─── Small helpers ────────────────────────────────────────────────────────────

function domainOf(email: string): string {
  return (email.split('@')[1] || '').toLowerCase().trim();
}

function isFreemail(domain: string): boolean {
  return FREEMAIL_DOMAINS.has(domain);
}

function jitteredDelayMs(): number {
  return SEND_JITTER_MIN_MS + Math.random() * (SEND_JITTER_MAX_MS - SEND_JITTER_MIN_MS);
}

/** Hour-of-day (0-23) and weekday check in an IANA timezone, without deps. */
function nowInTimezone(tz: string): { hour: number; isWeekday: boolean } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: 'numeric', hour12: false, weekday: 'short',
    }).formatToParts(new Date());
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '12', 10);
    const wd = parts.find(p => p.type === 'weekday')?.value || 'Mon';
    return { hour: Number.isFinite(hour) ? hour % 24 : 12, isWeekday: !['Sat', 'Sun'].includes(wd) };
  } catch {
    const d = new Date();
    return { hour: d.getUTCHours(), isWeekday: d.getUTCDay() >= 1 && d.getUTCDay() <= 5 };
  }
}

async function getUserTimezone(supabase: any, userId: string): Promise<string> {
  try {
    // .ilike matches the repo convention — user_id is an email whose casing
    // can differ between auth and profile rows (see tools.ts getUserTimezone).
    const { data } = await supabase
      .from('user_profiles')
      .select('preferences')
      .ilike('user_id', userId)
      .maybeSingle();
    const tz = data?.preferences?.timezone;
    if (typeof tz === 'string' && tz.length > 0) return tz;
  } catch { /* default below */ }
  return 'UTC';
}

/** Deliverability lint: spam triggers + link/exclamation density + generic filler. */
export function lintDraftDeliverability(body: string): { score: number; flags: string[] } {
  const flags: string[] = [];
  let penalty = 0;
  for (const t of SPAM_TRIGGERS) {
    if (t.re.test(body)) { flags.push(t.label); penalty += 12; }
  }
  const links = (body.match(/https?:\/\//g) || []).length;
  if (links > 1) { flags.push(`${links} links`); penalty += (links - 1) * 10; }
  const bangs = (body.match(/!/g) || []).length;
  if (bangs > 2) { flags.push('exclamation-heavy'); penalty += (bangs - 2) * 5; }
  if (body.length > 1800) { flags.push('long for a cold email'); penalty += 10; }
  const filler = detectGenericFiller(body);
  if (filler.shouldRedraft) { flags.push('reads generic'); penalty += 20; }
  return { score: Math.max(0, 100 - penalty), flags };
}

// ─── Domain health (pre-flight SPF/DMARC via DNS-over-HTTPS) ─────────────────

/**
 * One Google DNS JSON lookup per record — no new dependencies. For freemail
 * senders (gmail.com) Google manages SPF/DKIM, so we report healthy-with-note.
 */
export async function checkDomainHealth(senderEmail: string): Promise<DomainHealth> {
  const domain = domainOf(senderEmail);
  const base: DomainHealth = {
    domain, freemail: isFreemail(domain), spf: null, dmarc: null,
    checkedAt: new Date().toISOString(), advice: null,
  };
  if (base.freemail) {
    // Google signs consumer Gmail mail itself; nothing for the user to fix.
    base.spf = true; base.dmarc = true;
    base.advice = null;
    return base;
  }
  const lookupTxt = async (name: string): Promise<string[] | null> => {
    try {
      const res = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=TXT`,
        { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/dns-json' } },
      );
      if (!res.ok) return null;
      const json = await res.json();
      return (json?.Answer || []).map((a: any) => String(a.data || '').replace(/^"|"$/g, ''));
    } catch { return null; }
  };
  const [spfTxt, dmarcTxt] = await Promise.all([lookupTxt(domain), lookupTxt(`_dmarc.${domain}`)]);
  base.spf = spfTxt === null ? null : spfTxt.some(t => /v=spf1/i.test(t));
  base.dmarc = dmarcTxt === null ? null : dmarcTxt.some(t => /v=DMARC1/i.test(t));
  if (base.spf === false || base.dmarc === false) {
    const missing = [base.spf === false ? 'SPF' : null, base.dmarc === false ? 'DMARC' : null].filter(Boolean).join(' and ');
    base.advice =
      `${domain} is missing ${missing}. Cold email without ${missing} is how you land in spam. ` +
      (base.dmarc === false
        ? `Add a TXT record at _dmarc.${domain} with value "v=DMARC1; p=none; rua=mailto:${senderEmail}". `
        : '') +
      (base.spf === false
        ? `Add a TXT record at ${domain} that includes your email provider's SPF (for Google Workspace: "v=spf1 include:_spf.google.com ~all").`
        : '');
  }
  return base;
}

// ─── Campaign creation ────────────────────────────────────────────────────────

export async function createCampaign(
  supabase: any,
  userId: string,
  input: CreateCampaignInput,
): Promise<CreateCampaignResult> {
  const name = (input.name || '').trim().slice(0, 120);
  const brief = (input.brief || '').trim();
  if (!name) return { ok: false, error: 'Campaign name is required.' };
  if (brief.length < 20) {
    return { ok: false, error: 'The brief is too thin to personalize from — describe the pitch, who these people are, and what a good hook looks like.' };
  }
  const rawRecipients = Array.isArray(input.recipients) ? input.recipients : [];
  if (rawRecipients.length === 0) return { ok: false, error: 'At least one recipient is required.' };
  if (rawRecipients.length > MAX_RECIPIENTS_PER_CAMPAIGN) {
    return { ok: false, error: `Campaigns are capped at ${MAX_RECIPIENTS_PER_CAMPAIGN} recipients — split the list.` };
  }

  // Validate + normalize + in-list dedup.
  const excluded: Array<{ email: string; reason: string }> = [];
  const seen = new Set<string>();
  const candidates: CampaignRecipientInput[] = [];
  for (const r of rawRecipients) {
    const email = (r?.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { excluded.push({ email: email || '(empty)', reason: 'invalid address' }); continue; }
    if (NOREPLY_RE.test(email)) { excluded.push({ email, reason: 'no-reply address' }); continue; }
    if (seen.has(email)) { excluded.push({ email, reason: 'duplicate in list' }); continue; }
    seen.add(email);
    candidates.push({ ...r, email });
  }
  if (candidates.length === 0) {
    return { ok: false, error: 'No valid recipients after validation.', excluded };
  }

  // Cross-campaign suppression: anyone we cold-emailed in the window, or on
  // the permanent suppression list, is auto-excluded (shown in review).
  const emails = candidates.map(c => c.email);
  const windowStart = new Date(Date.now() - SUPPRESSION_WINDOW_DAYS * 86_400_000).toISOString();
  const [recentRes, suppressedRes] = await Promise.all([
    supabase
      .from('arcus_campaign_recipients')
      .select('email')
      .eq('user_id', userId)
      .in('status', ['queued', 'sent', 'replied', 'meeting'])
      .gte('created_at', windowStart)
      .in('email', emails),
    supabase
      .from('arcus_suppression_list')
      .select('email')
      .eq('user_id', userId)
      .in('email', emails),
  ]);
  const recentlyContacted = new Set((recentRes?.data || []).map((r: any) => (r.email || '').toLowerCase()));
  const suppressed = new Set((suppressedRes?.data || []).map((r: any) => (r.email || '').toLowerCase()));

  const accepted: CampaignRecipientInput[] = [];
  const excludedRows: Array<CampaignRecipientInput & { reason: string }> = [];
  for (const c of candidates) {
    if (suppressed.has(c.email)) { excluded.push({ email: c.email, reason: 'suppressed (asked not to be contacted)' }); excludedRows.push({ ...c, reason: 'suppressed' }); continue; }
    if (recentlyContacted.has(c.email)) { excluded.push({ email: c.email, reason: `already contacted in the last ${SUPPRESSION_WINDOW_DAYS} days` }); excludedRows.push({ ...c, reason: 'recently contacted' }); continue; }
    accepted.push(c);
  }
  if (accepted.length === 0) {
    return { ok: false, error: 'Every recipient was excluded (suppressed or recently contacted).', excluded };
  }

  // Pre-flight domain health on the SENDER (the user's own address).
  const domainHealth = await checkDomainHealth(userId);

  const dailyCap = Math.min(100, Math.max(10, Number(input.dailyCap) || 40));
  const { data: campaign, error: campErr } = await supabase
    .from('arcus_campaigns')
    .insert({
      user_id: userId,
      name,
      brief,
      status: 'drafting',
      daily_cap: dailyCap,
      research_depth: input.researchDepth || 'standard',
      subject_hint: (input.subjectHint || '').trim() || null,
      domain_health: domainHealth,
      recipient_count: accepted.length,
    })
    .select('id')
    .single();
  if (campErr || !campaign?.id) {
    return { ok: false, error: campErr?.message || 'Could not create the campaign.' };
  }

  // Insert recipients: accepted → pending; excluded-with-context → excluded
  // (kept so the review screen can show WHY they were left out).
  const rows = [
    ...accepted.map(c => ({
      campaign_id: campaign.id, user_id: userId, email: c.email,
      name: (c.name || '').trim() || null, company: (c.company || '').trim() || null,
      context: c.context || null, status: 'pending',
    })),
    ...excludedRows.map(c => ({
      campaign_id: campaign.id, user_id: userId, email: c.email,
      name: (c.name || '').trim() || null, company: (c.company || '').trim() || null,
      context: c.context || null, status: 'excluded', error: c.reason,
    })),
  ];
  const { error: recErr } = await supabase.from('arcus_campaign_recipients').insert(rows);
  if (recErr) {
    await supabase.from('arcus_campaigns').delete().eq('id', campaign.id);
    return { ok: false, error: recErr.message || 'Could not save the recipient list.' };
  }

  return { ok: true, campaignId: campaign.id, accepted: accepted.length, excluded, domainHealth };
}

// ─── Research ─────────────────────────────────────────────────────────────────

/**
 * Research one recipient without any new API surface: fetch their company
 * site (business domains only) and distill what it says. Freemail or fetch
 * failure degrades to context-column-only personalization — flagged honestly.
 */
async function researchRecipient(
  r: { email: string; name: string | null; company: string | null; context: any },
  depth: 'light' | 'standard' | 'deep',
): Promise<{ evidence: EvidenceChip[]; siteText: string | null }> {
  const evidence: EvidenceChip[] = [];
  const domain = domainOf(r.email);
  if (depth === 'light' || isFreemail(domain)) return { evidence, siteText: null };

  const fetchPage = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(RESEARCH_FETCH_TIMEOUT_MS),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MailientBot/1.0)' },
        redirect: 'follow',
      });
      if (!res.ok) return null;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('text/html')) return null;
      const html = await res.text();
      // Crude but dependency-free: strip scripts/styles/tags, collapse space.
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z#0-9]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const titleMatch = html.match(/<title[^>]*>([\s\S]{0,200}?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';
      return `${title ? title + ' — ' : ''}${text.slice(0, 1200)}`;
    } catch { return null; }
  };

  const home = await fetchPage(`https://${domain}`);
  if (home) {
    evidence.push({ source: domain, fact: home.slice(0, 140) });
  }
  let about: string | null = null;
  if (depth === 'deep' && home) {
    about = await fetchPage(`https://${domain}/about`);
    if (about) evidence.push({ source: `${domain}/about`, fact: about.slice(0, 140) });
  }
  const siteText = [home, about].filter(Boolean).join('\n\n') || null;
  return { evidence, siteText };
}

// ─── Drafting (chunked, resumable) ───────────────────────────────────────────

const COMPOSE_SYSTEM = `You are a world-class cold-email writer working AS the sender, in their exact voice. You write SHORT, genuinely individual first-touch emails — never templates with a name swapped in.

Rules:
- Each email must open from that recipient's OWN hook (their company, site, context) — one specific observation, then the point. If research is thin, lean on the provided context fields; never invent facts.
- 60–130 words. Plain text. No links unless the brief demands one. No "Hope this finds you well", no "I know you're busy", no flattery filler.
- One clear, low-friction ask (usually a short reply or a quick call).
- Subject: 2–6 words, lowercase-natural, specific — never salesy.
- Sound EXACTLY like the sender's voice profile. Match their greeting and sign-off style.

Return ONLY a JSON array, one object per recipient, no prose:
[{"id":"<recipient id>","subject":"...","body":"...","hook":"<the one-line personalization angle you used>"}]`;

export interface DraftBatchResult {
  drafted: number;
  remaining: number;
  campaignStatus: string;
  error?: string;
}

/**
 * Draft ONE batch for a campaign. Claims pending recipients (atomic via
 * status guard), researches them, composes the batch in a single LLM call,
 * lints + samples voice scores, writes rows back. Safe to call from the chat
 * tool, the cron tick, and the review page simultaneously.
 */
export async function draftCampaignBatch(
  supabase: any,
  userId: string,
  campaignId: string,
  opts: { limit?: number } = {},
): Promise<DraftBatchResult> {
  const limit = Math.min(opts.limit ?? DRAFT_BATCH_SIZE, 12);
  const fail = (error: string, status = 'drafting'): DraftBatchResult =>
    ({ drafted: 0, remaining: -1, campaignStatus: status, error });

  const { data: campaign } = await supabase
    .from('arcus_campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!campaign) return fail('Campaign not found.', 'missing');
  // Drafting normally happens in 'drafting', but a recipient re-included from
  // the review screen re-enters as 'pending' while the campaign is already in
  // 'review' (or even 'sending') — the review page's top-up call must still be
  // able to draft those. Terminal states never draft.
  if (!['drafting', 'review', 'sending'].includes(campaign.status)) {
    return { drafted: 0, remaining: 0, campaignStatus: campaign.status };
  }

  // Claim a batch: pending → researching (the status guard keeps concurrent
  // callers from double-drafting the same rows).
  const { data: pendingRows } = await supabase
    .from('arcus_campaign_recipients')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
    .limit(limit);
  if (!pendingRows?.length) {
    await maybeFinishDrafting(supabase, campaign);
    return { drafted: 0, remaining: 0, campaignStatus: 'review' };
  }
  const ids = pendingRows.map((r: any) => r.id);
  const { data: claimed } = await supabase
    .from('arcus_campaign_recipients')
    .update({ status: 'researching', updated_at: new Date().toISOString() })
    .in('id', ids)
    .eq('status', 'pending')
    .select('*');
  if (!claimed?.length) return { drafted: 0, remaining: -1, campaignStatus: 'drafting' };

  try {
    // Research pass (parallel, bounded by batch size).
    const researched = await Promise.all(
      claimed.map(async (r: any) => ({
        row: r,
        research: await researchRecipient(r, campaign.research_depth || 'standard'),
      })),
    );

    // Voice profile — same source the rest of the product drafts with.
    let voicePrompt = '';
    try {
      // @ts-ignore — JS module
      const { voiceProfileService } = await import('../voice-profile-service.js');
      const profile: any = await voiceProfileService.getVoiceProfile(userId);
      voicePrompt = (voiceProfileService.generateVoicePrompt(profile) as string | undefined)?.trim() || '';
    } catch { /* voice profile optional — brief still drives tone */ }

    const recipientBlocks = researched.map(({ row, research }) => {
      const ctx = row.context && typeof row.context === 'object'
        ? Object.entries(row.context).map(([k, v]) => `${k}: ${String(v).slice(0, 200)}`).join('\n')
        : '';
      return [
        `RECIPIENT id=${row.id}`,
        `email: ${row.email}`,
        row.name ? `name: ${row.name}` : null,
        row.company ? `company: ${row.company}` : null,
        ctx ? `context:\n${ctx}` : null,
        research.siteText ? `their website says:\n${research.siteText.slice(0, 900)}` : 'no site research available — personalize from context fields only',
      ].filter(Boolean).join('\n');
    }).join('\n\n---\n\n');

    const userMsg =
      `CAMPAIGN BRIEF (the sender's pitch and goal):\n${campaign.brief}\n\n` +
      (campaign.subject_hint ? `SUBJECT DIRECTION: ${campaign.subject_hint}\n\n` : '') +
      (voicePrompt ? `SENDER VOICE PROFILE:\n${voicePrompt}\n\n` : '') +
      `RECIPIENTS (${researched.length}):\n\n${recipientBlocks}\n\n` +
      `Write one email per recipient. Return the JSON array now.`;

    const response = await callLLM(
      [
        { role: 'system', content: COMPOSE_SYSTEM },
        { role: 'user', content: userMsg },
      ],
      [],
      { maxTokens: 350 * researched.length + 300, temperature: 0.55 },
    );
    const text = getText((response as any).content).trim();
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (!arrMatch) throw new Error('Compose call returned no JSON.');
    const drafts: any[] = JSON.parse(arrMatch[0]);
    const byId = new Map(drafts.filter(d => d && d.id).map(d => [String(d.id), d]));

    // Optionally voice-score a sample (first few + 1-in-N) to keep LLM cost sane.
    const { reviewDraftForOutreach } = await getReviewFn();
    let draftedCount = 0;
    for (let i = 0; i < researched.length; i++) {
      const { row, research } = researched[i];
      const d = byId.get(String(row.id));
      const nowIso = new Date().toISOString();
      if (!d || typeof d.body !== 'string' || d.body.trim().length < 30) {
        // Composition missed this one — return it to pending for the next batch.
        await supabase.from('arcus_campaign_recipients')
          .update({ status: 'pending', updated_at: nowIso })
          .eq('id', row.id);
        continue;
      }
      const body = d.body.trim();
      const subject = (typeof d.subject === 'string' && d.subject.trim()) ? d.subject.trim().slice(0, 150) : (campaign.subject_hint || 'quick question');
      const hook = typeof d.hook === 'string' ? d.hook.trim().slice(0, 300) : null;
      const lint = lintDraftDeliverability(body);

      let voiceScore: number | null = null;
      if (reviewDraftForOutreach && (draftedCount < 3 || i % VOICE_SCORE_SAMPLE_EVERY === 0)) {
        voiceScore = await reviewDraftForOutreach(userId, body, campaign.brief);
      }

      await supabase.from('arcus_campaign_recipients')
        .update({
          status: 'drafted',
          subject, body, hook,
          research: research.evidence.length ? research.evidence : null,
          deliverability_score: lint.score,
          generic_flag: lint.flags.includes('reads generic'),
          voice_score: voiceScore,
          updated_at: nowIso,
        })
        .eq('id', row.id);
      draftedCount++;
    }

    // Refresh campaign counts + maybe flip to review.
    const { count: draftedTotal } = await supabase
      .from('arcus_campaign_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', 'drafted');
    const { count: remaining } = await supabase
      .from('arcus_campaign_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .in('status', ['pending', 'researching']);
    await supabase.from('arcus_campaigns')
      .update({ drafted_count: draftedTotal ?? 0, updated_at: new Date().toISOString(), last_error: null })
      .eq('id', campaignId);
    if ((remaining ?? 0) === 0) {
      await maybeFinishDrafting(supabase, { ...campaign, id: campaignId });
      return { drafted: draftedCount, remaining: 0, campaignStatus: 'review' };
    }
    return { drafted: draftedCount, remaining: remaining ?? -1, campaignStatus: 'drafting' };
  } catch (e: any) {
    // 429 / parse failure / timeout: release the claimed rows so the next tick
    // (or the review page) can retry — nothing is lost.
    await supabase.from('arcus_campaign_recipients')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .in('id', ids)
      .eq('status', 'researching');
    await supabase.from('arcus_campaigns')
      .update({ last_error: (e?.message || 'drafting failed').slice(0, 300), updated_at: new Date().toISOString() })
      .eq('id', campaignId);
    return fail(e?.message || 'drafting failed');
  }
}

/** Lazy wrapper so outreach.ts never creates an import cycle with tools.ts. */
async function getReviewFn(): Promise<{ reviewDraftForOutreach: ((userId: string, body: string, brief: string) => Promise<number | null>) | null }> {
  try {
    // reviewDraft is private to tools.ts; recreate the thin call here instead
    // of exporting it (keeps tools.ts untouched and avoids a cycle).
    // @ts-ignore — JS module
    const { voiceProfileService } = await import('../voice-profile-service.js');
    return {
      reviewDraftForOutreach: async (userId: string, body: string, brief: string) => {
        try {
          const profile: any = await voiceProfileService.getVoiceProfile(userId);
          if (!profile || profile.status === 'default') return null;
          const voicePrompt = (voiceProfileService.generateVoicePrompt(profile) as string | undefined)?.trim();
          if (!voicePrompt) return null;
          const res: any = await Promise.race([
            callLLM(
              [
                { role: 'system', content: 'Score how well this cold email matches the sender\'s voice profile. Return ONLY JSON: {"score": 0-100}' },
                { role: 'user', content: `VOICE PROFILE:\n${voicePrompt}\n\nCAMPAIGN BRIEF:\n${brief.slice(0, 800)}\n\nDRAFT:\n${body.slice(0, 2000)}` },
              ],
              [],
              { maxTokens: 60, temperature: 0.1 },
            ),
            new Promise(resolve => setTimeout(() => resolve(null), 7000)),
          ]);
          if (!res) return null;
          const m = getText(res.content).match(/\d{1,3}/);
          const n = m ? parseInt(m[0], 10) : NaN;
          return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
        } catch { return null; }
      },
    };
  } catch {
    return { reviewDraftForOutreach: null };
  }
}

async function maybeFinishDrafting(supabase: any, campaign: any): Promise<void> {
  await supabase.from('arcus_campaigns')
    .update({ status: 'review', updated_at: new Date().toISOString() })
    .eq('id', campaign.id)
    .eq('status', 'drafting');
}

/** Cron entry: advance every campaign still drafting by one batch. Never throws. */
export async function continueDraftingCampaigns(supabase: any): Promise<number> {
  try {
    const { data: drafting } = await supabase
      .from('arcus_campaigns')
      .select('id, user_id')
      .eq('status', 'drafting')
      .limit(5);
    if (!drafting?.length) return 0;
    let advanced = 0;
    for (const c of drafting) {
      const res = await draftCampaignBatch(supabase, c.user_id, c.id);
      if (res.drafted > 0) advanced += res.drafted;
    }
    return advanced;
  } catch (e: any) {
    console.error('[outreach] continueDrafting failed:', e?.message || e);
    return 0;
  }
}

// ─── Dispatch (top-up pacing) ─────────────────────────────────────────────────

/** Ramp curve: day 1 = ramp.start, +ramp.step per clean day, ceiling daily_cap. */
export function effectiveDailyCap(campaign: any): number {
  const cap = campaign.daily_cap || 40;
  const ramp = campaign.ramp || { start: 15, step: 5 };
  if (!campaign.approved_at) return 0;
  const days = Math.floor((Date.now() - new Date(campaign.approved_at).getTime()) / 86_400_000);
  return Math.min(cap, (ramp.start ?? 15) + (ramp.step ?? 5) * days);
}

/**
 * Cron entry: for each approved (sending) campaign, top up the scheduled-email
 * queue a few rows at a time. Respects: ramp curve, daily cap, business-hours
 * window in the USER's timezone, jittered spacing, per-domain spacing within a
 * tick, and auto-pause on failure spikes. Never throws.
 */
export async function dispatchCampaignSends(supabase: any): Promise<{ queued: number }> {
  const out = { queued: 0 };
  try {
    const { data: campaigns } = await supabase
      .from('arcus_campaigns')
      .select('*')
      .eq('status', 'sending')
      .limit(10);
    if (!campaigns?.length) return out;

    for (const campaign of campaigns) {
      // Failure-spike guard: ≥3 hard fails today → auto-pause + plain alert.
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
      const { count: failsToday } = await supabase
        .from('arcus_campaign_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('status', 'failed')
        .gte('updated_at', dayStart.toISOString());
      if ((failsToday ?? 0) >= 3) {
        await supabase.from('arcus_campaigns')
          .update({
            status: 'paused',
            last_error: 'Auto-paused: several sends failed today — this protects your sender reputation. Check the failed rows, then resume.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', campaign.id);
        continue;
      }

      // Business-hours window in the user's timezone.
      const tz = await getUserTimezone(supabase, campaign.user_id);
      const win = campaign.send_window || { startHour: 9, endHour: 17, weekdaysOnly: true };
      const { hour, isWeekday } = nowInTimezone(tz);
      if (win.weekdaysOnly && !isWeekday) continue;
      if (hour < (win.startHour ?? 9) || hour >= (win.endHour ?? 17)) continue;

      // Today's budget = ramp-adjusted cap − (already sent today + already queued).
      const capToday = effectiveDailyCap(campaign);
      const { count: sentToday } = await supabase
        .from('arcus_campaign_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .in('status', ['sent', 'replied', 'meeting'])
        .gte('sent_at', dayStart.toISOString());
      const { count: queuedNow } = await supabase
        .from('arcus_campaign_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('status', 'queued');
      const budget = Math.min(
        DISPATCH_BATCH_PER_TICK,
        capToday - (sentToday ?? 0) - (queuedNow ?? 0),
      );
      if (budget <= 0) continue;

      // Next drafted recipients — spread across companies (never two sends to
      // the same domain back-to-back within a tick).
      const { data: nextUp } = await supabase
        .from('arcus_campaign_recipients')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('status', 'drafted')
        .order('created_at', { ascending: true })
        .limit(budget * 3);
      if (!nextUp?.length) {
        await maybeCompleteCampaign(supabase, campaign.id);
        continue;
      }
      const picked: any[] = [];
      const domains = new Set<string>();
      for (const r of nextUp) {
        const d = domainOf(r.email);
        if (domains.has(d) && !isFreemail(d)) continue;
        domains.add(d);
        picked.push(r);
        if (picked.length >= budget) break;
      }
      // If domain-spacing starved the batch, take the head anyway.
      for (const r of nextUp) {
        if (picked.length >= budget) break;
        if (!picked.includes(r)) picked.push(r);
      }

      // Enqueue with jittered send_at, stepping forward per row.
      let sendAt = Date.now() + 30_000;
      for (const r of picked) {
        sendAt += jitteredDelayMs();
        const enq = await enqueueScheduledEmail(supabase, {
          userId: campaign.user_id,
          to: r.email,
          subject: r.subject || '(no subject)',
          body: r.body || '',
          sendAt: new Date(sendAt),
          dedupKey: `campaign:${campaign.id}:${r.email}`,
          source: 'campaign',
        });
        if (enq.ok && !enq.duplicate) {
          await supabase.from('arcus_campaign_recipients')
            .update({ status: 'queued', scheduled_email_id: enq.id || null, updated_at: new Date().toISOString() })
            .eq('id', r.id)
            .eq('status', 'drafted');
          out.queued++;
        } else if (enq.duplicate) {
          // Row already queued once (e.g. resumed campaign) — just mark it.
          await supabase.from('arcus_campaign_recipients')
            .update({ status: 'queued', updated_at: new Date().toISOString() })
            .eq('id', r.id)
            .eq('status', 'drafted');
        }
      }
    }
  } catch (e: any) {
    console.error('[outreach] dispatch failed:', e?.message || e);
  }
  return out;
}

/**
 * Cron entry: pull outcomes back from the scheduled-email queue onto the
 * recipient rows (queued → sent/failed), refresh counts, complete campaigns.
 */
export async function syncCampaignSendOutcomes(supabase: any): Promise<void> {
  try {
    const { data: queued } = await supabase
      .from('arcus_campaign_recipients')
      .select('id, campaign_id, scheduled_email_id')
      .eq('status', 'queued')
      .not('scheduled_email_id', 'is', null)
      .limit(100);
    if (!queued?.length) return;

    const schedIds = queued.map((r: any) => r.scheduled_email_id);
    const { data: schedRows } = await supabase
      .from('arcus_scheduled_emails')
      .select('id, status, sent_message_id, last_error, sent_at')
      .in('id', schedIds);
    const byId = new Map((schedRows || []).map((s: any) => [s.id, s]));

    const touchedCampaigns = new Set<string>();
    for (const r of queued) {
      const s: any = byId.get(r.scheduled_email_id);
      if (!s) continue;
      const nowIso = new Date().toISOString();
      if (s.status === 'sent') {
        await supabase.from('arcus_campaign_recipients')
          .update({ status: 'sent', sent_message_id: s.sent_message_id || null, sent_at: s.sent_at || nowIso, updated_at: nowIso })
          .eq('id', r.id);
        touchedCampaigns.add(r.campaign_id);
      } else if (s.status === 'failed' || s.status === 'cancelled') {
        await supabase.from('arcus_campaign_recipients')
          .update({ status: 'failed', error: s.last_error || s.status, updated_at: nowIso })
          .eq('id', r.id);
        touchedCampaigns.add(r.campaign_id);
      }
    }

    for (const campaignId of touchedCampaigns) {
      await refreshCampaignCounts(supabase, campaignId);
      await maybeCompleteCampaign(supabase, campaignId);
    }
  } catch (e: any) {
    console.error('[outreach] sync failed:', e?.message || e);
  }
}

export async function refreshCampaignCounts(supabase: any, campaignId: string): Promise<void> {
  const countOf = async (statuses: string[]): Promise<number> => {
    const { count } = await supabase
      .from('arcus_campaign_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .in('status', statuses);
    return count ?? 0;
  };
  const [sent, replied, meeting, failed, drafted] = await Promise.all([
    countOf(['sent', 'replied', 'meeting']),
    countOf(['replied', 'meeting']),
    countOf(['meeting']),
    countOf(['failed']),
    countOf(['drafted']),
  ]);
  await supabase.from('arcus_campaigns')
    .update({
      sent_count: sent, replied_count: replied, meeting_count: meeting,
      failed_count: failed, drafted_count: drafted, updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId);
}

async function maybeCompleteCampaign(supabase: any, campaignId: string): Promise<void> {
  const { count: live } = await supabase
    .from('arcus_campaign_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .in('status', ['pending', 'researching', 'drafted', 'queued']);
  if ((live ?? 0) === 0) {
    await supabase.from('arcus_campaigns')
      .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', campaignId)
      .eq('status', 'sending');
  }
}

// ─── State changes (pause / resume / cancel / approve) ───────────────────────

export async function setCampaignState(
  supabase: any,
  userId: string,
  campaignId: string,
  action: 'pause' | 'resume' | 'cancel',
): Promise<{ ok: boolean; status?: string; error?: string }> {
  const { data: campaign } = await supabase
    .from('arcus_campaigns')
    .select('id, status, approved_at')
    .eq('id', campaignId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!campaign) return { ok: false, error: 'Campaign not found.' };

  const nowIso = new Date().toISOString();
  if (action === 'pause') {
    if (campaign.status !== 'sending') return { ok: false, error: `Can only pause a sending campaign (currently ${campaign.status}).` };
    await cancelPendingQueuedRows(supabase, campaignId);
    await supabase.from('arcus_campaigns').update({ status: 'paused', updated_at: nowIso }).eq('id', campaignId);
    return { ok: true, status: 'paused' };
  }
  if (action === 'resume') {
    if (campaign.status !== 'paused') return { ok: false, error: `Can only resume a paused campaign (currently ${campaign.status}).` };
    // Approval law: resume NEVER skips approval — a campaign only re-enters
    // 'sending' if the user approved it before (approved_at set on approve).
    if (!campaign.approved_at) return { ok: false, error: 'This campaign was never approved — open the review screen to approve it first.' };
    await supabase.from('arcus_campaigns').update({ status: 'sending', last_error: null, updated_at: nowIso }).eq('id', campaignId);
    return { ok: true, status: 'sending' };
  }
  // cancel
  await cancelPendingQueuedRows(supabase, campaignId);
  await supabase.from('arcus_campaigns').update({ status: 'cancelled', updated_at: nowIso }).eq('id', campaignId);
  return { ok: true, status: 'cancelled' };
}

/** Cancel any not-yet-sent queue rows and return their recipients to 'drafted'. */
async function cancelPendingQueuedRows(supabase: any, campaignId: string): Promise<void> {
  const { data: queued } = await supabase
    .from('arcus_campaign_recipients')
    .select('id, scheduled_email_id')
    .eq('campaign_id', campaignId)
    .eq('status', 'queued');
  if (!queued?.length) return;
  const schedIds = queued.map((r: any) => r.scheduled_email_id).filter(Boolean);
  if (schedIds.length) {
    await supabase.from('arcus_scheduled_emails')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .in('id', schedIds)
      .eq('status', 'pending');
  }
  // Rows whose scheduled email is already 'sending'/'sent' will be fixed up by
  // the next sync pass; everything still pending safely returns to drafted.
  const { data: schedRows } = await supabase
    .from('arcus_scheduled_emails')
    .select('id, status')
    .in('id', schedIds.length ? schedIds : ['00000000-0000-0000-0000-000000000000']);
  const cancelled = new Set((schedRows || []).filter((s: any) => s.status === 'cancelled').map((s: any) => s.id));
  for (const r of queued) {
    if (!r.scheduled_email_id || cancelled.has(r.scheduled_email_id)) {
      await supabase.from('arcus_campaign_recipients')
        .update({ status: 'drafted', scheduled_email_id: null, updated_at: new Date().toISOString() })
        .eq('id', r.id)
        .eq('status', 'queued');
    }
  }
}

export async function approveCampaign(
  supabase: any,
  userId: string,
  campaignId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: campaign } = await supabase
    .from('arcus_campaigns')
    .select('id, status')
    .eq('id', campaignId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!campaign) return { ok: false, error: 'Campaign not found.' };
  if (campaign.status !== 'review') {
    return { ok: false, error: `Only a campaign in review can be approved (currently ${campaign.status}).` };
  }
  const nowIso = new Date().toISOString();
  const { error, count } = await supabase.from('arcus_campaigns')
    .update({ status: 'sending', approved_at: nowIso, updated_at: nowIso })
    .eq('id', campaignId)
    .eq('status', 'review')
    .select('id', { count: 'exact', head: true });
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: 'Campaign status changed before approval. Refresh and try again.' };
  return { ok: true };
}

// ─── Campaign snapshots (for tools + API + cards) ─────────────────────────────

export interface CampaignSnapshot {
  id: string;
  name: string;
  status: string;
  brief: string;
  dailyCap: number;
  effectiveCapToday: number;
  researchDepth: string;
  counts: { recipients: number; drafted: number; sent: number; replied: number; meeting: number; failed: number; excluded: number };
  domainHealth: DomainHealth | null;
  createdAt: string;
  approvedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
}

// ─── Reply intelligence — the loop closes itself ─────────────────────────────
//
// Cron entry: find replies on sent campaign emails, classify the intent, and
// DRAFT the follow-through in the user's voice — saved as a Gmail draft in the
// thread (never sent; the approval law holds everywhere). `interested` replies
// get REAL calendar slots proposed when Calendar is connected — never invented
// times. `unsubscribe` suppresses the address permanently.

const REPLIES_PER_TICK = 8;

const REPLY_SYSTEM = `You are the sender's assistant handling replies to their cold outreach. For each reply, classify the intent and (when a response is warranted) write it AS the sender, in their voice.

Intents: "interested" (wants to talk / asks to meet / positive), "question" (asks something answerable), "objection" (pushback but engaged), "not_now" (polite decline / later), "unsubscribe" (stop contacting / hostile), "wrong_person".

Rules for responses:
- interested/question/objection get a response; not_now/unsubscribe/wrong_person get NONE (empty string).
- interested: if AVAILABLE SLOTS are provided, propose 2 of them naturally; if none provided, ask for their availability — NEVER invent times.
- Short (40-100 words), plain text, sender's voice, no filler.
- Ground every claim in the campaign brief — never invent product facts.

Return ONLY a JSON array: [{"id":"<id>","intent":"...","response":"<body or empty string>"}]`;

/** Coarse free-slot finder: next 3 weekdays, 10:00/11:00/14:00/15:00 starts in
 *  the user's tz, skipping hours that overlap a calendar event. Returns human
 *  strings like "Tue 2:00 PM". Empty when Calendar isn't connected. */
async function findFreeSlots(userId: string, tz: string): Promise<string[]> {
  try {
    const token = await getGcalToken(userId);
    if (!token) return [];
    const now = new Date();
    const end = new Date(now.getTime() + 4 * 86_400_000);
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=50`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const data = await res.json();
    const busy: Array<{ s: number; e: number }> = (data.items || [])
      .filter((ev: any) => ev.start?.dateTime && ev.end?.dateTime)
      .map((ev: any) => ({ s: Date.parse(ev.start.dateTime), e: Date.parse(ev.end.dateTime) }));

    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', minute: '2-digit' });
    const hourInTz = (d: Date) => parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(d), 10);
    const weekdayInTz = (d: Date) => new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(d);

    const slots: string[] = [];
    const CANDIDATE_HOURS = [10, 11, 14, 15];
    for (let day = 1; day <= 3 && slots.length < 3; day++) {
      for (const h of CANDIDATE_HOURS) {
        if (slots.length >= 3) break;
        // Walk hour marks on the target day until the tz-local hour matches.
        const base = new Date(now.getTime() + day * 86_400_000);
        base.setUTCMinutes(0, 0, 0);
        let probe: Date | null = null;
        for (let off = -14; off <= 14; off++) {
          const t = new Date(base.getTime() + off * 3_600_000);
          if (hourInTz(t) === h) { probe = t; break; }
        }
        if (!probe) continue;
        if (['Sat', 'Sun'].includes(weekdayInTz(probe))) continue;
        const s = probe.getTime(), e = s + 3_600_000;
        if (busy.some(b => b.s < e && b.e > s)) continue;
        slots.push(fmt.format(probe));
      }
    }
    return slots;
  } catch { return []; }
}

/** Save a Gmail draft reply into the recipient's thread. Returns draft id. */
async function saveThreadDraft(
  userId: string,
  to: string,
  subject: string,
  body: string,
  threadId: string,
): Promise<string | null> {
  try {
    let token = await getGmailToken(userId);
    if (!token) return null;
    const raw = buildRaw(to, subject, body);
    const payload = JSON.stringify({ message: { raw, threadId } });
    const post = (t: string) => fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: payload,
      signal: AbortSignal.timeout(12000),
    });
    let res = await post(token);
    if (res.status === 401) {
      const fresh = await refreshGoogleToken(userId);
      if (fresh) res = await post(fresh);
    }
    if (!res.ok) return null;
    const d = await res.json().catch(() => ({}));
    return d?.id || null;
  } catch { return null; }
}

/**
 * Cron entry: detect + classify replies for active campaigns and draft the
 * follow-through. Bounded per tick; never throws.
 */
export async function classifyCampaignReplies(supabase: any): Promise<number> {
  let handled = 0;
  try {
    // Sending campaigns plus recently-completed ones (replies trail sends).
    const cutoff = new Date(Date.now() - 14 * 86_400_000).toISOString();
    const { data: campaigns } = await supabase
      .from('arcus_campaigns')
      .select('*')
      .or(`status.eq.sending,and(status.eq.completed,completed_at.gte.${cutoff})`)
      .limit(3);
    if (!campaigns?.length) return 0;

    for (const campaign of campaigns) {
      const { data: candidates } = await supabase
        .from('arcus_campaign_recipients')
        .select('id, email, name, subject, thread_id, sent_at')
        .eq('campaign_id', campaign.id)
        .eq('status', 'sent')
        .not('thread_id', 'is', null)
        .is('replied_at', null)
        .limit(REPLIES_PER_TICK);
      if (!candidates?.length) continue;

      let token = await getGmailToken(campaign.user_id);
      if (!token) continue;

      // 1. Detect replies: a message in the thread FROM the recipient.
      const replied: Array<{ row: any; snippet: string }> = [];
      for (const r of candidates) {
        try {
          const get = (t: string) => fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/threads/${r.thread_id}?format=metadata&metadataHeaders=From`,
            { headers: { Authorization: `Bearer ${t}` }, signal: AbortSignal.timeout(8000) },
          );
          let res = await get(token);
          if (res.status === 401) {
            const fresh = await refreshGoogleToken(campaign.user_id);
            if (!fresh) break;
            token = fresh;
            res = await get(token);
          }
          if (!res.ok) continue;
          const thread = await res.json();
          const fromRecipient = (thread.messages || []).filter((m: any) => {
            const from = (m.payload?.headers || []).find((h: any) => h.name === 'From')?.value || '';
            return from.toLowerCase().includes(r.email.toLowerCase());
          });
          if (fromRecipient.length > 0) {
            const last = fromRecipient[fromRecipient.length - 1];
            replied.push({ row: r, snippet: (last.snippet || '').slice(0, 400) });
          }
        } catch { /* next candidate */ }
      }
      if (!replied.length) continue;

      // 2. Classify + compose follow-throughs in ONE call.
      let voicePrompt = '';
      try {
        // @ts-ignore — JS module
        const { voiceProfileService } = await import('../voice-profile-service.js');
        const profile: any = await voiceProfileService.getVoiceProfile(campaign.user_id);
        voicePrompt = (voiceProfileService.generateVoicePrompt(profile) as string | undefined)?.trim() || '';
      } catch { /* voice optional */ }
      const tz = await getUserTimezone(supabase, campaign.user_id);
      const slots = await findFreeSlots(campaign.user_id, tz);

      const blocks = replied.map(({ row, snippet }) =>
        `REPLY id=${row.id}\nfrom: ${row.name || row.email} <${row.email}>\noriginal subject: ${row.subject || ''}\ntheir reply: "${snippet}"`,
      ).join('\n\n---\n\n');
      const userMsg =
        `CAMPAIGN BRIEF:\n${campaign.brief}\n\n` +
        (voicePrompt ? `SENDER VOICE PROFILE:\n${voicePrompt}\n\n` : '') +
        (slots.length ? `AVAILABLE SLOTS (sender's real calendar, their timezone): ${slots.join(' · ')}\n\n` : 'AVAILABLE SLOTS: none known — ask for their availability instead.\n\n') +
        `REPLIES (${replied.length}):\n\n${blocks}\n\nReturn the JSON array now.`;

      let parsed: any[] = [];
      try {
        const res = await callLLM(
          [{ role: 'system', content: REPLY_SYSTEM }, { role: 'user', content: userMsg }],
          [],
          { maxTokens: 250 * replied.length + 200, temperature: 0.4 },
        );
        const text = getText((res as any).content).trim();
        const m = text.match(/\[[\s\S]*\]/);
        if (m) parsed = JSON.parse(m[0]);
      } catch {
        // Classification unavailable this tick (429 etc.) — mark nothing;
        // candidates stay 'sent' and get re-checked next tick. No loss.
        continue;
      }
      const byId = new Map(parsed.filter(p => p && p.id).map(p => [String(p.id), p]));

      // 3. Persist outcomes + draft follow-throughs.
      for (const { row, snippet } of replied) {
        const cls = byId.get(String(row.id));
        const intent = ['interested', 'question', 'objection', 'not_now', 'unsubscribe', 'wrong_person'].includes(cls?.intent)
          ? cls.intent : 'question';
        const nowIso = new Date().toISOString();

        let responseDraftId: string | null = null;
        const responseBody = typeof cls?.response === 'string' ? cls.response.trim() : '';
        if (responseBody && ['interested', 'question', 'objection'].includes(intent) && row.thread_id) {
          responseDraftId = await saveThreadDraft(
            campaign.user_id, row.email,
            row.subject ? `Re: ${row.subject}` : 'Re:',
            responseBody, row.thread_id,
          );
        }

        if (intent === 'unsubscribe') {
          await supabase.from('arcus_suppression_list')
            .upsert(
              { user_id: campaign.user_id, email: row.email.toLowerCase(), reason: 'unsubscribe' },
              { onConflict: 'user_id,email', ignoreDuplicates: true },
            );
        }

        await supabase.from('arcus_campaign_recipients')
          .update({
            status: intent === 'unsubscribe' ? 'suppressed' : 'replied',
            reply_intent: intent,
            reply_snippet: snippet.slice(0, 300),
            response_draft_id: responseDraftId,
            replied_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', row.id);
        handled++;
      }
      await refreshCampaignCounts(supabase, campaign.id);
    }
  } catch (e: any) {
    console.error('[outreach] reply classification failed:', e?.message || e);
  }
  return handled;
}

export async function getCampaignSnapshot(
  supabase: any,
  userId: string,
  campaignId: string,
): Promise<CampaignSnapshot | null> {
  const { data: c } = await supabase
    .from('arcus_campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!c) return null;
  const { count: excluded } = await supabase
    .from('arcus_campaign_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', c.id)
    .in('status', ['excluded', 'suppressed']);
  return {
    id: c.id, name: c.name, status: c.status, brief: c.brief,
    dailyCap: c.daily_cap, effectiveCapToday: effectiveDailyCap(c),
    researchDepth: c.research_depth,
    counts: {
      recipients: c.recipient_count ?? 0, drafted: c.drafted_count ?? 0,
      sent: c.sent_count ?? 0, replied: c.replied_count ?? 0,
      meeting: c.meeting_count ?? 0, failed: c.failed_count ?? 0,
      excluded: excluded ?? 0,
    },
    domainHealth: c.domain_health || null,
    createdAt: c.created_at, approvedAt: c.approved_at, completedAt: c.completed_at,
    lastError: c.last_error,
  };
}
