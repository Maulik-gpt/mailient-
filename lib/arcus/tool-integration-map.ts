/**
 * Tool → required-integration map.
 *
 * Extracted from tools.ts so system-prompt.ts can auto-derive its capability
 * listing without creating a circular import. Single source of truth — when
 * you add a new tool to tools.ts, add ONE line here and the system prompt
 * picks it up automatically.
 *
 *   value === 'gmail' | 'gcal' | 'notion' | 'slack'  → integration required
 *   value === null                                   → always available
 *
 * If you add a NEW integration, also extend INTEGRATION_LABELS below.
 */

export const TOOL_INTEGRATION_MAP: Record<string, string | null> = {
  // Gmail
  search_gmail: 'gmail',
  read_email: 'gmail',
  gmail_read_thread: 'gmail',
  gmail_get_labels: 'gmail',
  gmail_apply_label: 'gmail',
  gmail_archive_thread: 'gmail',
  gmail_get_profile: 'gmail',
  get_sent_emails: 'gmail',
  voice_profile_generate: 'gmail',
  draft_reply: 'gmail',
  draft_cold_email: 'gmail',
  send_email: 'gmail',
  check_followups: 'gmail',
  digest_newsletters: 'gmail',
  build_worklist: 'gmail',
  gmail_unlimited_search: 'gmail',
  gmail_bulk_read_threads: 'gmail',
  gmail_batch_draft_replies: 'gmail',
  gmail_batch_send_emails: 'gmail',
  gmail_auto_label_threads: 'gmail',
  gmail_auto_archive_threads: 'gmail',
  gmail_extract_data_from_threads: 'gmail',
  gmail_detect_conversation_type: 'gmail',
  gmail_generate_auto_replies: 'gmail',
  gmail_detect_urgency: 'gmail',
  report_send_gmail: 'gmail',
  memory_relationship_intelligence: 'gmail',

  // Calendar
  schedule_meeting: 'gcal',
  get_calendar_events: 'gcal',
  calendar_get_availability: 'gcal',
  calendar_cancel_event: 'gcal',
  calendar_unlimited_scan: 'gcal',
  calendar_batch_create_events: 'gcal',
  calendar_auto_detect_conflicts: 'gcal',
  calendar_auto_decline_low_priority: 'gcal',
  calendar_generate_free_time_blocks: 'gcal',
  calendar_meeting_prep_automation: 'gcal',
  calendar_auto_generate_meet_links: 'gcal',
  calendar_buffer_time_insertion: 'gcal',

  // Notion
  search_notion: 'notion',
  fetch_notion_schema: 'notion',
  create_notion_page: 'notion',
  notion_read_page: 'notion',
  notion_create_task: 'notion',
  notion_get_calendar_events: 'notion',
  notion_auto_create_contact_profiles: 'notion',
  notion_auto_log_all_communication: 'notion',
  notion_batch_create_database_entries: 'notion',
  notion_auto_update_project_status: 'notion',
  notion_auto_generate_meeting_notes: 'notion',
  notion_deal_tracking_automation: 'notion',
  notion_create_smart_dashboards: 'notion',
  notion_link_related_items: 'notion',
  notion_auto_archive_completed_work: 'notion',
  notion_generate_weekly_summaries: 'notion',

  // Slack
  send_slack_message: 'slack',
  slack_find_user: 'slack',
  slack_send_dm: 'slack',
  slack_get_channels: 'slack',
  slack_post_daily_briefing: 'slack',
  slack_real_time_urgent_alerts: 'slack',
  slack_team_digest_weekly: 'slack',
  slack_deal_update_notifications: 'slack',
  slack_task_assignment_notifications: 'slack',
  slack_approval_request_routing: 'slack',
  report_send_slack: 'slack',

  // Always available
  get_voice_profile: null,
  voice_profile_update: null,
  draft_review: null,
  open_canvas: null,
  update_canvas: null,
  web_search: null,
  web_search_instant: null,
  create_scheduled_agent: null,
  report_generate: null,
  ask_user: null,
  get_recipient_context: null,
  get_contact_context: null,
  remember_about_contact: null,
  memory_search: null,
  memory_save: null,
  memory_get_contact_profile: null,
  claim_worklist_items: null,
  check_draft_quality: null,
  record_processed_items: null,
  calendar_timezone_intelligence: null,
  memory_unlimited_scan: null,
  memory_bulk_save_learning: null,
  generate_email_sequence: null,
  generate_proposal_documents: null,
  generate_client_reports: null,
  generate_sow_documents: null,
  generate_internal_documentation: 'notion',
  web_search_unlimited: null,
  company_intelligence_research: null,
  contact_research_and_verification: null,
  agent_task_queue_management: null,
  error_recovery_and_retries: null,
  performance_monitoring_and_optimization: null,
  output_formatting_and_presentation: null,
  get_delegation_rules: null,
  create_delegation_rule: null,
  surface_proactive_signals: null,
};

export const INTEGRATION_LABELS: Record<string, string> = {
  gmail: 'Gmail',
  gcal: 'Google Calendar',
  notion: 'Notion',
  notion_calendar: 'Notion Calendar',
  slack: 'Slack',
};

/**
 * Inverse: integration → tools[]. Built once at module load.
 */
export function toolsForIntegration(integration: string): string[] {
  const out: string[] = [];
  for (const [tool, req] of Object.entries(TOOL_INTEGRATION_MAP)) {
    if (req === integration) out.push(tool);
  }
  // Notion + notion_calendar share the same tool set
  if (integration === 'notion_calendar') {
    for (const [tool, req] of Object.entries(TOOL_INTEGRATION_MAP)) {
      if (req === 'notion') out.push(tool);
    }
  }
  return [...new Set(out)];
}
