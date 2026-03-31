'use client';

/**
 * ConnectorsModal Component - Phase 4
 * 
 * Main modal for connector selection
 * Shows 5 connectors in a grid with status and capability indicators
 * Matches Manus AI style with black/white premium aesthetic
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Video, 
  FileText, 
  CheckSquare, 
  Mail,
  X,
  Check,
  ExternalLink,
  Search,
  Shield,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Connector {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  description: string;
  capabilities: {
    read: boolean;
    write: boolean;
    create: boolean;
  };
  reauthRequired?: boolean;
}

interface ConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectors: Connector[];
  onConnect: (connectorId: string) => void;
  onDisconnect: (connectorId: string) => void;
  className?: string;
}

const iconMap: Record<string, React.ElementType> = {
  calendar: Calendar,
  video: Video,
  notion: FileText,
  'check-square': CheckSquare,
  mail: Mail
};

const providerColors: Record<string, string> = {
  google_calendar: 'from-blue-500/20 to-blue-600/10',
  cal_com: 'from-white/20 to-white/10',
  notion: 'from-white/20 to-white/10',
  google_tasks: 'from-white/20 to-white/10',
  gmail: 'from-red-500/20 to-red-600/10'
};

export function ConnectorsModal({ 
  isOpen, 
  onClose, 
  connectors, 
  onConnect, 
  onDisconnect,
  className 
}: ConnectorsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'apps' | 'api' | 'mcp'>('apps');

  // Filter connectors based on search
  const filteredConnectors = connectors.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const connectedCount = connectors.filter(c => c.connected).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center p-4",
          "bg-black/60 backdrop-blur-sm",
          className
        )}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={cn(
            "w-full max-w-2xl max-h-[85vh] overflow-hidden",
            "bg-[#1a1a1a] rounded-2xl border border-white/[0.08]",
            "shadow-2xl shadow-black/50"
          )}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-semibold text-white/90">
                  Connectors
                </h2>
                <p className="text-[13px] text-white/40 mt-0.5">
                  {connectedCount} of {connectors.length} connected
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 mt-5">
              <button
                onClick={() => setActiveTab('apps')}
                className={cn(
                  "text-[14px] font-medium pb-2 border-b-2 transition-colors",
                  activeTab === 'apps'
                    ? "text-white border-white"
                    : "text-white/40 border-transparent hover:text-white/60"
                )}
              >
                Apps
              </button>
              <button
                onClick={() => setActiveTab('api')}
                className={cn(
                  "text-[14px] font-medium pb-2 border-b-2 transition-colors",
                  activeTab === 'api'
                    ? "text-white border-white"
                    : "text-white/40 border-transparent hover:text-white/60"
                )}
              >
                Custom API
              </button>
              <button
                onClick={() => setActiveTab('mcp')}
                className={cn(
                  "text-[14px] font-medium pb-2 border-b-2 transition-colors",
                  activeTab === 'mcp'
                    ? "text-white border-white"
                    : "text-white/40 border-transparent hover:text-white/60"
                )}
              >
                Custom MCP
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-white/[0.06]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search connectors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-2 rounded-lg",
                  "bg-white/[0.03] border border-white/[0.08]",
                  "text-[14px] text-white/80 placeholder:text-white/30",
                  "focus:outline-none focus:border-white/20",
                  "transition-colors"
                )}
              />
            </div>
          </div>

          {/* Connector Grid */}
          <div className="p-6 overflow-y-auto max-h-[50vh]">
            <div className="grid grid-cols-2 gap-3">
              {filteredConnectors.map((connector) => {
                const Icon = iconMap[connector.icon] || Zap;
                const isConnected = connector.connected;
                const needsReauth = connector.reauthRequired;

                return (
                  <motion.div
                    key={connector.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    className={cn(
                      "group relative p-4 rounded-xl border cursor-pointer",
                      "transition-all duration-200",
                      isConnected
                        ? "bg-white/[0.05] border-white/[0.12] hover:border-white/20"
                        : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
                    )}
                    onClick={() => isConnected ? onDisconnect(connector.id) : onConnect(connector.id)}
                  >
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      {isConnected ? (
                        needsReauth ? (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                            <Shield className="w-3 h-3 text-orange-400" />
                            <span className="text-[10px] text-orange-400">Reauth</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-[10px] text-emerald-400">Connected</span>
                          </div>
                        )
                      ) : null}
                    </div>

                    {/* Icon */}
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
                      "bg-gradient-to-br",
                      providerColors[connector.id] || "from-white/10 to-white/5"
                    )}>
                      <Icon className="w-6 h-6 text-white/80" />
                    </div>

                    {/* Info */}
                    <h3 className="text-[15px] font-medium text-white/90">
                      {connector.name}
                    </h3>
                    <p className="text-[12px] text-white/40 mt-1 line-clamp-2">
                      {connector.description}
                    </p>

                    {/* Capabilities */}
                    <div className="flex items-center gap-3 mt-3">
                      {connector.capabilities.read && (
                        <span className="text-[11px] text-white/30">Read</span>
                      )}
                      {connector.capabilities.write && (
                        <span className="text-[11px] text-white/30">Write</span>
                      )}
                      {connector.capabilities.create && (
                        <span className="text-[11px] text-white/30">Create</span>
                      )}
                    </div>

                    {/* Action Hint */}
                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                      <span className={cn(
                        "text-[12px] font-medium",
                        isConnected ? "text-red-400" : "text-white/60"
                      )}>
                        {isConnected ? 'Click to disconnect' : 'Click to connect'}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ConnectorsModal;
