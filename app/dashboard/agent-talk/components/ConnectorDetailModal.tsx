/**
 * Connector Detail Modal - Manus AI Style
 * 
 * Shows single connector with centered layout:
 * - Large icon at top
 * - Name and description
 * - Connect button (white bg, black text)
 * - Show Details dropdown
 * - Connected state: Try it out + Manage buttons
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Send,
  Settings,
  CheckCircle2
} from 'lucide-react';

interface Connector {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  longDescription?: string;
  features?: string[];
}

interface ConnectedAccount {
  id: string;
  connectorId: string;
  status: string;
  email?: string;
  name?: string;
  connectedAt?: string;
  workspace?: string;
}

interface ConnectorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  connector: Connector | null;
  connectedAccount?: ConnectedAccount | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onTryItOut?: () => void;
  onManage?: () => void;
  isConnecting?: boolean;
}

export function ConnectorDetailModal({
  isOpen,
  onClose,
  connector,
  connectedAccount,
  onConnect,
  onDisconnect,
  onTryItOut,
  onManage,
  isConnecting = false
}: ConnectorDetailModalProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!connector) return null;

  const isConnected = connectedAccount?.status === 'connected';

  // Sample features for each connector type
  const getFeatures = () => {
    switch (connector.id) {
      case 'notion':
        return [
          'Create, edit, and organize pages and databases',
          'Search across your workspace content',
          'Manage workspace members and permissions',
          'Sync content between Mailent and Notion'
        ];
      case 'google-calendar':
        return [
          'Create and manage calendar events',
          'Schedule meetings with smart suggestions',
          'Sync events with Google Meet',
          'Send calendar invites automatically'
        ];
      case 'calcom':
        return [
          'Book appointments with smart scheduling',
          'Manage availability and booking rules',
          'Send automated reminders',
          'Collect payments for bookings'
        ];
      case 'google-tasks':
        return [
          'Create and manage task lists',
          'Set due dates and reminders',
          'Sync tasks across Google Workspace',
          'Convert emails to tasks'
        ];
      default:
        return [
          'Access and manage your data',
          'Create and organize content',
          'Sync information automatically',
          'Enable AI-powered workflows'
        ];
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal - Centered like Manus AI */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                       w-full max-w-md mx-auto z-50"
          >
            <div className="bg-[#1f1f1f] rounded-3xl shadow-2xl border border-gray-800/50 
                          overflow-hidden mx-4">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white 
                         hover:bg-gray-800/50 rounded-full transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content - Centered */}
              <div className="p-8 flex flex-col items-center text-center">
                {/* Large Icon */}
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: `${connector.color}20` }}
                >
                  <img
                    src={connector.icon}
                    alt={connector.name}
                    className="w-12 h-12 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/connectors/placeholder.svg';
                    }}
                  />
                </div>

                {/* Connector Name */}
                <h2 className="text-2xl font-semibold text-white mb-3">
                  {connector.name}
                </h2>

                {/* Description */}
                <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-xs">
                  {connector.description}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                  {!isConnected ? (
                    // Not Connected - Show Connect button
                    <button
                      onClick={onConnect}
                      disabled={isConnecting}
                      className="inline-flex items-center justify-center gap-2 
                               bg-white text-black px-6 py-3 rounded-xl 
                               font-medium text-base
                               hover:bg-gray-100 active:bg-gray-200
                               transition-all disabled:opacity-50 
                               disabled:cursor-not-allowed"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          <span>Connect</span>
                        </>
                      )}
                    </button>
                  ) : (
                    // Connected - Show Try it out and Manage buttons
                    <>
                      <button
                        onClick={onTryItOut}
                        className="inline-flex items-center justify-center gap-2 
                                 bg-white text-black px-5 py-2.5 rounded-xl 
                                 font-medium text-sm
                                 hover:bg-gray-100 active:bg-gray-200
                                 transition-all"
                      >
                        <Send className="w-4 h-4" />
                        <span>Try it out</span>
                      </button>
                      <button
                        onClick={onManage}
                        className="inline-flex items-center justify-center gap-2 
                                 bg-gray-800 text-white px-5 py-2.5 rounded-xl 
                                 font-medium text-sm border border-gray-700
                                 hover:bg-gray-700 active:bg-gray-600
                                 transition-all"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Manage</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Connected Status Badge */}
                {isConnected && (
                  <div className="mt-4 flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Connected{connectedAccount?.workspace ? ` to ${connectedAccount.workspace}` : ''}
                    </span>
                  </div>
                )}

                {/* Show Details Dropdown */}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="mt-6 flex items-center gap-1 text-gray-500 
                           hover:text-gray-300 transition-colors text-sm"
                >
                  <span>Show Details</span>
                  {showDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {/* Details Section */}
                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="w-full overflow-hidden"
                    >
                      <div className="pt-6 pb-2 text-left">
                        <p className="text-gray-300 text-sm leading-relaxed mb-4">
                          {connector.longDescription || `${connector.name} lets you connect your workspace to Mailent, enabling AI-powered workflows, automated content creation, and seamless data synchronization.`}
                        </p>

                        <h4 className="text-white font-medium text-sm mb-3">
                          Capabilities:
                        </h4>
                        <ul className="space-y-2">
                          {getFeatures().map((feature, index) => (
                            <li 
                              key={index}
                              className="flex items-start gap-2 text-gray-400 text-sm"
                            >
                              <span className="text-green-500 mt-0.5">✓</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Disconnect button in details */}
                        {isConnected && (
                          <button
                            onClick={onDisconnect}
                            className="mt-6 w-full py-2.5 px-4 bg-transparent 
                                     text-red-400 border border-red-400/30 
                                     rounded-xl text-sm font-medium
                                     hover:bg-red-400/10 transition-all"
                          >
                            Disconnect {connector.name}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
