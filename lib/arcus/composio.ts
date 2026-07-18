/**
 * Composio managed-auth bridge — AUTH LAYER ONLY.
 *
 * Why this exists: Mailient's own Google OAuth client is in Testing status
 * (100-user cap, verification pending). Composio's managed Google app is a
 * verified OAuth client, so users who connect Gmail/Calendar through it are
 * not subject to OUR client's cap. We use Composio strictly as the OAuth +
 * token vendor: the user consents on Composio's client, Composio stores and
 * refreshes the Google tokens, and we pull the live access token so the
 * ENTIRE existing tool layer (direct Gmail/Calendar REST calls) keeps
 * working unchanged. No agent-engine changes, no Composio tool execution.
 *
 * Feature flag: a toolkit routes through Composio ONLY when BOTH env vars
 * exist — absent env = the legacy own-client OAuth, untouched:
 *   COMPOSIO_API_KEY                  (dashboard → Settings → API Keys)
 *   COMPOSIO_GMAIL_AUTH_CONFIG_ID     (auth config id, "ac_…", for Gmail)
 *   COMPOSIO_GCAL_AUTH_CONFIG_ID     (auth config id for Google Calendar)
 *
 * Dashboard prerequisites (one-time):
 *   1. Create the auth configs (Gmail scopes: userinfo.email,
 *      userinfo.profile, gmail.modify — nothing else).
 *   2. Settings → Project Configuration → turn OFF "Mask Connected Account
 *      Secrets". Without this, state.val.access_token comes back masked
 *      ("ya29...") and getComposioAccessToken refuses it with a loud error.
 *
 * Storage: the connected-account id is stored in arcus_integrations.
 * access_token as encrypt(`composio:<accountId>`) — the token getters in
 * tools/http-tokens.ts detect the prefix and resolve the live token here.
 *
 * SDK surface used (verified against @composio/core 0.14.0 type defs):
 *   composio.connectedAccounts.initiate(userId, authConfigId, { callbackUrl })
 *     → ConnectionRequest { id, redirectUrl }
 *   composio.connectedAccounts.get(accountId)
 *     → { status: 'INITIALIZING'|'INITIATED'|'ACTIVE'|'FAILED'|'EXPIRED'|
 *          'INACTIVE'|'REVOKED', state?: { val?: { access_token } } }
 */

import { Composio } from '@composio/core';

export type ComposioToolkit = 'gmail' | 'gcal';

let _client: Composio | null = null;
function client(): Composio {
  if (!_client) {
    _client = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
  }
  return _client;
}

export function composioAuthConfigId(toolkit: ComposioToolkit): string | undefined {
  return toolkit === 'gmail'
    ? process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID
    : process.env.COMPOSIO_GCAL_AUTH_CONFIG_ID;
}

/** True when this toolkit should connect through Composio instead of our own Google client. */
export function composioEnabled(toolkit: ComposioToolkit): boolean {
  return !!(process.env.COMPOSIO_API_KEY && composioAuthConfigId(toolkit));
}

export const COMPOSIO_TOKEN_PREFIX = 'composio:';

/**
 * Start a Composio-managed OAuth connection. Returns the Google consent URL
 * (on Composio's verified client) and the connected-account id we must
 * verify + persist at callback time.
 */
export async function initiateComposioConnection(
  userEmail: string,
  toolkit: ComposioToolkit,
  callbackUrl: string,
): Promise<{ accountId: string; redirectUrl: string }> {
  const authConfigId = composioAuthConfigId(toolkit);
  if (!authConfigId) throw new Error(`Composio auth config for ${toolkit} is not configured`);
  // Composio deprecated `.initiate()` for MANAGED-OAuth auth configs (returns
  // HTTP 400 "no longer supported. Use POST /api/v3/connected_accounts/link").
  // `.link()` is the current method — same (userId, authConfigId, {callbackUrl})
  // signature and same { id, redirectUrl } result.
  const req = await client().connectedAccounts.link(
    userEmail.toLowerCase(),
    authConfigId,
    { callbackUrl },
  );
  if (!req.redirectUrl) {
    throw new Error('Composio did not return a redirect URL for the connection request');
  }
  return { accountId: req.id, redirectUrl: req.redirectUrl };
}

/** Raw status of a connected account ('ACTIVE' = usable). */
export async function getComposioAccountStatus(accountId: string): Promise<string> {
  const account = await client().connectedAccounts.get(accountId);
  return account.status;
}

/** Revoke + delete a connected account on Composio (best-effort; used on disconnect). */
export async function deleteComposioConnection(accountId: string): Promise<void> {
  tokenCache.delete(accountId);
  await client().connectedAccounts.delete(accountId);
}

// ── Composio-as-login: identity from a connected Google account ───────────────
// When Composio is the SOLE Google touchpoint, the account connection (which
// includes the openid/email/profile identity scopes) IS the login. We read the
// live access token and call Google's userinfo endpoint to get the verified
// identity. We use userinfo (not the id_token) because Composio's id_token has
// Composio's client as its `aud`, which we can't verify against our own client —
// userinfo works regardless of which OAuth client minted the token.

export interface ComposioIdentity {
  email: string;
  name?: string;
  picture?: string;
  sub?: string;
}

/**
 * Resolve the verified Google identity behind a connected account. Returns null
 * if the account isn't ACTIVE, the token is masked, or Google rejects it.
 */
export async function getComposioIdentity(accountId: string): Promise<ComposioIdentity | null> {
  const token = await getComposioAccessToken(accountId, { force: true });
  if (!token) {
    // getComposioAccessToken already logs the specific reason (masked token,
    // non-ACTIVE, missing). The #1 cause is "Mask Connected Account Secrets"
    // still ON in the Composio dashboard — surface it once more, loudly, since
    // it manifests as a confusing "no identity" at login.
    console.error('[Composio] getComposioIdentity: no usable token. If login fails with composio_login_no_identity, turn OFF "Mask Connected Account Secrets" in Composio → Settings → Project Configuration.');
    return null;
  }
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[Composio] userinfo failed (${res.status}) — token invalid or missing openid/email scope`);
      return null;
    }
    const j: any = await res.json();
    if (!j?.email) return null;
    return {
      email: String(j.email).toLowerCase(),
      name: j.name || undefined,
      picture: j.picture || undefined,
      sub: j.sub || undefined,
    };
  } catch (err: any) {
    console.warn('[Composio] identity fetch failed:', err?.message);
    return null;
  }
}

/** True when Composio should be the SOLE Google touchpoint (login included). */
export function composioLoginEnabled(): boolean {
  return !!(process.env.COMPOSIO_API_KEY && process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID && process.env.COMPOSIO_LOGIN === '1');
}

// ── Live token resolution ────────────────────────────────────────────────────
// Composio refreshes the Google token on their side; we fetch it on demand
// and cache briefly so tool bursts (an inbox sweep is dozens of Gmail calls)
// don't hammer their API. force=true busts the cache — used by the 401-retry
// path in refreshGoogleToken.

// 4 minutes: Google tokens live ~60min and Composio refreshes them
// proactively server-side, so a short TTL means a token that DID rotate is
// stale for at most one cache window — and ~15 fetches/hour/user is nothing.
// (Our refreshGoogleToken deliberately returns null for Composio rows: there
// is no local refresh_token; recovery is simply this cache expiring.)
const tokenCache = new Map<string, { token: string; at: number }>();
const TOKEN_CACHE_TTL_MS = 4 * 60 * 1000;

/** Detect a dashboard-masked secret ("ya29...") — unusable as a bearer token. */
function looksMasked(token: string): boolean {
  return token.length < 20 || token.includes('...');
}

export async function getComposioAccessToken(
  accountId: string,
  opts: { force?: boolean } = {},
): Promise<string | null> {
  const cached = tokenCache.get(accountId);
  if (!opts.force && cached && Date.now() - cached.at < TOKEN_CACHE_TTL_MS) {
    return cached.token;
  }
  try {
    const account = await client().connectedAccounts.get(accountId);
    if (account.status !== 'ACTIVE') {
      console.warn(`[Composio] account ${accountId} status=${account.status} — treating as disconnected`);
      return null;
    }
    const val = (account.state as any)?.val;
    const token: unknown = val?.access_token;
    if (typeof token !== 'string' || !token) {
      console.error('[Composio] connected account has no access_token in state.val — is the auth scheme OAUTH2?');
      return null;
    }
    if (looksMasked(token)) {
      console.error(
        '[Composio] access_token is MASKED. Fix: Composio dashboard → Settings → ' +
        'Project Configuration → turn OFF "Mask Connected Account Secrets".',
      );
      return null;
    }
    tokenCache.set(accountId, { token, at: Date.now() });
    return token;
  } catch (err: any) {
    console.warn('[Composio] token fetch failed:', err?.message);
    // Fall back to a still-fresh cached token on transient API errors.
    return cached?.token ?? null;
  }
}
