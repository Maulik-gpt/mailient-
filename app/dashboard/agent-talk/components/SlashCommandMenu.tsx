'use client';

/**
 * SlashCommandMenu — PART 46.
 *
 * Pure-UI autocomplete dropdown that ChatInput mounts above the prompt
 * textarea when the user types "/" at the start of their input. Reads
 * commands from lib/arcus/skills.ts (single source of truth) and renders
 * them grouped by category, with keyboard-first navigation matching
 * Claude Code's pattern:
 *
 *   ↑ / ↓   navigate
 *   Tab/Enter  select the focused command
 *   Esc     dismiss
 *
 * No business logic lives here. The parent owns:
 *   - what the current filter text is (driven by the input value)
 *   - what to do when a command is selected (set input value, focus, etc.)
 *   - when to mount/unmount this menu (typically: isOpen=true when the
 *     input starts with "/")
 *
 * Visual notes:
 *   - Floats ABOVE the input (positioned: absolute, bottom-full).
 *   - Category headers ("WORKFLOWS", "PROFILE", "NAVIGATION") group entries
 *     so users scan by intent, not alphabetically.
 *   - Selected item is highlighted with the same solid black/white treatment
 *     as the settings modal so the design language stays consistent.
 *   - Max-height + scroll on overflow keeps it from eating the chat area.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  SLASH_COMMANDS,
  filterSlashCommands,
  type SlashCommand,
  type SlashCategory,
} from '@/lib/arcus/skills';

const CATEGORY_LABELS: Record<SlashCategory, string> = {
  workflows: 'Workflows',
  profile: 'Profile',
  navigation: 'Navigation',
};

const CATEGORY_ORDER: SlashCategory[] = ['workflows', 'profile', 'navigation'];

interface SlashCommandMenuProps {
  /** Truthy means the menu renders. Parent controls based on input value. */
  isOpen: boolean;
  /** The prefix the user has typed after the "/", e.g. "br" → matches "brief". */
  filter: string;
  /** Index of the currently focused command in the flat (filtered) list. */
  focusedIndex: number;
  /** Called when the parent wants to override focusedIndex (mouse hover). */
  onFocusIndex: (i: number) => void;
  /** Called when a command is picked (click, Tab, Enter). */
  onSelect: (command: SlashCommand) => void;
}

export function SlashCommandMenu({
  isOpen,
  filter,
  focusedIndex,
  onFocusIndex,
  onSelect,
}: SlashCommandMenuProps) {
  // Filter once per render — registry is small (11 items) so this is cheap.
  const filtered = useMemo(() => filterSlashCommands(filter), [filter]);
  const focusedRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll the focused item into view when ↑/↓ moves out of the
  // visible window. Cheap because the list is at most 11 entries tall.
  useEffect(() => {
    if (!isOpen) return;
    focusedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex, isOpen]);

  // Group filtered commands by category, preserving registry order within
  // each group. We build a flat index → command map alongside so keyboard
  // focus can address items by a single number regardless of grouping.
  const grouped = useMemo(() => {
    const map = new Map<SlashCategory, SlashCommand[]>();
    for (const cmd of filtered) {
      if (!map.has(cmd.category)) map.set(cmd.category, []);
      map.get(cmd.category)!.push(cmd);
    }
    return CATEGORY_ORDER.filter(c => map.has(c)).map(c => ({
      category: c,
      commands: map.get(c)!,
    }));
  }, [filtered]);

  // Flat list — must match `filtered` exactly so focusedIndex stays in sync
  // with whatever ChatInput's keydown handler increments.
  const flatList = filtered;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.98 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className={cn(
          'absolute bottom-full left-0 right-0 mb-2 z-30',
          'max-h-[360px] overflow-y-auto',
          'bg-white dark:bg-[#1a1a1a]',
          'border border-neutral-200 dark:border-[#2a2a2a]',
          'rounded-2xl shadow-2xl',
          'py-1.5',
        )}
        role="listbox"
        aria-label="Slash commands"
      >
        {flatList.length === 0 ? (
          <div className="px-4 py-6 text-center text-[13px] text-neutral-500 dark:text-white/40">
            No commands match <span className="font-mono text-neutral-700 dark:text-white/60">/{filter}</span>
          </div>
        ) : (
          grouped.map(({ category, commands }) => (
            <div key={category} className="py-1">
              <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-white/30">
                {CATEGORY_LABELS[category]}
              </div>
              {commands.map((cmd) => {
                const flatIdx = flatList.indexOf(cmd);
                const isFocused = flatIdx === focusedIndex;
                return (
                  <button
                    key={cmd.name}
                    ref={isFocused ? focusedRef : null}
                    type="button"
                    role="option"
                    aria-selected={isFocused}
                    onMouseEnter={() => onFocusIndex(flatIdx)}
                    onClick={() => onSelect(cmd)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      isFocused
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'text-neutral-800 dark:text-white/85 hover:bg-neutral-50 dark:hover:bg-white/[0.04]',
                    )}
                  >
                    <span className="text-[15px] leading-none w-5 flex-shrink-0 text-center" aria-hidden="true">
                      {cmd.icon}
                    </span>
                    <span className="font-mono text-[13px] font-semibold flex-shrink-0">
                      /{cmd.name}
                    </span>
                    <span
                      className={cn(
                        'text-[12px] truncate flex-1',
                        isFocused
                          ? 'text-white/70 dark:text-black/55'
                          : 'text-neutral-500 dark:text-white/45',
                      )}
                    >
                      {cmd.description}
                    </span>
                  </button>
                );
              })}
            </div>
          ))
        )}

        {flatList.length > 0 && (
          <div className="px-4 py-2 mt-1 border-t border-neutral-100 dark:border-white/[0.06] flex items-center gap-3 text-[10px] text-neutral-400 dark:text-white/30">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-white/[0.06] font-mono">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-white/[0.06] font-mono">tab</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-white/[0.06] font-mono">esc</kbd>
              dismiss
            </span>
            <span className="ml-auto text-neutral-400 dark:text-white/25">
              {flatList.length} of {SLASH_COMMANDS.length}
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
