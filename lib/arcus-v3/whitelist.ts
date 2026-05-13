/**
 * Arcus V3 — Action Whitelist
 * 
 * This is the security boundary of the execution engine.
 * Any step whose app+action combination is not in this object
 * throws immediately — BEFORE any API call is made.
 * 
 * If an LLM response contains an unlisted action (possible via
 * prompt injection through malicious calendar invites), the step
 * fails with a clear error, the plan is marked failed, and the
 * incident is logged to the audit table.
 */

const ALLOWED_ACTIONS: Record<string, string[]> = {
  gcal:  ['update_event', 'create_event', 'delete_event'],
  slack: ['send_message', 'set_status'],
  // notion and calcom are added in Phase 2 and Phase 3 respectively
};

/**
 * Check if an app+action combination is whitelisted.
 * Must be called BEFORE any API call in the execution loop.
 */
export function isAllowedAction(app: string, action: string): boolean {
  return ALLOWED_ACTIONS[app]?.includes(action) ?? false;
}

/**
 * Get all allowed actions for display/validation purposes.
 */
export function getAllowedActions(): Record<string, string[]> {
  return { ...ALLOWED_ACTIONS };
}

/**
 * Deep link map for manual recovery when a step fails.
 * Directs the user to the affected app to fix manually.
 */
export const DEEP_LINKS: Record<string, string> = {
  gcal:   'https://calendar.google.com',
  slack:  'https://app.slack.com',
  notion: 'https://notion.so',
  calcom: 'https://app.cal.com',
};

export default ALLOWED_ACTIONS;
