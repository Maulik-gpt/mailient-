/**
 * Integration Status API
 * 
 * Phase 4: API routes for integration management
 * GET /api/integrations/status - Get all integration statuses
 * GET /api/integrations/:provider/status - Get specific integration status
 * POST /api/integrations/:provider/execute - Execute integration action
 * GET /api/integrations/:provider/auth - Get OAuth URL
 * POST /api/integrations/:provider/callback - OAuth callback
 * DELETE /api/integrations/:provider - Disconnect integration
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ArcusIntegrationManager } from '@/lib/arcus-integration-manager';
import { supabase } from '@/lib/supabase';

// Database wrapper for integration manager
const db = {
  async storeIntegrationCredentials(userEmail, provider, credentials) {
    const { error } = await supabase
      .from('integration_credentials')
      .upsert({
        user_email: userEmail,
        provider,
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        expires_at: credentials.expiresAt,
        scopes: credentials.scopes,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_email,provider'
      });
    
    if (error) throw error;
  },

  async getIntegrationCredentials(userEmail, provider) {
    const { data, error } = await supabase
      .from('integration_credentials')
      .select('*')
      .eq('user_email', userEmail)
      .eq('provider', provider)
      .single();
    
    if (error || !data) return null;
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      scopes: data.scopes || []
    };
  },

  async deleteIntegrationCredentials(userEmail, provider) {
    const { error } = await supabase
      .from('integration_credentials')
      .delete()
      .eq('user_email', userEmail)
      .eq('provider', provider);
    
    if (error) throw error;
  },

  async logIntegrationEvent(userEmail, provider, event, metadata = {}) {
    await supabase
      .from('integration_events')
      .insert({
        user_email: userEmail,
        provider,
        event,
        metadata,
        created_at: new Date().toISOString()
      });
  }
};

// Initialize integration manager
const integrationManager = new ArcusIntegrationManager(db);

/**
 * GET /api/integrations/status
 * Get all integration statuses for current user
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    // Get specific provider status
    if (provider) {
      const status = await integrationManager.getIntegrationStatus(userEmail, provider);
      return NextResponse.json({ 
        provider,
        ...status,
        actions: integrationManager.getProviderActions(provider)
      });
    }

    // Get all integration statuses
    const statuses = await integrationManager.getAllIntegrationStatuses(userEmail);
    
    // Add available actions for each integration
    const integrationsWithActions = Object.entries(statuses.integrations).map(([key, status]) => ({
      ...status,
      actions: integrationManager.getProviderActions(key)?.actions || []
    }));

    return NextResponse.json({
      ...statuses,
      integrations: integrationsWithActions
    });
  } catch (error) {
    console.error('[Integrations API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch integration status',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/execute
 * Execute an integration action
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { provider, action, params, runId, executionId } = body;

    if (!provider || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, action' },
        { status: 400 }
      );
    }

    const userEmail = session.user.email;

    // Execute the action
    const result = await integrationManager.executeAction(
      userEmail,
      provider,
      action,
      params || {},
      { runId, executionId, userEmail }
    );

    // Log the execution
    await db.logIntegrationEvent(userEmail, provider, 'action_executed', {
      action,
      success: result.success,
      errorCode: result.error?.code
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Integrations API] Execute error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: error.message,
          category: 'internal_error',
          retryable: false
        }
      },
      { status: 500 }
    );
  }
}
