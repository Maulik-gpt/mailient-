/**
 * GET /api/integrations/[appId]/auth
 *
 * Returns the OAuth initiation URL for a given app.
 * The client navigates to this URL, which triggers the provider-specific
 * OAuth route (which sets a CSRF cookie and redirects to the provider).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../lib/auth.js';

// Maps UI app IDs → internal OAuth initiation route
const APP_OAUTH_ROUTE: Record<string, string> = {
  google_calendar: '/api/arcus/v3/oauth/gcal',
  google_meet:     '/api/arcus/v3/oauth/gcal',   // shares GCal scopes
  notion:          '/api/arcus/v3/oauth/notion',
  notion_calendar: '/api/arcus/v3/oauth/notion',  // shares Notion OAuth
  slack:           '/api/arcus/v3/oauth/slack',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appId } = await params;
    const route = APP_OAUTH_ROUTE[appId];

    if (!route) {
      return NextResponse.json({ error: 'Unknown app or not yet supported' }, { status: 404 });
    }

    return NextResponse.json({ url: route });
  } catch (err) {
    console.error('[integrations/auth] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
