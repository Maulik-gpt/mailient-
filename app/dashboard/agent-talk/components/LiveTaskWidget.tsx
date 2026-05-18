'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Search, Mail, Calendar, Globe, FileText, Zap, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentStep } from './AgentExecutionTimeline';

interface LiveTaskWidgetProps {
  steps: AgentStep[];
  isActive: boolean;
}

function toolIcon(tool: string) {
  switch (tool) {
    case 'search_gmail':
    case 'read_email':
    case 'get_sent_emails':
    case 'draft_reply':
    case 'send_email':
      return <Mail className="w-3 h-3" />;
    case 'schedule_meeting':
    case 'get_calendar_events':
      return <Calendar className="w-3 h-3" />;
    case 'web_search':
    case 'search_web':
    case 'read_browser_page':
      return <Globe className="w-3 h-3" />;
    case 'search_notion':
      return <FileText className="w-3 h-3" />;
    case 'open_canvas':
      return <Zap className="w-3 h-3" />;
    case 'send_slack_message':
      return <MessageSquare className="w-3 h-3" />;
    default:
      return <Search className="w-3 h-3" />;
  }
}

export function LiveTaskWidget({ steps, isActive }: LiveTaskWidgetProps) {
  const visible = isActive && steps.length > 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="mb-3 w-full"
        >
          <div className="flex flex-wrap gap-2 items-center">
            {steps.map((step, i) => (
              <TaskItem key={step.id} step={step} index={i} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TaskItem({ step, index }: { step: AgentStep; index: number }) {
  const isDone = step.status === 'completed' || step.status === 'error';
  const isActive = step.status === 'active';
  const isError = step.status === 'error';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, x: -6 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', damping: 22, stiffness: 300 }}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium tracking-tight transition-all relative overflow-hidden',
        isActive && 'bg-white/[0.06] border-white/20 text-white',
        isDone && !isError && 'bg-transparent border-white/[0.06] text-white/25',
        isError && 'bg-red-500/5 border-red-500/20 text-red-400/60',
      )}
    >
      {/* Shimmer sweep for active */}
      {isActive && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent w-[200%]"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
        />
      )}

      {/* Icon bubble */}
      <span className={cn(
        'flex items-center justify-center w-4 h-4 rounded-full border transition-all z-10 relative',
        isActive && 'bg-white/20 border-white/30 text-white',
        isDone && !isError && 'bg-white/5 border-white/10 text-white/20',
        isError && 'bg-red-500/10 border-red-500/20 text-red-400/50',
      )}>
        {isActive ? (
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
        ) : isDone && !isError ? (
          <Check className="w-2.5 h-2.5" />
        ) : (
          toolIcon(step.tool || '')
        )}
      </span>

      {/* Label */}
      <span className={cn(
        'z-10 relative',
        isDone && !isError && 'line-through decoration-white/15',
      )}>
        {step.label}
      </span>
    </motion.div>
  );
}
