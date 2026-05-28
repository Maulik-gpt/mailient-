/**
 * React Hook for Connectors
 * 
 * Manages connector state, OAuth flows, and UI integration.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  CONNECTOR_STATUS,
  hasConnectedAccounts,
  getConnectedConnectors 
} from '@/lib/arcus-connector-registry';

interface ConnectedAccount {
  id: string;
  connectorId: string;
  status: string;
  email?: string;
  name?: string;
  connectedAt?: string;
  provider?: string;
}

interface UseConnectorsOptions {
  userId: string;
  supabase: any;
  onConnect?: (connectorId: string) => void;
  onDisconnect?: (accountId: string) => void;
  onError?: (error: Error) => void;
}

export function useConnectors(options: UseConnectorsOptions) {
  const { userId, supabase } = options;
  
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Load connected accounts
  const loadAccounts = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/connectors', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load connectors');
      }

      const data = await response.json();
      setConnectedAccounts(data.connectedAccounts || []);

    } catch (err) {
      setError(err as Error);
      options.onError?.(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase, options]);

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Connect a connector
  const connect = useCallback(async (connectorId: string) => {
    if (!userId) return;

    try {
      setIsConnecting(connectorId);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/connectors/oauth', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connectorId,
          redirectUri: `${window.location.origin}/api/connectors/callback`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initiate OAuth');
      }

      const { oauthUrl } = await response.json();

      // Open OAuth window
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        oauthUrl,
        'Connect Account',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups and try again.');
      }

      // Listen for completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          loadAccounts();
          setIsConnecting(null);
        }
      }, 1000);

      options.onConnect?.(connectorId);

    } catch (err) {
      setError(err as Error);
      setIsConnecting(null);
      options.onError?.(err as Error);
    }
  }, [userId, supabase, loadAccounts, options]);

  // Disconnect an account (now: by connectorId, not accountId — so we can
  // hit the unified Arcus disconnect endpoint which clears every store).
  // The legacy /api/connectors/{accountId} DELETE only touched one table,
  // so disconnecting Gmail from the UI left the row in integration_credentials
  // and user_tokens orphaned — the next chat turn would still think Gmail
  // was connected. Now we POST a provider to the new endpoint and it deletes
  // from arcus_integrations + integration_credentials + (conditionally)
  // user_tokens, plus invalidates the scope-probe cache.
  const disconnect = useCallback(async (accountIdOrConnectorId: string) => {
    if (!userId) return;

    try {
      setError(null);

      // Resolve to a connectorId — the new endpoint takes provider, not
      // arcus account id. The local state stores both, so we accept either.
      const account = connectedAccounts.find(
        a => a.id === accountIdOrConnectorId || a.connectorId === accountIdOrConnectorId,
      );
      const provider = account?.connectorId || accountIdOrConnectorId;

      const response = await fetch('/api/arcus/connectors/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to disconnect');
      }

      // Local state — drop ANY account whose connectorId matches the provider.
      setConnectedAccounts(prev => prev.filter(a => a.connectorId !== provider));
      options.onDisconnect?.(accountIdOrConnectorId);
      // Refresh from server so anything we missed (other parallel rows) syncs.
      loadAccounts();
    } catch (err) {
      setError(err as Error);
      options.onError?.(err as Error);
    }
  }, [userId, supabase, options, connectedAccounts, loadAccounts]);

  // Reconfigure / "Manage" — re-initiates OAuth for an already-connected
  // provider. Used when a connector's scopes expired or the user wants to
  // re-authorize. Same flow as connect() but the OAuth screen will show
  // the user the existing app permissions and let them grant any missing
  // scope (e.g. add Calendar after only granting Gmail).
  const reconfigure = useCallback(async (connectorId: string) => {
    return connect(connectorId);
  }, [connect]);

  // Dismiss banner
  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    // Persist to localStorage
    localStorage.setItem('connectorBannerDismissed', 'true');
  }, []);

  // Check if banner was previously dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('connectorBannerDismissed') === 'true';
    setBannerDismissed(dismissed);
  }, []);

  // Computed values
  const hasConnections = hasConnectedAccounts(connectedAccounts);
  const connectedWithInfo = getConnectedConnectors(connectedAccounts);

  return {
    // State
    connectedAccounts,
    isLoading,
    isConnecting,
    error,
    bannerDismissed,
    
    // Computed
    hasConnections,
    connectedWithInfo,
    connectedCount: connectedAccounts.filter(
      a => a.status === CONNECTOR_STATUS.CONNECTED
    ).length,
    
    // Actions
    connect,
    disconnect,
    reconfigure,
    dismissBanner,
    refresh: loadAccounts
  };
}

export default useConnectors;
