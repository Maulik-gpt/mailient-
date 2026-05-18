'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Play, Loader2, FileText, Download, Maximize2 } from 'lucide-react';
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

function stripEmojis(str: string): string {
  return str
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function handleDownload(plan: PlanCardData) {
  try {
    const blob = new Blob([plan.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.title.replace(/\s+/g, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // silent
  }
}

// ─── Full-screen plan modal ────────────────────────────────────────────────────

function PlanModal({
  plan,
  onClose,
}: {
  plan: PlanCardData;
  onClose: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="plan-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
        style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          key="plan-modal-card"
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-white/[0.10] bg-[#111111] shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Top accent */}
          <div className="h-px w-full bg-white/[0.15] flex-shrink-0" />

          {/* Modal header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.10] flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-white/60" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold tracking-[0.08em] uppercase text-white/30 mb-0.5">
                Plan Document
              </div>
              <h2 className="text-[15px] font-semibold text-white/90 tracking-tight leading-tight truncate">
                {stripEmojis(plan.title)}
              </h2>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => handleDownload(plan)}
                className="p-2 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                title="Download as Markdown"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin scrollbar-thumb-white/10">
            <PlanMarkdown markdown={plan.markdown} />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

// ─── Compact plan card (always shown in chat) ─────────────────────────────────

export function ChatPlanCard({ plan, onExecute, onCancel }: ChatPlanCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    <>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="mt-3 w-full"
      >
        <div
          className={cn(
            'relative flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all overflow-hidden',
            isDone
              ? 'border-white/[0.06] bg-white/[0.02] opacity-70'
              : isCancelled
              ? 'border-white/[0.04] bg-white/[0.01] opacity-40'
              : 'border-white/[0.10] bg-[#141414]',
          )}
        >
          {/* Top accent stripe */}
          <div
            className={cn(
              'absolute top-0 left-0 right-0 h-px',
              isDone ? 'bg-green-500/30' : isCancelled ? 'bg-white/5' : 'bg-white/15',
            )}
          />

          {/* Icon */}
          <div
            className={cn(
              'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border',
              isDone
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : isCancelled
                ? 'bg-white/5 border-white/10 text-white/20'
                : 'bg-white/[0.06] border-white/[0.10] text-white/60',
            )}
          >
            {isDone ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0">
            <div
              className={cn(
                'text-[10px] font-bold tracking-[0.08em] uppercase mb-0.5',
                isDone ? 'text-green-400/50' : isCancelled ? 'text-white/20' : 'text-white/35',
              )}
            >
              {isDone ? 'Executed' : isCancelled ? 'Cancelled' : 'Plan'}
            </div>
            <div
              className={cn(
                'text-[14px] font-semibold tracking-tight truncate leading-tight',
                isDone ? 'text-white/45' : isCancelled ? 'text-white/20' : 'text-white/90',
              )}
            >
              {stripEmojis(plan.title)}
            </div>
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View button — always visible */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.06] border border-white/[0.07] hover:border-white/[0.15] transition-all"
              title="View full plan"
            >
              <Maximize2 className="w-3 h-3" />
              View
            </button>

            {/* Cancel */}
            {!isDone && !isCancelled && (
              <button
                onClick={handleCancel}
                disabled={isExecuting}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-medium text-white/35 hover:text-white/60 hover:bg-white/[0.06] border border-white/[0.07] hover:border-white/[0.15] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            )}

            {/* Execute */}
            {!isDone && !isCancelled && (
              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[12px] font-semibold text-black bg-white hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/10"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Executing…
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    Execute
                  </>
                )}
              </button>
            )}

            {/* Done state label */}
            {isDone && (
              <div className="flex items-center gap-1.5 text-[12px] text-green-400/50">
                <Check className="w-3 h-3" />
                Done
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {isModalOpen && <PlanModal plan={plan} onClose={() => setIsModalOpen(false)} />}
    </>
  );
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function PlanMarkdown({ markdown }: { markdown: string }) {
  const clean = stripEmojis(markdown);

  return (
    <div className="plan-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-[20px] font-bold text-white/90 tracking-tight mb-3 mt-1 leading-snug">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[16px] font-semibold text-white/80 tracking-tight mb-2 mt-5 leading-snug">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[13px] font-semibold text-white/70 tracking-tight mb-1.5 mt-4 uppercase">
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
            <p className="text-[13px] text-white/60 leading-[1.75] mb-3">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 space-y-1.5 pl-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 space-y-1.5 pl-0 list-none">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2.5 text-[13px] text-white/60 leading-[1.65]">
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-white/25 mt-[7px]" />
              <span>{children}</span>
            </li>
          ),
          hr: () => <div className="my-5 border-t border-white/[0.08]" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-white/85">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-white/55">{children}</em>
          ),
          pre: ({ children }) => (
            <pre className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 overflow-x-auto my-3">
              {children}
            </pre>
          ),
          code: ({ children, className }) => (
            <code
              className={
                className
                  ? 'text-[12px] text-white/60 font-mono'
                  : 'bg-white/[0.06] border border-white/[0.08] rounded px-1.5 py-0.5 text-[12px] text-white/70 font-mono'
              }
            >
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-white/15 pl-3 my-3 text-white/45 italic text-[13px]">
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
