/**
 * Connector Modal Component
 * 
 * Beautiful modal for managing connections like Manus AI.
 * Shows all available connectors with their status.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Search, 
  CheckCircle2, 
  Plus, 
  Link2,
  ChevronRight
} from 'lucide-react';
import { 
  CONNECTOR_CATEGORIES,
  CONNECTOR_STATUS,
  getAllConnectors,
  getConnectedConnectors
} from '@/lib/arcus-connector-registry';
import { ConnectorDetailModal } from './ConnectorDetailModal';

interface Connector {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  ui: {
    showInBanner: boolean;
    priority: number;
  };
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

interface ConnectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectedAccounts: ConnectedAccount[];
  onConnect: (connectorId: string) => void;
  onDisconnect: (accountId: string) => void;
  isConnecting?: string | null;
}

const categoryLabels: Record<string, string> = {
  [CONNECTOR_CATEGORIES.EMAIL]: 'Email',
  [CONNECTOR_CATEGORIES.CALENDAR]: 'Calendar',
  [CONNECTOR_CATEGORIES.STORAGE]: 'Storage',
  [CONNECTOR_CATEGORIES.DEVELOPMENT]: 'Development',
  [CONNECTOR_CATEGORIES.SOCIAL]: 'Social',
  [CONNECTOR_CATEGORIES.ADVERTISING]: 'Advertising',
  [CONNECTOR_CATEGORIES.COMMUNICATION]: 'Communication',
  [CONNECTOR_CATEGORIES.PRODUCTIVITY]: 'Productivity',
  [CONNECTOR_CATEGORIES.AUTOMATION]: 'Automation'
};

export function ConnectorModal({ 
  isOpen, 
  onClose, 
  connectedAccounts,
  onConnect,
  onDisconnect,
  isConnecting
}: ConnectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'apps' | 'connected'>('apps');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedCategory(null);
      setSelectedConnector(null);
      setIsDetailOpen(false);
    }
  }, [isOpen]);

  // Get all connectors
  const allConnectors = getAllConnectors();

  // Get connected accounts with connector info
  const connectedWithInfo = getConnectedConnectors(connectedAccounts);

  // Filter connectors based on search and category
  const filteredConnectors = allConnectors.filter(connector => {
    const matchesSearch = 
      connector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      connector.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || connector.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Group connectors by category
  const connectorsByCategory = filteredConnectors.reduce((acc, connector) => {
    if (!acc[connector.category]) {
      acc[connector.category] = [];
    }
    acc[connector.category].push(connector);
    return acc;
  }, {} as Record<string, Connector[]>);

  // Check if connector is connected
  const isConnected = (connectorId: string) => {
    return connectedAccounts.some(
      account => account.connectorId === connectorId && 
                 account.status === CONNECTOR_STATUS.CONNECTED
    );
  };

  // Get account for connected connector
  const getAccount = (connectorId: string) => {
    return connectedAccounts.find(
      a => a.connectorId === connectorId && 
           a.status === CONNECTOR_STATUS.CONNECTED
    );
  };

  // Handle connector click - open detail modal
  const handleConnectorClick = (connector: Connector) => {
    setSelectedConnector(connector);
    setIsDetailOpen(true);
  };

  // Handle connect from detail modal
  const handleConnect = () => {
    if (selectedConnector) {
      onConnect(selectedConnector.id);
    }
  };

  // Handle disconnect from detail modal
  const handleDisconnect = () => {
    const account = selectedConnector ? getAccount(selectedConnector.id) : null;
    if (account) {
      onDisconnect(account.id);
    }
  };

  // Handle try it out
  const handleTryItOut = () => {
    // TODO: Implement try it out functionality
    console.log('Try it out clicked for', selectedConnector?.name);
  };

  // Handle manage
  const handleManage = () => {
    // TODO: Implement manage functionality
    console.log('Manage clicked for', selectedConnector?.name);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            />

            {/* Modal */}
            <motion.div
              className="fixed inset-4 md:inset-y-10 md:inset-x-8 lg:inset-y-16 lg:inset-x-48 bg-white dark:bg-[#0A0A0A] rounded-[2rem] z-50 
                         flex flex-col overflow-hidden shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] border border-neutral-200 dark:border-white/5"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-8 pb-6 border-b border-neutral-200 dark:border-white/5">
                <div>
                  <h2 className="text-2xl font-semibold text-black dark:text-white">Connectors</h2>
                  <p className="text-neutral-600 dark:text-gray-400 text-sm mt-1">
                    Connect your tools to enable AI-powered workflows
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-neutral-100 dark:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 p-2 px-8 border-b border-neutral-200 dark:border-white/5">
                <button
                  onClick={() => setActiveTab('apps')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'apps'
                      ? 'bg-neutral-100 dark:bg-white/10 text-black dark:text-white'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:text-white hover:bg-neutral-100 dark:bg-white/5'
                  }`}
                >
                  Apps
                </button>
                <button
                  onClick={() => setActiveTab('connected')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'connected'
                      ? 'bg-neutral-100 dark:bg-white/10 text-black dark:text-white'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:text-white hover:bg-neutral-100 dark:bg-white/5'
                  }`}
                >
                  Connected
                  {connectedWithInfo.length > 0 && (
                    <span className="bg-green-500 text-black dark:text-white text-xs px-2 py-0.5 rounded-full">
                      {connectedWithInfo.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden flex">
                {activeTab === 'apps' ? (
                  <>
                    {/* Sidebar - Categories */}
                    <div className="w-72 border-r border-neutral-200 dark:border-white/5 p-6 overflow-y-auto hidden md:block bg-neutral-50 dark:bg-[#070707]">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                          !selectedCategory
                            ? 'bg-black dark:bg-white text-white dark:text-black font-bold shadow-lg'
                            : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:bg-white/5'
                        }`}
                      >
                        All Apps
                      </button>
                      
                      {Object.entries(categoryLabels).map(([key, label]) => {
                        const count = allConnectors.filter(c => c.category === key).length;
                        return (
                          <button
                            key={key}
                            onClick={() => setSelectedCategory(key)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1 flex items-center justify-between ${
                              selectedCategory === key
                                ? 'bg-black dark:bg-white text-white dark:text-black font-bold shadow-lg'
                                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:bg-white/5'
                            }`}
                          >
                            <span>{label}</span>
                            <span className="text-xs text-gray-600">{count}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 relative overflow-hidden">
                      {/* Fade Overlays */}
                      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white dark:from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
                      
                      <div className="h-full overflow-y-auto p-10 py-12 custom-scrollbar">
                      {/* Search */}
                      <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 dark:text-gray-500" />
                        <input
                          type="text"
                          placeholder="Search connectors..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-4 
                                     text-black dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5
                                     transition-all"
                        />
                      </div>

                      {/* Connectors Grid - Clickable cards */}
                      {Object.entries(connectorsByCategory).map(([category, connectors]) => (
                        <div key={category} className="mb-8">
                          <h3 className="text-sm font-medium text-neutral-600 dark:text-gray-500 uppercase tracking-wider mb-4">
                            {categoryLabels[category] || category}
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {connectors.map((connector) => {
                              const connected = isConnected(connector.id);

                              return (
                                <motion.button
                                  key={connector.id}
                                  onClick={() => handleConnectorClick(connector)}
                                  whileHover={{ scale: 1.01 }}
                                  className={`bg-neutral-50 dark:bg-white/[0.02] border rounded-[1.5rem] p-6 flex items-center gap-6 
                                             transition-all text-left w-full group ${
                                    connected
                                      ? 'border-emerald-500/30 bg-emerald-500/5'
                                      : 'border-neutral-200 dark:border-white/5 hover:border-neutral-300 dark:hover:border-white/20'
                                  }`}
                                >
                                  {/* Icon */}
                                  <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-110"
                                    style={{ backgroundColor: `${connector.color}15` }}
                                  >
                                    <img
                                      src={connector.icon}
                                      alt={connector.name}
                                      className="w-6 h-6"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/connectors/placeholder.svg';
                                      }}
                                    />
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-lg font-bold text-black dark:text-white truncate">
                                        {connector.name}
                                      </h4>
                                      {connected && (
                                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                      )}
                                    </div>
                                    <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1 line-clamp-2 leading-relaxed">
                                      {connector.description}
                                    </p>
                                  </div>

                                  {/* Arrow */}
                                  <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Empty State */}
                      {filteredConnectors.length === 0 && (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-neutral-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-gray-600" />
                          </div>
                          <h3 className="text-lg font-medium text-black dark:text-white mb-2">
                            No connectors found
                          </h3>
                          <p className="text-neutral-600 dark:text-gray-400">
                            Try adjusting your search or category filter
                          </p>
                        </div>
                      )}
                      </div>
                    </div>
                  </>
                ) : (
                  // Connected Tab
                  <div className="flex-1 relative overflow-hidden">
                    {/* Fade Overlays */}
                    <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white dark:from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
                    
                    <div className="h-full overflow-y-auto p-10 py-12 custom-scrollbar">
                    {connectedWithInfo.length > 0 ? (
                      <div className="space-y-4">
                        {connectedWithInfo.map((connection) => (
                          <motion.button
                            key={connection.accountId}
                            onClick={() => {
                              const connector = allConnectors.find(c => c.id === connection.connectorId);
                              if (connector) handleConnectorClick(connector);
                            }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full bg-neutral-50 dark:bg-gray-900 border border-green-500/30 rounded-xl p-4 
                                       flex items-center gap-4 text-left hover:bg-neutral-100 dark:bg-gray-800/50 transition-all"
                          >
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${connection.color}15` }}
                            >
                              <img
                                src={connection.icon}
                                alt={connection.name}
                                className="w-6 h-6"
                              />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-black dark:text-white">
                                  {connection.name}
                                </h4>
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              </div>
                              {connection.email && (
                                <p className="text-neutral-600 dark:text-gray-400 text-sm">{connection.email}</p>
                              )}
                              <p className="text-green-400 text-xs mt-0.5">
                                Connected {new Date(connection.connectedAt || '').toLocaleDateString()}
                              </p>
                            </div>
                            
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                          </motion.button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-neutral-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Link2 className="w-8 h-8 text-gray-600" />
                        </div>
                        <h3 className="text-lg font-medium text-black dark:text-white mb-2">
                          No connected accounts
                        </h3>
                        <p className="text-neutral-600 dark:text-gray-400 mb-6">
                          Connect your tools to enable AI-powered workflows
                        </p>
                        <button
                          onClick={() => setActiveTab('apps')}
                          className="px-6 py-3 bg-white text-black rounded-xl font-medium
                                     hover:bg-gray-200 transition-colors"
                        >
                          Browse Connectors
                        </button>
                      </div>
                    )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Connector Detail Modal */}
      <ConnectorDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        connector={selectedConnector}
        connectedAccount={selectedConnector ? getAccount(selectedConnector.id) : null}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onTryItOut={handleTryItOut}
        onManage={handleManage}
        isConnecting={isConnecting === selectedConnector?.id}
      />
    </>
  );
}

export default ConnectorModal;
