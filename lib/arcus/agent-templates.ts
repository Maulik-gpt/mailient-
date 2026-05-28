/**
 * Arcus Agent Templates
 *
 * Curated pre-built scheduled-agent configurations. Spawned via
 * POST /api/arcus/agents/templates → which calls createScheduledAgent
 * directly with _planApproved: true (skipping the spec-confirmation card
 * since the template IS the spec).
 *
 * Design rules:
 *  - Each template name is 2-4 words, recognizable, action-oriented.
 *  - cron_schedule uses the user's local timezone (handled at run time
 *    by shouldAgentRunNow).
 *  - skip_confirmations defaults to FALSE — new users hit the approval
 *    dashboard, build trust, then flip autonomy on themselves.
 *  - task_description references the actual tool names from the 60-tool
 *    arsenal so the LLM has a clear playbook for each run.
 *  - requiredIntegrations is informational — the agent-creation flow
 *    will surface integration-required cards if anything is missing.
 */

export interface AgentTemplate {
  /** Stable id used for spawn lookups. */
  id: string;
  /** Display name shown to the user; also becomes the agent's name. */
  name: string;
  /** One-line description shown on the gallery card. */
  tagline: string;
  /** Longer marketing description shown when the card is expanded. */
  description: string;
  /** Emoji icon for the card. */
  emoji: string;
  /** Cron schedule (5-field). */
  cronSchedule: string;
  /** Human-readable schedule label for the card ("Daily 7:00 AM"). */
  scheduleLabel: string;
  /** Output channel for reports. */
  outputChannel: 'gmail' | 'slack' | 'both';
  /** Default skip_confirmations. ALL templates ship with this OFF for safety. */
  skipConfirmations: boolean;
  /** Required integrations for the template to actually do work. */
  requiredIntegrations: Array<'gmail' | 'gcal' | 'notion' | 'slack'>;
  /** The standing instruction the agent runs every fire. References the tool arsenal. */
  taskDescription: string;
  /** What the user can expect in the report. */
  expectedOutput: string;
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  // ───────────────────────────────────────────────────────────────────────
  // 1. Morning Inbox Sweep
  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'morning_inbox_sweep',
    name: 'Morning Inbox Sweep',
    tagline: 'Wake up to a triaged inbox with drafts ready to send',
    description:
      'Every morning at 7am, this agent reads every unread email from the last 24 hours, ' +
      'drafts replies in your voice for anything that needs one, archives newsletters and promos, ' +
      'and logs every conversation to your Notion contacts database.',
    emoji: '🌅',
    cronSchedule: '0 7 * * *',
    scheduleLabel: 'Daily 7:00 AM',
    outputChannel: 'gmail',
    skipConfirmations: false,
    requiredIntegrations: ['gmail'],
    taskDescription: [
      'Process my inbox from the last 24 hours autonomously, every morning. Follow this exact workflow:',
      '',
      '1. build_worklist with gmailQuery "is:unread newer_than:1d -category:promotions" — get the filtered tiered worklist.',
      '2. claim_worklist_items with the thread ids — prevents parallel agents from duplicating.',
      '3. gmail_bulk_read_threads with all the thread ids — read all of them in parallel.',
      '4. gmail_extract_data_from_threads — extract structured info (sender, decisions, urgency, deal signals) for every thread.',
      '5. gmail_detect_urgency — identify any thread scoring 7+ for the urgent-attention section.',
      '6. gmail_batch_draft_replies — for every Tier 1 (client) and Tier 2 (revenue) thread, draft a reply in my voice. Use per-thread instructions based on what the thread is asking.',
      '7. For every draft, call check_draft_quality. If shouldRedraft is true, regenerate without the flagged generic phrases.',
      '8. gmail_auto_label_threads with labelName "Arcus-Reviewed" — label everything you handled.',
      '9. gmail_auto_archive_threads — bulk archive newsletters, promos, and Tier 4 items.',
      '10. notion_auto_log_all_communication — log every Tier 1+2 thread to my Notion communications database.',
      '11. record_processed_items so tomorrow does not re-process the same threads.',
      '12. Write the report following the executive briefing format.',
    ].join('\n'),
    expectedOutput:
      'A morning email + one-line subject line that summarizes: emails processed, drafts queued for your review, ' +
      'urgent items flagged, newsletters archived, deals tracked. Every action links directly to the Gmail draft, ' +
      'Notion page, or Calendar event.',
  },

  // ───────────────────────────────────────────────────────────────────────
  // 2. Deal Pipeline Tracker
  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'deal_pipeline_tracker',
    name: 'Deal Pipeline Tracker',
    tagline: 'Sales activity logged to Notion every afternoon',
    description:
      'Every afternoon at 12:30pm, this agent scans your sent and inbound emails for deal-related signals ' +
      '(contracts, pricing, proposals, signatures, payments), extracts company / contact / stage / value, ' +
      'and updates your Notion deals pipeline automatically.',
    emoji: '💰',
    cronSchedule: '30 12 * * 1-5',
    scheduleLabel: 'Weekdays 12:30 PM',
    outputChannel: 'both',
    skipConfirmations: false,
    requiredIntegrations: ['gmail', 'notion'],
    taskDescription: [
      'Track my sales pipeline by scanning recent deal-related emails and logging them to Notion. Workflow:',
      '',
      '1. gmail_unlimited_search with gmailQuery "(contract OR proposal OR pricing OR invoice OR signed OR renewal OR negotiation) newer_than:1d" maxResults 50.',
      '2. claim_worklist_items for all matching thread ids.',
      '3. gmail_bulk_read_threads on all of them.',
      '4. notion_deal_tracking_automation — extract deal info (company, contact, stage, value, probability, timeline, signals) and log each to my Notion deals database.',
      '5. For any deal that moved between stages (compared to memory), prepare a slack_deal_update_notifications batch and call it.',
      '6. notion_create_smart_dashboards with kind "sales" — refresh the sales overview dashboard.',
      '7. memory_bulk_save_learning — save deal-stage observations so tomorrow you can detect movement.',
      '8. record_processed_items.',
      '9. Write the report with 💰 Revenue & Opportunities as the lead section.',
    ].join('\n'),
    expectedOutput:
      'A midday report — to your inbox AND posted in your Slack #sales-pipeline channel — listing every deal ' +
      'detected today, stage changes since yesterday, and a refreshed Notion sales dashboard. Every entry links ' +
      'to the Notion deal page and the originating Gmail thread.',
  },

  // ───────────────────────────────────────────────────────────────────────
  // 3. Meeting Prep Concierge
  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'meeting_prep_concierge',
    name: 'Meeting Prep Concierge',
    tagline: 'One-page prep doc for every external meeting tomorrow',
    description:
      'Every evening at 6pm, this agent looks at tomorrow\'s calendar, identifies every meeting with external ' +
      'attendees, and generates a one-page prep document for each (context · recent emails · talking points · ' +
      'watch-fors). Prep docs save to Notion and link from the calendar event.',
    emoji: '📅',
    cronSchedule: '0 18 * * *',
    scheduleLabel: 'Daily 6:00 PM',
    outputChannel: 'gmail',
    skipConfirmations: false,
    requiredIntegrations: ['gcal', 'gmail', 'notion'],
    taskDescription: [
      'Generate meeting prep docs for tomorrow\'s external meetings. Workflow:',
      '',
      '1. calendar_unlimited_scan with daysAhead 1 — find all events tomorrow.',
      '2. Filter to events with at least one external (non-self) attendee.',
      '3. calendar_meeting_prep_automation with scanWindow true and saveToNotion true — for each external meeting, pull recent emails with attendees, query memory for context, compose a markdown prep doc, save to Notion meetings database.',
      '4. calendar_auto_generate_meet_links — for any external meeting tomorrow that\'s missing a Meet link, add one (PATCH conferenceData with sendUpdates=all so attendees get the updated invite).',
      '5. calendar_buffer_time_insertion with dryRun false — insert 15-min buffer blocks between back-to-back meetings.',
      '6. record_processed_items.',
      '7. Write the report listing every meeting prepped, with direct links to each Notion prep doc and Calendar event.',
    ].join('\n'),
    expectedOutput:
      'An evening email summarizing tomorrow\'s prep — one line per external meeting with the time, attendees, ' +
      'and a direct link to the Notion prep doc. Meet links and buffer blocks added silently. You wake up ' +
      'ready for every conversation.',
  },

  // ───────────────────────────────────────────────────────────────────────
  // 4. Weekly Executive Brief
  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'weekly_executive_brief',
    name: 'Weekly Executive Brief',
    tagline: 'Friday 4pm: a real executive briefing for the week',
    description:
      'Every Friday at 4pm, this agent aggregates the week — emails handled, deals moved, meetings held, ' +
      'projects updated, urgent items — and composes a structured executive briefing with revenue / operations / ' +
      'client relationships / next-actions sections. Emailed and posted to your team Slack.',
    emoji: '📊',
    cronSchedule: '0 16 * * 5',
    scheduleLabel: 'Friday 4:00 PM',
    outputChannel: 'both',
    skipConfirmations: false,
    requiredIntegrations: ['gmail', 'notion'],
    taskDescription: [
      'Generate a weekly executive briefing covering everything that happened this week. Workflow:',
      '',
      '1. notion_generate_weekly_summaries — aggregate emails sent count, meetings held list, agent run activity. Save the structured summary to Notion weekly_summaries database.',
      '2. gmail_unlimited_search "(contract OR signed OR closed OR shipped) newer_than:7d" — find revenue wins.',
      '3. memory_unlimited_scan with queries ["[AGENT_RUN]", "[LEARNING:approved]", "client", "deal"] — pull context about agent activity and client interactions this week.',
      '4. notion_create_smart_dashboards with kind "executive" — refresh the executive overview.',
      '5. output_formatting_and_presentation with format "briefing" and content set to the aggregated context — get a polished markdown briefing.',
      '6. slack_team_digest_weekly with channel "#team-digest" — post the digest to Slack.',
      '7. Write the final report following the executive briefing format with all 5 sections (Revenue / Client Updates / Operations / Needs Attention / Links).',
    ].join('\n'),
    expectedOutput:
      'A Friday afternoon executive briefing — in your inbox and in your team Slack channel — that reads like a ' +
      'real chief-of-staff weekly report. Sections for revenue, client relationships, operations, and what needs ' +
      'your attention next week. Every claim links to the underlying Notion page or Gmail thread.',
  },
];

export function getTemplateById(id: string): AgentTemplate | undefined {
  return AGENT_TEMPLATES.find(t => t.id === id);
}
