'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Copy, Check, Edit3, FileText, Mail, Sparkles, ChevronDown, 
  ChevronRight, Calendar, Globe, AlertCircle, ShieldAlert, Send, 
  ArrowRight, Maximize2, Minimize2, BarChart3, Clock, Users, Zap, 
  MoreHorizontal, Monitor, CheckCircle2, Circle, Edit, Terminal,
  Code, Layout, Laptop, GripVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

export type CanvasType = 'email_draft' | 'summary' | 'research' | 'action_plan' | 'reply' | 'notes' | 'meeting_schedule' | 'analytics' | 'workflow' | 'none';

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
}

const typeConfig: Record<CanvasType, { label: string; icon: any; color: string }> = {
    email_draft: { label: 'Draft', icon: <Mail className="w-4 h-4" />, color: '#6366f1' },
    summary: { label: 'Summary', icon: <FileText className="w-4 h-4" />, color: '#8b5cf6' },
    research: { label: 'Research', icon: <Globe className="w-4 h-4" />, color: '#06b6d4' },
    action_plan: { label: 'Plan', icon: <Zap className="w-4 h-4" />, color: '#f59e0b' },
    reply: { label: 'Reply', icon: <Zap className="w-4 h-4" />, color: '#10b981' },
    notes: { label: 'Notes', icon: <Edit3 className="w-4 h-4" />, color: '#ec4899' },
    meeting_schedule: { label: 'Schedule', icon: <Calendar className="w-4 h-4" />, color: '#3b82f6' },
    analytics: { label: 'Analytics', icon: <BarChart3 className="w-4 h-4" />, color: '#f97316' },
    workflow: { label: 'Review', icon: <Layout className="w-4 h-4" />, color: '#a855f7' },
    none: { label: 'Work', icon: <Monitor className="w-4 h-4" />, color: '#a855f7' },
};

export function CanvasPanel({ isOpen, onClose, canvasData, onExecute, isExecuting }: CanvasPanelProps) {
    const [editMode, setEditMode] = useState(false);
    const [editedBody, setEditedBody] = useState('');
    const [copied, setCopied] = useState(false);
    const [width, setWidth] = useState(520);
    const [isResizing, setIsResizing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (canvasData?.type === 'email_draft' && canvasData.content?.body) {
            setEditedBody(canvasData.content.body);
        }
    }, [canvasData]);

    const handleCopy = () => {
        let text = '';
        if (canvasData?.type === 'email_draft' || canvasData?.type === 'reply') {
            text = `Subject: ${canvasData.content.subject || ''}\nTo: ${canvasData.content.to || ''}\n\n${editMode ? editedBody : canvasData.content.body || ''}`;
        } else if (canvasData?.raw) {
            text = canvasData.raw;
        }
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExecute = (action: string) => {
        if (action === 'copy') { handleCopy(); return; }
        if (action === 'cancel') { onClose(); return; }
        if (action === 'revise') { setEditMode(true); return; }

        let payload = canvasData?.content;
        if (canvasData?.type === 'email_draft' || canvasData?.type === 'reply') {
            payload = { ...canvasData.content, body: editMode ? editedBody : canvasData.content.body || '' };
        }

        onExecute(action, payload);
    };

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing) {
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 380 && newWidth < window.innerWidth * 0.8) {
                setWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    if (!isOpen || !canvasData) return null;

    const config = typeConfig[canvasData.type] || typeConfig.none;

    return (
        <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="h-[calc(100vh-24px)] flex flex-col overflow-hidden relative mr-3 my-3 rounded-[32px] bg-[#1c1c1c] border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.6)] z-40 group/canvas selection:bg-blue-500/30"
            style={{ width: `${width}px` }}
        >
            {/* Resize Handle */}
            <div 
                onMouseDown={startResizing}
                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/10 transition-colors z-[100]"
            />

            {/* Manus-style Header */}
            <div className="shrink-0 pt-6 px-6 pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <h2 className="text-[15px] font-bold text-white/95 tracking-tight flex items-center gap-2">
                           Arcus's Computer
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <Monitor className="w-4 h-4 text-white/40 hover:text-white transition-colors cursor-pointer" />
                        <Maximize2 className="w-4 h-4 text-white/40 hover:text-white transition-colors cursor-pointer" />
                        <X className="w-5 h-5 text-white/40 hover:text-white transition-colors cursor-pointer" onClick={onClose} />
                    </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <Edit3 className="w-3 h-3 text-white/30" />
                    <span className="text-[11px] text-white/30 font-medium tracking-tight">
                        Arcus is using Editor <span className="mx-1.5 opacity-40">|</span> 
                        {canvasData.type === 'workflow' ? 'Running mission_plan.py' : `Editing ${canvasData.title?.toLowerCase().replace(/\s+/g, '_') || 'file'}.txt`}
                    </span>
                </div>
            </div>

            {/* Inner Content Window (The "Manus Computer" bit) */}
            <div className="flex-1 px-4 py-4 overflow-hidden flex flex-col">
                <div className="flex-1 bg-black border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
                    {/* Inner Header */}
                    <div className="shrink-0 h-10 flex items-center justify-center border-b border-white/5">
                        <span className="text-[11px] font-mono text-white/40 italic">
                            {canvasData.title?.toLowerCase().replace(/\s+/g, '_') || 'active_mission'}.py
                        </span>
                    </div>

                    {/* Content Scroll Area */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <AnimatePresence mode="wait">
                            {canvasData.type === 'workflow' ? (
                                <motion.div key="workflow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                    {canvasData.content?.steps?.map((step: any, index: number) => (
                                        <div 
                                            key={step.id || index}
                                            className={cn(
                                                "flex items-start gap-4 transition-opacity duration-500",
                                                step.status === 'completed' || step.status === 'active' ? "opacity-100" : "opacity-10"
                                            )}
                                        >
                                            <div className="mt-1 shrink-0">
                                                {step.status === 'completed' ? (
                                                    <CheckCircle2 className="w-5 h-5 text-blue-500/80" />
                                                ) : (
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-full border flex items-center justify-center",
                                                        step.status === 'active' ? "border-white/40 animate-pulse" : "border-white/10"
                                                    )}>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[14px] font-bold text-white/90 truncate">{step.title}</span>
                                                {step.description && step.status === 'active' && (
                                                    <span className="text-[11px] text-white/30 mt-1 leading-relaxed">{step.description}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col font-mono">
                                    {canvasData.type === 'email_draft' || canvasData.type === 'reply' ? (
                                        <div className="space-y-4 text-[13px] leading-relaxed">
                                            <div className="flex gap-4 border-b border-white/5 pb-2">
                                                <span className="text-white/20 uppercase tracking-tighter">To</span>
                                                <span className="text-white/60">{canvasData.content.to}</span>
                                            </div>
                                            <div className="flex gap-4 border-b border-white/5 pb-2">
                                                <span className="text-white/20 uppercase tracking-tighter">Sub</span>
                                                <span className="text-white/90">{canvasData.content.subject}</span>
                                            </div>
                                            <div className="pt-4 text-white/80 whitespace-pre-wrap">
                                                {editMode ? (
                                                    <textarea
                                                        value={editedBody}
                                                        onChange={(e) => setEditedBody(e.target.value)}
                                                        className="w-full bg-transparent border-none focus:outline-none min-h-[300px] resize-none"
                                                        autoFocus
                                                    />
                                                ) : canvasData.content.body}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center opacity-20">
                                            <Terminal className="w-12 h-12" />
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Inner Window Footer (Progress Bar) */}
                    <div className="shrink-0 p-4 border-t border-white/5 bg-black">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 shrink-0">
                                <Clock className="w-4 h-4 text-white/20" />
                                <ChevronRight className="w-4 h-4 text-white/20" />
                            </div>
                            <div className="flex-1 h-[2px] bg-white/5 rounded-full relative overflow-hidden">
                                <motion.div 
                                    className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${(canvasData.content?.steps?.filter((s: any) => s.status === 'completed').length || 1) / (canvasData.content?.steps?.length || 5) * 100}%` }}
                                    transition={{ duration: 1 }}
                                />
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Live</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="shrink-0 h-14 px-6 border-t border-white/5 flex items-center justify-between text-white/30">
                <div className="flex items-center gap-3">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium truncate max-w-[300px]">
                        Automating mission workflows and data synthesis for {canvasData.title || 'the objective'}...
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[11px] font-mono tracking-widest">
                        {canvasData.content?.steps?.filter((s: any) => s.status === 'completed').length || 0} / {canvasData.content?.steps?.length || 0}
                    </span>
                    <ChevronDown className="w-4 h-4 rotate-180 hover:text-white transition-colors cursor-pointer" />
                </div>
            </div>

            {/* Float Action Controls (only for actionable types) */}
            {(canvasData.type === 'email_draft' || canvasData.type === 'reply') && (
                <div className="absolute right-8 bottom-20 flex gap-3">
                    <button 
                        onClick={() => handleExecute('send_email')}
                        className="h-10 px-6 bg-white text-black text-[12px] font-bold rounded-full shadow-2xl hover:bg-neutral-200 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <span>Execute Mission</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    {!editMode ? (
                        <button 
                            onClick={() => setEditMode(true)}
                            className="w-10 h-10 bg-[#2a2a2a] border border-white/10 text-white/60 hover:text-white rounded-full flex items-center justify-center transition-all shadow-xl"
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>
                    ) : (
                        <button 
                            onClick={() => setEditMode(false)}
                            className="h-10 px-6 bg-[#2a2a2a] border border-white/10 text-white font-bold rounded-full flex items-center justify-center text-[12px] shadow-xl"
                        >
                            Done
                        </button>
                    )}
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
            `}</style>
        </motion.div>
    );
}
