'use client';

/**
 * ConnectorBar Component - Phase 4
 * 
 * Displays connector icons in the prompt box with "Connect your tools to Arcus" CTA
 * Matches Manus AI style with black/white premium aesthetic
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Video, 
  FileText, 
  CheckSquare, 
  Mail,
  ChevronRight,
  Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Connector {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  description: string;
}

interface ConnectorBarProps {
  connectors: Connector[];
  onOpenConnectors: () => void;
  className?: string;
}

const iconMap: Record<string, React.ElementType> = {
  calendar: Calendar,
  video: Video,
  notion: FileText,
  'check-square': CheckSquare,
  mail: Mail
};

export function ConnectorBar({ connectors, onOpenConnectors, className }: ConnectorBarProps) {
  // Show only first 4 connectors in the bar
  const visibleConnectors = connectors.slice(0, 4);
  const connectedCount = connectors.filter(c => c.connected).length;
  const totalCount = connectors.length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        "bg-white/[0.03] rounded-xl border border-white/[0.06]",
        "backdrop-blur-sm",
        className
      )}
    >
      {/* Connector Icons */}
      <div className="flex items-center gap-1">
        {visibleConnectors.map((connector, index) => {
          const Icon = iconMap[connector.icon] || Link2;
          const isConnected = connector.connected;
          
          return (
            <motion.div
              key={connector.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                "bg-white/[0.06] border border-white/[0.1]",
                isConnected && "bg-white/15 border-white/20"
              )}
            >
              <Icon className={cn(
                "w-3.5 h-3.5",
                isConnected ? "text-white" : "text-white/50"
              )} />
              
              {/* Connected indicator dot */}
              {isConnected && (
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-white border border-[#1a1a1a]" />
              )}
            </motion.div>
          );
        })}
        
        {/* More indicator */}
        {connectors.length > 4 && (
          <div className="w-7 h-7 rounded-md bg-white/[0.03] border border-white/[0.1] flex items-center justify-center shrink-0">
            <span className="text-[10px] text-white/40 font-medium">
              +{connectors.length - 4}
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-white/[0.08]" />

      {/* CTA Text */}
      <button
        onClick={onOpenConnectors}
        className="flex items-center gap-2 group/link"
      >
        <Link2 className="w-3.5 h-3.5 text-white/40" />
        <span className="text-[13px] text-white/50 group-hover/link:text-white/70 transition-colors">
          {connectedCount === 0 
            ? "Connect your tools to Arcus" 
            : `${connectedCount}/${totalCount} connected`
          }
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover/link:text-white/50 transition-colors" />
      </button>
    </motion.div>
  );
}

export default ConnectorBar;
