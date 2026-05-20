'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

export interface ConfirmationData {
  action: string;
  description: string;
  details?: Record<string, string>;
}

interface ConfirmationCardProps {
  data: ConfirmationData;
  status?: 'confirmed' | 'cancelled';
  onAction: (action: 'confirm' | 'cancel') => void;
}

export function ConfirmationCard({ data, status, onAction }: ConfirmationCardProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = !mounted || resolvedTheme === 'dark';

  // Resolved state — show a compact pill
  if (status) {
    return (
      <div className={cn(
        'mt-3 w-full rounded-[14px] border px-4 py-2.5 flex items-center gap-2.5 text-[12px] font-medium',
        status === 'confirmed'
          ? isDark
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : isDark
            ? 'bg-white/[0.04] border-white/[0.08] text-white/35'
            : 'bg-neutral-50 border-neutral-200 text-neutral-400',
      )}>
        {status === 'confirmed'
          ? <Check className="w-3.5 h-3.5 flex-shrink-0" />
          : <X className="w-3.5 h-3.5 flex-shrink-0" />}
        {status === 'confirmed'
          ? `Confirmed — proceeding with ${data.action}`
          : `Cancelled — ${data.action} skipped`}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className={cn(
        'mt-3 w-full rounded-[20px] border overflow-hidden',
        isDark
          ? 'bg-white/[0.04] border-white/[0.09] shadow-[0_4px_24px_rgba(0,0,0,0.3)]'
          : 'bg-white border-black/[0.09] shadow-sm',
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2.5 px-4 py-3 border-b',
        isDark ? 'border-white/[0.07]' : 'border-black/[0.06]',
      )}>
        <AlertCircle className="w-4 h-4 text-amber-400/80 flex-shrink-0" />
        <span className={cn(
          'text-[11px] font-bold uppercase tracking-widest',
          isDark ? 'text-white/50' : 'text-neutral-500',
        )}>
          Confirmation required
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5">
        <div>
          <p className={cn('text-[15px] font-bold mb-0.5 leading-snug', isDark ? 'text-white/90' : 'text-neutral-900')}>
            {data.action}
          </p>
          <p className={cn('text-[13px] leading-relaxed', isDark ? 'text-white/55' : 'text-neutral-600')}>
            {data.description}
          </p>
        </div>

        {data.details && Object.keys(data.details).length > 0 && (
          <div className={cn(
            'rounded-xl border px-3 py-2 space-y-1.5',
            isDark ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-neutral-50 border-neutral-200/70',
          )}>
            {Object.entries(data.details).map(([key, val]) => val ? (
              <div key={key} className="flex items-start gap-2 text-[12px]">
                <span className={cn(
                  'capitalize font-medium flex-shrink-0 w-14',
                  isDark ? 'text-white/35' : 'text-neutral-400',
                )}>
                  {key}
                </span>
                <span className={cn(
                  'font-semibold break-all min-w-0',
                  isDark ? 'text-white/75' : 'text-neutral-700',
                )}>
                  {val}
                </span>
              </div>
            ) : null)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={cn(
        'flex items-center gap-2.5 px-4 py-3 border-t',
        isDark ? 'border-white/[0.06]' : 'border-black/[0.05]',
      )}>
        <button
          onClick={() => { if (!loading) { setLoading(true); onAction('confirm'); } }}
          disabled={loading}
          className={cn(
            'flex-1 py-2 rounded-xl text-[13px] font-bold transition-all',
            'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_12px_rgba(52,211,153,0.2)] disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {loading ? 'Confirming…' : 'Confirm'}
        </button>
        <button
          onClick={() => { if (!loading) onAction('cancel'); }}
          disabled={loading}
          className={cn(
            'px-4 py-2 rounded-xl text-[13px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed',
            isDark
              ? 'text-white/45 hover:text-white/70 hover:bg-white/[0.05]'
              : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100',
          )}
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}
