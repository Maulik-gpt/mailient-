/**
 * Arcus session approval state — server-side gate for irreversible writes.
 *
 * The LLM is told (in the system prompt) to call request_confirmation before
 * send_email / schedule_meeting / send_slack_message / create_notion_page.
 * But prompt-level rules drift — the LLM occasionally skips the confirmation
 * call and goes straight to the write. This module backs that rule with
 * code: every confirmation request inserts a pending row, the user's click
 * promotes it to approved, and the write tool refuses to execute unless an
 * approved row exists that matches its target.
 *
 * Backed by the arcus_session_approvals table (see migration). Misses (e.g.
 * Supabase down, table not migrated) fail OPEN — we log and let the call
 * through, because failing closed would break every send for users who
 * haven't applied the migration yet. Once the migration is universally
 * applied, we can tighten this to fail closed.
 */

// @ts-ignore — JS module, no .d.ts
import { getSupabaseAdmin } from '../supabase.js';

export type ApprovalActionType =
  | 'send_email'
  | 'schedule_meeting'
  | 'send_slack_message'
  | 'create_notion_page';

const APPROVAL_TABLE = 'arcus_session_approvals';

/**
 * Normalize the target identifier so the request_confirmation details and the
 * subsequent write tool input map to the same key.
 */
export function normalizeTargetKey(action: ApprovalActionType, input: Record<string, any>): string {
  switch (action) {
    case 'send_email': {
      const to = String(input.to || input.To || '').trim().toLowerCase();
      // Subject helps disambiguate two emails to the same recipient
      const subj = String(input.subject || input.Subject || '').trim().toLowerCase().slice(0, 80);
      return `${to}|${subj}`;
    }
    case 'schedule_meeting': {
      const attendees: string[] = Array.isArray(input.attendees)
        ? input.attendees
        : typeof input.Attendees === 'string'
          ? input.Attendees.split(/[,;]/).map((s: string) => s.trim())
          : [];
      const at = attendees.map((s) => s.toLowerCase()).sort().join(',');
      const start = String(input.startTime || input.Start || input.When || '').trim().toLowerCase();
      return `${at}|${start}`;
    }
    case 'send_slack_message': {
      const ch = String(input.channel || input.Channel || '').trim().toLowerCase();
      return ch;
    }
    case 'create_notion_page': {
      const db = String(input.database || input.Database || input.parentId || '').trim().toLowerCase();
      const title = String(input.title || input.Title || '').trim().toLowerCase().slice(0, 80);
      return `${db}|${title}`;
    }
  }
}

/**
 * Record a pending approval request. Returns the row's UUID, which the UI
 * uses to POST back to /api/arcus/approval/confirm when the user clicks
 * Confirm or Cancel. Returns null on any DB error — the caller should still
 * show the confirmation card (failing open).
 */
export async function recordPendingApproval(params: {
  conversationId: string;
  userId: string;
  actionType: ApprovalActionType;
  targetKey: string;
  actionLabel?: string;
}): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(APPROVAL_TABLE)
      .insert({
        conversation_id: params.conversationId,
        user_id: params.userId.toLowerCase(),
        action_type: params.actionType,
        target_key: params.targetKey,
        action_label: params.actionLabel || null,
        status: 'pending',
      })
      .select('id')
      .single();
    if (error) {
      console.warn('[Arcus:Approvals] recordPendingApproval failed:', error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (err: any) {
    console.warn('[Arcus:Approvals] recordPendingApproval threw:', err.message);
    return null;
  }
}

/**
 * Look up an approved row for the given (conversation, action, target) and
 * mark it consumed in the same transaction. Returns true iff a matching
 * approved row existed and was consumed.
 *
 * Fail-open semantics: if Supabase is unreachable OR the table doesn't exist
 * (migration not applied), this returns true so the write proceeds. Once
 * every deployment has the migration we can flip this to fail-closed.
 */
export async function consumeApproval(params: {
  conversationId: string;
  userId: string;
  actionType: ApprovalActionType;
  targetKey: string;
}): Promise<{ approved: boolean; failedOpen: boolean }> {
  if (!params.conversationId) {
    // No conversation id means we cannot match against any approval — let it
    // through. This happens on background-agent runs where the request_confirmation
    // path is bypassed entirely.
    return { approved: true, failedOpen: true };
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(APPROVAL_TABLE)
      .select('id, expires_at')
      .eq('conversation_id', params.conversationId)
      .eq('user_id', params.userId.toLowerCase())
      .eq('action_type', params.actionType)
      .eq('target_key', params.targetKey)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // 42P01 = table does not exist (migration not applied) — fail open.
      if ((error as any).code === '42P01') {
        console.warn('[Arcus:Approvals] table missing, failing open');
        return { approved: true, failedOpen: true };
      }
      console.warn('[Arcus:Approvals] consumeApproval lookup error:', error.message);
      return { approved: false, failedOpen: false };
    }

    if (!data) return { approved: false, failedOpen: false };

    // Reject if expired
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return { approved: false, failedOpen: false };
    }

    // Consume it so the same approval can't be reused for a second write
    await supabase
      .from(APPROVAL_TABLE)
      .update({ status: 'consumed', consumed_at: new Date().toISOString() })
      .eq('id', data.id);

    return { approved: true, failedOpen: false };
  } catch (err: any) {
    console.warn('[Arcus:Approvals] consumeApproval threw:', err.message);
    return { approved: true, failedOpen: true };
  }
}

/**
 * Promote a pending approval to approved (called by the UI when the user
 * clicks Confirm). Returns true on success.
 */
export async function approvePending(params: {
  approvalId: string;
  userId: string;
}): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from(APPROVAL_TABLE)
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', params.approvalId)
      .eq('user_id', params.userId.toLowerCase())
      .eq('status', 'pending');
    if (error) {
      console.warn('[Arcus:Approvals] approvePending failed:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Arcus:Approvals] approvePending threw:', err.message);
    return false;
  }
}

/**
 * Mark a pending approval as declined.
 */
export async function declinePending(params: {
  approvalId: string;
  userId: string;
}): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from(APPROVAL_TABLE)
      .update({ status: 'declined' })
      .eq('id', params.approvalId)
      .eq('user_id', params.userId.toLowerCase())
      .eq('status', 'pending');
    return !error;
  } catch {
    return false;
  }
}
