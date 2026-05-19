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
  isSidebarCollapsed,
  messages = []
}: ArtifactsGalleryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [width, setWidth] = useState(540);
  const [isResizing, setIsResizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // ─── Resize Handlers ─────────────────────────────────────────────────────────
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing || window.innerWidth < 768) return;
    const sidebarW = isSidebarCollapsed ? 80 : 256;
    const max = window.innerWidth - sidebarW - 500 - 48;
    const next = window.innerWidth - e.clientX;
    setWidth(Math.max(380, Math.min(next, max)));
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, isSidebarCollapsed]);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingAll(true);
      fetch('/api/arcus/conversation')
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.sessions)) {
            setAllSessions(data.sessions);
          }
        })
        .catch(err => console.error('Error fetching all conversations for artifacts:', err))
        .finally(() => setIsLoadingAll(false));
    }
  }, [isOpen]);

  // ─── Dynamic session artifacts extraction from active messages and previous chats ───
  const dynamicArtifacts: DynamicArtifactItem[] = [];
  const processedMessageIds = new Set<string>();

  const extractFromMessages = (msgs: any[], chatTitle?: string) => {
    if (!Array.isArray(msgs)) return;

    msgs.forEach((msg, index) => {
      const msgKey = msg.id || `${chatTitle || 'chat'}-${index}`;
      if (processedMessageIds.has(msgKey)) return;
      processedMessageIds.add(msgKey);

      if (msg.role === 'assistant' && msg.meta) {
        // 1. Plan Artifact
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
            subtitle: chatTitle ? `From: ${chatTitle}` : `Created from chat`,
            time: msg.time || 'Just now',
            content: { type: 'action_plan', title: plan.title, markdown: rawMarkdown },
            raw: rawMarkdown,
          });
        }
        
        // 2. Canvas Approval Specs
        if (msg.meta.canvasApproval?.canvasData) {
          const cv = msg.meta.canvasApproval.canvasData;
          dynamicArtifacts.push({
            id: `dyn-appr-${msgKey}`,
            type: cv.type || 'workflow',
            tag: 'Mission Spec · JSON',
            title: msg.meta.canvasApproval.title || 'Canvas Workflow Specification',
            subtitle: chatTitle ? `From: ${chatTitle}` : `Extracted from chat`,
            time: msg.time || 'Just now',
            content: cv.content,
            raw: cv.raw || JSON.stringify(cv.content, null, 2)
          });
        }
        
        // 3. Execution/Action Results
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
            subtitle: chatTitle ? `From: ${chatTitle}` : `Extracted from chat`,
            time: msg.time || 'Just now',
            content: cv.content,
            raw: cv.raw || (typeof cv.content === 'string' ? cv.content : JSON.stringify(cv.content, null, 2))
          });
        }
      }
    });
  };

  // First, extract from active chat messages (instant load)
  extractFromMessages(messages, 'Active Session');

  // Next, extract from all previous conversations
  allSessions.forEach(session => {
    extractFromMessages(session.messages, session.title);
  });

  // Filter based on search query
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
    const data: CanvasData = {
      type: art.type,
      title: art.title,
      content: art.content,
      raw: art.raw
    };
    onSelectArtifact(data);
    toast.success(`Opening "${art.title}" in Canvas`);
  };

  const panelWidth = window.innerWidth < 768 ? 'calc(100vw - 24px)' : `${width}px`;

  return (
    <div
      className={cn(
        'h-[calc(100vh-32px)] flex flex-col flex-shrink-0 relative bg-arcus-bg border-l border-arcus-border shadow-2xl rounded-r-[32px] overflow-hidden'
      )}
      style={{ width: panelWidth }}
      ref={scrollRef}
    >
      {/* Premium Grain Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />

      {/* Resize Handle */}
      <div
        onMouseDown={startResizing}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-[100] group/resize hover:bg-arcus-surface-hover transition-colors"
      >
        <div className="absolute left-[2px] top-1/2 -translate-y-1/2 w-[2px] h-8 rounded-full bg-arcus-surface-hover group-hover/resize:bg-white/30 transition-colors" />
      </div>

      {/* Header section */}
      <div className="px-6 py-5 border-b border-arcus-border flex items-center justify-between shrink-0 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-arcus-elevated border border-arcus-border flex items-center justify-center">
            <Library className="w-4 h-4 text-arcus-fg-secondary" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-white tracking-tight lowercase">Library</h3>
            {isLoadingAll ? (
              <p className="text-[10px] text-arcus-fg-muted tracking-tight uppercase flex items-center gap-1.5">
                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Syncing all conversations...
              </p>
            ) : (
              <p className="text-[10px] text-arcus-fg-tertiary tracking-tight uppercase">All conversations</p>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 hover:bg-arcus-surface rounded-xl transition-all text-arcus-fg-tertiary hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input (only shown if there are active artifacts) */}
      {dynamicArtifacts.length > 0 && (
        <div className="px-6 py-4 border-b border-arcus-border shrink-0 relative z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-arcus-fg-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library..."
              className="w-full pl-9 pr-4 py-2 bg-arcus-elevated border border-arcus-border rounded-xl text-[13px] text-white placeholder:text-arcus-fg-muted focus:outline-none focus:border-white/20 transition-all font-medium tracking-tight"
            />
          </div>
        </div>
      )}

      {/* Scrollable Gallery Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 relative z-10 select-none scrollbar-thin scrollbar-thumb-arcus-surface-hover">
        
        {dynamicArtifacts.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold text-arcus-fg-tertiary uppercase tracking-wider">All Documents</h4>
              <span className="text-[10px] text-arcus-fg-muted font-mono">{filteredArtifacts.length} total</span>
            </div>

            {/* Grid Layout of Dynamic Artifacts */}
            <div className="grid grid-cols-1 gap-4">
              {filteredArtifacts.map((art) => {
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
                    className="group p-4 bg-arcus-elevated hover:bg-arcus-elevated border border-arcus-border hover:border-arcus-divider rounded-2xl transition-all duration-200 ease-out cursor-pointer relative"
                  >
                    {/* Top row: tag + download */}
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-arcus-elevated border border-arcus-border text-[9px] font-mono text-arcus-fg-secondary tracking-wide">
                        {art.tag}
                      </span>
                      <button
                        onClick={(e) => handleDownload(e, art)}
                        className="p-1.5 hover:bg-arcus-surface-hover rounded-lg transition-colors text-arcus-fg-muted hover:text-arcus-fg-secondary opacity-0 group-hover:opacity-100"
                        title="Download .docx"
                      >
                        {isDownloading
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Download className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Title */}
                    <h5 className="text-[13px] font-semibold text-white leading-snug tracking-tight mb-1.5">
                      {art.title}
                    </h5>

                    {/* Content preview */}
                    {snippet && (
                      <p className="text-[12px] text-arcus-fg-muted leading-relaxed line-clamp-2 mb-3">
                        {snippet}{snippet.length === 120 ? '…' : ''}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-arcus-border text-[10px] text-arcus-fg-muted font-mono">
                      <span className="truncate max-w-[55%]">{art.subtitle}</span>
                      <span className="flex items-center gap-1 shrink-0 text-arcus-fg-tertiary group-hover:text-arcus-fg-secondary transition-colors">
                        Open in Canvas <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredArtifacts.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <FileText className="w-8 h-8 text-arcus-fg-muted mb-3" />
                  <p className="text-[12px] text-arcus-fg-muted font-medium">No search results matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* PREMIUM MONOCHROMATIC EMPTY STATE */
          <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
            <div className="w-16 h-16 rounded-2xl bg-arcus-elevated border border-arcus-border flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-arcus-fg-muted animate-pulse" />
            </div>
            
            <h4 className="text-white text-[15px] font-bold tracking-tight mb-2 lowercase">
              Your library is empty
            </h4>

            <p className="text-arcus-fg-tertiary text-[12px] leading-relaxed max-w-[280px]">
              Documents, plans, and drafts created by Arcus across all your conversations will appear here — searchable and downloadable as .docx.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
