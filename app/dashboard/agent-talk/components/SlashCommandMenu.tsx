'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SLASH_COMMANDS, filterSlashCommands, type SlashCommand } from '@/lib/arcus/skills';

interface SlashCommandMenuProps {
  isOpen: boolean;
  filter: string;
  focusedIndex: number;
  onFocusIndex: (i: number) => void;
  onSelect: (command: SlashCommand) => void;
}

export function SlashCommandMenu({
  isOpen,
  filter,
  focusedIndex,
  onFocusIndex,
  onSelect,
}: SlashCommandMenuProps) {
  const filtered = useMemo(
    () => [...filterSlashCommands(filter)].sort((a, b) => a.name.localeCompare(b.name)),
    [filter],
  );
  const focusedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    focusedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex, isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.1, ease: 'easeOut' }}
        className={cn(
          'absolute bottom-full left-0 right-0 mb-2 z-30',
          'max-h-[360px] overflow-y-auto',
          'bg-white dark:bg-[#1a1a1a]',
          'border border-black/[0.08] dark:border-white/[0.08]',
          'rounded-2xl shadow-2xl',
          'py-2',
        )}
        role="listbox"
        aria-label="Slash commands"
      >
        {filtered.length === 0 ? (
          <div className="px-4 py-3 text-[13px] text-black/40 dark:text-white/40">
            No commands match /<span className="text-black/60 dark:text-white/60">{filter}</span>
          </div>
        ) : (
          filtered.map((cmd, i) => {
            const isFocused = i === focusedIndex;
            return (
              <button
                key={cmd.name}
                ref={isFocused ? focusedRef : null}
                type="button"
                role="option"
                aria-selected={isFocused}
                onMouseEnter={() => onFocusIndex(i)}
                onClick={() => onSelect(cmd)}
                className={cn(
                  'w-full text-left px-5 py-2 text-[15px] transition-colors',
                  isFocused
                    ? 'bg-black/[0.05] dark:bg-white/[0.06] text-black dark:text-white'
                    : 'text-black/80 dark:text-white/85 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
                )}
              >
                /{cmd.name}
              </button>
            );
          })
        )}
      </motion.div>
    </AnimatePresence>
  );
}
