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
  const [collapsed, setCollapsed] = useState(false);
  const { tasks, completedCount } = taskList;
  const total = tasks.length;
  const done = Math.min(completedCount, total);

  if (!tasks || tasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="mb-4 w-full rounded-2xl border border-white/[0.08] bg-[#161616] overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-semibold text-white/80 tracking-tight">
            Task progress
          </span>
          {isActive && done < total && (
            <motion.span
              className="inline-block w-1.5 h-1.5 rounded-full bg-white/30"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            />
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[12px] font-mono text-white/30 tabular-nums">
            {done} / {total}
          </span>
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-white/25 transition-transform duration-200',
              collapsed ? '-rotate-90' : 'rotate-0',
            )}
          />
        </div>
      </button>

      {/* Task rows */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 flex flex-col gap-0.5 border-t border-white/[0.05] pt-2">
              {tasks.map((task, idx) => {
                const isCompleted = idx < done;
                const isRunning = !isCompleted && isActive && idx === done;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                    className="flex items-start gap-2.5 py-1.5"
                  >
                    {/* Status icon */}
                    <div className="flex-shrink-0 mt-[1px]">
                      {isCompleted ? (
                        <motion.div
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', damping: 20, stiffness: 350 }}
                        >
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        </motion.div>
                      ) : isRunning ? (
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                        >
                          <Clock className="w-3.5 h-3.5 text-white/40" />
                        </motion.div>
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-white/20" />
                      )}
                    </div>

                    {/* Task text */}
                    <span
                      className={cn(
                        'text-[13px] leading-snug tracking-tight transition-colors duration-500',
                        isCompleted
                          ? 'text-white/70'
                          : isRunning
                          ? 'text-white/55'
                          : 'text-white/25',
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
    </motion.div>
  );
}
