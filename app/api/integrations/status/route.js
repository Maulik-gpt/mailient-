import { DatabaseService } from '@/lib/supabase.js';
import { auth } from '@/lib/auth.js';
import { decrypt } from '@/lib/crypto.js';

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

    // Core Google integrations
    const integrations = {
      gmail: !!tokens,
      'google-calendar': tokenScopes.includes('calendar'),
      'google-meet': tokenScopes.includes('calendar'),
      'google-tasks': tokenScopes.includes('tasks') || !!tokens, // Tasks API uses same OAuth
    };

    // Notion — check if server-level integration token is configured
    const notionConfigured = !!process.env.NOTION_INTEGRATION_TOKEN;
    let notionConnected = false;
    if (notionConfigured) {
      try {
        const { NotionAdapter } = await import('@/lib/notion-adapter.js');
        const notion = new NotionAdapter({ token: process.env.NOTION_INTEGRATION_TOKEN });
        const check = await notion.checkConnection();
        notionConnected = check.connected;
      } catch (e) {
        // Connection check failed — not connected
      }
    }
    integrations['notion'] = notionConnected;

    // Google Tasks — verify via API if tokens exist
    let tasksConnected = false;
    if (tokens?.encrypted_access_token) {
      try {
        const accessToken = decrypt(tokens.encrypted_access_token);
        const refreshToken = tokens.encrypted_refresh_token ? decrypt(tokens.encrypted_refresh_token) : '';
        const { GoogleTasksAdapter } = await import('@/lib/google-tasks-adapter.js');
        const tasksAdapter = new GoogleTasksAdapter(accessToken, refreshToken);
        const check = await tasksAdapter.checkConnection();
        tasksConnected = check.connected;
      } catch (e) {
        // Tasks check failed
      }
    }
    integrations['google-tasks'] = tasksConnected;

    return Response.json({ integrations });

  } catch (error) {
    console.error('Error getting integration status:', error);
    return Response.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
