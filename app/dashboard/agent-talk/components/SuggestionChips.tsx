'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SuggestionChip {
  label: string;
  prompt: string;
}

interface SuggestionChipsProps {
  chips: SuggestionChip[];
  disabled?: boolean;
  onPick: (prompt: string) => void;
}

export function SuggestionChips({ chips, disabled, onPick }: SuggestionChipsProps) {
  if (!chips || chips.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <AnimatePresence>
        {chips.map((chip, i) => (
          <motion.button
            key={`${i}-${chip.label}`}
            type="button"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15, delay: i * 0.04 }}
            onClick={() => !disabled && onPick(chip.prompt)}
            disabled={disabled}
            className={cn(
              'group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-all border',
              'bg-black/[0.04] dark:bg-white/[0.05] text-black/75 dark:text-white/75',
              'border-black/[0.06] dark:border-white/[0.08]',
              'hover:bg-black/[0.08] dark:hover:bg-white/[0.09] hover:text-black dark:hover:text-white hover:border-black/[0.12] dark:hover:border-white/[0.14]',
              'disabled:opacity-40 disabled:pointer-events-none',
              'active:scale-[0.98]',
            )}
            title={chip.prompt}
          >
            <span className="truncate max-w-[280px]">{chip.label}</span>
            <ArrowUpRight className="w-3 h-3 opacity-40 group-hover:opacity-70 transition-opacity" strokeWidth={2} />
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
