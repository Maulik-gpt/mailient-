/**
 * Arcus V3 — Step Dispatcher
 * 
 * Routes plan steps to the correct integration handler.
 * Fetches and decrypts tokens before dispatching.
 */

import { getSupabaseAdmin } from '../supabase.js';
import { decrypt } from '../crypto.js';
import { gcalHandler } from './handlers/gcal';
import { slackHandler } from './handlers/slack';

/**
 * Execute a single step by dispatching to the appropriate handler.
 * Fetches decrypted tokens for the given app + user.
 */
export async function executeStep(
  step: { app: string; action: string; params: Record<string, unknown> },
  userId: string
): Promise<void> {
  const tokens = await getDecryptedTokens(userId, step.app);

  switch (step.app) {
    case 'gcal':
      return gcalHandler(step.action, step.params, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    case 'slack':
      return slackHandler(step.action, step.params, {
        accessToken: tokens.accessToken,
      });
    default:
      throw new Error(`Unknown app: ${step.app}`);
  }
}

/**
 * Fetch and decrypt OAuth tokens for a given user + provider.
 * Always scoped to userId — never fetches by ID alone.
 */
async function getDecryptedTokens(
  userId: string,
  provider: string
): Promise<{ accessToken: string; refreshToken?: string }> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('arcus_integrations')
    .select('access_token, refresh_token')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`No ${provider} integration found for user. Connect ${provider} first.`);
  }

  return {
    accessToken: decrypt(data.access_token),
    refreshToken: data.refresh_token ? decrypt(data.refresh_token) : undefined,
  };
}
