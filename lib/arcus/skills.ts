/**
 * Arcus Slash-Commands Registry — PART 46.
 *
 * Single source of truth for every slash command exposed in the chat input.
 * Each command is one of two kinds:
 *
 *   - kind: 'prompt'  — the slash text is replaced server-side with a
 *                       canonical, well-tuned prompt before the LLM sees it.
 *                       Used for "do real work" commands like /brief, /inbox.
 *   - kind: 'client'  — the slash text never hits the network. The chat input
 *                       calls a local handler instead (open a modal, clear the
 *                       conversation, inject a help message). Used for
 *                       navigation + utility commands.
 *
 * Why a registry rather than scattered if/else logic:
 *   - The autocomplete menu, the server-side expander, and the /help command
 *     all read from the same list. Adding a command = one entry here.
 *   - The categories drive the visual grouping in the dropdown.
 *   - Prompt templates live next to their descriptions so when we tune one
 *     we don't have to chase the rest of the system.
 *
 * v1 ships 11 commands. v2 will likely add arg parsing (e.g. /follow-up
 * @priya) — deferred so this PR stays scoped.
 */

export type SlashCategory = 'workflows' | 'profile' | 'navigation';

export interface SlashCommand {
  /** Canonical name without the leading slash. Lowercase, kebab-allowed. */
  name: string;
  /** One-line description shown in the autocomplete menu + /help output. */
  description: string;
  /** Category for visual grouping in the dropdown. */
  category: SlashCategory;
  /** Emoji or icon char shown to the left of the name. Keep to 1 glyph. */
  icon: string;
  /**
   * 'prompt' commands get expanded server-side; 'client' commands are
   * handled entirely in the browser via the matching handler callback.
   */
  kind: 'prompt' | 'client';
  /**
   * For kind: 'prompt' — the canonical message text the LLM actually
   * receives, replacing the literal `/cmd` the user typed. Authored to
   * work well against the free OpenRouter models we run on (concrete,
   * names the tools to use, structures the output).
   */
  template?: string;
  /**
   * For kind: 'client' — the name of the handler the chat input should
   * invoke. The actual callback is wired in ChatInterface.tsx; this is
   * just the string key so the registry stays plain data.
   */
  clientHandler?:
    | 'openAgents'
    | 'openMemorySettings'
    | 'openSettings'
    | 'clearConversation'
    | 'showHelp';
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // ─── Workflows — five-VA "do real work" prompts ────────────────────────────
  {
    name: 'brief',
    description: 'Morning briefing across Inbox, Calendar, CRM, Comms, and Research.',
    category: 'workflows',
    icon: '☀️',
    kind: 'prompt',
    template:
      'Give me a morning briefing. ' +
      'Pull (in parallel): unread emails from the last 24 hours, my calendar for today and tomorrow, ' +
      'recent Notion activity, and relevant memory signals for any client or deal mentioned in the inbox. ' +
      'Synthesize into one cross-VA briefing organized by priority — what needs my attention first, ' +
      'what I should know about, and what can wait. Output to Canvas if there\'s more than three bullet groups.',
  },
  {
    name: 'inbox',
    description: 'Triage inbox: digest newsletters, flag VIPs, draft client replies.',
    category: 'workflows',
    icon: '📧',
    kind: 'prompt',
    template:
      'Triage my inbox now. Three passes in parallel: ' +
      '(1) digest_newsletters to summarize and offer to archive promotional / newsletter mail; ' +
      '(2) gmail_unlimited_search for client threads needing a response (3+ exchanges in 90 days), ' +
      'draft replies for each in my voice; ' +
      '(3) gmail_detect_urgency on the top 20 unread to surface anything truly time-sensitive. ' +
      'End with a tight list of what needs my decision and what got handled.',
  },
  {
    name: 'follow-up',
    description: 'Find stalled threads where I\'m waiting on a reply. Draft polite nudges.',
    category: 'workflows',
    icon: '⏳',
    kind: 'prompt',
    template:
      'Find threads where I\'m waiting on a reply — sent emails with no response for 3+ days, ' +
      'prioritized by client status and revenue impact. ' +
      'For each, draft a short, polite follow-up in my voice that references the prior thread context. ' +
      'Show the list with one draft per thread; do not send anything.',
  },
  {
    name: 'prep',
    description: 'Meeting prep doc for the next 24 hours — Canvas with one section per meeting.',
    category: 'workflows',
    icon: '🗓️',
    kind: 'prompt',
    template:
      'Prepare me for every meeting in the next 24 hours. For each upcoming meeting: ' +
      'pull recent email threads with the attendees, relevant Notion pages or notes, ' +
      'any prior meeting notes I have, and a one-line "what they likely want to discuss" based on the latest context. ' +
      'Produce a meeting prep document in Canvas with one section per meeting, sorted chronologically.',
  },
  {
    name: 'weekly',
    description: 'Weekly executive brief — done / stalled / next-week / revenue signals.',
    category: 'workflows',
    icon: '📊',
    kind: 'prompt',
    template:
      'Generate my weekly executive brief. Cover four sections: ' +
      '(1) Done this week — key emails sent, meetings held, decisions logged in Notion; ' +
      '(2) Stalled — outbound conversations waiting on a reply, blocked deals or projects; ' +
      '(3) Coming next week — calendar overview, expected priorities; ' +
      '(4) Revenue signals — anything in inbox or Notion that smells like a deal moving forward (or sideways). ' +
      'Output to Canvas. Be specific — name people, name companies, name numbers when you have them.',
  },
  {
    name: 'vip',
    description: 'Surface what\'s waiting from high-value contacts. Don\'t act, just surface.',
    category: 'workflows',
    icon: '⭐',
    kind: 'prompt',
    template:
      'Show me what\'s waiting from high-value contacts — clients, investors, key partners. ' +
      'Pull recent threads from VIPs (memory + relationship-weighted) that I have not replied to yet, ' +
      'sorted by urgency. For each: the recipient, the subject, what they\'re asking, and how many days they\'ve been waiting. ' +
      'Do not draft replies and do not act — this is a surface-only command.',
  },

  // ─── Profile — single-tool actions ─────────────────────────────────────────
  {
    name: 'voice',
    description: 'Rebuild my writing voice profile from the last 90 days of sent mail.',
    category: 'profile',
    icon: '🎤',
    kind: 'prompt',
    template:
      'Rebuild my voice profile from my last 90 days of sent mail using voice_profile_generate. ' +
      'When done, confirm with a one-line summary of the new profile\'s tone, typical greeting, and sign-off pattern.',
  },

  // ─── Navigation — client-only, never touch the network ─────────────────────
  {
    name: 'agents',
    description: 'Open the Agents panel.',
    category: 'navigation',
    icon: '🤖',
    kind: 'client',
    clientHandler: 'openAgents',
  },
  {
    name: 'memory',
    description: 'Open Settings → Memory.',
    category: 'navigation',
    icon: '🧠',
    kind: 'client',
    clientHandler: 'openMemorySettings',
  },
  {
    name: 'settings',
    description: 'Open Settings → Instructions.',
    category: 'navigation',
    icon: '⚙️',
    kind: 'client',
    clientHandler: 'openSettings',
  },
  {
    name: 'clear',
    description: 'Clear the current conversation.',
    category: 'navigation',
    icon: '🧹',
    kind: 'client',
    clientHandler: 'clearConversation',
  },
  {
    name: 'help',
    description: 'Show all slash commands.',
    category: 'navigation',
    icon: '❓',
    kind: 'client',
    clientHandler: 'showHelp',
  },
];

/**
 * Lookup by name (without the leading slash). Returns undefined when the
 * name doesn't match a registered command — the chat input + server expander
 * both treat that as "this isn't a slash command, send the message as-is."
 */
export function findSlashCommand(name: string): SlashCommand | undefined {
  const normalized = name.trim().toLowerCase().replace(/^\//, '');
  return SLASH_COMMANDS.find(c => c.name === normalized);
}

/**
 * Server-side expander. Called by the chat route before passing the message
 * to runAgentLoop. If the first token is a known prompt-kind slash command,
 * returns the template; otherwise returns the message unchanged.
 *
 * The user bubble in chat history still shows the original `/brief` text —
 * only the LLM sees the expansion. That keeps the conversation log clean
 * while giving the model the full context it needs to do the work.
 *
 * Client-kind commands should NEVER reach this function — the chat input is
 * responsible for short-circuiting them in the browser. If one slips through
 * (e.g. legacy client, manual API hit), we leave the message untouched so
 * the LLM at least gets a literal "/agents" it can ask the user about.
 */
export function expandSlashCommand(message: string): {
  expanded: string;
  matchedCommand?: SlashCommand;
} {
  const trimmed = message.trim();
  if (!trimmed.startsWith('/')) return { expanded: message };

  // First token = command name. Anything after = args (v1 ignores args, but
  // we still strip them off the command lookup so future arg support drops
  // in without changing the parse).
  const firstWhitespace = trimmed.search(/\s/);
  const cmdToken = firstWhitespace === -1 ? trimmed : trimmed.slice(0, firstWhitespace);
  const command = findSlashCommand(cmdToken);

  if (!command || command.kind !== 'prompt' || !command.template) {
    return { expanded: message };
  }

  return { expanded: command.template, matchedCommand: command };
}

/**
 * Filter the registry by user-typed prefix. Used by SlashCommandMenu to
 * power the autocomplete dropdown. Empty prefix returns everything.
 *
 * Match rules:
 *   - case-insensitive
 *   - matches names that START WITH the prefix (not substring) so the menu
 *     stays predictable as the user types
 *   - preserves the order of SLASH_COMMANDS so the visual grouping is stable
 */
export function filterSlashCommands(prefix: string): SlashCommand[] {
  const p = prefix.trim().toLowerCase().replace(/^\//, '');
  if (!p) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(c => c.name.startsWith(p));
}
