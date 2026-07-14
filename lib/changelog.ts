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
    date: 'July 14, 2026',
    entries: [
      {
        tag: 'Improved',
        title: 'A cleaner live view while Arcus works',
        points: [
          'One thinking indicator, one place — the live "thinking" shimmer no longer shows up twice, and execution steps live only inside the collapsible steps box on the reply.',
          'The steps box now starts closed and quietly shows what\'s running in its header; it opens itself only when a real multi-step task is underway, in a fixed-width, pure black-and-white design.',
          'Thoughts now sit under the executor box as a quiet trace instead of reading like the reply itself, and the blinking bar that could get stuck under a reply is gone.',
          'Stray model artifacts (a lone "False" line) no longer leak into the chat.',
          'When Arcus asks a clarifying question, it now suggests the most likely answers as tappable choices — its best guess comes preselected, so one tap answers it. Your reply lands in the chat as a clean answer, not a form transcript.',
          'A question from Arcus now reads like a normal message in the conversation — no more empty reply above the question card.',
        ],
      },
      {
        tag: 'Fixed',
        title: 'Chat stays put, one loader, no email dumps',
        points: [
          'Sending a follow-up message no longer risks bouncing you back to the start screen mid-reply (the bug that forced a refresh and burned a second run).',
          'The thinking indicator is truly singular now — the placeholder "Thinking..." line that doubled it is gone; only real reasoning shows under the header.',
          'While drafting or triaging, Arcus references an email in a line or two instead of pasting the whole thing — full bodies only when you ask to see them.',
        ],
      },
      {
        tag: 'Fixed',
        title: 'Replies are fast again',
        points: [
          'A model-provider quirk was silently eating the response budget on "thinking", which made normal replies crawl to ~50 seconds and sometimes come back blank. Arcus now tells that model family to answer directly — replies land in seconds again.',
          'When a model is having a bad day, Arcus now steps around it once instead of re-trying the same failure on every backup key.',
        ],
      },
      {
        tag: 'New',
        title: 'Arcus can decide to plan before it acts',
        points: [
          'When a request mid-conversation turns out to be big, multi-phase, or risky, Arcus now switches itself into plan mode and shows you a reviewable plan before touching anything.',
          'Simple asks still just get done — the switch is reserved for work that deserves your sign-off first.',
        ],
      },
    ],
  },
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
