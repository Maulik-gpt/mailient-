'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Copy, Check, Edit3, FileText, Mail, ListChecks, Sparkles, ChevronDown, ChevronRight, Maximize2, Minimize2, Calendar, LayoutGrid, BarChart3, Clock, User2, MapPin, Globe, ExternalLink, AlertCircle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

export type CanvasType = 'email_draft' | 'summary' | 'research' | 'action_plan' | 'reply' | 'notes' | 'meeting_schedule' | 'analytics' | 'none';

export interface CanvasSection {
    id: string;
    title: string;
    tag?: string;
    content: string;
    expanded?: boolean;
}

export interface CanvasData {
    type: CanvasType;
    title?: string;
    content: any;
    sections?: CanvasSection[];
    actions?: { actionType: string; label?: string; requiresApproval?: boolean }[];
    approvalTokens?: Record<string, string>;
    goal?: string;
    decisionSummary?: string;
    riskFlags?: string[];
    riskLevel?: 'low' | 'medium' | 'high';
    confidence?: number;
    requiredInputs?: string[];
    missingInputs?: string[];
    sources?: { threadId?: string | null; messageId?: string | null; sender?: string; timestamp?: string | null; subject?: string }[];
    recommendedAction?: string | null;
    alternatives?: string[];
    actionPayload?: unknown;
    approval?: {
        required: boolean;
        token?: string | null;
        expiresAt?: string | null;
        reason?: string | null;
    };
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

const typeLabels: Record<CanvasType, string> = {
    email_draft: 'Email draft',
    summary: 'Summary',
    research: 'Research',
    action_plan: 'Action plan',
    reply: 'Reply',
    notes: 'Notes',
    meeting_schedule: 'Schedule',
    analytics: 'Analytics',
    none: 'Canvas',
};

const actionPriority: Record<string, number> = {
    send_email: 1,
    schedule_meeting: 1,
    save_draft: 2,
    execute_plan: 3,
    apply_changes: 4,
    revise: 5,
    cancel: 6
};

const actionLabelMap: Record<string, string> = {
    send_email: 'Send Email',
    schedule_meeting: 'Confirm Meeting',
    save_draft: 'Save Draft',
    execute_plan: 'Execute Task',
    apply_changes: 'Apply Changes',
    revise: 'Revise',
    cancel: 'Cancel'
};

export function CanvasPanel({ isOpen, onClose, canvasData, onExecute, isExecuting }: CanvasPanelProps) {
    const [editMode, setEditMode] = useState(false);
    const [editedBody, setEditedBody] = useState('');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [copied, setCopied] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<'google' | 'cal'>('google');
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (canvasData?.type === 'email_draft' && canvasData.content?.body) {
            setEditedBody(canvasData.content.body);
        }
        if (canvasData?.sections) {
            setExpandedSections(new Set(canvasData.sections.map((s) => s.id)));
        }
    }, [canvasData]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const toggleSection = (id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleCopy = () => {
        let text = '';
        if (canvasData?.type === 'email_draft') {
            text = `Subject: ${canvasData.content.subject || ''}\nTo: ${canvasData.content.to || ''}\n\n${editMode ? editedBody : canvasData.content.body || ''}`;
        } else if (canvasData?.sections && canvasData.sections.length > 0) {
            text = canvasData.sections.map((s) => `${s.title}${s.tag ? ` [${s.tag}]` : ''}\n${s.content}`).join('\n\n');
        } else if (canvasData?.raw) {
            text = canvasData.raw;
        }
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExecute = (action: string) => {
        if (action === 'copy') {
            handleCopy();
            return;
        }
        if (action === 'cancel') {
            onClose();
            return;
        }
        if (action === 'revise') {
            setEditMode(true);
            return;
        }

        let payload = canvasData?.actionPayload || canvasData?.content;
        
        if (canvasData?.type === 'email_draft') {
            payload = { ...canvasData.content, body: editMode ? editedBody : canvasData.content.body || '' };
        } else if (canvasData?.type === 'meeting_schedule') {
            payload = { ...canvasData.content, provider: selectedProvider };
        }

        onExecute(action, payload);
    };

    if (!isOpen || !canvasData) return null;

    const title = canvasData.title || typeLabels[canvasData.type] || 'Canvas';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-graphite-bg/70 backdrop-blur-[3px] z-[60] cursor-pointer"
                    />

                    {/* Panel */}
                    <motion.div
                        ref={panelRef}
                        initial={{ x: '100%', opacity: 0.5 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0.5 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 220, mass: 1 }}
                        className={`fixed right-0 top-0 h-screen ${isFullscreen ? 'w-screen' : 'w-full md:w-[58vw] max-w-[900px] min-w-full md:min-w-[480px]'} bg-graphite-bg border-l border-graphite-border z-[70] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-canvas-slide-in`}
                    >
                        {/* Apple-style Grain Overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150 z-0"></div>

                        {/* Top Navigation Bar */}
                        <div className="relative z-10 flex items-center justify-between px-10 py-5 bg-graphite-surface/50 backdrop-blur-3xl border-b border-white/[0.04]">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-white/60 animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.15)]" />
                                    <span className="text-[11px] tracking-widest text-graphite-muted uppercase leading-none">Arcus Canvas</span>
                                </div>
                                <div className="h-4 w-px bg-white/10" />
                                <div className="flex items-center gap-2">
                                    <LayoutGrid className="w-3 h-3 text-graphite-muted-2" />
                                    <span className="text-[10px] text-graphite-muted-2 tracking-wider">Workspace</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="flex bg-white/[0.03] rounded-full p-1 border border-white/[0.06]">
                                    <button
                                        onClick={() => setIsFullscreen(false)}
                                        className={`p-1.5 rounded-full transition-all ${!isFullscreen ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
                                    >
                                        <Minimize2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setIsFullscreen(true)}
                                        className={`p-1.5 rounded-full transition-all ${isFullscreen ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
                                    >
                                        <Maximize2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white group"
                                >
                                    <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                                </button>
                            </div>
                        </div>

                        {/* Main Interaction Area */}
                        <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar scroll-smooth">
                            <div className="max-w-[720px] mx-auto w-full px-10 py-16 pb-32">
                                
                                {/* Header Section */}
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: 0.1 }}
                                    className="mb-14"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-graphite-muted-2 uppercase tracking-tight bg-white/[0.02] border border-graphite-border px-3 py-1 rounded-full">
                                                {canvasData.type.replace('_', ' ')}
                                            </span>
                                            {canvasData.confidence !== undefined && (
                                                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    <span className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-widest">{canvasData.confidence}% Confidence</span>
                                                </div>
                                            )}
                                            {canvasData.riskLevel && (
                                                <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border ${
                                                    canvasData.riskLevel === 'high' ? 'bg-red-500/5 border-red-500/10 text-red-500/80' : 
                                                    canvasData.riskLevel === 'medium' ? 'bg-amber-500/5 border-amber-500/10 text-amber-500/80' : 
                                                    'bg-blue-500/5 border-blue-500/10 text-blue-500/80'
                                                }`}>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">{canvasData.riskLevel} Risk</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <h2 className="text-graphite-text text-5xl font-light tracking-tight leading-[1.1] mb-6 arcus-typography">
                                        {title}
                                    </h2>
                                    {canvasData.goal && (
                                        <p className="text-graphite-muted text-lg font-light leading-relaxed max-w-xl arcus-typography">
                                            {canvasData.goal}
                                        </p>
                                    )}
                                </motion.div>

                                {/* Banners Area */}
                                <AnimatePresence>
                                    <div className="space-y-4 mb-14">
                                        {canvasData.approval?.required && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 flex items-start gap-4"
                                            >
                                                <div className="p-2 bg-amber-500/20 rounded-xl text-amber-500">
                                                    <ShieldAlert className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-amber-500 font-bold text-sm mb-1 uppercase tracking-tight">Approval Required</h4>
                                                    <p className="text-amber-200/60 text-sm leading-relaxed">{canvasData.approval.reason || 'This action requires your confirmation before proceeding.'}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                        
                                        {canvasData.missingInputs && canvasData.missingInputs.length > 0 && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 flex items-start gap-4"
                                            >
                                                <div className="p-2 bg-red-500/20 rounded-xl text-red-500">
                                                    <AlertCircle className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-red-500 font-bold text-sm mb-1 uppercase tracking-tight">Required Information Missing</h4>
                                                    <p className="text-red-200/60 text-sm leading-relaxed">
                                                        Please provide the following to continue: <span className="font-bold text-red-400">{canvasData.missingInputs.join(', ')}</span>
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </AnimatePresence>

                                {/* Task Specific Content */}
                                <div className="space-y-12">
                                    
                                    {/* MEETING SCHEDULER */}
                                    {canvasData.type === 'meeting_schedule' && canvasData.content && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="space-y-8"
                                        >
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 hover:bg-white/[0.03] transition-all group/card">
                                                    <div className="flex items-center gap-3 mb-4 text-white/30">
                                                        <User2 className="w-4 h-4" />
                                                        <span className="text-[10px] tracking-widest uppercase">Participants</span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="text-white text-lg font-medium">{canvasData.content.attendees?.[0] || 'Unknown'}</div>
                                                        <div className="text-white/40 text-sm">{canvasData.content.attendees?.slice(1).join(', ')}</div>
                                                    </div>
                                                </div>
                                                <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 hover:bg-white/[0.03] transition-all group/card">
                                                    <div className="flex items-center gap-3 mb-4 text-white/30">
                                                        <Calendar className="w-4 h-4" />
                                                        <span className="text-[10px] tracking-widest uppercase">Scheduled time</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-white text-lg font-medium">{canvasData.content.date || 'To be selected'}</div>
                                                        <div className="text-white/40 text-sm">{canvasData.content.time || ''}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Provider Selection */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 text-white/30">
                                                    <Globe className="w-4 h-4" />
                                                    <span className="text-[10px] tracking-widest uppercase">Select provider</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button 
                                                        onClick={() => setSelectedProvider('google')}
                                                        className={`flex items-center justify-between px-6 py-5 rounded-2xl border transition-all ${selectedProvider === 'google' ? 'bg-white text-black border-white' : 'bg-white/[0.02] border-white/[0.1] text-white/60 hover:border-white/20'}`}
                                                    >
                                                        <span className="font-semibold tracking-tight">Google Meet</span>
                                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedProvider === 'google' ? 'border-black' : 'border-white/20'}`}>
                                                            {selectedProvider === 'google' && <div className="w-2 h-2 bg-black rounded-full" />}
                                                        </div>
                                                    </button>
                                                    <button 
                                                        onClick={() => setSelectedProvider('cal')}
                                                        className={`flex items-center justify-between px-6 py-5 rounded-2xl border transition-all ${selectedProvider === 'cal' ? 'bg-white text-black border-white' : 'bg-white/[0.02] border-white/[0.1] text-white/60 hover:border-white/20'}`}
                                                    >
                                                        <span className="font-semibold tracking-tight">Cal.com</span>
                                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedProvider === 'cal' ? 'border-black' : 'border-white/20'}`}>
                                                            {selectedProvider === 'cal' && <div className="w-2 h-2 bg-black rounded-full" />}
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Details Accordion */}
                                            <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl overflow-hidden">
                                                <div className="px-8 py-6 border-b border-white/[0.04]">
                                                    <h4 className="text-white/80 font-medium mb-1">Meeting Details</h4>
                                                    <p className="text-white/40 text-sm">Review the invitation content before confirming.</p>
                                                </div>
                                                <div className="p-8 space-y-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-white/20 uppercase tracking-widest">Title</label>
                                                        <div className="text-white bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm">
                                                            {canvasData.content.subject || 'Meeting with Arcus'}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-white/20 uppercase tracking-widest">Agenda</label>
                                                        <div className="text-white/60 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-4 text-sm leading-relaxed whitespace-pre-wrap">
                                                            {canvasData.content.agenda || canvasData.content.description || 'No agenda provided.'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* ANALYTICS */}
                                    {canvasData.type === 'analytics' && canvasData.content && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="space-y-10"
                                        >
                                            <div className="h-[300px] w-full bg-white/[0.02] border border-white/[0.06] rounded-3xl p-8">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={canvasData.content.data || []}>
                                                        <defs>
                                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.2}/>
                                                                <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0}/>
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#FFFFFF05" vertical={false} />
                                                        <XAxis 
                                                            dataKey="name" 
                                                            stroke="#FFFFFF20" 
                                                            fontSize={10} 
                                                            tickLine={false} 
                                                            axisLine={false}
                                                            tick={{ fill: '#FFFFFF40' }}
                                                        />
                                                        <YAxis 
                                                            stroke="#FFFFFF20" 
                                                            fontSize={10} 
                                                            tickLine={false} 
                                                            axisLine={false}
                                                            tick={{ fill: '#FFFFFF40' }}
                                                        />
                                                        <RechartsTooltip 
                                                            contentStyle={{ backgroundColor: '#1A1A1C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px' }}
                                                            itemStyle={{ color: '#FFFFFF' }}
                                                        />
                                                        <Area 
                                                            type="monotone" 
                                                            dataKey="value" 
                                                            stroke="#FFFFFF" 
                                                            strokeWidth={2}
                                                            fillOpacity={1} 
                                                            fill="url(#colorValue)" 
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>

                                            <div className="grid grid-cols-3 gap-6">
                                                {canvasData.content.stats?.map((stat: any, i: number) => (
                                                    <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                                                        <div className="text-white/30 text-[10px] tracking-widest uppercase mb-1">{stat.label}</div>
                                                        <div className="text-white text-2xl font-light">{stat.value}</div>
                                                        <div className={`text-[10px] mt-2 ${stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {stat.trend === 'up' ? '↑' : '↓'} {stat.percentage}%
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* EMAIL DRAFT */}
                                    {canvasData.type === 'email_draft' && canvasData.content && (
                                        <div className="space-y-8">
                                            <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-8 space-y-6">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-4 py-3 border-b border-white/[0.03]">
                                                        <span className="text-white/20 text-[10px] w-16 uppercase tracking-widest">To:</span>
                                                        <span className="text-white/80 font-medium">{canvasData.content.to || 'Unknown'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 py-3 border-b border-white/[0.03]">
                                                        <span className="text-white/20 text-[10px] w-16 uppercase tracking-widest">Subject:</span>
                                                        <span className="text-white font-medium">{canvasData.content.subject || 'Untitled'}</span>
                                                    </div>
                                                </div>

                                                <div className="relative pt-4">
                                                    {editMode ? (
                                                        <textarea
                                                            value={editedBody}
                                                            onChange={(e) => setEditedBody(e.target.value)}
                                                            className="w-full min-h-[450px] bg-white/[0.02] border border-white/[0.08] rounded-2xl p-8 text-white/90 text-lg leading-[1.7] resize-none focus:outline-none focus:border-white/20 font-sans transition-all selection:bg-white/10"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <div className="text-white/80 text-xl font-light leading-[1.8] whitespace-pre-wrap font-sans tracking-tight selection:bg-white/20 p-2">
                                                            {canvasData.content.body}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {canvasData.content.attachments?.length > 0 && (
                                                <div className="flex flex-wrap gap-3">
                                                    {canvasData.content.attachments.map((file: any, i: number) => (
                                                        <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-full text-white/60 text-xs">
                                                            <FileText className="w-3 h-3" />
                                                            {file.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* GENERIC SECTIONS VIEW */}
                                    {canvasData.type !== 'email_draft' && canvasData.type !== 'meeting_schedule' && canvasData.type !== 'analytics' && (
                                        <div className="space-y-6">
                                            {canvasData.sections?.map((section) => (
                                                <div 
                                                    key={section.id}
                                                    className="bg-white/[0.02] border border-white/[0.06] rounded-3xl overflow-hidden group/section"
                                                >
                                                    <button 
                                                        onClick={() => toggleSection(section.id)}
                                                        className="w-full px-8 py-6 flex items-center justify-between text-left group-hover/section:bg-white/[0.01] transition-all"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-2 rounded-xl bg-white/[0.03] text-white/40 group-hover/section:text-white transition-all ${expandedSections.has(section.id) ? 'rotate-90' : ''}`}>
                                                                <ChevronRight className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-white font-medium tracking-tight">{section.title}</h4>
                                                                {section.tag && (
                                                                    <span className="text-[9px] text-white/20 uppercase tracking-tight">{section.tag}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                    <AnimatePresence>
                                                        {expandedSections.has(section.id) && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="px-10 pb-10 pt-2">
                                                                    <div className="text-white/60 text-lg font-light leading-relaxed prose prose-invert max-w-none">
                                                                        {section.content}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            ))}
                                            
                                            {/* RAW TEXT FALLBACK */}
                                            {(!canvasData.sections || canvasData.sections.length === 0) && canvasData.raw && (
                                                <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-10">
                                                    <p className="text-white/70 text-lg font-light leading-relaxed whitespace-pre-wrap">
                                                        {canvasData.raw}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>

                        {/* Action Dock (Fixed at bottom) */}
                        <div className="relative z-20 mt-auto border-t border-graphite-border bg-graphite-bg/80 backdrop-blur-3xl px-10 py-8">
                            <div className="max-w-[720px] mx-auto flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={handleCopy}
                                        className="flex items-center gap-3 h-12 px-6 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-graphite-border text-graphite-muted-2 hover:text-graphite-text transition-all group"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 transition-transform group-hover:scale-110" />}
                                        <span className="text-xs font-medium tracking-tight uppercase">{copied ? 'Copied' : 'Copy data'}</span>
                                    </button>
                                    
                                    {(canvasData.type === 'email_draft' || canvasData.type === 'meeting_schedule') && (
                                        <button
                                            onClick={() => setEditMode(!editMode)}
                                            className={`flex items-center gap-3 h-12 px-6 rounded-2xl border transition-all ${editMode ? 'bg-white text-black border-white' : 'bg-white/[0.03] border-graphite-border text-graphite-muted-2 hover:text-graphite-text'}`}
                                        >
                                            <Edit3 className="w-4 h-4" />
                                            <span className="text-xs font-medium tracking-tight uppercase">{editMode ? 'Finish editing' : 'Revise details'}</span>
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={onClose}
                                        className="h-12 px-8 rounded-2xl text-graphite-muted-2 hover:text-graphite-text transition-all text-sm font-medium"
                                    >
                                        Dismiss
                                    </button>
                                    
                                    {/* Primary Action Button */}
                                    {canvasData.actions?.length ? (
                                        canvasData.actions.filter(a => a.actionType !== 'cancel' && a.actionType !== 'revise').map((action) => (
                                            <button
                                                key={action.actionType}
                                                onClick={() => handleExecute(action.actionType)}
                                                disabled={isExecuting || (canvasData.missingInputs && canvasData.missingInputs.length > 0)}
                                                className="flex items-center gap-3 h-14 px-10 rounded-2xl bg-white text-black hover:bg-neutral-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] disabled:opacity-30 disabled:cursor-not-allowed group font-bold tracking-tight"
                                            >
                                                {isExecuting ? (
                                                    <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                ) : (
                                                    <Sparkles className="w-5 h-5 text-black/40 group-hover:scale-110 transition-transform" />
                                                )}
                                                <span>{isExecuting ? 'Processing...' : (action.label || actionLabelMap[action.actionType] || 'Execute')}</span>
                                            </button>
                                        ))
                                    ) : (
                                        <button
                                            onClick={() => handleExecute('default')}
                                            disabled={isExecuting || (canvasData.missingInputs && canvasData.missingInputs.length > 0)}
                                            className="flex items-center gap-3 h-14 px-10 rounded-2xl bg-white text-black hover:bg-neutral-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] disabled:opacity-30 disabled:cursor-not-allowed group font-bold tracking-tight"
                                        >
                                            <Sparkles className="w-5 h-5 text-black/40 group-hover:scale-110 transition-transform" />
                                            <span>Complete Task</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Error Notification */}
                        <AnimatePresence>
                            {canvasData.error && (
                                <motion.div 
                                    initial={{ y: 100, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 100, opacity: 0 }}
                                    className="absolute bottom-32 left-10 right-10 z-[100]"
                                >
                                    <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-xl rounded-2xl p-6 flex items-start gap-4 shadow-2xl">
                                        <div className="p-2 bg-red-500/20 rounded-xl text-red-500">
                                            <AlertCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-red-500 font-bold text-sm mb-1 uppercase tracking-tight">System Exception</h4>
                                            <p className="text-red-200/60 text-sm leading-relaxed">{canvasData.error}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.12);
                }
            `}</style>
        </AnimatePresence>
    );
}
