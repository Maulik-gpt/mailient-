/**
 * Mailient public changelog — the ship log rendered at /changelog.
 *
 * HOW TO ADD AN ENTRY: prepend to the group for today's date (create the
 * group if it doesn't exist — newest group first). Write for FOUNDERS, not
 * developers: what changed in their product, in plain language. No internal
 * jargon, no commit-speak, no file names.
 *
 * Tags: 'New' = a capability that didn't exist · 'Improved' = an existing
 * thing got meaningfully better · 'Fixed' = something broken now works.
 */

export type ChangelogTag = 'New' | 'Improved' | 'Fixed';

export interface ChangelogEntry {
  tag: ChangelogTag;
  title: string;
  points: string[];
}

export interface ChangelogGroup {
  /** Human date, e.g. "July 11, 2026" */
  date: string;
  entries: ChangelogEntry[];
}

export const CHANGELOG: ChangelogGroup[] = [
  {
    date: 'July 13, 2026',
    entries: [
      {
        tag: 'New',
        title: 'Arcus runs your outreach — hand it a list, approve once',
        points: [
          'Paste a list or attach a CSV and say "email these 40 people about…" — Arcus researches each person, writes every email individually in your voice, and shows you samples.',
          'One approval covers the whole batch. After your yes, emails go out paced like a human sends them — spread over days, business hours, minutes apart — so your Gmail reputation stays clean.',
          'Before a first bulk send from a custom domain, Arcus checks your SPF/DMARC and tells you exactly what to fix if something\'s missing.',
          'Ask for a watcher and Arcus sets up a scheduled agent that reads the replies, drafts responses in your voice with real openings from your calendar, nudges the silent ones once with a fresh angle, and never contacts anyone who opts out.',
          'Nothing new to learn — it\'s the same chat, the same agents, now trusted with bigger jobs.',
        ],
      },
      {
        tag: 'Fixed',
        title: 'Attachments actually reach Arcus now',
        points: [
          'CSV and text files uploaded in chat were silently invisible to the AI. Fixed — attach a contact list or notes and Arcus reads the real contents.',
        ],
      },
    ],
  },
  {
    date: 'July 11, 2026',
    entries: [
      {
        tag: 'Improved',
        title: 'Answers that read like a briefing, not a wall of text',
        points: [
          'Arcus now structures substantive answers — clear sections, dividers, and a boxed "Bottom line" takeaway you can read at a glance.',
          'The quick-ask palette (Ctrl+K) renders it all beautifully: section labels, tidy lists, callout boxes.',
          'One-line questions still get one-line answers — no ceremony where none is needed.',
        ],
      },
      {
        tag: 'Improved',
        title: 'A calmer, smarter chat',
        points: [
          'Simple messages get a simple reply — the processing trace now only appears when Arcus is doing real work.',
          'While it works, you see what it\'s actually thinking — a live reasoning line, updating in real time.',
          'Plan cards are fully legible in both themes, and their proposals are grounded in your real emails and events — one obvious right move stands alone instead of padded fake alternatives.',
          'Acting on a briefing recommendation now hands the request visibly into the chat composer — you review it and hit send.',
        ],
      },
      {
        tag: 'Improved',
        title: 'Onboarding that respects your time',
        points: [
          'The plan screen leads with what matters: "Start 3-day free trial", the real price you\'ll pay, and secure-checkout reassurance.',
          'A plan + price recap sits right before checkout, with a one-click way to change your mind.',
          'The live Arcus demo can be skipped — it finishes in the background either way.',
          'Fixed two dead ends: returning from an abandoned checkout, and a scan that timed out, both now continue cleanly.',
        ],
      },
      {
        tag: 'Fixed',
        title: 'Light theme, everywhere',
        points: [
          'Every surface — chat cards, the inbox intelligence report, the agents page, draft review — is now fully legible in light and dark.',
          'Status colors, hover states, and selection indicators read correctly in both themes.',
        ],
      },
    ],
  },
  {
    date: 'July 10, 2026',
    entries: [
      {
        tag: 'New',
        title: 'Watch Arcus work — a live, narrated trace',
        points: [
          'Every step shows the actual thing being done ("Scanning your inbox for unanswered investor threads"), not a bare tool name.',
          'Web steps show their real sources. Multi-step tasks show a live phase plan that checks off as work completes.',
          'Nothing in the trace can claim work that didn\'t happen — every line is grounded in what actually ran.',
        ],
      },
      {
        tag: 'New',
        title: 'A sharper, glassier interface',
        points: [
          'An Apple-grade design pass across the app: translucent surfaces, hairline boundaries, soft depth, smooth motion.',
          'Message bubbles, processing cards, result cards, drafts, confirmations — one consistent, premium language.',
        ],
      },
      {
        tag: 'Fixed',
        title: 'Your briefing never comes back empty',
        points: [
          'If the AI engine is briefly busy, recommendations now degrade to accurate picks built from your real inbox — overdue promises, replies waiting, follow-ups going quiet — instead of vanishing.',
        ],
      },
    ],
  },
  {
    date: 'Early July 2026',
    entries: [
      {
        tag: 'New',
        title: 'Transparent reasoning',
        points: [
          'Arcus shows how it decided, not just what it decided — the tradeoff it weighed, what it ranked above what, and why.',
          'Your Today feed gained "Why this order?" — one tap reveals how the day was prioritized.',
        ],
      },
      {
        tag: 'New',
        title: 'The employee suite',
        points: [
          'Confidence receipts: every pick comes with the evidence it saw ("read 47, 3 need you").',
          'Approval mode: anything that leaves the building waits for your one-glance sign-off.',
          'Founder memory: Arcus learns your VIPs, style, and priorities from how you work — and shows its recall.',
          'Continuous inbox: you review progress, not a backlog — "while you were away" leads with what was handled.',
          'Opportunity detection: quiet risks surface first, tagged "Before it slips".',
        ],
      },
      {
        tag: 'Improved',
        title: 'Instant, warm replies',
        points: [
          'Casual messages skip the machinery entirely — Arcus answers in about a second, like a colleague texting back.',
        ],
      },
    ],
  },
];
