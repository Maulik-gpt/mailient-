export type SlashCategory = 'workflows' | 'profile' | 'navigation';

export interface SlashCommand {
  name: string;
  description: string;
  category: SlashCategory;
  icon: string;
  kind: 'prompt' | 'client';
  template?: string;
  clientHandler?:
    | 'openAgents'
    | 'openMemorySettings'
    | 'openSettings'
    | 'clearConversation'
    | 'showHelp';
}

const GROUND_RULES = `

GROUND RULES for this command — apply strictly, no exceptions:
- Fetch before you claim. Every reference to real data (email, calendar, contact, Notion page) comes from a tool call THIS turn. Never invent senders, subjects, dates, names, or counts.
- Integration awareness. If a tool's underlying integration is not connected, SKIP that step cleanly and report "<X> not connected — skipped" in the section that step belonged to. Never fabricate output from a missing integration.
- Empty results are OK. If a search returns nothing, say so plainly ("No unread email since yesterday.") — never pad with imagined items.
- One pass per source. Don't re-search the same source with slight query variations to fill a section that came up empty.
- Stay on lane. This command names specific work. Do not pivot to other tasks just because you found capacity.`;

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'brief',
    description: 'Morning briefing across Inbox, Calendar, CRM, Comms, and Research.',
    category: 'workflows',
    icon: '☀️',
    kind: 'prompt',
    template:
      'Give me a morning briefing. Run these in parallel: unread emails from the last 24 hours, calendar for today and tomorrow, recent Notion activity, and relevant memory signals for any client or deal mentioned. Synthesize into one cross-VA briefing organized by priority — what needs my attention first, what I should know about, what can wait. Open canvas if there is more than three bullet groups. Skip any source whose integration is not connected.'
      + GROUND_RULES,
  },
  {
    name: 'inbox',
    description: 'Triage inbox: digest newsletters, flag VIPs, draft client replies.',
    category: 'workflows',
    icon: '📧',
    kind: 'prompt',
    template:
      'Triage my inbox now. (1) digest_newsletters to summarize promotional / newsletter mail (offer archive, do not auto-archive unless I said clear/clean). (2) For client threads needing a response (3+ exchanges in 90 days, found via gmail_unlimited_search), draft replies in my voice. (3) gmail_detect_urgency on the top 20 unread to surface anything truly time-sensitive. End with a tight list of what needs my decision and what got handled. If Gmail is not connected, say so and stop.'
      + GROUND_RULES,
  },
  {
    name: 'follow-up',
    description: 'Find stalled threads where I am waiting on a reply. Draft polite nudges.',
    category: 'workflows',
    icon: '⏳',
    kind: 'prompt',
    template:
      'Find threads where I am waiting on a reply — sent emails with no response for 3+ days, prioritized by client status and revenue impact. Use get_sent_emails and check_followups. For each, draft a short, polite follow-up in my voice that references the prior thread context. Show the list with one draft per thread; do not send anything. If there are no stalled threads, say so plainly and stop.'
      + GROUND_RULES,
  },
  {
    name: 'prep',
    description: 'Meeting prep doc for the next 24 hours — Canvas, one section per meeting.',
    category: 'workflows',
    icon: '🗓️',
    kind: 'prompt',
    template:
      'Prepare me for every meeting in the next 24 hours. Start with calendar_unlimited_scan for the window. For each upcoming meeting: pull recent email threads with the attendees (gmail_unlimited_search), relevant Notion pages (search_notion), past memory (memory_search), and synthesize one "what they likely want to discuss" line based on the latest context. Produce a meeting prep document in Canvas with one section per meeting, sorted chronologically. If there are no upcoming meetings, say so and stop — do not invent meetings.'
      + GROUND_RULES,
  },
  {
    name: 'weekly',
    description: 'Weekly executive brief: done / stalled / next week / revenue signals.',
    category: 'workflows',
    icon: '📊',
    kind: 'prompt',
    template:
      'Generate my weekly executive brief. Four sections: (1) Done this week — key emails sent (get_sent_emails over 7 days), meetings held (calendar_unlimited_scan), Notion entries logged. (2) Stalled — outbound waiting on a reply 3+ days, blocked deals. (3) Coming next week — calendar overview, expected priorities. (4) Revenue signals — inbox + Notion items that smell like a deal moving. Output to Canvas. Be specific: name people, companies, numbers when the tools returned them. Empty sections are omitted, not padded.'
      + GROUND_RULES,
  },
  {
    name: 'vip',
    description: 'Surface what is waiting from high-value contacts. Do not act, just surface.',
    category: 'workflows',
    icon: '⭐',
    kind: 'prompt',
    template:
      'Show me what is waiting from high-value contacts — clients, investors, key partners. Use memory_relationship_intelligence and gmail_unlimited_search. Pull recent threads from VIPs I have not replied to yet, sorted by urgency. For each: recipient, subject, what they are asking, days waiting. Do not draft replies, do not act — this is surface-only. If nothing is waiting from VIPs, say so plainly and stop.'
      + GROUND_RULES,
  },
  {
    name: 'voice',
    description: 'Rebuild my writing voice profile from the last 90 days of sent mail.',
    category: 'profile',
    icon: '🎤',
    kind: 'prompt',
    template:
      'Call voice_profile_generate to rebuild my voice profile from the last 90 days of sent mail. When the tool returns, confirm with a one-line summary of the new profile (tone + typical greeting + typical sign-off). If the tool fails or returns insufficient_sent_mail, report exactly that — do not invent a profile summary.'
      + GROUND_RULES,
  },
  { name: 'agents',   description: 'Open the Agents panel.',                category: 'navigation', icon: '🤖', kind: 'client', clientHandler: 'openAgents' },
  { name: 'memory',   description: 'Open Settings → Memory.',               category: 'navigation', icon: '🧠', kind: 'client', clientHandler: 'openMemorySettings' },
  { name: 'settings', description: 'Open Settings → Instructions.',         category: 'navigation', icon: '⚙️', kind: 'client', clientHandler: 'openSettings' },
  { name: 'clear',    description: 'Clear the current conversation.',       category: 'navigation', icon: '🧹', kind: 'client', clientHandler: 'clearConversation' },
  { name: 'help',     description: 'Show all slash commands.',              category: 'navigation', icon: '❓', kind: 'client', clientHandler: 'showHelp' },
];

export function findSlashCommand(name: string): SlashCommand | undefined {
  const normalized = name.trim().toLowerCase().replace(/^\//, '');
  return SLASH_COMMANDS.find(c => c.name === normalized);
}

export function expandSlashCommand(message: string): {
  expanded: string;
  matchedCommand?: SlashCommand;
} {
  const trimmed = message.trim();
  if (!trimmed.startsWith('/')) return { expanded: message };

  const firstWhitespace = trimmed.search(/\s/);
  const cmdToken = firstWhitespace === -1 ? trimmed : trimmed.slice(0, firstWhitespace);
  const userArgs = firstWhitespace === -1 ? '' : trimmed.slice(firstWhitespace + 1).trim();
  const command = findSlashCommand(cmdToken);

  if (!command || command.kind !== 'prompt' || !command.template) {
    return { expanded: message };
  }

  const expanded = userArgs
    ? `${command.template}\n\nAdditional context from the user: ${userArgs}`
    : command.template;

  return { expanded, matchedCommand: command };
}

export function filterSlashCommands(prefix: string): SlashCommand[] {
  const p = prefix.trim().toLowerCase().replace(/^\//, '');
  if (!p) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(c => c.name.includes(p));
}
