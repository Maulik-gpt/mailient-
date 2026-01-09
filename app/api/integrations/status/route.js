import { DatabaseService } from '@/lib/supabase.js';
import { auth } from '@/lib/auth.js';

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: 'No session' }, { status: 401 });
    }

    const { integrationId, enabled } = await request.json();

    if (!integrationId) {
      return Response.json({ error: 'Missing integrationId' }, { status: 400 });
    }

    const db = new DatabaseService();
    await db.updateIntegrationStatus(session.user.email, integrationId, enabled);

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error updating integration status:', error);
    return Response.json({ error: 'Failed to update status' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: 'No session' }, { status: 401 });
    }

    const db = new DatabaseService();
    const tokens = await db.getUserTokens(session.user.email);
    const profile = await db.getUserProfile(session.user.email);

    const tokenScopes = tokens?.scopes || '';
    const hasCalendarScope =
      tokenScopes.includes('https://www.googleapis.com/auth/calendar') ||
      tokenScopes.includes('https://www.googleapis.com/auth/calendar.events') ||
      tokenScopes.includes('https://www.googleapis.com/auth/calendar.events.freebusy');
    const integrations = {
      gmail: !!tokens,
      'google-calendar': (profile?.integrations?.['google-calendar'] !== false) && !!tokens && hasCalendarScope, // Enabled if not disabled, has tokens, and has Calendar scope
      'google-meet': (profile?.integrations?.['google-meet'] !== false) && !!tokens && hasCalendarScope, // Enabled if not disabled, has tokens, and has Calendar scope
    };

    return Response.json({ integrations });

  } catch (error) {
    console.error('Error getting integration status:', error);
    return Response.json({ error: 'Failed to get status' }, { status: 500 });
  }
}

