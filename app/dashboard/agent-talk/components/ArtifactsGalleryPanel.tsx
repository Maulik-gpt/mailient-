'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X, FileText, Download, Sparkles,
  Search, ArrowRight, Loader2, Library
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { type CanvasData, type CanvasType } from './CanvasPanel';

interface ArtifactsGalleryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectArtifact: (data: CanvasData) => void;
  isSidebarCollapsed?: boolean;
  messages?: any[];
}

interface DynamicArtifactItem {
  id: string;
  type: CanvasType;
  tag: string;
  title: string;
  subtitle: string;
  time: string;
  content: any;
  raw: string;
}

export function ArtifactsGalleryPanel({
  isOpen,
  onClose,
  onSelectArtifact,
  messages = []
}: ArtifactsGalleryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingAll(true);
      fetch('/api/arcus/conversation')
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.sessions)) setAllSessions(data.sessions);
        })
        .catch(err => console.error('Error fetching conversations for library:', err))
        .finally(() => setIsLoadingAll(false));
    }
  }, [isOpen]);

  // ─── Artifact extraction ───────────────────────────────────────────────────────
  const dynamicArtifacts: DynamicArtifactItem[] = [];
  const processedMessageIds = new Set<string>();

  const extractFromMessages = (msgs: any[], chatTitle?: string) => {
    if (!Array.isArray(msgs)) return;
    msgs.forEach((msg, index) => {
      const msgKey = msg.id || `${chatTitle || 'chat'}-${index}`;
      if (processedMessageIds.has(msgKey)) return;
      processedMessageIds.add(msgKey);

      if (msg.role === 'assistant' && msg.meta) {
        const planSource = msg.meta.planCard || msg.meta._planForDocs || msg.meta.planArtifact;
        if (planSource) {
          const plan = planSource;
          const rawMarkdown = plan.markdown
            || `# ${plan.title || 'Strategic Mission Plan'}\n\nObjective: ${plan.objective || ''}\n\n${plan.steps?.map((s: any, idx: number) => `### Step ${idx + 1}: ${s.action}\n${s.description || s.human_readable || ''}\n`).join('\n') || ''}`;
          dynamicArtifacts.push({
            id: `dyn-plan-${msgKey}`,
            type: 'action_plan',
            tag: 'Plan · MD',
            title: plan.title || 'Strategic Mission Plan',
            subtitle: chatTitle ? `From: ${chatTitle}` : 'Created from chat',
            time: msg.time || 'Just now',
            content: { type: 'action_plan', title: plan.title, markdown: rawMarkdown },
            raw: rawMarkdown,
          });
        }

        if (msg.meta.canvasApproval?.canvasData) {
          const cv = msg.meta.canvasApproval.canvasData;
          dynamicArtifacts.push({
            id: `dyn-appr-${msgKey}`,
            type: cv.type || 'workflow',
            tag: 'Mission Spec · JSON',
            title: msg.meta.canvasApproval.title || 'Canvas Workflow Specification',
            subtitle: chatTitle ? `From: ${chatTitle}` : 'Extracted from chat',
            time: msg.time || 'Just now',
            content: cv.content,
            raw: cv.raw || JSON.stringify(cv.content, null, 2),
          });
        }

        if (msg.meta.result?.canvasData) {
          const cv = msg.meta.result.canvasData;
          let fileTag = 'Result · MD';
          if (cv.type === 'analytics') fileTag = 'Analytics · MD';
          else if (cv.type === 'email_draft' || cv.type === 'reply') fileTag = 'Email Draft · MD';
          else if (cv.type === 'notes') fileTag = 'Document · MD';
          dynamicArtifacts.push({
            id: `dyn-res-${msgKey}`,
            type: cv.type || 'notes',
            tag: fileTag,
            title: msg.meta.result.title || 'Action Results Summary',
            subtitle: chatTitle ? `From: ${chatTitle}` : 'Extracted from chat',
            time: msg.time || 'Just now',
            content: cv.content,
            raw: cv.raw || (typeof cv.content === 'string' ? cv.content : JSON.stringify(cv.content, null, 2)),
          });
        }
      }
    });
  };

  extractFromMessages(messages, 'Active Session');
  allSessions.forEach(session => extractFromMessages(session.messages, session.title));

  const filteredArtifacts = dynamicArtifacts.filter(art =>
    art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    art.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownload = async (e: React.MouseEvent, art: DynamicArtifactItem) => {
    e.stopPropagation();
    if (downloadingId === art.id) return;
    setDownloadingId(art.id);
    const safeName = art.title.replace(/\s+/g, '_').toLowerCase();
    try {
      const { markdownToDocxBlob, triggerDocxDownload } = await import('@/lib/arcus/docx-export');
      const blob = await markdownToDocxBlob(art.raw, art.title);
      triggerDocxDownload(blob, safeName);
      toast.success(`Downloaded "${art.title}"`);
    } catch {
      try {
        const blob = new Blob([art.raw], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeName}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Downloaded as markdown');
      } catch {
        toast.error('Could not download file');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSelect = (art: DynamicArtifactItem) => {
    const data: CanvasData = { type: art.type, title: art.title, content: art.content, raw: art.raw };
    onSelectArtifact(data);
    toast.success(`Opening "${art.title}" in Canvas`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Blurred backdrop */}
          <motion.div
            key="library-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] backdrop-blur-sm bg-black/30 dark:bg-black/50"
          />

          {/* Modal card */}
          <motion.div
            key="library-modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'fixed z-[201] inset-0 m-auto',
              'w-[min(580px,calc(100vw-32px))] h-[min(680px,calc(100vh-80px))]',
              'flex flex-col rounded-[28px] overflow-hidden shadow-2xl',
              // Standard system palette colors
              'bg-[#D8D8D8] dark:bg-arcus-bg-elevated',
              'border border-black/10 dark:border-arcus-border',
            )}
            onClick={e => e.stopPropagation()}
          >
            {/* Subtle noise texture */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.025] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-0" />

            {/* Header */}
            <div className="px-6 py-5 border-b border-black/10 dark:border-arcus-border flex items-center justify-between shrink-0 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-black/8 dark:bg-arcus-surface border border-black/10 dark:border-arcus-border flex items-center justify-center">
                  <Library className="w-4 h-4 text-black/60 dark:text-arcus-fg-secondary" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-black/90 dark:text-arcus-fg tracking-tight lowercase">Library</h3>
                  {isLoadingAll ? (
                    <p className="text-[10px] text-black/40 dark:text-arcus-fg-tertiary tracking-tight uppercase flex items-center gap-1.5">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Syncing conversations…
                    </p>
                  ) : (
                    <p className="text-[10px] text-black/40 dark:text-arcus-fg-tertiary tracking-tight uppercase">
                      {filteredArtifacts.length} document{filteredArtifacts.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl transition-all text-black/40 dark:text-arcus-fg-tertiary hover:text-black/70 dark:hover:text-arcus-fg hover:bg-black/8 dark:hover:bg-arcus-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            {dynamicArtifacts.length > 0 && (
              <div className="px-6 py-4 border-b border-black/10 dark:border-arcus-border shrink-0 relative z-10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-arcus-fg-tertiary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search library…"
                    className="w-full pl-9 pr-4 py-2.5 bg-black/6 dark:bg-arcus-surface border border-black/10 dark:border-arcus-border rounded-xl text-[13px] text-black/80 dark:text-arcus-fg placeholder:text-black/30 dark:placeholder:text-arcus-fg-tertiary focus:outline-none focus:border-black/20 dark:focus:border-arcus-fg-secondary transition-all font-medium"
                  />
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 relative z-10 select-none">
              {dynamicArtifacts.length > 0 ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-black/40 dark:text-arcus-fg-tertiary uppercase tracking-wider">All Documents</h4>
                    <span className="text-[10px] text-black/30 dark:text-arcus-fg-muted font-mono">{filteredArtifacts.length} total</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {filteredArtifacts.map(art => {
                      const snippet = art.raw
                        .replace(/^#{1,6}\s+/gm, '')
                        .replace(/[*_`~]/g, '')
                        .replace(/\n+/g, ' ')
                        .trim()
                        .slice(0, 120);
                      const isDownloading = downloadingId === art.id;
                      return (
                        <div
                          key={art.id}
                          onClick={() => handleSelect(art)}
                          className="group p-4 bg-black/5 dark:bg-arcus-surface hover:bg-black/8 dark:hover:bg-arcus-surface-hover border border-black/8 dark:border-arcus-border rounded-2xl transition-all duration-150 cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="px-2 py-0.5 rounded-full bg-black/6 dark:bg-arcus-bg border border-black/8 dark:border-arcus-border text-[9px] font-mono text-black/50 dark:text-arcus-fg-secondary tracking-wide">
                              {art.tag}
                            </span>
                            <button
                              onClick={e => handleDownload(e, art)}
                              className="p-1.5 hover:bg-black/8 dark:hover:bg-arcus-surface-hover rounded-lg transition-colors text-black/30 dark:text-arcus-fg-muted hover:text-black/60 dark:hover:text-arcus-fg-secondary opacity-0 group-hover:opacity-100"
                              title="Download .docx"
                            >
                              {isDownloading
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Download className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <h5 className="text-[13px] font-semibold text-black/85 dark:text-arcus-fg leading-snug tracking-tight mb-1.5">
                            {art.title}
                          </h5>

                          {snippet && (
                            <p className="text-[12px] text-black/45 dark:text-arcus-fg-secondary leading-relaxed line-clamp-2 mb-3">
                              {snippet}{snippet.length === 120 ? '…' : ''}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2.5 border-t border-black/8 dark:border-arcus-border text-[10px] font-mono">
                            <span className="text-black/35 dark:text-white/25 truncate max-w-[55%]">{art.subtitle}</span>
                            <span className="flex items-center gap-1 text-black/35 dark:text-arcus-fg-tertiary group-hover:text-black/55 dark:group-hover:text-arcus-fg-secondary transition-colors shrink-0">
                              Open in Canvas <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {filteredArtifacts.length === 0 && (
                      <div className="py-12 flex flex-col items-center justify-center text-center">
                        <FileText className="w-8 h-8 text-black/20 dark:text-arcus-fg-muted/20 mb-3" />
                        <p className="text-[12px] text-black/35 dark:text-arcus-fg-tertiary font-medium">No results for "{searchQuery}"</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
                  <div className="w-16 h-16 rounded-2xl bg-black/6 dark:bg-arcus-surface border border-black/8 dark:border-arcus-border flex items-center justify-center mb-6">
                    <Sparkles className="w-6 h-6 text-black/25 dark:text-arcus-fg-tertiary animate-pulse" />
                  </div>
                  <h4 className="text-black/70 dark:text-arcus-fg-secondary text-[15px] font-bold tracking-tight mb-2 lowercase">
                    Your library is empty
                  </h4>
                  <p className="text-black/40 dark:text-arcus-fg-tertiary text-[12px] leading-relaxed max-w-[260px]">
                    Documents, plans, and drafts created by Arcus across all your conversations will appear here — searchable and downloadable as .docx.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
