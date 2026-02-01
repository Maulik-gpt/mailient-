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
          accentColor: 'text-neutral-400',
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
          accentColor: 'text-neutral-400',
          borderColor: 'border-l-neutral-500/40'
        };
    }
  };

  const { icon, accentColor, borderColor } = getCardConfig();

  return (
    <div
      className={`group bg-[var(--accent)]/40 hover:bg-[var(--accent)]/60 border border-[var(--border)] ${borderColor} border-l-2 rounded-lg transition-all duration-200 cursor-pointer`}
      style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif" }}
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className={`flex-shrink-0 ${accentColor}`}>
              {icon}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <h3 className={`text-sm font-medium ${accentColor}`}>
                {title}
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed font-light">
                {content}
              </p>
            </div>
          </div>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (onClick) onClick();
            }}
            variant="ghost"
            size="sm"
            className="flex-shrink-0 h-8 px-3 bg-transparent hover:bg-[var(--accent)] border border-[var(--border)] hover:border-[var(--muted-foreground)]/40 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-md transition-colors text-xs font-light"
          >
            Details
            <ArrowRight className="w-3 h-3 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
