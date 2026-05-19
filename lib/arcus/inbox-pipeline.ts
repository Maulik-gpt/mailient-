/**
 * Inbox Pipeline
 *
 * Pre-processes Gmail search results before the LLM sees them.
 * Classifies each email into a priority tier, sorts by priority,
 * silently removes newsletters/promotions, and returns an annotated
 * output string the LLM can reason about correctly.
 *
 * Tier 1 — Existing thread (Re: subject, ongoing conversation)
 * Tier 2 — Revenue signal (contract, invoice, payment, proposal…)
 * Tier 3 — Scheduling (meeting, invite, calendar, availability…)
 * Tier 4 — General correspondence
 * Archive — Newsletter, promotion, automated notification (removed silently)
 */

// ── Classification patterns ────────────────────────────────────────────────────

const REVENUE_KW = /\b(contract|invoice|invoiced|payment|proposal|deal|pric(e|ing)|renewal|purchase\s+order|quote|billing|subscription|revenue|retainer|statement|payable|receivable|budget|cost\s+estimate|scope\s+of\s+work|\bsow\b|\bnda\b|agreement|term\s+sheet|sign(ed|ing)|countersign)\b/i;

const SCHEDULING_KW = /\b(meeting|schedule|scheduled|calendar|invite|invitation|availability|available|call|sync|book(ed|ing)|appointment|zoom|google\s+meet|teams|webinar|conference|catch\s+up|follow[\s-]?up|let'?s\s+(meet|talk|connect|chat))\b/i;

const ARCHIVE_SENDER = /^(no[\s-]?reply|do[\s-]?not[\s-]?reply|newsletter|notification[s]?|alert[s]?|marketing|promotion[s]?|update[s]?|digest|automated|system|support[\s-]?noreply|mailer[\s-]?daemon|postmaster|bounce|campaigns?|info@(?:mail|email|news)|mailchimp|sendgrid|klaviyo|hubspot|mailerlite)@/i;

const ARCHIVE_SUBJECT = /\b(unsubscribe|newsletter|promotional|weekly\s+digest|daily\s+digest|roundup|% off|\bsale\b|discount|limited\s+time|offer\s+expires|coupon|promo\s+code|your\s+order|has\s+shipped|out\s+for\s+delivery|delivery\s+confirmation|receipt\s+for|order\s+#|transaction\s+receipt|statement\s+available|account\s+statement|verify\s+your\s+email|confirm\s+your\s+(email|account)|security\s+alert|sign[\s-]in\s+from|new\s+(device|location)\s+sign[\s-]in)\b/i;

const ARCHIVE_PREVIEW = /\b(unsubscribe|view\s+in\s+(your\s+)?browser|manage\s+(your\s+)?preferences|email\s+preferences|opt\s+out|update\s+subscription|privacy\s+policy|terms\s+of\s+service|©\s*\d{4}|all\s+rights\s+reserved)\b/i;

const ONGOING_THREAD = /^re:/i;

// ── Types ──────────────────────────────────────────────────────────────────────

type Tier = 1 | 2 | 3 | 4 | 'archive';

interface EmailEntry {
  index: number;
  raw: string;
  from: string;
  subject: string;
  preview: string;
}

interface ClassifiedEntry {
  tier: Tier;
  label: string;
  entry: EmailEntry;
}

// ── Classification ─────────────────────────────────────────────────────────────

function classify(e: EmailEntry): Tier {
  const from = e.from.toLowerCase();
  const subj = e.subject;
  const prev = e.preview;

  // Archive signals — highest confidence, check first
  if (ARCHIVE_SENDER.test(from)) return 'archive';
  if (ARCHIVE_SUBJECT.test(subj)) return 'archive';
  if (ARCHIVE_PREVIEW.test(prev)) return 'archive';

  // Revenue signals
  if (REVENUE_KW.test(subj) || REVENUE_KW.test(prev)) return 2;

  // Scheduling
  if (SCHEDULING_KW.test(subj) || SCHEDULING_KW.test(prev)) return 3;

  // Ongoing thread (Re: …) → existing relationship → Tier 1
  if (ONGOING_THREAD.test(subj)) return 1;

  return 4;
}

const TIER_BADGE: Record<string, string> = {
  '1': '🔵 CLIENT THREAD',
  '2': '🟢 REVENUE',
  '3': '🟡 SCHEDULING',
  '4': 'GENERAL',
};

// ── Parser ─────────────────────────────────────────────────────────────────────

function parseEntries(output: string): EmailEntry[] {
  // Format from search_gmail:
  //   1. [ID: ...] [Thread: ...]
  //      From: ...
  //      Subject: ...
  //      Date: ...
  //      Preview: ...
  const blocks = output.split(/\n(?=\d+\. )/).filter(Boolean);
  const entries: EmailEntry[] = [];

  for (const block of blocks) {
    const indexMatch = block.match(/^(\d+)\./);
    if (!indexMatch) continue;

    const from = block.match(/From:\s*(.+)/i)?.[1]?.trim() ?? '';
    const subject = block.match(/Subject:\s*(.+)/i)?.[1]?.trim() ?? '';
    const preview = block.match(/Preview:\s*(.+)/i)?.[1]?.trim() ?? '';

    entries.push({ index: parseInt(indexMatch[1], 10), raw: block.trim(), from, subject, preview });
  }

  return entries;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Takes the raw string output from search_gmail, classifies and sorts emails,
 * strips archives, and returns an annotated version the LLM can prioritize correctly.
 */
export function processGmailResults(toolOutput: string): {
  annotated: string;
  archiveCount: number;
} {
  // Only process search_gmail output (has this signature)
  if (!toolOutput.startsWith('Found') || !toolOutput.includes('[ID:')) {
    return { annotated: toolOutput, archiveCount: 0 };
  }

  const headerLine = toolOutput.split('\n')[0];
  const entries = parseEntries(toolOutput);
  if (!entries.length) return { annotated: toolOutput, archiveCount: 0 };

  const classified: ClassifiedEntry[] = entries.map(e => {
    const tier = classify(e);
    return { tier, label: tier === 'archive' ? 'ARCHIVE' : TIER_BADGE[String(tier)], entry: e };
  });

  const archived = classified.filter(c => c.tier === 'archive');
  const active = classified
    .filter(c => c.tier !== 'archive')
    .sort((a, b) => (a.tier as number) - (b.tier as number));

  if (!active.length) {
    return {
      annotated: `${headerLine}\n\n(All ${archived.length} emails classified as newsletters/promotions and de-prioritized.)`,
      archiveCount: archived.length,
    };
  }

  const annotatedBlocks = active.map((c, i) => {
    const lines = c.entry.raw.split('\n');
    // Inject tier badge into the first line after the index number
    lines[0] = lines[0].replace(/^(\d+\.\s*)/, `${i + 1}. [${c.label}] `);
    return lines.join('\n');
  });

  const archiveNote = archived.length
    ? `\n\n[Note: ${archived.length} newsletter/promotional/automated email(s) removed from this list — will report count at the end]`
    : '';

  return {
    annotated: `${headerLine} (sorted by priority)\n\n${annotatedBlocks.join('\n\n')}${archiveNote}`,
    archiveCount: archived.length,
  };
}

/**
 * Returns true if the user's message is an inbox/email processing task —
 * used to decide whether to run the pipeline on search_gmail results.
 */
export function isInboxTask(userMessage: string): boolean {
  return /\b(inbox|unread|emails?|messages?|sort|clean\s+up|go\s+through|process|triage|catch\s+up)\b/i.test(userMessage);
}

/**
 * Detects whether a user message is vague enough to require a planning pass
 * before execution. Vague = broad intent, no specific target or qualifier.
 */
export function isVagueInstruction(text: string): boolean {
  const t = text.trim();

  // Long messages are usually specific enough
  if (t.length > 100) return false;

  // If it mentions a specific person, company, subject, or qualifier — not vague
  if (/\b(from|about|regarding|subject:|to:|for\s+\w+|with\s+\w+|re:)/i.test(t)) return false;

  const VAGUE = [
    /^(sort(\s+out)?|clean(\s+up)?|tidy(\s+up)?)\s+(my\s+)?inbox\s*[?.]?\s*$/i,
    /^(catch\s+up|catchup)(\s+with\s+my\s+(clients?|contacts?|team|emails?))?\s*[?.]?\s*$/i,
    /^prepare(\s+me)?\s+for\s+tomorrow\s*[?.]?\s*$/i,
    /^(handle|process|go\s+through|review|check)\s+(my\s+)?(everything|emails?|messages?|inbox)\s*[?.]?\s*$/i,
    /^(what'?s?\s+(in|new|up)|any\s+new)\s*(emails?|messages?)?\s*[?]?\s*$/i,
    /^(manage|organis?e)\s+(my\s+)?(inbox|emails?)\s*[?.]?\s*$/i,
    /^(check|look\s+at)\s+(my\s+)?emails?\s*[?.]?\s*$/i,
  ];

  return VAGUE.some(p => p.test(t));
}
