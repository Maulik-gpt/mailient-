'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Play, Loader2, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface PlanCardData {
  title: string;
  markdown: string;
  status: 'proposed' | 'executing' | 'completed' | 'cancelled';
  createdAt?: string;
}

interface ChatPlanCardProps {
  plan: PlanCardData;
  onExecute: (plan: PlanCardData) => void;
  onCancel: (plan: PlanCardData) => void;
}

// Strip emojis from text
function stripEmojis(str: string): string {
  return str.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}]/gu, '').replace(/\s{2,}/g, ' ').trim();
}

export function ChatPlanCard({ plan, onExecute, onCancel }: ChatPlanCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExecuting, setIsExecuting] = useState(plan.status === 'executing');

  const isDone = plan.status === 'completed';
  const isCancelled = plan.status === 'cancelled';

  function handleExecute() {
    setIsExecuting(true);
    onExecute(plan);
  }

  function handleCancel() {
    onCancel(plan);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
      className="mt-4 w-full max-w-2xl"
    >
      <div className={cn(
        'rounded-2xl border overflow-hidden transition-all',
        isDone ? 'border-white/[0.06] bg-white/[0.02]' :
        isCancelled ? 'border-white/[0.04] bg-white/[0.01] opacity-50' :
        'border-white/10 bg-[#141414]'
      )}>
        {/* Top accent line */}
        <div className={cn(
          'h-px w-full',
          isDone ? 'bg-green-500/30' : isCancelled ? 'bg-white/5' : 'bg-white/15'
        )} />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border',
              isDone ? 'bg-green-500/10 border-green-500/20 text-green-400' :
              isCancelled ? 'bg-white/5 border-white/10 text-white/20' :
              'bg-white/[0.06] border-white/10 text-white/60'
            )}>
              {isDone ? <Check className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-[10px] font-bold tracking-[0.08em] uppercase',
                  isDone ? 'text-green-400/60' : isCancelled ? 'text-white/20' : 'text-white/40'
                )}>
                  {isDone ? 'Executed' : isCancelled ? 'Cancelled' : 'Plan'}
                </span>
              </div>
              <h3 className={cn(
                'text-[15px] font-semibold tracking-tight leading-tight mt-0.5 truncate',
                isDone ? 'text-white/50' : isCancelled ? 'text-white/20' : 'text-white/90'
              )}>
                {stripEmojis(plan.title)}
              </h3>
            </div>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Plan content */}
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-3 border-t border-white/[0.05] pt-4">
                <PlanMarkdown markdown={plan.markdown} />
              </div>

              {/* Action buttons */}
              {!isDone && !isCancelled && (
                <div className="flex items-center justify-end gap-2 px-5 pb-4 pt-2 border-t border-white/[0.05]">
                  <button
                    onClick={handleCancel}
                    disabled={isExecuting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium text-white/40 hover:text-white/70 hover:bg-white/5 border border-white/[0.07] hover:border-white/15 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={handleExecute}
                    disabled={isExecuting}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[13px] font-semibold text-black bg-white hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/10"
                  >
                    {isExecuting ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" />Executing...</>
                    ) : (
                      <><Play className="w-3.5 h-3.5" />Execute</>
                    )}
                  </button>
                </div>
              )}

              {isDone && (
                <div className="flex items-center gap-2 px-5 pb-4 pt-2 border-t border-white/[0.05]">
                  <Check className="w-3.5 h-3.5 text-green-400/60" />
                  <span className="text-[12px] text-white/30">Plan executed successfully</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Markdown renderer — H1-H6, bullets, separators, no emojis ───────────────

function PlanMarkdown({ markdown }: { markdown: string }) {
  const clean = stripEmojis(markdown);

  return (
    <div className="plan-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-[18px] font-bold text-white/90 tracking-tight mb-3 mt-1 leading-snug">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[15px] font-semibold text-white/80 tracking-tight mb-2 mt-4 leading-snug">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[13px] font-semibold text-white/70 tracking-tight mb-1.5 mt-3 uppercase">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[13px] font-medium text-white/65 tracking-tight mb-1.5 mt-3">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-[12px] font-medium text-white/55 tracking-tight mb-1 mt-2">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-[11px] font-medium text-white/45 tracking-wide uppercase mb-1 mt-2">
              {children}
            </h6>
          ),
          p: ({ children }) => (
            <p className="text-[13px] text-white/60 leading-[1.7] mb-2">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 space-y-1 pl-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 space-y-1 pl-0 list-none counter-reset-item">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="flex items-start gap-2 text-[13px] text-white/60 leading-[1.6]">
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-white/25 mt-[7px]" />
              <span>{children}</span>
            </li>
          ),
          hr: () => (
            <div className="my-4 border-t border-white/[0.08]" />
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white/85">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-white/55">{children}</em>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <pre className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 overflow-x-auto my-3">
                  <code className="text-[12px] text-white/60 font-mono">{children}</code>
                </pre>
              );
            }
            return (
              <code className="bg-white/[0.06] border border-white/[0.08] rounded px-1.5 py-0.5 text-[12px] text-white/70 font-mono">
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-white/15 pl-3 my-2 text-white/45 italic text-[13px]">
              {children}
            </blockquote>
          ),
        }}
      >
        {clean}
      </ReactMarkdown>
    </div>
  );
}
