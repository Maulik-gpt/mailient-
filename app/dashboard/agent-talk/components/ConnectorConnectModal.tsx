'use client';

/**
 * ConnectorConnectModal Component - Phase 4
 * 
 * Individual connector connection modal (like the Notion modal shown)
 * Shows provider icon, description, and connect button
 * Matches Manus AI style with black/white premium aesthetic
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Shield,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectorConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: {
    id: string;
    name: string;
    icon: React.ElementType;
    description: string;
    connected: boolean;
    scopes: string[];
    reauthRequired?: boolean;
    error?: string;
  } | null;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting?: boolean;
  className?: string;
}

export function ConnectorConnectModal({
  isOpen,
  onClose,
  provider,
  onConnect,
  onDisconnect,
  isConnecting = false,
  className
}: ConnectorConnectModalProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen || !provider) return null;

  const Icon = provider.icon;
  const isConnected = provider.connected;
  const needsReauth = provider.reauthRequired;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "fixed inset-0 z-[60] flex items-center justify-center p-4",
          "bg-black/70 backdrop-blur-sm",
          className
        )}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            "w-full max-w-md overflow-hidden",
            "bg-[#1a1a1a] rounded-2xl border border-white/[0.08]",
            "shadow-2xl shadow-black/50"
          )}
          onClick={e => e.stopPropagation()}
        >
          {/* Close Button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-5 h-5 text-black/40 dark:text-white/40" />
            </button>
          </div>

          {/* Content */}
          <div className="px-8 pt-12 pb-8 text-center">
            {/* Provider Icon */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={cn(
                "w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6",
                "bg-white/[0.08] border border-white/[0.12]",
                "shadow-lg shadow-black/20"
              )}
            >
              <Icon className="w-10 h-10 text-black dark:text-white" />
            </motion.div>

            {/* Provider Name */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-[24px] font-semibold text-black/95 dark:text-white/95 mb-3"
            >
              {provider.name}
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-[15px] text-black/5 dark:text-black/50 dark:text-white/50 leading-relaxed mb-8 max-w-sm mx-auto"
            >
              {provider.description}
            </motion.p>

            {/* Error Message */}
            {provider.error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-[13px] text-red-400 text-left">{provider.error}</p>
                </div>
              </motion.div>
            )}

            {/* Reauth Warning */}
            {needsReauth && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20"
              >
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <p className="text-[13px] text-orange-400 text-left">
                    Additional permissions required. Please reconnect.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Connect/Disconnect Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              onClick={isConnected ? onDisconnect : onConnect}
              disabled={isConnecting}
              className={cn(
                "w-full py-3 px-6 rounded-xl font-medium text-[15px]",
                "transition-all duration-200",
                "flex items-center justify-center gap-2",
                isConnected
                  ? "bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400"
                  : "bg-white hover:bg-black/[0.045] dark:bg-white/90 text-black"
              )}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : isConnected ? (
                <>
                  <X className="w-4 h-4" />
                  <span>Disconnect</span>
                </>
              ) : (
                <>
                  <span className="text-lg">+</span>
                  <span>Connect</span>
                </>
              )}
            </motion.button>

            {/* Show Details Toggle */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => setShowDetails(!showDetails)}
              className="mt-6 flex items-center justify-center gap-1 text-[14px] text-black/40 dark:text-white/40 hover:text-black/60 dark:text-white/60 transition-colors mx-auto"
            >
              <span>Show Details</span>
              {showDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </motion.button>

            {/* Details Panel */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-white/[0.06] text-left">
                    <h4 className="text-[13px] font-medium text-black/70 dark:text-white/70 mb-3">
                      Required Permissions
                    </h4>
                    <ul className="space-y-2">
                      {provider.scopes.map((scope, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-black/40 dark:text-white/40 mt-0.5 shrink-0" />
                          <span className="text-[13px] text-black/5 dark:text-black/50 dark:text-white/50">{scope}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 p-3 rounded-lg bg-white/[0.03]">
                      <p className="text-[12px] text-black/40 dark:text-white/40 leading-relaxed">
                        Your data is secure. We only access the permissions you grant 
                        and never store your passwords. You can revoke access at any time 
                        from your Google Account settings.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ConnectorConnectModal;
