'use client';

import React from 'react';
import { Mail, TrendingUp, Lightbulb, User, DollarSign, ArrowRight, Zap, AlertTriangle, Clock } from 'lucide-react';
import { Button } from './button';

type CardType = 'inbox-intelligence' | 'opportunity' | 'founder-progress' | 'weekly-intelligence' | 'arcus-suggestion' | 'urgent-action' | 'hot-leads' | 'at-risk' | 'missed-followups' | 'unread-important';

interface SiftCardProps {
  type: CardType;
  title: string;
  subtitle?: string;
  content: string;
  actions?: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
  }[];
  metadata?: {
    [key: string]: string | number;
  };
  timestamp?: string;
  user?: {
    name: string;
    username: string;
    avatar: string;
    title?: string;
  };
  isSelected?: boolean;
  onClick?: () => void;
  onMore?: () => void;
}

export const SiftCard: React.FC<SiftCardProps> = ({
  type,
  title,
  content,
  onClick,
}) => {
  const getCardConfig = () => {
    switch (type) {
      case 'urgent-action':
        return {
          icon: <Zap className="w-4 h-4" strokeWidth={1.5} />,
          accentColor: 'text-red-400',
          borderColor: 'border-l-red-500/40'
        };
      case 'hot-leads':
        return {
          icon: <TrendingUp className="w-4 h-4" strokeWidth={1.5} />,
          accentColor: 'text-orange-400',
          borderColor: 'border-l-orange-500/40'
        };
      case 'at-risk':
        return {
          icon: <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />,
          accentColor: 'text-yellow-400',
          borderColor: 'border-l-yellow-500/40'
        };
      case 'missed-followups':
        return {
          icon: <Clock className="w-4 h-4" strokeWidth={1.5} />,
          accentColor: 'text-purple-400',
          borderColor: 'border-l-purple-500/40'
        };
      case 'unread-important':
        return {
          icon: <Mail className="w-4 h-4" strokeWidth={1.5} />,
          accentColor: 'text-blue-400',
          borderColor: 'border-l-blue-500/40'
        };
      case 'weekly-intelligence':
        return {
          icon: <Lightbulb className="w-4 h-4" strokeWidth={1.5} />,
          accentColor: 'text-neutral-500 dark:text-neutral-600 dark:text-neutral-400',
          borderColor: 'border-l-neutral-500/40'
        };
      case 'opportunity':
        return {
          icon: <TrendingUp className="w-4 h-4" strokeWidth={1.5} />,
          accentColor: 'text-green-400',
          borderColor: 'border-l-green-500/40'
        };
      case 'inbox-intelligence':
        return {
          icon: <Mail className="w-4 h-4" strokeWidth={1.5} />,
          accentColor: 'text-blue-400',
          borderColor: 'border-l-blue-500/40'
        };
      case 'founder-progress':
        return {
          icon: <User className="w-4 h-4" strokeWidth={1.5} />,
          accentColor: 'text-purple-400',
          borderColor: 'border-l-purple-500/40'
        };
      case 'arcus-suggestion':
        return {
          icon: <DollarSign className="w-4 h-4" strokeWidth={1.5} />,
          accentColor: 'text-cyan-400',
          borderColor: 'border-l-cyan-500/40'
        };
      default:
        return {
          icon: <Mail className="w-4 h-4" strokeWidth={1.5} />,
          accentColor: 'text-neutral-500 dark:text-neutral-400',
          borderColor: 'border-l-neutral-500/40'
        };
    }
  };

  const { icon, accentColor, borderColor } = getCardConfig();

  return (
    <div
      onClick={onClick}
      className={`group bg-white/5 dark:bg-neutral-900/40 border border-neutral-200 dark:border-white/5 ${borderColor} border-l-2 rounded-xl transition-colors cursor-pointer overflow-hidden relative`}
      style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="flex-shrink-0 text-neutral-500">
              {icon}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-200">
                {title}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-500 leading-relaxed font-light">
                {content}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
