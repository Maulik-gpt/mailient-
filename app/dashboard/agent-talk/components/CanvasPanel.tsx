'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Copy, Check, Edit3, FileText, Mail, Sparkles,
  BarChart3, Zap, Globe, Calendar, ArrowRight, Send,
  Download, ChevronLeft, ChevronRight, Loader2,
  AlertTriangle, CheckCircle2, Clock, ListTodo, Target,
  HelpCircle, Shield, Play,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CanvasType =
  | 'email_draft' | 'summary' | 'research' | 'action_plan' | 'reply'
  | 'notes' | 'meeting_schedule' | 'analytics' | 'workflow' | 'execution'
  | 'artifacts' | 'action_outputs' | 'next_actions' | 'none'
  | 'report' | 'analysis';

export interface CanvasData {
  type: CanvasType;
  title?: string;
  content: any;
  sections?: any[];
  actions?: { actionType: string; label?: string; requiresApproval?: boolean }[];
  approvalTokens?: Record<string, string>;
  raw?: string;
  error?: string;
}

interface CanvasPanelProps {
  isOpen: boolean;
  onClose: () => void;
  canvasData: CanvasData | null;
  onExecute: (action: string, data: unknown) => void;
  isExecuting?: boolean;
  isSidebarCollapsed?: boolean;
  onSendToChat?: (message: string) => void;
}

// ─── Type config ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, {
  label: string;
  Icon: any;
  accent: string;
  badge: string;
  badgeText: string;
}> = {
  email_draft:     { label: 'Email Draft',   Icon: Mail,      accent: '#6366f1', badge: 'bg-indigo-500/15 border-indigo-500/25',  badgeText: 'text-indigo-300'  },
  reply:           { label: 'Reply',          Icon: Mail,      accent: '#10b981', badge: 'bg-emerald-500/15 border-emerald-500/25', badgeText: 'text-emerald-300' },
  report:          { label: 'Report',         Icon: FileText,  accent: '#8b5cf6', badge: 'bg-violet-500/15 border-violet-500/25',  badgeText: 'text-violet-300'  },
  notes:           { label: 'Notes',          Icon: Edit3,     accent: '#ec4899', badge: 'bg-pink-500/15 border-pink-500/25',      badgeText: 'text-pink-300'    },
  analysis:        { label: 'Analysis',       Icon: BarChart3, accent: '#f97316', badge: 'bg-orange-500/15 border-orange-500/25',  badgeText: 'text-orange-300'  },
  analytics:       { label: 'Analytics',      Icon: BarChart3, accent: '#f97316', badge: 'bg-orange-500/15 border-orange-500/25',  badgeText: 'text-orange-300'  },
  action_plan:     { label: 'Action Plan',    Icon: Zap,       accent: '#f59e0b', badge: 'bg-amber-500/15 border-amber-500/25',   badgeText: 'text-amber-300'   },
  research:        { label: 'Research',       Icon: Globe,     accent: '#06b6d4', badge: 'bg-cyan-500/15 border-cyan-500/25',     badgeText: 'text-cyan-300'    },
  summary:         { label: 'Summary',        Icon: FileText,  accent: '#8b5cf6', badge: 'bg-violet-500/15 border-violet-500/25', badgeText: 'text-violet-300'  },
  meeting_schedule:{ label: 'Schedule',       Icon: Calendar,  accent: '#3b82f6', badge: 'bg-blue-500/15 border-blue-500/25',    badgeText: 'text-blue-300'    },
  workflow:        { label: 'Workflow',        Icon: Sparkles,  accent: '#a855f7', badge: 'bg-purple-500/15 border-purple-500/25', badgeText: 'text-purple-300'  },
  execution:       { label: 'Execution',       Icon: Play,      accent: '#3b82f6', badge: 'bg-blue-500/15 border-blue-500/25',    badgeText: 'text-blue-300'    },
  artifacts:       { label: 'Files',           Icon: FileText,  accent: '#8b5cf6', badge: 'bg-violet-500/15 border-violet-500/25', badgeText: 'text-violet-300'  },
  action_outputs:  { label: 'Results',         Icon: CheckCircle2, accent: '#10b981', badge: 'bg-emerald-500/15 border-emerald-500/25', badgeText: 'text-emerald-300' },
  next_actions:    { label: 'Next Steps',      Icon: ArrowRight, accent: '#f59e0b', badge: 'bg-amber-500/15 border-amber-500/25', badgeText: 'text-amber-300'  },
  none:            { label: 'Document',        Icon: Sparkles,  accent: '#a855f7', badge: 'bg-purple-500/15 border-purple-500/25', badgeText: 'text-purple-300'  },
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.none;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function CanvasPanel({
  isOpen, onClose, canvasData, onExecute, isExecuting, isSidebarCollapsed,
}: CanvasPanelProps) {
  const [editMode, setEditMode]     = useState(false);
  const [editedBody, setEditedBody] = useState('');
  const [copied, setCopied]         = useState(false);
  const [width, setWidth]           = useState(540);
  const [isResizing, setIsResizing] = useState(false);
  const [isClient, setIsClient]     = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (canvasData?.type === 'email_draft' || canvasData?.type === 'reply') {
      const body = canvasData.content?.body || extractEmailBody(canvasData.raw || '');
      setEditedBody(body);
      setEditMode(false);
    }
  }, [canvasData]);

  // ── Resize ───────────────────────────────────────────────────────────────────
  const startResizing = useCallback((e: React.MouseEvent) => { e.preventDefault(); setIsResizing(true); }, []);
  const stopResizing  = useCallback(() => { setIsResizing(false); }, []);
  const handleResize  = useCallback((e: MouseEvent) => {
    if (!isResizing || window.innerWidth < 768) return;
    const sidebarW = isSidebarCollapsed ? 80 : 256;
    const max = window.innerWidth - sidebarW - 500 - 48;
    const next = window.innerWidth - e.clientX;
    setWidth(Math.max(380, Math.min(next, max)));
  }, [isResizing, isSidebarCollapsed]);

  useEffect(() => {
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [handleResize, stopResizing]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const getTextContent = () => {
    if (!canvasData) return '';
    if (canvasData.raw) return canvasData.raw;
    if (typeof canvasData.content === 'string') return canvasData.content;
    if (canvasData.content?.body) return canvasData.content.body;
    return JSON.stringify(canvasData.content, null, 2);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getTextContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    const payload = canvasData?.content?.threadId
      ? { ...canvasData.content, body: editMode ? editedBody : canvasData.content.body }
      : { ...(canvasData?.content || {}), body: editMode ? editedBody : (canvasData?.content?.body || '') };
    onExecute('send_email', payload);
  };

  if (!isOpen || !canvasData) return null;

  const cfg = getConfig(canvasData.type);
  const isEmail = canvasData.type === 'email_draft' || canvasData.type === 'reply';
  const panelWidth = isClient && window.innerWidth < 768 ? 'calc(100vw - 24px)' : `${width}px`;

  return (
    <div
      className={cn(
        'h-[calc(100vh-32px)] flex flex-col flex-shrink-0 relative',
        'bg-[#0c0c0d] border border-white/[0.07] rounded-[24px] shadow-[0_32px_80px_-8px_rgba(0,0,0,0.8)]',
        'overflow-hidden select-text m-3',
        isResizing ? 'cursor-ew-resize' : '',
      )}
      style={{ width: panelWidth }}
    >
      {/* Accent glow at top */}
      <div
        className="absolute inset-x-0 top-0 h-[1px] opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${cfg.accent}, transparent)` }}
      />

      {/* Resize handle */}
      <div
        onMouseDown={startResizing}
        className="hidden md:block absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10 hover:bg-white/10 transition-colors"
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#0e0e10]">
        {/* Type badge + title */}
        <div className="flex items-center gap-3 min-w-0">
          <span className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold tracking-wide shrink-0', cfg.badge, cfg.badgeText)}>
            <cfg.Icon className="w-3.5 h-3.5" />
            {cfg.label}
          </span>
          <h2 className="text-[13px] font-semibold text-white/80 truncate leading-tight">
            {canvasData.title || 'Document'}
          </h2>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 ml-3">
          <button
            onClick={handleCopy}
            title="Copy content"
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/8 text-white/40 hover:text-white/80 transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/8 text-white/40 hover:text-white/80 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Email metadata strip ────────────────────────────────────────────── */}
      {isEmail && (
        <div className="shrink-0 border-b border-white/[0.06] bg-[#0e0e10]/60">
          <EmailField label="To"      value={canvasData.content?.to      || ''} />
          <EmailField label="Subject" value={canvasData.content?.subject || ''} last />
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto canvas-scroll">
        <div className="px-7 py-6">
          <AnimatePresence mode="wait">
            {isEmail ? (
              <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {editMode ? (
                  <textarea
                    value={editedBody}
                    onChange={e => setEditedBody(e.target.value)}
                    className="w-full min-h-[360px] bg-transparent text-[14px] text-white/80 leading-relaxed resize-none focus:outline-none font-sans"
                    autoFocus
                    placeholder="Email body…"
                  />
                ) : (
                  <div className="prose-canvas text-[14px] text-white/80 leading-relaxed whitespace-pre-wrap font-sans">
                    {canvasData.content?.body || extractEmailBody(canvasData.raw || '')}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="doc" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <MarkdownView content={canvasData.raw || (typeof canvasData.content === 'string' ? canvasData.content : '')} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="shrink-0 border-t border-white/[0.06] bg-[#0e0e10] px-5 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Word count */}
          <span className="text-[11px] text-white/25 tabular-nums">
            {wordCount(getTextContent())} words
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isEmail ? (
            <>
              {editMode ? (
                <FooterButton onClick={() => setEditMode(false)} variant="ghost">Done editing</FooterButton>
              ) : (
                <FooterButton onClick={() => setEditMode(true)} variant="ghost" icon={<Edit3 className="w-3.5 h-3.5" />}>Edit</FooterButton>
              )}
              <FooterButton
                onClick={handleSend}
                variant="primary"
                icon={<Send className="w-3.5 h-3.5" />}
                loading={isExecuting}
              >
                Send Email
              </FooterButton>
            </>
          ) : (
            <>
              <FooterButton onClick={handleCopy} variant="ghost" icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}>
                {copied ? 'Copied' : 'Copy'}
              </FooterButton>
            </>
          )}
        </div>
      </footer>

      <style jsx global>{`
        .canvas-scroll::-webkit-scrollbar          { width: 4px; }
        .canvas-scroll::-webkit-scrollbar-track    { background: transparent; }
        .canvas-scroll::-webkit-scrollbar-thumb    { background: rgba(255,255,255,0.06); border-radius: 8px; }
        .canvas-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }
      `}</style>
    </div>
  );
}

// ─── Email field row ────────────────────────────────────────────────────────────

function EmailField({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={cn('flex items-start gap-3 px-6 py-2.5', !last && 'border-b border-white/[0.04]')}>
      <span className="text-[11px] font-semibold text-white/25 uppercase tracking-widest w-[42px] shrink-0 pt-[1px]">{label}</span>
      <span className="text-[13px] text-white/70 leading-snug">{value || '—'}</span>
    </div>
  );
}

// ─── Footer button ──────────────────────────────────────────────────────────────

function FooterButton({
  children, onClick, variant, icon, loading,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant: 'primary' | 'ghost';
  icon?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'flex items-center gap-1.5 px-3.5 h-8 rounded-xl text-[12px] font-semibold transition-all active:scale-95 disabled:opacity-50',
        variant === 'primary'
          ? 'bg-white text-black hover:bg-white/90'
          : 'text-white/50 hover:text-white/80 hover:bg-white/8',
      )}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ─── Beautiful markdown renderer ────────────────────────────────────────────────

function MarkdownView({ content }: { content: string }) {
  if (!content) return (
    <div className="flex flex-col items-center justify-center py-20 opacity-30">
      <Sparkles className="w-8 h-8 text-white/30 mb-3" />
      <p className="text-[13px] text-white/40">No content</p>
    </div>
  );

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-[22px] font-bold text-white/95 leading-tight mb-5 mt-2 tracking-tight">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-[17px] font-semibold text-white/90 leading-snug mb-3 mt-6 tracking-tight">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-[14px] font-semibold text-white/80 leading-snug mb-2.5 mt-5">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-[14px] text-white/75 leading-[1.75] mb-4">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-4 space-y-1.5 list-none pl-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-4 space-y-1.5 pl-5 list-decimal marker:text-white/30">{children}</ol>
        ),
        li: ({ children, ...props }: any) => (
          props.ordered
            ? <li className="text-[13.5px] text-white/75 leading-relaxed pl-1">{children}</li>
            : <li className="flex items-start gap-2.5 text-[13.5px] text-white/75 leading-relaxed list-none">
                <span className="w-1.5 h-1.5 rounded-full bg-white/25 mt-[7px] shrink-0" />
                <span className="flex-1">{children}</span>
              </li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-white/90">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-white/70">{children}</em>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-white/20 pl-4 my-4 text-[13.5px] text-white/50 italic leading-relaxed">
            {children}
          </blockquote>
        ),
        code: ({ inline, children, ...props }: any) =>
          inline ? (
            <code className="px-1.5 py-0.5 rounded-md bg-white/8 text-[12.5px] font-mono text-white/75 border border-white/10">
              {children}
            </code>
          ) : (
            <pre className="my-4 rounded-xl bg-[#161618] border border-white/[0.07] overflow-x-auto">
              <code className="block p-4 text-[12.5px] font-mono text-white/75 leading-relaxed">{children}</code>
            </pre>
          ),
        hr: () => <hr className="my-6 border-white/[0.08]" />,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="my-5 overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full text-[13px]">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-white/[0.04] border-b border-white/[0.08]">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-white/[0.05]">{children}</tbody>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-white/40 uppercase tracking-wider">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-3 text-white/65">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractEmailBody(markdown: string): string {
  const parts = markdown.split('---');
  if (parts.length >= 2) return parts.slice(1).join('---').replace(/^\s+/, '').split('✅')[0].trim();
  return markdown;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
