/**
 * Arcus tool layer — OAuth token resolution for Gmail / GCal / Notion / Slack.
 *
 * Pulled out of the 9500-line tools.ts in PART 39a. Every domain executor
 * (Gmail/Calendar/Notion/Slack) consults one of the get*Token helpers below
 * before hitting its upstream API. The Google helpers also know how to
 * refresh an expired token via the stored refresh_token.
 *
 * Token storage shape — historic V2 vs current V3 — is normalised here so
 * callers don't have to know which table the user's credentials happen to
 * live in.
 */

// @ts-ignore — JS module
import { getSupabaseAdmin } from '../../supabase.js';
// @ts-ignore — JS module
import { decrypt, encrypt } from '../../crypto.js';
import { normalizeUserId } from '../user-id';
import { failureResult, type ToolResult } from './types';

/**
 * Refresh a Google access token using the stored refresh token.
 * Stores the new access token back wherever the credentials currently live
 * (arcus_integrations → integration_credentials → user_tokens, in priority order).
 * Returns the new access token, or null if refresh fails.
 */
export async function refreshGoogleToken(userId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const uid = normalizeUserId(userId);

    // 1. Try to find in arcus_integrations (V3)
    const { data: v3 } = await supabase
      .from('arcus_integrations')
      .select('refresh_token, provider')
      .eq('user_id', uid)
      .in('provider', ['gcal', 'gmail'])
      .maybeSingle();

    if (v3?.refresh_token) {
      const refreshToken = decrypt(v3.refresh_token);
      const newToken = await performGoogleRefresh(refreshToken);
      if (newToken) {
        await supabase
          .from('arcus_integrations')
          .update({
            access_token: encrypt(newToken),
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', uid)
          .eq('provider', v3.provider);
        return newToken;
      }
    }

    // 2. Try to find in integration_credentials (legacy V2)
    const { data: legacy } = await supabase
      .from('integration_credentials')
      .select('encrypted_refresh_token, refresh_token, provider')
      .eq('user_id', uid)
      .in('provider', ['google_calendar', 'google'])
      .maybeSingle();

    if (legacy) {
      const encryptedRf = legacy.encrypted_refresh_token || (legacy.refresh_token ? encrypt(legacy.refresh_token) : null);
      if (encryptedRf) {
        const refreshToken = decrypt(encryptedRf);
        const newToken = await performGoogleRefresh(refreshToken);
        if (newToken) {
          await supabase
            .from('integration_credentials')
            .update({
              encrypted_access_token: encrypt(newToken),
              access_token: newToken,
              expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', uid)
            .eq('provider', legacy.provider);
          return newToken;
        }
      }
    }

    // 3. Fallback to user_tokens
    const { data: ut } = await supabase
      .from('user_tokens')
      .select('encrypted_refresh_token')
      .or(`user_id.ilike."${uid}",google_email.ilike."${uid}"`)
      .maybeSingle();

    if (ut?.encrypted_refresh_token) {
      const refreshToken = decrypt(ut.encrypted_refresh_token);
      const newToken = await performGoogleRefresh(refreshToken);
      if (newToken) {
        await supabase
          .from('user_tokens')
          .update({
            encrypted_access_token: encrypt(newToken),
            access_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .or(`user_id.ilike."${uid}",google_email.ilike."${uid}"`);
        return newToken;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function performGoogleRefresh(refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return null;
  const json = await res.json();
  return json.access_token || null;
}

export async function getGmailToken(userId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const uid = normalizeUserId(userId);

    // 1. arcus_integrations (V3 OAuth flow)
    const { data: v3 } = await supabase
      .from('arcus_integrations')
      .select('access_token')
      .eq('user_id', uid)
      .eq('provider', 'gmail')
      .maybeSingle();
    if (v3?.access_token) return decrypt(v3.access_token);

    // 2. integration_credentials (legacy OAuth flow)
    const { data: legacy } = await supabase
      .from('integration_credentials')
      .select('encrypted_access_token')
      .eq('user_id', uid)
      .eq('provider', 'google')
      .maybeSingle();
    if (legacy?.encrypted_access_token) return decrypt(legacy.encrypted_access_token);

    // 3. user_tokens (populated automatically on Google login via NextAuth)
    const { data: ut } = await supabase
      .from('user_tokens')
      .select('encrypted_access_token')
      .or(`user_id.ilike."${uid}",google_email.ilike."${uid}"`)
      .maybeSingle();
    if (ut?.encrypted_access_token) return decrypt(ut.encrypted_access_token);

    return null;
  } catch {
    return null;
  }
}

export async function getGcalToken(userId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const uid = normalizeUserId(userId);

    // 1. arcus_integrations (V3 OAuth flow)
    const { data: v3 } = await supabase
      .from('arcus_integrations')
      .select('access_token')
      .eq('user_id', uid)
      .eq('provider', 'gcal')
      .maybeSingle();
    if (v3?.access_token) return decrypt(v3.access_token);

    // 2. integration_credentials (legacy OAuth flow)
    const { data: legacy } = await supabase
      .from('integration_credentials')
      .select('encrypted_access_token')
      .eq('user_id', uid)
      .eq('provider', 'google_calendar')
      .maybeSingle();
    if (legacy?.encrypted_access_token) return decrypt(legacy.encrypted_access_token);

    // 3. user_tokens (Google login covers Calendar scope too)
    const { data: ut } = await supabase
      .from('user_tokens')
      .select('encrypted_access_token')
      .or(`user_id.ilike."${uid}",google_email.ilike."${uid}"`)
      .maybeSingle();
    if (ut?.encrypted_access_token) return decrypt(ut.encrypted_access_token);

    return null;
  } catch {
    return null;
  }
}

export async function getNotionToken(userId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    // Check both 'notion' and 'notion_calendar' — they share the same OAuth
    // token but users may have connected only one of the two.
    const { data } = await supabase
      .from('arcus_integrations')
      .select('access_token')
      .eq('user_id', userId)
      .in('provider', ['notion', 'notion_calendar'])
      .limit(1)
      .maybeSingle();
    if (data?.access_token) return decrypt(data.access_token);
    return null;
  } catch {
    return null;
  }
}

export async function getSlackToken(userId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('arcus_integrations')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', 'slack')
      .maybeSingle();
    if (data?.access_token) return decrypt(data.access_token);
    return null;
  } catch {
    return null;
  }
}

// ── Scope error helpers ──────────────────────────────────────────────────────

/**
 * Shown when the Calendar API rejects the token for lack of calendar scope.
 * This happens when the only Google token on file is the Gmail/login token
 * (no calendar.events scope). The fix is a dedicated Calendar reconnect.
 */
export const CALENDAR_SCOPE_MESSAGE =
  'Google Calendar access needs to be re-authorized. The current Google connection only has email permissions, not calendar permissions. ' +
  'Tell the user: "I need calendar access to do that. Click the connectors button in the prompt box, choose Google Calendar, and complete the Google sign-in — then ask me again."';

/**
 * Gmail returns 403 when the OAuth token does not carry one of the Gmail
 * scopes the call requires (e.g. gmail.readonly, gmail.modify, gmail.send).
 * Most often this hits users who connected Google Sign-In before Arcus added
 * Gmail-specific permissions. The fix is a Gmail reconnect from the connectors
 * modal, which re-runs the OAuth consent screen with the missing scopes.
 */
export const GMAIL_SCOPE_MESSAGE =
  'Gmail access needs to be re-authorized. The current Google token is missing the required Gmail permissions. ' +
  'Tell the user: "I need Gmail access to do that. Click the connectors button in the prompt box, choose Gmail, and complete the Google sign-in — then ask me again."';

export function isScopeError(status: number): boolean {
  return status === 403 || status === 401;
}

/**
 * Pick the right failure for a non-ok Gmail response. 403 is always a scope
 * problem from Google's side; 404 is a missing message/thread; everything
 * else is bucketed as upstream_gmail with the raw status surfaced.
 */
export function gmailHttpFailure(status: number, contextLabel: string): ToolResult {
  if (status === 403) return failureResult(GMAIL_SCOPE_MESSAGE, 'gmail_scope_missing');
  if (status === 404) return failureResult(`${contextLabel} (404 not found).`, 'not_found');
  return failureResult(`${contextLabel} (${status}).`, 'upstream_gmail');
}
