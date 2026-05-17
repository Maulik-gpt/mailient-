/**
 * DELETE /api/integrations?provider=<appId>
 *
 * Disconnects a specific app integration for the authenticated user.
 * Maps UI app IDs to the internal DB provider name before deletion.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../lib/auth.js';
import { getSupabaseAdmin } from '../../../lib/supabase.js';
import { auditLogger } from '../../../lib/audit-logger.js';

// Maps UI app IDs → arcus_integrations.provider values
const APP_TO_DB_PROVIDER: Record<string, string> = {
  google_calendar: 'gcal',
  google_meet:     'gcal',
  notion:          'notion',
  notion_calendar: 'notion',
  slack:           'slack',
};

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.email.toLowerCase();
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('provider');

    if (!appId) {
      return NextResponse.json({ error: 'provider query param required' }, { status: 400 });
    }

    const dbProvider = APP_TO_DB_PROVIDER[appId];
    if (!dbProvider) {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('arcus_integrations')
      .delete()
      .eq('user_id', userId)
      .eq('provider', dbProvider);

    if (error) {
      console.error('[integrations/delete] DB error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await auditLogger.log(userId, 'arcus.integration_disconnected', { provider: dbProvider, appId });
    return NextResponse.json({ status: 'disconnected', provider: appId });
  } catch (err) {
    console.error('[integrations/delete] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
