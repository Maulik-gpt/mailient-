'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X, FileText, Download, Sparkles, BarChart3, Mail,
  Search, Grid, Plus, Check, Play, FileSpreadsheet,
  ChevronRight, ArrowRight, ShieldCheck, Terminal, HelpCircle
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

  // ─── Dynamic session artifacts extraction (strictly from active messages) ───
  const dynamicArtifacts: DynamicArtifactItem[] = [];
  
  messages.forEach((msg, index) => {
    if (msg.role === 'assistant' && msg.meta) {
      // 1. Plan Artifact — supports planCard (new), _planForDocs (new alias), and legacy planArtifact
      const planSource = msg.meta.planCard || msg.meta._planForDocs || msg.meta.planArtifact;
      if (planSource) {
        const plan = planSource;
        // Prefer the flat markdown if available (new format), fall back to reconstructing from steps
        const rawMarkdown = plan.markdown
          || `# ${plan.title || 'Strategic Mission Plan'}\n\nObjective: ${plan.objective || ''}\n\n${plan.steps?.map((s: any, idx: number) => `### Step ${idx + 1}: ${s.action}\n${s.description || s.human_readable || ''}\n`).join('\n') || ''}`;
        dynamicArtifacts.push({
          id: `dyn-plan-${index}`,
          type: 'action_plan',
          tag: 'Plan · MD',
          title: plan.title || 'Strategic Mission Plan',
          subtitle: `Created from chat`,
          time: msg.time || 'Just now',
          content: { type: 'action_plan', title: plan.title, markdown: rawMarkdown },
          raw: rawMarkdown,
        });
      }
      
      // 2. Canvas Approval Specs
      if (msg.meta.canvasApproval?.canvasData) {
        const cv = msg.meta.canvasApproval.canvasData;
        dynamicArtifacts.push({
          id: `dyn-appr-${index}`,
          type: cv.type || 'workflow',
          tag: 'Mission Spec · JSON',
          title: msg.meta.canvasApproval.title || 'Canvas Workflow Specification',
          subtitle: `Extracted from chat`,
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
          id: `dyn-res-${index}`,
          type: cv.type || 'notes',
          tag: fileTag,
          title: msg.meta.result.title || 'Action Results Summary',
          subtitle: `Extracted from chat`,
          time: msg.time || 'Just now',
          content: cv.content,
          raw: cv.raw || (typeof cv.content === 'string' ? cv.content : JSON.stringify(cv.content, null, 2))
        });
      }
    }
  });

  // Filter based on search query
  const filteredArtifacts = dynamicArtifacts.filter(art =>
    art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    art.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownload = (e: React.MouseEvent, art: DynamicArtifactItem) => {
    e.stopPropagation();
    try {
      const blob = new Blob([art.raw], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${art.title.replace(/\s+/g, '_').toLowerCase()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('File download initiated successfully');
    } catch (err) {
      toast.error('Could not download file');
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
        'h-[calc(100vh-32px)] flex flex-col flex-shrink-0 relative bg-black border-l border-white/[0.08] shadow-2xl rounded-r-[32px] overflow-hidden'
      )}
      style={{ width: panelWidth }}
      ref={scrollRef}
    >
      {/* Premium Grain Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />

      {/* Resize Handle */}
      <div
        onMouseDown={startResizing}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-[100] group/resize hover:bg-white/10 transition-colors"
      >
        <div className="absolute left-[2px] top-1/2 -translate-y-1/2 w-[2px] h-8 rounded-full bg-white/10 group-hover/resize:bg-white/30 transition-colors" />
      </div>

      {/* Header section */}
      <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between shrink-0 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <FileText className="w-4 h-4 text-white/80" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-white tracking-tight lowercase">Documents & Artifacts</h3>
            <p className="text-[10px] text-white/40 tracking-tight uppercase">Active session library</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 hover:bg-white/[0.06] rounded-xl transition-all text-white/40 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input (only shown if there are active artifacts) */}
      {dynamicArtifacts.length > 0 && (
        <div className="px-6 py-4 border-b border-white/[0.04] shrink-0 relative z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search session documents..."
              className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all font-medium tracking-tight"
            />
          </div>
        </div>
      )}

      {/* Scrollable Gallery Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 relative z-10 select-none scrollbar-thin scrollbar-thumb-white/10">
        
        {dynamicArtifacts.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Session Artifacts</h4>
              <span className="text-[10px] text-white/30 font-mono">{filteredArtifacts.length} total</span>
            </div>

            {/* Grid Layout of Dynamic Artifacts */}
            <div className="grid grid-cols-1 gap-4">
              {filteredArtifacts.map((art) => (
                <div
                  key={art.id}
                  onClick={() => handleSelect(art)}
                  className="group p-5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/20 rounded-2xl transition-all duration-300 ease-out cursor-pointer relative"
                >
                  <div className="flex items-start justify-between mb-3.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[9px] font-mono text-white/80">
                      {art.tag}
                    </span>
                    <button
                      onClick={(e) => handleDownload(e, art)}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white opacity-0 group-hover:opacity-100"
                      title="Download Raw Source"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h5 className="text-[13px] font-bold text-white leading-snug tracking-tight mb-2">
                    {art.title}
                  </h5>

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] text-[10px] text-white/40 font-mono">
                    <span>{art.subtitle}</span>
                    <span className="flex items-center gap-1">Open in Canvas <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /></span>
                  </div>
                </div>
              ))}

              {filteredArtifacts.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <FileText className="w-8 h-8 text-white/10 mb-3" />
                  <p className="text-[12px] text-white/30 font-medium">No search results matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* PREMIUM MONOCHROMATIC EMPTY STATE */
          <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-white/20 animate-pulse" />
            </div>
            
            <h4 className="text-white text-[15px] font-bold tracking-tight mb-2 lowercase">
              No session documents generated
            </h4>
            
            <p className="text-white/40 text-[12px] leading-relaxed max-w-[280px]">
              When the Arcus agent generates structured spreadsheets, roadmaps, analytics, or drafts in this chat, they will automatically appear here as selectable workspace cards.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
