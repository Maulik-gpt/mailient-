'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Play, Loader2, FileText, Download, Maximize2, MoreHorizontal } from 'lucide-react';
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

/** Extract readable plain text from markdown for the card preview */
function extractPreview(markdown: string, maxLen = 260): string {
  const text = markdown
    .replace(/#{1,6}\s+/g, '')              // strip heading markers (inline too)
    .replace(/^---+$/gm, '')                // hr on own line
    .replace(/---+/g, '')                   // inline --- remnants
    .replace(/\*\*(.*?)\*\*/g, '$1')        // bold
    .replace(/\*(.*?)\*/g, '$1')            // italic
    .replace(/^[-*+]\s+/gm, '')             // bullet points
    .replace(/^\d+\.\s+/gm, '')             // ordered list
    .replace(/`[^`]+`/g, '')                // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ');

  return text.length > maxLen ? text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…' : text;
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
  } catch { /* silent */ }
}

// ─── Full-screen plan modal ────────────────────────────────────────────────────

function PlanModal({ plan, onClose }: { plan: PlanCardData; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="plan-modal-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
        onClick={onClose}
      >
        <motion.div
          key="plan-modal-card"
          initial={{ opacity: 0, scale: 0.97, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border border-arcus-divider bg-arcus-surface shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Top accent */}
          <div className="h-[2px] w-full bg-gradient-to-r from-white/5 via-white/20 to-white/5 flex-shrink-0" />

          {/* Modal header */}
          <div className="flex items-center gap-4 px-8 py-5 border-b border-arcus-border flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-arcus-surface border border-arcus-divider flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-arcus-fg-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold tracking-[0.10em] uppercase text-arcus-fg-muted mb-1">
                Plan Document
              </div>
              <h2 className="text-[18px] font-bold text-zinc-900 dark:text-white tracking-tight leading-tight truncate">
                {stripEmojis(plan.title)}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => handleDownload(plan)}
                className="p-2.5 rounded-xl text-arcus-fg-muted hover:text-zinc-900 dark:hover:text-white hover:bg-arcus-surface border border-transparent hover:border-arcus-border transition-all"
                title="Download as Markdown"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2.5 rounded-xl text-arcus-fg-muted hover:text-zinc-900 dark:hover:text-white hover:bg-arcus-surface border border-transparent hover:border-arcus-border transition-all"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-8 py-7 scrollbar-thin scrollbar-thumb-arcus-surface-hover scrollbar-track-transparent">
            <PlanMarkdown markdown={plan.markdown} />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

// ─── Compact document-style card (shown in chat) ───────────────────────────────

export function ChatPlanCard({ plan, onExecute, onCancel }: ChatPlanCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(plan.status === 'executing');

  const isDone = plan.status === 'completed';
  const isCancelled = plan.status === 'cancelled';
  const preview = extractPreview(plan.markdown);

  function handleExecute() {
    setIsExecuting(true);
    onExecute(plan);
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="mt-3 w-full"
      >
        <div
          className={cn(
            'relative rounded-2xl border overflow-hidden transition-all',
            isDone
              ? 'border-arcus-border bg-arcus-surface opacity-75'
              : isCancelled
              ? 'border-arcus-border bg-arcus-surface opacity-40'
              : 'border-arcus-divider bg-arcus-surface',
          )}
        >
          {/* Top accent stripe */}
          <div className={cn(
            'absolute top-0 left-0 right-0 h-px',
            isDone ? 'bg-green-500/25' : isCancelled ? 'bg-white/5' : 'bg-white/[0.18]',
          )} />

          {/* ── Document header row ── */}
          <div className="flex items-center gap-3 px-5 pt-4 pb-3">
            {/* Icon */}
            <div className={cn(
              'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border',
              isDone
                ? 'bg-green-500/10 border-green-500/25 text-green-400'
                : isCancelled
                ? 'bg-arcus-elevated border-arcus-border text-arcus-fg-muted'
                : 'bg-arcus-surface border-arcus-divider text-arcus-fg-secondary',
            )}>
              {isDone ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>

            {/* Title + label */}
            <div className="flex-1 min-w-0">
              <div className={cn(
                'text-[10px] font-bold tracking-[0.09em] uppercase mb-0.5',
                isDone ? 'text-green-400/50' : isCancelled ? 'text-arcus-fg-muted' : 'text-arcus-fg-muted',
              )}>
                {isDone ? 'Executed' : isCancelled ? 'Cancelled' : 'Plan'}
              </div>
              <div className={cn(
                'text-[15px] font-bold tracking-tight leading-tight truncate',
                isDone ? 'text-arcus-fg-secondary' : isCancelled ? 'text-arcus-fg-muted' : 'text-zinc-900 dark:text-white',
              )}>
                {stripEmojis(plan.title)}
              </div>
            </div>

            {/* "..." open modal button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-arcus-fg-muted hover:text-arcus-fg-secondary hover:bg-arcus-surface transition-all"
              title="View full plan"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* ── Content preview ── */}
          {preview && !isCancelled && (
            <div className="relative px-5 pb-4">
              {/* Fade gradient at bottom */}
              <div className="absolute bottom-4 left-0 right-0 h-8 bg-gradient-to-t from-arcus-surface to-transparent pointer-events-none z-10" />
              <p className={cn(
                'text-[13px] leading-[1.7] line-clamp-3',
                isDone ? 'text-arcus-fg-muted' : 'text-arcus-fg-secondary',
              )}>
                {preview}
              </p>
            </div>
          )}

          {/* ── Action bar ── */}
          {!isDone && !isCancelled && (
            <div className="flex items-center gap-2 px-5 py-3 border-t border-arcus-border bg-arcus-elevated">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-arcus-fg-secondary hover:text-zinc-900 dark:hover:text-white hover:bg-arcus-surface border border-arcus-divider hover:border-arcus-divider transition-all"
              >
                <Maximize2 className="w-3 h-3" />
                View plan
              </button>

              <div className="flex-1" />

              <button
                onClick={() => onCancel(plan)}
                disabled={isExecuting}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-arcus-fg-secondary hover:text-zinc-900 dark:hover:text-white hover:bg-arcus-surface border border-arcus-divider hover:border-arcus-divider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>

              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[12px] font-bold text-white dark:text-black bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-neutral-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md dark:shadow-lg active:scale-95"
              >
                {isExecuting ? (
                  <><Loader2 className="w-3 h-3 animate-spin" />Executing…</>
                ) : (
                  <><Play className="w-3 h-3" />Execute</>
                )}
              </button>
            </div>
          )}

          {/* Done footer */}
          {isDone && (
            <div className="flex items-center gap-2 px-5 py-3 border-t border-arcus-border">
              <Check className="w-3.5 h-3.5 text-green-400/50" />
              <span className="text-[12px] text-arcus-fg-muted">Plan executed successfully</span>
              <div className="flex-1" />
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-[11px] text-arcus-fg-muted hover:text-arcus-fg-secondary transition-colors"
              >
                View →
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {isModalOpen && <PlanModal plan={plan} onClose={() => setIsModalOpen(false)} />}
    </>
  );
}

// ─── Markdown pre-processor ───────────────────────────────────────────────────
// Fixes AI output where ## and --- appear inline rather than on their own lines

function normalizeMarkdown(raw: string): string {
  return raw
    // Put heading markers that appear mid-line onto their own line
    .replace(/([^\n#])\s{0,2}(#{1,6} )/g, '$1\n\n$2')
    // Put --- separators that appear mid-line onto their own lines
    .replace(/([^\n])\s*---+\s*([^\n-])/g, '$1\n\n---\n\n$2')
    .replace(/([^\n])\s*---+\s*$/gm, '$1\n\n---')
    // Ensure --- lines are truly isolated (not inside list items creating front-matter)
    .replace(/^([-*+]\s[^\n]*)\n---+/gm, '$1\n\n---')
    // Collapse 3+ consecutive blank lines to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Markdown renderer (modal) ────────────────────────────────────────────────

function PlanMarkdown({ markdown }: { markdown: string }) {
  const prepared = normalizeMarkdown(stripEmojis(markdown));

  return (
    <div className="plan-markdown select-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-[28px] font-bold text-zinc-900 dark:text-white tracking-tight mb-5 mt-2 leading-[1.2]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <div className="mt-9 mb-4">
              <h2 className="text-[18px] font-bold text-zinc-900 dark:text-white tracking-tight leading-snug">
                {children}
              </h2>
              <div className="mt-2.5 h-px bg-gradient-to-r from-black/10 dark:from-white/15 to-transparent" />
            </div>
          ),
          h3: ({ children }) => (
            <h3 className="text-[15px] font-semibold text-arcus-fg tracking-tight mb-2.5 mt-6 uppercase letter-spacing-wide">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[15px] font-semibold text-arcus-fg-secondary tracking-tight mb-2 mt-5">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-[14px] font-medium text-arcus-fg-secondary tracking-tight mb-1.5 mt-4">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-[12px] font-bold text-arcus-fg-secondary tracking-[0.08em] uppercase mb-2 mt-4">
              {children}
            </h6>
          ),
          p: ({ children }) => (
            <p className="text-[15px] text-arcus-fg-secondary leading-[1.85] mb-4">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mb-5 space-y-2.5 pl-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-5 pl-0 list-none space-y-2.5 counter-reset-none">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-3 text-[15px] text-arcus-fg-secondary leading-[1.75]">
              <span className="flex-shrink-0 w-[5px] h-[5px] rounded-full bg-arcus-fg-muted mt-[11px]" />
              <span className="flex-1">{children}</span>
            </li>
          ),
          hr: () => (
            <div className="my-8 flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/12 to-transparent" />
            </div>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-900 dark:text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-arcus-fg-secondary">{children}</em>
          ),
          pre: ({ children }) => (
            <pre className="bg-arcus-elevated border border-arcus-border rounded-xl p-4 overflow-x-auto my-5 text-[13px]">
              {children}
            </pre>
          ),
          code: ({ children, className }) => (
            <code className={className
              ? 'text-[13px] text-arcus-fg-secondary font-mono'
              : 'bg-arcus-surface border border-arcus-border rounded-md px-1.5 py-0.5 text-[13px] text-zinc-800 dark:text-white font-mono'
            }>
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-[2px] border-black/10 dark:border-white/20 pl-5 my-5 text-arcus-fg-secondary italic text-[15px] leading-[1.8]">
              {children}
            </blockquote>
          ),
        }}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  );
}
