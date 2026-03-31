'use client';

/**
 * RecoveryHintPanel - Manus AI Style
 * Displays error recovery hints with actionable guidance
 * Premium dark interface with clear visual hierarchy
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  HelpCircle,
  X,
  Wifi,
  Key,
  FileWarning,
  Server,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface RecoveryHint {
  userMessage: string;
  recoveryAction: string;
  autoRetry?: boolean;
  maxRetries?: number;
  requiresUserAction?: boolean;
  suggestedAction?: string;
  helpUrl?: string;
}

interface ErrorCategory {
  category: string;
  code?: string;
  message: string;
  retryable: boolean;
  recoveryHint?: RecoveryHint;
}

interface RecoveryHintPanelProps {
  error: ErrorCategory;
  onRetry?: () => void;
  onDismiss?: () => void;
  onAction?: (action: string) => void;
  className?: string;
  compact?: boolean;
}

// ============================================================================
// ERROR CATEGORY CONFIGURATION
// ============================================================================

const errorCategoryConfig: Record<string, {
  icon: any;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  network: {
    icon: Wifi,
    title: 'Connection Issue',
    color: 'text-white/70',
    bgColor: 'bg-white/10',
    borderColor: 'border-white/20'
  },
  timeout: {
    icon: RefreshCw,
    title: 'Request Timeout',
    color: 'text-white/70',
    bgColor: 'bg-white/10',
    borderColor: 'border-white/20'
  },
  rate_limit: {
    icon: Server,
    title: 'Rate Limited',
    color: 'text-white/60',
    bgColor: 'bg-white/10',
    borderColor: 'border-white/20'
  },
  auth_failed: {
    icon: Key,
    title: 'Authentication Failed',
    color: 'text-white/50',
    bgColor: 'bg-white/10',
    borderColor: 'border-white/20'
  },
  permission_denied: {
    icon: Lock,
    title: 'Permission Denied',
    color: 'text-white/50',
    bgColor: 'bg-white/10',
    borderColor: 'border-white/20'
  },
  invalid_input: {
    icon: FileWarning,
    title: 'Invalid Input',
    color: 'text-white/60',
    bgColor: 'bg-white/10',
    borderColor: 'border-white/20'
  },
  not_found: {
    icon: HelpCircle,
    title: 'Not Found',
    color: 'text-white/40',
    bgColor: 'bg-white/10',
    borderColor: 'border-white/20'
  },
  already_exists: {
    icon: CheckCircle2,
    title: 'Already Exists',
    color: 'text-white/60',
    bgColor: 'bg-white/10',
    borderColor: 'border-white/20'
  },
  already_completed: {
    icon: CheckCircle2,
    title: 'Already Completed',
    color: 'text-white/80',
    bgColor: 'bg-white/15',
    borderColor: 'border-white/25'
  },
  conflict: {
    icon: AlertTriangle,
    title: 'Conflict Detected',
    color: 'text-white/60',
    bgColor: 'bg-white/10',
    borderColor: 'border-white/20'
  },
  internal_error: {
    icon: Server,
    title: 'Internal Error',
    color: 'text-white/50',
    bgColor: 'bg-white/10',
    borderColor: 'border-white/20'
  },
  default: {
    icon: AlertTriangle,
    title: 'Error',
    color: 'text-white/50',
    bgColor: 'bg-white/10',
    borderColor: 'border-white/20'
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export function RecoveryHintPanel({
  error,
  onRetry,
  onDismiss,
  onAction,
  className,
  compact = false
}: RecoveryHintPanelProps) {
  const config = errorCategoryConfig[error.category] || errorCategoryConfig.default;
  const Icon = config.icon;
  const hint = error.recoveryHint;

  const getActionButton = () => {
    if (!hint?.suggestedAction) return null;

    const actionConfig: Record<string, { label: string; icon: any; variant: string }> = {
      reconnect_integration: {
        label: 'Reconnect Account',
        icon: Key,
        variant: 'primary'
      },
      reauth_required: {
        label: 'Re-authenticate',
        icon: Lock,
        variant: 'primary'
      },
      input_correction: {
        label: 'Fix Input',
        icon: FileWarning,
        variant: 'secondary'
      },
      retry_with_backoff: {
        label: 'Retry Now',
        icon: RefreshCw,
        variant: 'primary'
      },
      skip_or_alternative: {
        label: 'Skip Step',
        icon: ArrowRight,
        variant: 'secondary'
      },
      manual_intervention: {
        label: 'Manual Fix',
        icon: HelpCircle,
        variant: 'secondary'
      },
      escalate: {
        label: 'Get Help',
        icon: HelpCircle,
        variant: 'secondary'
      }
    };

    const action = actionConfig[hint.suggestedAction || ''] || {
      label: 'Take Action',
      icon: ArrowRight,
      variant: 'secondary'
    };
    const ActionIcon = action.icon;

    return (
      <button
        onClick={() => onAction?.(hint.suggestedAction || '')}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all",
          action.variant === 'primary'
            ? "bg-white text-black hover:bg-white/90"
            : "bg-white/[0.06] hover:bg-white/[0.1] text-white/80 border border-white/[0.1]"
        )}
      >
        <ActionIcon className="w-4 h-4" />
        {action.label}
      </button>
    );
  };

  if (compact) {
    return (
      <div className={cn(
        "flex items-start gap-3 p-4 rounded-xl border",
        config.bgColor,
        config.borderColor,
        className
      )}>
        <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", config.color)} />
        <div className="flex-1 min-w-0">
          <p className={cn("text-[13px] font-medium", config.color)}>
            {hint?.userMessage || error.message}
          </p>
          {hint?.autoRetry && (
            <p className="text-[11px] text-white/40 mt-1">
              Retrying automatically...
            </p>
          )}
        </div>
        {error.retryable && onRetry && (
          <button
            onClick={onRetry}
            className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-all shrink-0"
          >
            <RefreshCw className="w-4 h-4 text-white/60" />
          </button>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden",
        "shadow-2xl shadow-black/50",
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        "px-6 py-5 border-b",
        config.bgColor,
        config.borderColor
      )}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center border shrink-0",
              "bg-black/20",
              config.borderColor
            )}>
              <Icon className={cn("w-5 h-5", config.color)} />
            </div>
            <div>
              <h3 className={cn("text-[16px] font-semibold", config.color)}>
                {config.title}
              </h3>
              <p className="text-[13px] text-white/60 mt-1">
                {error.code && (
                  <span className="font-mono text-white/40 mr-2">[{error.code}]</span>
                )}
                {hint?.userMessage || error.message}
              </p>
            </div>
          </div>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-2 rounded-lg bg-black/20 hover:bg-black/30 transition-all shrink-0"
            >
              <X className="w-4 h-4 text-white/40" />
            </button>
          )}
        </div>
      </div>

      {/* Recovery Content */}
      <div className="px-6 py-5">
        {/* Auto-retry indicator */}
        {hint?.autoRetry && (
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 mb-4">
            <RefreshCw className="w-4 h-4 text-white/70 animate-spin" />
            <p className="text-[13px] text-white/70">
              Retrying automatically
              {hint.maxRetries && ` (max ${hint.maxRetries} attempts)`}
            </p>
          </div>
        )}

        {/* User action required */}
        {hint?.requiresUserAction && (
          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10 mb-4">
            <ShieldAlert className="w-4 h-4 text-white/60 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] text-white/60 font-medium">Action Required</p>
              <p className="text-[12px] text-white/50 mt-1">
                This step requires your approval or input to continue.
              </p>
            </div>
          </div>
        )}

        {/* Recovery action */}
        {hint?.recoveryAction && (
          <div className="mb-4">
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Recovery Action</p>
            <p className="text-[13px] text-white/70">{hint.recoveryAction}</p>
          </div>
        )}

        {/* Help URL */}
        {hint?.helpUrl && (
          <a
            href={hint.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[13px] text-blue-400 hover:text-blue-300 transition-colors mb-4"
          >
            <HelpCircle className="w-4 h-4" />
            Learn more about this error
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
          {getActionButton()}

          {error.retryable && onRetry && !hint?.autoRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium text-white/60 hover:text-white/80 hover:bg-white/[0.06] transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="ml-auto text-[13px] text-white/40 hover:text-white/60 transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// COMPACT VERSION
// ============================================================================

export function RecoveryHintBadge({
  error,
  onClick
}: {
  error: ErrorCategory;
  onClick?: () => void;
}) {
  const config = errorCategoryConfig[error.category] || errorCategoryConfig.default;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-all",
        config.bgColor,
        config.borderColor,
        config.color,
        onClick && "hover:opacity-80"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {error.recoveryHint?.userMessage || error.message}
      {error.retryable && <RefreshCw className="w-3 h-3 ml-1" />}
    </button>
  );
}

export default RecoveryHintPanel;
