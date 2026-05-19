'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TaskList {
  tasks: string[];
  completedCount: number;
}

interface TaskProgressCardProps {
  taskList: TaskList;
  isActive: boolean;
}

export function TaskProgressCard({ taskList, isActive }: TaskProgressCardProps) {
  // Collapsed by default — user expands upward
  const [collapsed, setCollapsed] = useState(true);
  const { tasks, completedCount } = taskList;
  const total = tasks.length;
  const done = Math.min(completedCount, total);

  if (!tasks || tasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="w-full rounded-2xl border border-arcus-border bg-arcus-surface overflow-hidden mb-2"
    >
      {/* Task rows — rendered ABOVE the header so expansion goes upward */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pt-3 pb-2 flex flex-col gap-0.5 border-b border-arcus-border/40">
              {tasks.map((task, idx) => {
                const isCompleted = idx < done;
                const isRunning = !isCompleted && isActive && idx === done;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18, delay: idx * 0.03 }}
                    className="flex items-start gap-2.5 py-1.5"
                  >
                    <div className="flex-shrink-0 mt-[1px]">
                      {isCompleted ? (
                        <motion.div
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', damping: 20, stiffness: 350 }}
                        >
                          <Check className="w-3.5 h-3.5 text-arcus-fg-secondary" />
                        </motion.div>
                      ) : isRunning ? (
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                        >
                          <Clock className="w-3.5 h-3.5 text-arcus-fg-secondary/80" />
                        </motion.div>
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-arcus-fg-muted/40" />
                      )}
                    </div>

                    <span
                      className={cn(
                        'text-[13px] leading-snug tracking-tight transition-colors duration-500',
                        isCompleted
                          ? 'text-arcus-fg-secondary/80 line-through'
                          : isRunning
                          ? 'text-arcus-fg font-medium'
                          : 'text-arcus-fg-muted/50',
                      )}
                    >
                      {task}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header — always visible at bottom, acts as the toggle handle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-arcus-surface-hover/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {/* Pulse dot while running */}
          {isActive && done < total && (
            <motion.span
              className="inline-block w-1.5 h-1.5 rounded-full bg-arcus-fg-secondary/50"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            />
          )}
          <span className="text-[12px] font-semibold text-arcus-fg-secondary tracking-tight">
            Task progress
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[12px] font-mono text-arcus-fg-muted tabular-nums">
            {done}/{total}
          </span>
          {/* Chevron flips: points down when collapsed (click to expand up), up when open */}
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-arcus-fg-muted/60 transition-transform duration-200',
              collapsed ? 'rotate-0' : 'rotate-180',
            )}
          />
        </div>
      </button>
    </motion.div>
  );
}
