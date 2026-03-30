/**
 * ChatInterface Connectors Integration
 * 
 * Integrates the connector system into the ChatInterface prompt box:
 * - Shows connector icons next to Agent/Plan dropdown when connected
 * - Shows connector banner at bottom when no connections
 * - Manages connector modal state
 * - Integrates with useConnectors hook
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PromptBoxConnectorIcons, PromptBoxConnectorIconsCompact } from './PromptBoxConnectorIcons';
import { ConnectorBanner, ConnectorBannerCompact } from './ConnectorBanner';
import { ConnectorModal } from './ConnectorModal';
import { useConnectors } from '../hooks/useConnectors';

interface ChatInterfaceConnectorsProps {
  userId: string;
  supabase: any;
  compact?: boolean;
}

export function ChatInterfaceConnectors({ 
  userId, 
  supabase,
  compact = false 
}: ChatInterfaceConnectorsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use the connectors hook
  const {
    connectedAccounts,
    isLoading,
    isConnecting,
    error,
    bannerDismissed,
    hasConnections,
    connectedCount,
    connect,
    disconnect,
    dismissBanner,
    refresh
  } = useConnectors({
    userId,
    supabase,
    onConnect: (connectorId) => {
      console.log('Connected:', connectorId);
      refresh();
    },
    onDisconnect: (accountId) => {
      console.log('Disconnected:', accountId);
      refresh();
    },
    onError: (err) => {
      console.error('Connector error:', err);
    }
  });

  const handleConnect = async (connectorId: string) => {
    await connect(connectorId);
  };

  const handleDisconnect = async (accountId: string) => {
    await disconnect(accountId);
  };

  return (
    <>
      {/* Connector Icons Row - Next to Agent/Plan dropdown */}
      <div className="flex items-center gap-2">
        {!isLoading && (
          <>
            {compact ? (
              <PromptBoxConnectorIconsCompact
                connectedAccounts={connectedAccounts}
                onOpenConnectors={() => setIsModalOpen(true)}
              />
            ) : (
              <PromptBoxConnectorIcons
                connectedAccounts={connectedAccounts}
                onOpenConnectors={() => setIsModalOpen(true)}
                maxVisible={5}
              />
            )}
          </>
        )}
      </div>

      {/* Connector Banner - Bottom of prompt box */}
      <AnimatePresence>
        {!isLoading && !hasConnections && !bannerDismissed && (
          <div className={compact ? 'mt-4' : 'mt-2'}>
            {compact ? (
              <ConnectorBannerCompact
                connectedAccounts={connectedAccounts}
                onOpenConnectors={() => setIsModalOpen(true)}
                onDismiss={dismissBanner}
              />
            ) : (
              <ConnectorBanner
                connectedAccounts={connectedAccounts}
                onOpenConnectors={() => setIsModalOpen(true)}
                onDismiss={dismissBanner}
                dismissed={bannerDismissed}
              />
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Connector Modal */}
      <ConnectorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          refresh(); // Refresh after modal closes
        }}
        connectedAccounts={connectedAccounts}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        isConnecting={isConnecting}
      />

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full mb-2 left-0 right-0 mx-auto max-w-sm
                       bg-red-500/10 border border-red-500/20 rounded-lg p-3
                       text-center"
          >
            <p className="text-red-400 text-sm">{error.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatInterfaceConnectors;
