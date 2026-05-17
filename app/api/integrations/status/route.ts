/**
 * GET /api/integrations/status
 *
 * Returns connection status for all supported apps.
 * Maps internal DB provider names (gcal, notion, slack) to
 * the UI app IDs used by ConnectorsModal.
 */

import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth.js';
import { getSupabaseAdmin } from '../../../../lib/supabase.js';

// Map from arcus_integrations.provider → UI app IDs that share that connection
const PROVIDER_TO_APP_IDS: Record<string, string[]> = {
  gcal:   ['google_calendar', 'google_meet'],
  notion: ['notion', 'notion_calendar'],
  slack:  ['slack'],
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.email.toLowerCase();
    const supabase = getSupabaseAdmin();

    const { data: integrations } = await supabase
      .from('arcus_integrations')
      .select('provider, workspace_info, updated_at')
      .eq('user_id', userId);

    const connected = new Map(
      (integrations || []).map((row: any) => [row.provider, row])
    );

    const result: { provider: string; connected: boolean; workspace_info?: any }[] = [];

    for (const [dbProvider, appIds] of Object.entries(PROVIDER_TO_APP_IDS)) {
      const row = connected.get(dbProvider);
      for (const appId of appIds) {
        result.push({
          provider: appId,
          connected: !!row,
          workspace_info: row?.workspace_info ?? null,
        });
      }
    }

    return NextResponse.json({ integrations: result });
  } catch (err) {
    console.error('[integrations/status] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
