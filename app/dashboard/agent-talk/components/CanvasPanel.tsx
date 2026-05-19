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
  email_draft:     { label: 'Email Draft',   Icon: Mail,      accent: '#ffffff', badge: 'bg-arcus-elevated border-arcus-border', badgeText: 'text-arcus-fg-secondary' },
  reply:           { label: 'Reply',          Icon: Mail,      accent: '#ffffff', badge: 'bg-arcus-elevated border-arcus-border', badgeText: 'text-arcus-fg-secondary' },
  report:          { label: 'Report',         Icon: FileText,  accent: '#ffffff', badge: 'bg-arcus-elevated border-arcus-border', badgeText: 'text-arcus-fg-secondary' },
  notes:           { label: 'Notes',          Icon: Edit3,     accent: '#ffffff', badge: 'bg-arcus-elevated border-arcus-border', badgeText: 'text-arcus-fg-secondary' },
  analysis:        { label: 'Analysis',       Icon: BarChart3, accent: '#ffffff', badge: 'bg-arcus-elevated border-arcus-border', badgeText: 'text-arcus-fg-secondary' },
  analytics:       { label: 'Analytics',      Icon: BarChart3, accent: '#ffffff', badge: 'bg-arcus-elevated border-arcus-border', badgeText: 'text-arcus-fg-secondary' },
  action_plan:     { label: 'Action Plan',    Icon: Zap,       accent: '#ffffff', badge: 'bg-arcus-elevated border-arcus-border', badgeText: 'text-arcus-fg-secondary' },
  research:        { label: 'Research',       Icon: Globe,     accent: '#ffffff', badge: 'bg-arcus-elevated border-arcus-border', badgeText: 'text-arcus-fg-secondary' },
  summary:         { label: 'Summary',        Icon: FileText,  accent: '#ffffff', badge: 'bg-arcus-elevated border-arcus-border', badgeText: 'text-arcus-fg-secondary' },
  meeting_schedule:{ label: 'Schedule',       Icon: Calendar,  accent: '#ffffff', badge: 'bg-arcus-elevated border-arcus-border', badgeText: 'text-arcus-fg-secondary' },
  workflow:        { label: 'Workflow',        Icon: Sparkles,  accent: '#ffffff', badge: 'bg-arcus-elevated border-arcus-border', badgeText: 'text-arcus-fg-secondary' },
  execution:       { label: 'Execution',       Icon: Play,      accent: '#ffffff', badge: 'bg-arcus-elevated border-arcus-border', badgeText: 'text-arcus-fg-secondary' },
  artifacts:       { label: 'Files',           Icon: FileText,  accent: '#ffffff', badge: 'bg-arcus-elevated border-arcus-border', badgeText: 'text-arcus-fg-secondary' },
  action_outputs:  { label: 'Results',         Icon: CheckCircle2, accent: '#ffffff', badge: 'bg-arcus-elevated border-arcus-border', badgeText: 'text-arcus-fg-secondary' },
  next_actions:    { label: 'Next Steps',      Icon: ArrowRight, accent: '#ffffff', badge: 'bg-arcus-elevated border-arcus-border', badgeText: 'text-arcus-fg-secondary' },
  none:            { label: 'Document',        Icon: Sparkles,  accent: '#ffffff', badge: 'bg-arcus-elevated border-arcus-border', badgeText: 'text-arcus-fg-secondary' },
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.none;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function CanvasPanel({
  isOpen, onClose, canvasData, onExecute, isExecuting, isSidebarCollapsed,
}: CanvasPanelProps) {
  const [editMode, setEditMode]           = useState(false);
  const [editedBody, setEditedBody]       = useState('');
  const [copied, setCopied]               = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [width, setWidth]                 = useState(540);
  const [isResizing, setIsResizing]       = useState(false);
  const [isClient, setIsClient]           = useState(false);
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

  const handleDownloadDocx = async () => {
    if (downloadingDocx) return;
    const text = getTextContent();
    if (!text) return;
    const isEmail = canvasData?.type === 'email_draft' || canvasData?.type === 'reply';
    const safeName = (canvasData?.title || 'document').toLowerCase().replace(/[^a-z0-9]+/g, '_');

    if (isEmail) {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return;
    }

    setDownloadingDocx(true);
    try {
      const { markdownToDocxBlob, triggerDocxDownload } = await import('@/lib/arcus/docx-export');
      const blob = await markdownToDocxBlob(text, canvasData?.title || 'document');
      triggerDocxDownload(blob, safeName);
    } catch {
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloadingDocx(false);
    }
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
        'bg-arcus-elevated border border-arcus-border rounded-[24px] shadow-[0_32px_80px_-8px_rgba(0,0,0,0.8)]',
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
        className="hidden md:block absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10 hover:bg-arcus-surface-hover transition-colors"
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-white/[0.03] bg-arcus-elevated">
        {/* Type badge + title */}
        <div className="flex items-center gap-3 min-w-0">
          <span className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold tracking-wide shrink-0', cfg.badge, cfg.badgeText)}>
            <cfg.Icon className="w-3.5 h-3.5" />
            {cfg.label}
          </span>
          <h2 className="text-[13px] font-semibold text-arcus-fg-secondary truncate leading-tight">
            {canvasData.title || 'Document'}
          </h2>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 ml-3">
          <button
            onClick={handleCopy}
            title="Copy content"
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-arcus-surface text-arcus-fg-tertiary hover:text-arcus-fg-secondary transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownloadDocx}
            title={isEmail ? 'Download .txt' : 'Download .docx'}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-arcus-surface text-arcus-fg-tertiary hover:text-arcus-fg-secondary transition-all"
          >
            {downloadingDocx
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />
            }
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-arcus-surface text-arcus-fg-tertiary hover:text-arcus-fg-secondary transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Email metadata strip ────────────────────────────────────────────── */}
      {isEmail && (
        <div className="shrink-0 border-b border-white/[0.03] bg-arcus-elevated/60">
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
                <MetaInsights type={canvasData.type} content={getTextContent()} />
                {editMode ? (
                  <textarea
                    value={editedBody}
                    onChange={e => setEditedBody(e.target.value)}
                    className="w-full min-h-[360px] bg-transparent text-[14px] text-arcus-fg-secondary leading-relaxed resize-none focus:outline-none font-sans"
                    autoFocus
                    placeholder="Email body…"
                  />
                ) : (
                  <div className="prose-canvas text-[14px] text-arcus-fg-secondary leading-relaxed whitespace-pre-wrap font-sans">
                    {canvasData.content?.body || extractEmailBody(canvasData.raw || '')}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="doc" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <MetaInsights type={canvasData.type} content={getTextContent()} />
                <MarkdownView content={canvasData.raw || (typeof canvasData.content === 'string' ? canvasData.content : '')} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="shrink-0 border-t border-white/[0.03] bg-arcus-elevated px-5 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Word count */}
          <span className="text-[11px] text-arcus-fg-muted tabular-nums">
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
              <FooterButton
                onClick={handleDownloadDocx}
                variant="ghost"
                loading={downloadingDocx}
                icon={downloadingDocx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              >
                Download
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
    <div className={cn('flex items-start gap-3 px-6 py-2.5', !last && 'border-b border-white/[0.03]')}>
      <span className="text-[11px] font-semibold text-arcus-fg-muted uppercase tracking-widest w-[42px] shrink-0 pt-[1px]">{label}</span>
      <span className="text-[13px] text-arcus-fg-secondary leading-snug">{value || '—'}</span>
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
          : 'text-arcus-fg-tertiary hover:text-arcus-fg-secondary hover:bg-arcus-surface',
      )}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ─── Meta Insights Component ──────────────────────────────────────────────────

function MetaInsights({ type, content }: { type: string; content: string }) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minRead = Math.max(1, Math.ceil(words / 200));

  const getTags = () => {
    const tags = [`${minRead} min read`];
    const lower = content.toLowerCase();
    
    if (type === 'email_draft' || type === 'reply') {
      tags.push('Style-Matched');
      tags.push('Draft Reply');
    } else if (type === 'report') {
      tags.push('Weekly Digest');
      tags.push('Inbox Analysis');
    } else if (type === 'analysis' || type === 'analytics') {
      tags.push('Statistical');
      tags.push('AI Audit');
    } else if (type === 'action_plan') {
      tags.push('Actionable');
      tags.push('CRM Tasks');
    } else {
      tags.push('AI Memo');
    }

    if (lower.includes('urgent') || lower.includes('alert') || lower.includes('security')) {
      tags.push('High Priority');
    }
    
    if (lower.includes('revenue') || lower.includes('deal') || lower.includes('$')) {
      tags.push('Revenue Deal');
    }

    return tags;
  };

  const tags = getTags();

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6 p-3 px-4 rounded-xl bg-arcus-elevated border border-arcus-border backdrop-blur-md">
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-arcus-fg-muted uppercase tracking-widest mr-2 shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-arcus-fg-secondary" />
        Meta Insights
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, idx) => (
          <span 
            key={idx} 
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all duration-200",
              tag === 'High Priority' 
                ? "bg-white text-black border-white animate-pulse"
                : tag === 'Revenue Deal'
                ? "bg-white/80 text-black border-white"
                : "bg-arcus-elevated border-arcus-border text-arcus-fg-secondary"
            )}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── YAML/Text Chart Parser ────────────────────────────────────────────────────

interface ChartData {
  type: 'bar' | 'line' | 'pie';
  title?: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

function parseChartContent(content: string, typeHint?: 'bar' | 'line' | 'pie'): ChartData | null {
  try {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const data: Partial<ChartData> = {
      type: typeHint || 'bar',
      labels: [],
      datasets: []
    };

    let currentDataset: any = null;

    for (const line of lines) {
      if (line.toLowerCase().startsWith('type:')) {
        const t = line.split(':')[1].trim().toLowerCase();
        if (t === 'bar' || t === 'line' || t === 'pie') {
          data.type = t;
        }
      } else if (line.toLowerCase().startsWith('title:')) {
        data.title = line.split(':').slice(1).join(':').trim().replace(/^['"]|['"]$/g, '');
      } else if (line.toLowerCase().startsWith('labels:')) {
        const val = line.split(':').slice(1).join(':').trim();
        try {
          data.labels = JSON.parse(val);
        } catch {
          data.labels = val.replace(/[\[\]"']/g, '').split(',').map(s => s.trim());
        }
      } else if (line.startsWith('-') || line.startsWith('dataset:')) {
        // Ignored
      } else if (line.toLowerCase().startsWith('label:')) {
        currentDataset = { label: line.split(':')[1].trim().replace(/^['"]|['"]$/g, ''), data: [] };
        data.datasets!.push(currentDataset);
      } else if (line.toLowerCase().startsWith('values:') || line.toLowerCase().startsWith('data:')) {
        const val = line.split(':').slice(1).join(':').trim();
        let nums: number[] = [];
        try {
          nums = JSON.parse(val);
        } catch {
          nums = val.replace(/[\[\]"']/g, '').split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        }
        if (currentDataset) {
          currentDataset.data = nums;
        } else {
          if (data.datasets!.length === 0) {
            data.datasets!.push({ label: 'Value', data: nums });
          } else {
            data.datasets![0].data = nums;
          }
        }
      } else if (line.includes(':')) {
        const parts = line.split(':');
        const k = parts[0].trim().replace(/^[-* ]+/, '');
        const v = parseFloat(parts[1].trim());
        if (!isNaN(v)) {
          data.labels!.push(k);
          if (data.datasets!.length === 0) {
            data.datasets!.push({ label: 'Value', data: [] });
          }
          data.datasets![0].data.push(v);
        }
      }
    }

    if (data.labels!.length && data.datasets!.length) {
      return data as ChartData;
    }
  } catch (e) {
    console.error('Failed to parse chart', e);
  }
  return null;
}

// ─── Dynamic SVG Interactive Charts ────────────────────────────────────────────

function InteractiveChart({ data }: { data: ChartData }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.type === 'pie') {
    const values = data.datasets[0]?.data || [];
    const total = values.reduce((sum, v) => sum + v, 0);
    const colors = [
      '#ffffff',               // Pure white
      'rgba(255,255,255,0.85)', // High opacity white
      'rgba(255,255,255,0.7)',  // Medium-high opacity white
      'rgba(255,255,255,0.5)',  // Medium opacity white
      'rgba(255,255,255,0.3)',  // Medium-low opacity white
      'rgba(255,255,255,0.15)', // Low opacity white
    ];

    let accumulatedAngle = 0;
    const radius = 70;
    const strokeWidth = 24;
    const center = 100;
    const circumference = 2 * Math.PI * radius;

    return (
      <div className="my-6 p-6 rounded-2xl bg-arcus-elevated border border-arcus-border flex flex-col sm:flex-row items-center gap-8 backdrop-blur-md">
        <div className="relative w-[180px] h-[180px] flex-shrink-0">
          <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
            {values.map((v, idx) => {
              const percentage = total > 0 ? v / total : 0;
              const strokeDasharray = `${percentage * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedAngle * circumference;
              accumulatedAngle += percentage;

              const isHovered = hoveredIdx === idx;

              return (
                <circle
                  key={idx}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={colors[idx % colors.length]}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer origin-center hover:scale-[1.02]"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-arcus-fg-muted font-semibold uppercase tracking-wider">Total</span>
            <span className="text-[20px] font-bold text-white tracking-tight">{total}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3 w-full">
          {data.title && <h4 className="text-[13px] font-bold text-arcus-fg mb-1">{data.title}</h4>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.labels.map((label, idx) => {
              const val = values[idx] || 0;
              const pct = total > 0 ? Math.round((val / total) * 100) : 0;
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-xl border transition-all duration-200 cursor-pointer",
                    isHovered
                      ? "bg-arcus-surface border-arcus-divider scale-[1.02]"
                      : "bg-arcus-elevated border-transparent"
                  )}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
                    <span className="text-[12px] font-medium text-arcus-fg-secondary truncate">{label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[12px] font-semibold text-arcus-fg">{val}</span>
                    <span className="text-[10px] text-arcus-fg-tertiary font-mono">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const labels = data.labels;
  const datasets = data.datasets;
  const colors = [
    '#ffffff',               // Pure white
    'rgba(255,255,255,0.7)',  // White 70%
    'rgba(255,255,255,0.4)',  // White 40%
    'rgba(255,255,255,0.2)',  // White 20%
  ];

  const allValues = datasets.flatMap(d => d.data);
  const maxVal = Math.max(...allValues, 1);
  const minVal = 0;
  const range = maxVal - minVal;
  const padding = range * 0.1;
  const gridMax = Math.ceil((maxVal + padding) / 5) * 5;

  const chartHeight = 160;
  const chartWidth = 380;
  const paddingX = 40;
  const paddingY = 20;

  const getX = (index: number) => paddingX + (index * (chartWidth - paddingX * 2)) / Math.max(labels.length - 1, 1);
  const getY = (value: number) => chartHeight - paddingY - ((value - minVal) * (chartHeight - paddingY * 2)) / gridMax;

  return (
    <div className="my-6 p-6 rounded-2xl bg-arcus-elevated border border-arcus-border flex flex-col gap-4 backdrop-blur-md">
      {data.title && (
        <div className="flex items-center justify-between">
          <h4 className="text-[13px] font-bold text-arcus-fg">{data.title}</h4>
          <div className="flex items-center gap-3">
            {datasets.map((d, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
                <span className="text-[10px] text-arcus-fg-tertiary font-medium">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative w-full h-[180px]">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full">
          {[0, 1, 2, 3, 4].map(i => {
            const val = (gridMax / 4) * i;
            const y = getY(val);
            return (
              <g key={i} className="opacity-25">
                <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} strokeDasharray="3 3" />
                <text x={paddingX - 8} y={y + 3} fill="rgba(255,255,255,0.4)" fontSize={8} textAnchor="end" className="font-mono">{Math.round(val)}</text>
              </g>
            );
          })}

          {data.type === 'bar' && datasets.map((d, dIdx) => {
            const barWidth = Math.max(2, (chartWidth - paddingX * 2) / (labels.length * 3));
            const groupOffset = (dIdx - (datasets.length - 1) / 2) * (barWidth + 2);

            return d.data.map((val, idx) => {
              const x = getX(idx) + groupOffset;
              const y = getY(val);
              const height = chartHeight - paddingY - y;
              const isHovered = hoveredIdx === idx;

              return (
                <rect
                  key={`${dIdx}-${idx}`}
                  x={x - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={Math.max(2, height)}
                  rx={2}
                  fill={colors[dIdx % colors.length]}
                  fillOpacity={isHovered ? 0.95 : 0.75}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            });
          })}

          {data.type === 'line' && datasets.map((d, dIdx) => {
            let pathData = '';
            d.data.forEach((val, idx) => {
              const x = getX(idx);
              const y = getY(val);
              if (idx === 0) pathData += `M ${x} ${y}`;
              else pathData += ` L ${x} ${y}`;
            });

            return (
              <g key={dIdx}>
                <path
                  d={`${pathData} L ${getX(labels.length - 1)} ${chartHeight - paddingY} L ${getX(0)} ${chartHeight - paddingY} Z`}
                  fill={`url(#gradient-${dIdx})`}
                  className="opacity-10"
                />
                <defs>
                  <linearGradient id={`gradient-${dIdx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors[dIdx % colors.length]} />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>

                <path
                  d={pathData}
                  fill="transparent"
                  stroke={colors[dIdx % colors.length]}
                  strokeWidth={2}
                  strokeLinecap="round"
                />

                {d.data.map((val, idx) => {
                  const x = getX(idx);
                  const y = getY(val);
                  const isHovered = hoveredIdx === idx;

                  return (
                    <circle
                      key={idx}
                      cx={x}
                      cy={y}
                      r={isHovered ? 4.5 : 3}
                      fill={colors[dIdx % colors.length]}
                      stroke="#0A0A0A"
                      strokeWidth={1.5}
                      className="transition-all duration-150 cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  );
                })}
              </g>
            );
          })}

          {labels.map((label, idx) => {
            const x = getX(idx);
            const isHovered = hoveredIdx === idx;
            return (
              <text
                key={idx}
                x={x}
                y={chartHeight - 4}
                fill={isHovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)'}
                fontSize={8}
                textAnchor="middle"
                className="font-medium transition-colors duration-150"
              >
                {label}
              </text>
            );
          })}
        </svg>

        {hoveredIdx !== null && (
          <div 
            className="absolute z-10 px-2.5 py-1.5 rounded-lg bg-arcus-bg/90 border border-arcus-divider text-[10px] text-arcus-fg flex flex-col gap-1 pointer-events-none shadow-lg"
            style={{
              left: `${Math.min(getX(hoveredIdx) * 0.9, 240)}px`,
              top: '10px'
            }}
          >
            <span className="font-bold text-arcus-fg-tertiary uppercase">{labels[hoveredIdx]}</span>
            {datasets.map((d, dIdx) => (
              <div key={dIdx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors[dIdx % colors.length] }} />
                <span>{d.label}: <strong>{d.data[hoveredIdx]}</strong></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Beautiful markdown renderer ────────────────────────────────────────────────

function MarkdownView({ content }: { content: string }) {
  if (!content) return (
    <div className="flex flex-col items-center justify-center py-20 opacity-30">
      <Sparkles className="w-8 h-8 text-arcus-fg-muted mb-3" />
      <p className="text-[13px] text-arcus-fg-tertiary">No content</p>
    </div>
  );

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-[22px] font-bold text-arcus-fg leading-tight mb-5 mt-2 tracking-tight">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-[17px] font-semibold text-arcus-fg leading-snug mb-3 mt-6 tracking-tight">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-[14px] font-semibold text-arcus-fg-secondary leading-snug mb-2.5 mt-5">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-[14px] text-arcus-fg-secondary leading-[1.75] mb-4">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-4 space-y-1.5 list-none pl-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-4 space-y-1.5 pl-5 list-decimal marker:text-arcus-fg-muted">{children}</ol>
        ),
        li: ({ children, ...props }: any) => (
          props.ordered
            ? <li className="text-[13.5px] text-arcus-fg-secondary leading-relaxed pl-1">{children}</li>
            : <li className="flex items-start gap-2.5 text-[13.5px] text-arcus-fg-secondary leading-relaxed list-none">
                <span className="w-1.5 h-1.5 rounded-full bg-arcus-fg-muted mt-[7px] shrink-0" />
                <span className="flex-1">{children}</span>
              </li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-arcus-fg">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-arcus-fg-secondary">{children}</em>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-arcus-fg-muted pl-4 my-4 text-[13.5px] text-arcus-fg-tertiary italic leading-relaxed">
            {children}
          </blockquote>
        ),
        code: ({ inline, children, ...props }: any) => {
          const rawText = String(children);
          const lang = props.className || '';

          if (!inline && (lang.includes('chart') || lang.includes('graph') || lang.includes('piechart') || lang.includes('pie-chart'))) {
            const parsed = parseChartContent(rawText, lang.includes('pie') ? 'pie' : lang.includes('line') ? 'line' : 'bar');
            if (parsed) {
              return <InteractiveChart data={parsed} />;
            }
          }

          return inline ? (
            <code className="px-1.5 py-0.5 rounded-md bg-arcus-surface text-[12.5px] font-mono text-arcus-fg-secondary border border-arcus-divider">
              {children}
            </code>
          ) : (
            <pre className="my-4 rounded-xl bg-arcus-surface border border-arcus-border overflow-x-auto">
              <code className="block p-4 text-[12.5px] font-mono text-arcus-fg-secondary leading-relaxed">{children}</code>
            </pre>
          );
        },
        hr: () => <hr className="my-6 border-arcus-border" />,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-white underline underline-offset-2 hover:text-white/80 transition-colors">
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="my-5 overflow-x-auto rounded-xl border border-arcus-border">
            <table className="w-full text-[13px]">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-arcus-elevated border-b border-arcus-border">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-arcus-border">{children}</tbody>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-arcus-fg-tertiary uppercase tracking-wider">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-3 text-arcus-fg-secondary">{children}</td>
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
