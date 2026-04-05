'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Copy, Check, Edit3, FileText, Mail, Sparkles, ChevronDown, 
  ChevronRight, Calendar, Globe, AlertCircle, ShieldAlert, Send, 
  ArrowRight, BarChart3, Clock, Users, Zap, 
  MoreHorizontal, CheckCircle2, Circle, Edit, Terminal,
  Code, Layout, Laptop, GripVertical, ChevronLeft, Presentation,
  LineChart, PieChart, TrendingUp, Info, ListTodo, AlertTriangle, 
  Target, HelpCircle, Shield, Play, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { ExecutionTimeline } from './ExecutionTimeline';
import { ActionOutputCards } from './ActionOutputCards';
import { CanvasArtifacts } from './CanvasArtifacts';
import { NextActionControls } from './NextActionControls';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell, 
  AreaChart, Area 
} from 'recharts';

export type CanvasType = 'email_draft' | 'summary' | 'research' | 'action_plan' | 'reply' | 'notes' | 'meeting_schedule' | 'analytics' | 'workflow' | 'execution' | 'artifacts' | 'action_outputs' | 'next_actions' | 'none';

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
    execution: { label: 'Execution', icon: <Play className="w-4 h-4" />, color: '#3b82f6' },
    artifacts: { label: 'Artifacts', icon: <FileText className="w-4 h-4" />, color: '#8b5cf6' },
    action_outputs: { label: 'Results', icon: <CheckCircle2 className="w-4 h-4" />, color: '#10b981' },
    next_actions: { label: 'Next Steps', icon: <ArrowRight className="w-4 h-4" />, color: '#f59e0b' },
    none: { label: 'Work', icon: <Sparkles className="w-4 h-4" />, color: '#a855f7' },
};

export function CanvasPanel({ isOpen, onClose, canvasData, onExecute, isExecuting, isSidebarCollapsed, onSendToChat }: CanvasPanelProps) {
    const [editMode, setEditMode] = useState(false);
    const [editedBody, setEditedBody] = useState('');
    const [copied, setCopied] = useState(false);
    const [width, setWidth] = useState(520);
    const [isResizing, setIsResizing] = useState(false);
    const [deckIndex, setDeckIndex] = useState(0);
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
            const sidebarWidth = isSidebarCollapsed ? 80 : 256;
            const chatMinWidth = 500;
            const paddingAndGap = 48; // 32px padding (p-4 * 2) + 16px gap (gap-4)
            const maxAllowedWidth = window.innerWidth - sidebarWidth - chatMinWidth - paddingAndGap;
            
            const newWidth = window.innerWidth - e.clientX;
            // Clamp between reasonable min (380) and derived max
            if (newWidth > 380 && newWidth < maxAllowedWidth) {
                setWidth(newWidth);
            } else if (newWidth >= maxAllowedWidth) {
                setWidth(maxAllowedWidth);
            }
        }
    }, [isResizing, isSidebarCollapsed]);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    if (!isOpen || !canvasData) return null;

    return (
        <div
            className="h-full flex flex-col overflow-hidden relative flex-shrink-0 bg-neutral-100 dark:bg-[#161616] border-l border-white/[0.05] z-50 group/canvas selection:bg-blue-500/30"
            style={{ width: `${width}px` }}
        >
            {/* Resize Handle */}
            <div 
                onMouseDown={startResizing}
                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10 transition-colors z-[100]"
            />

            {/* Premium Header - Reusing Chat Interface Design Language */}
            <div className="shrink-0 pt-6 px-6 pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <h2 className="text-[15px] font-bold text-black/95 dark:text-white/95 tracking-tight flex items-center gap-2">
                           Arcus's Computer
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        {canvasData.type === 'analytics' && onSendToChat && (
                            <button 
                                onClick={() => onSendToChat("Can you explain the current analytics trends for my emails?")}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[11px] font-bold rounded-lg transition-all border border-blue-500/20"
                            >
                                <Info className="w-3.5 h-3.5" />
                                <span>Explain Chart</span>
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 rounded-lg transition-all text-black/40 dark:text-white/40 hover:text-black dark:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Inner Content Window (The "Arcus Computer" bit) */}
            <div className="flex-1 px-4 py-4 overflow-hidden flex flex-col">
                <div className="flex-1 bg-white dark:bg-black border border-neutral-200 dark:border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
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
                                                        step.status === 'active' ? "border-white/40 animate-pulse" : "border-neutral-200 dark:border-white/10"
                                                    )}>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-black/[0.020] dark:bg-white/40" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[14px] font-bold text-black/90 dark:text-white/90 truncate">{step.title}</span>
                                                {step.description && step.status === 'active' && (
                                                    <span className="text-[11px] text-black/30 dark:text-white/30 mt-1 leading-relaxed">{step.description}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            ) : canvasData.type === 'summary' ? (
                                <div className="h-full flex flex-col">
                                    <div className="shrink-0 flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-2">
                                            <Presentation className="w-4 h-4 text-blue-400" />
                                            <span className="text-[11px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Email Summary Deck</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button 
                                            disabled={deckIndex === 0}
                                            onClick={() => setDeckIndex(p => Math.max(0, p - 1))}
                                            className="w-8 h-8 rounded-lg bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 flex items-center justify-center hover:bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10 disabled:opacity-20 transition-all"
                                          >
                                            <ChevronLeft className="w-4 h-4 text-black dark:text-white" />
                                          </button>
                                          <span className="text-[12px] font-mono text-black/60 dark:text-white/60">{deckIndex + 1} / {canvasData.content?.items?.length || 1}</span>
                                          <button 
                                            disabled={deckIndex >= (canvasData.content?.items?.length || 1) - 1}
                                            onClick={() => setDeckIndex(p => Math.min((canvasData.content?.items?.length || 1) - 1, p + 1))}
                                            className="w-8 h-8 rounded-lg bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 flex items-center justify-center hover:bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10 disabled:opacity-20 transition-all"
                                          >
                                            <ChevronRight className="w-4 h-4 text-black dark:text-white" />
                                          </button>
                                        </div>
                                    </div>

                                    <AnimatePresence mode="wait">
                                      <motion.div 
                                        key={deckIndex}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="flex-1 flex flex-col items-center justify-center text-center px-8"
                                      >
                                          <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                                            <Sparkles className="w-8 h-8 text-blue-400" />
                                          </div>
                                          <h3 className="text-[20px] font-bold text-black dark:text-white mb-2 leading-tight">
                                            {canvasData.content?.items?.[deckIndex]?.subject || 'Email Summary'}
                                          </h3>
                                          <p className="text-[14px] text-black/5 dark:text-black/50 dark:text-white/50 leading-relaxed font-mono">
                                            {canvasData.content?.items?.[deckIndex]?.summary || 'No summary available for this item.'}
                                          </p>
                                          {canvasData.content?.items?.[deckIndex]?.sender && (
                                            <div className="mt-8 flex items-center gap-3">
                                              <div className="px-4 py-2 bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 rounded-full border border-neutral-200 dark:border-white/5 text-[11px] text-black/40 dark:text-white/40 font-mono">
                                                From: {canvasData.content.items[deckIndex].sender}
                                              </div>
                                              {canvasData.content?.items?.[deckIndex]?.priority && (
                                                <div className={cn(
                                                  "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                                                  canvasData.content.items[deckIndex].priority === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                  canvasData.content.items[deckIndex].priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                )}>
                                                  {canvasData.content.items[deckIndex].priority}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                      </motion.div>
                                    </AnimatePresence>
                                </div>
                            ) : canvasData.type === 'action_plan' ? (
                                <PlanArtifactView 
                                    content={canvasData.content} 
                                    onExecute={onExecute}
                                    isExecuting={isExecuting}
                                />
                            ) : canvasData.type === 'analytics' ? (
                                <div className="h-full flex flex-col space-y-8 overflow-y-auto pr-2 custom-scrollbar">
                                  {/* Dynamic Stats Row */}
                                  <div className="grid grid-cols-2 gap-4">
                                    {(canvasData.content?.stats || []).map((stat: any, i: number) => (
                                      <div key={i} className="p-5 bg-white/[0.03] border border-neutral-200 dark:border-white/5 rounded-2xl">
                                        <div className="flex items-center gap-2 mb-2 text-black/30 dark:text-white/30">
                                          {stat.changeDirection === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                                          <span className="text-[10px] font-bold uppercase tracking-widest">{stat.label}</span>
                                        </div>
                                        <div className="text-[24px] font-bold text-black dark:text-white">{stat.value}</div>
                                        {stat.change && (
                                          <div className={cn("text-[10px] mt-1 font-mono", stat.changeDirection === 'up' ? 'text-emerald-400' : stat.changeDirection === 'down' ? 'text-red-400' : 'text-blue-400')}>
                                            {stat.change}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>

                                  {/* Dynamic Area Chart */}
                                  {canvasData.content?.areaChart && (
                                    <div className="p-6 bg-white dark:bg-black border border-neutral-200 dark:border-white/5 rounded-2xl h-[280px]">
                                      <div className="flex items-center justify-between mb-6">
                                        <div className="text-[12px] font-bold text-black dark:text-white flex items-center gap-2">
                                          <LineChart className="w-4 h-4 text-emerald-400" />
                                          {canvasData.content.areaChart.label || 'Trend Overview'}
                                        </div>
                                      </div>
                                      <div className="h-full w-full pb-8">
                                        <ResponsiveContainer width="100%" height="100%">
                                          <AreaChart data={canvasData.content.areaChart.data || []}>
                                            <defs>
                                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                              </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={10} axisLine={false} tickLine={false} />
                                            <YAxis hide />
                                            <RechartsTooltip 
                                              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px' }}
                                              itemStyle={{ color: '#fff' }}
                                            />
                                            <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                                          </AreaChart>
                                        </ResponsiveContainer>
                                      </div>
                                    </div>
                                  )}

                                  {/* Dynamic Pie Chart */}
                                  {canvasData.content?.pieChart && (
                                    <div className="p-6 bg-white/[0.02] rounded-2xl border border-neutral-200 dark:border-white/5">
                                      <div className="text-[12px] font-bold text-black dark:text-white mb-4 flex items-center gap-2">
                                        <PieChart className="w-4 h-4 text-blue-400" />
                                        {canvasData.content.pieChart.label || 'Distribution'}
                                      </div>
                                      <div className="flex items-center gap-8">
                                        <div className="w-[120px] h-[120px]">
                                          <ResponsiveContainer width="100%" height="100%">
                                            <RePieChart>
                                              <Pie
                                                data={canvasData.content.pieChart.data || []}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={60}
                                                paddingAngle={5}
                                                dataKey="value"
                                              >
                                                {(canvasData.content.pieChart.data || []).map((_: any, index: number) => (
                                                  <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][index % 5]} />
                                                ))}
                                              </Pie>
                                            </RePieChart>
                                          </ResponsiveContainer>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                          {(canvasData.content.pieChart.data || []).map((seg: any, i: number) => {
                                            const total = (canvasData.content.pieChart.data || []).reduce((sum: number, d: any) => sum + (d.value || 0), 0);
                                            const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
                                            const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500'];
                                            return (
                                              <div key={i} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <div className={cn("w-2 h-2 rounded-full", colors[i % colors.length])} />
                                                  <span className="text-[11px] text-black/70 dark:text-white/70">{seg.name}</span>
                                                </div>
                                                <span className="text-[11px] font-mono text-black/40 dark:text-white/40">{pct}%</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                            ) : (
                                <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col font-mono">
                                    {canvasData.type === 'email_draft' || canvasData.type === 'reply' ? (
                                        <div className="space-y-4 text-[13px] leading-relaxed">
                                            <div className="flex gap-4 border-b border-neutral-200 dark:border-white/5 pb-2">
                                                <span className="text-black/20 dark:text-white/20 uppercase tracking-tighter">To</span>
                                                <span className="text-black/60 dark:text-white/60">{canvasData.content.to}</span>
                                            </div>
                                            <div className="flex gap-4 border-b border-neutral-200 dark:border-white/5 pb-2">
                                                <span className="text-black/20 dark:text-white/20 uppercase tracking-tighter">Sub</span>
                                                <span className="text-black/90 dark:text-white/90">{canvasData.content.subject}</span>
                                            </div>
                                            <div className="pt-4 text-black/80 dark:text-white/80 whitespace-pre-wrap">
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
                                    ) : canvasData.type === 'execution' ? (
                                        <ExecutionTimeline 
                                            steps={canvasData.content?.steps || []}
                                            currentStepId={canvasData.content?.currentStepId}
                                            overallProgress={canvasData.content?.progress || 0}
                                            runStatus={canvasData.content?.runStatus || 'initializing'}
                                        />
                                    ) : canvasData.type === 'artifacts' ? (
                                        <CanvasArtifacts 
                                            artifacts={canvasData.content?.artifacts || []}
                                            onDownload={(id) => onExecute('download_artifact', { id })}
                                        />
                                    ) : canvasData.type === 'action_outputs' ? (
                                        <ActionOutputCards 
                                            outputs={canvasData.content?.outputs || []}
                                            onViewDetails={(output: any) => {
                                                if (output?.externalRefs?.notionPageUrl) {
                                                    window.open(output.externalRefs.notionPageUrl, '_blank');
                                                } else if (output?.externalRefs?.calendarEventUrl) {
                                                    window.open(output.externalRefs.calendarEventUrl, '_blank');
                                                }
                                            }}
                                        />
                                    ) : canvasData.type === 'next_actions' ? (
                                        <NextActionControls 
                                            actions={canvasData.content?.actions || []}
                                            onExecute={(actionId: string) => onExecute(actionId, canvasData.content?.context)}
                                            disabled={isExecuting}
                                        />
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center opacity-30 px-12 text-center">
                                            <div className="w-12 h-12 rounded-2xl bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 border border-neutral-200 dark:border-white/10 flex items-center justify-center mb-4">
                                                <Sparkles className="w-6 h-6 text-black/40 dark:text-white/40" />
                                            </div>
                                            <p className="text-[13px] font-bold text-black dark:text-white tracking-tight">Mission Active</p>
                                            <p className="text-[11px] text-black/40 dark:text-white/40 mt-1 leading-relaxed">Arcus is analyzing the objective and preparing context for the workspace...</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Inner Window Footer (Removed Progress Bar) */}
                </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="shrink-0 h-14 px-6 border-t border-neutral-200 dark:border-white/5 flex items-center justify-between text-black/30 dark:text-white/30">
                <div className="flex items-center gap-3">
                    <span className="text-[11px] font-medium truncate max-w-[300px]">
                        Automating mission workflows and data synthesis for {canvasData.title || 'the objective'}...
                    </span>
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
                            className="w-10 h-10 bg-[#2a2a2a] border border-neutral-200 dark:border-white/10 text-black/60 dark:text-white/60 hover:text-black dark:text-white rounded-full flex items-center justify-center transition-all shadow-xl"
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>
                    ) : (
                        <button 
                            onClick={() => setEditMode(false)}
                            className="h-10 px-6 bg-[#2a2a2a] border border-neutral-200 dark:border-white/10 text-black dark:text-white font-bold rounded-full flex items-center justify-center text-[12px] shadow-xl"
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
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLAN ARTIFACT VIEW (Phase 2)
// ═══════════════════════════════════════════════════════════════════════════════

interface PlanArtifactViewProps {
    content: {
        planId?: string;
        title?: string;
        objective?: string;
        assumptions?: string[];
        questionsAnswered?: string[];
        acceptanceCriteria?: string[];
        status?: 'draft' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled';
        todos?: Array<{
            todoId: string;
            title: string;
            description?: string;
            status: 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'skipped' | 'blocked_approval';
            actionType: string;
            sortOrder: number;
            approvalMode: 'auto' | 'manual';
            attemptCount: number;
            errorMessage?: string;
            resultPayload?: any;
        }>;
        progress?: {
            total: number;
            completed: number;
            failed: number;
            running: number;
            ready: number;
        };
        approvedAt?: string;
        completedAt?: string;
    };
    onExecute: (action: string, data: unknown) => void;
    isExecuting?: boolean;
}

const todoStatusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
    pending: { label: 'Pending', color: 'text-black/30 dark:text-white/30', bgColor: 'bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5', icon: Clock },
    ready: { label: 'Ready', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: CheckCircle2 },
    running: { label: 'Running', color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: Loader2 },
    completed: { label: 'Done', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckCircle2 },
    failed: { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: AlertTriangle },
    skipped: { label: 'Skipped', color: 'text-neutral-600 dark:text-neutral-600 dark:text-neutral-400', bgColor: 'bg-neutral-500/10', icon: CheckCircle2 },
    blocked_approval: { label: 'Blocked', color: 'text-orange-400', bgColor: 'bg-orange-500/10', icon: AlertTriangle }
};

const planStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    draft: { label: 'Draft', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
    approved: { label: 'Approved', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
    executing: { label: 'Executing', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    completed: { label: 'Completed', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
    failed: { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-500/10' },
    cancelled: { label: 'Cancelled', color: 'text-neutral-600 dark:text-neutral-600 dark:text-neutral-400', bgColor: 'bg-neutral-500/10' }
};

function PlanArtifactView({ content, onExecute, isExecuting: isExecutingProp }: PlanArtifactViewProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'todos' | 'timeline'>('overview');
    const [expandedTodos, setExpandedTodos] = useState(true);

    const status = content.status || 'draft';
    const statusInfo = planStatusConfig[status];
    const todos = content.todos || [];
    const progress = content.progress || {
        total: todos.length,
        completed: todos.filter(t => t.status === 'completed').length,
        failed: todos.filter(t => t.status === 'failed').length,
        running: todos.filter(t => t.status === 'running').length,
        ready: todos.filter(t => t.status === 'ready').length
    };

    const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
    const isExecuting = status === 'executing' || status === 'approved';
    const needsApproval = status === 'draft';

    return (
        <div className="h-full flex flex-col space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center border",
                            statusInfo.bgColor, statusInfo.color.replace('text-', 'border-').replace('400', '500/30')
                        )}>
                            <ListTodo className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-[18px] font-bold text-black/95 dark:text-white/95">{content.title || 'Execution Plan'}</h2>
                            <p className="text-[13px] text-black/5 dark:text-black/50 dark:text-white/50 mt-0.5">{content.objective}</p>
                        </div>
                    </div>
                    <span className={cn(
                        "text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border",
                        statusInfo.bgColor, statusInfo.color, statusInfo.color.replace('text-', 'border-').replace('400', '500/30')
                    )}>
                        {statusInfo.label}
                    </span>
                </div>

                {/* Progress Bar */}
                {progress.total > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-black/40 dark:text-white/40">
                            <span>Progress</span>
                            <span>{progress.completed}/{progress.total} completed</span>
                        </div>
                        <div className="h-2 bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500 rounded-full"
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                        <div className="flex items-center gap-4 text-[11px]">
                            {progress.running > 0 && (
                                <span className="text-amber-400 flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    {progress.running} running
                                </span>
                            )}
                            {progress.failed > 0 && (
                                <span className="text-red-400 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {progress.failed} failed
                                </span>
                            )}
                            {progress.ready > 0 && status === 'approved' && (
                                <span className="text-blue-400">{progress.ready} ready to start</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Action Button */}
            {needsApproval && (
                <button
                    onClick={() => onExecute('approve_plan', { planId: content.planId })}
                    disabled={isExecutingProp}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-white text-black text-[14px] font-bold rounded-xl hover:bg-neutral-200 transition-all disabled:opacity-50"
                >
                    <Shield className="w-4 h-4" />
                    Approve & Execute Plan
                </button>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 rounded-lg">
                {(['overview', 'todos', 'timeline'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "flex-1 py-2 text-[12px] font-bold rounded-md transition-all",
                            activeTab === tab 
                                ? "bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10 text-black dark:text-white" 
                                : "text-black/40 dark:text-white/40 hover:text-black/60 dark:text-white/60"
                        )}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {/* Assumptions */}
                        {content.assumptions && content.assumptions.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-black/40 dark:text-white/40">
                                    <Target className="w-4 h-4" />
                                    <span className="text-[12px] font-bold uppercase tracking-wider">Assumptions</span>
                                </div>
                                <ul className="space-y-2">
                                    {content.assumptions.map((assumption, i) => (
                                        <li key={i} className="flex items-start gap-2 text-[13px] text-black/60 dark:text-white/60">
                                            <span className="text-black/30 dark:text-white/30 mt-1">•</span>
                                            {assumption}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Questions Answered */}
                        {content.questionsAnswered && content.questionsAnswered.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-black/40 dark:text-white/40">
                                    <HelpCircle className="w-4 h-4" />
                                    <span className="text-[12px] font-bold uppercase tracking-wider">Questions Answered</span>
                                </div>
                                <ul className="space-y-2">
                                    {content.questionsAnswered.map((q, i) => (
                                        <li key={i} className="flex items-start gap-2 text-[13px] text-black/60 dark:text-white/60">
                                            <span className="text-emerald-400/60 mt-1">✓</span>
                                            {q}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Acceptance Criteria */}
                        {content.acceptanceCriteria && content.acceptanceCriteria.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-black/40 dark:text-white/40">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-[12px] font-bold uppercase tracking-wider">Acceptance Criteria</span>
                                </div>
                                <ul className="space-y-2">
                                    {content.acceptanceCriteria.map((criteria, i) => (
                                        <li key={i} className="flex items-start gap-2 text-[13px] text-black/60 dark:text-white/60">
                                            <span className="text-black/30 dark:text-white/30 mt-1">{i + 1}.</span>
                                            {criteria}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'todos' && (
                    <motion.div
                        key="todos"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-2"
                    >
                        {todos.map((todo, index) => (
                            <TodoItemCard key={todo.todoId} todo={todo} index={index} />
                        ))}
                    </motion.div>
                )}

                {activeTab === 'timeline' && (
                    <motion.div
                        key="timeline"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        <div className="relative pl-4 border-l border-neutral-200 dark:border-white/10 space-y-6">
                            {content.approvedAt && (
                                <TimelineItem 
                                    status="completed"
                                    title="Plan Approved"
                                    timestamp={content.approvedAt}
                                    description="User approved the execution plan"
                                />
                            )}
                            {todos.filter(t => t.status !== 'pending').map((todo) => (
                                <TimelineItem
                                    key={todo.todoId}
                                    status={todo.status}
                                    title={todo.title}
                                    description={todo.resultPayload?.message || todo.errorMessage}
                                    isError={todo.status === 'failed'}
                                />
                            ))}
                            {content.completedAt && (
                                <TimelineItem 
                                    status="completed"
                                    title="Plan Completed"
                                    timestamp={content.completedAt}
                                    description="All tasks finished successfully"
                                />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function TodoItemCard({ todo, index }: { todo: NonNullable<PlanArtifactViewProps['content']['todos']>[number]; index: number }) {
    const status = todoStatusConfig[todo.status];
    const StatusIcon = status.icon;
    const isRunning = todo.status === 'running';
    const isCompleted = todo.status === 'completed';

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
                "flex items-start gap-3 p-3 rounded-xl border transition-all",
                isRunning ? "bg-amber-500/5 border-amber-500/20" :
                isCompleted ? "bg-emerald-500/5 border-emerald-500/10" :
                todo.status === 'failed' ? "bg-red-500/5 border-red-500/20" :
                todo.status === 'blocked_approval' ? "bg-orange-500/5 border-orange-500/20" :
                "bg-white/[0.02] border-neutral-200 dark:border-white/5"
            )}
        >
            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5", status.bgColor)}>
                <StatusIcon className={cn("w-3.5 h-3.5", isRunning && "animate-spin", status.color)} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <h4 className={cn("text-[13px] font-semibold leading-tight", isCompleted ? 'text-black/40 dark:text-white/40 line-through' : 'text-black/80 dark:text-white/80')}>
                        {todo.title}
                    </h4>
                    <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0", status.bgColor, status.color)}>
                        {status.label}
                    </span>
                </div>
                {todo.description && !isCompleted && (
                    <p className="text-[12px] text-black/40 dark:text-white/40 mt-1">{todo.description}</p>
                )}
                {todo.errorMessage && (
                    <p className="text-[11px] text-red-400/80 mt-1">{todo.errorMessage}</p>
                )}
                {todo.attemptCount > 1 && (
                    <p className="text-[10px] text-black/30 dark:text-white/30 mt-2">Attempt {todo.attemptCount}</p>
                )}
            </div>
        </motion.div>
    );
}

function TimelineItem({ 
    status, 
    title, 
    description, 
    timestamp, 
    isError 
}: { 
    status: string; 
    title: string; 
    description?: string; 
    timestamp?: string;
    isError?: boolean;
}) {
    const statusColors: Record<string, string> = {
        completed: 'bg-emerald-500',
        failed: 'bg-red-500',
        running: 'bg-amber-500',
        ready: 'bg-blue-500',
        pending: 'bg-black/[0.010] dark:bg-white/20'
    };

    return (
        <div className="relative">
            <div className={cn("absolute -left-[21px] w-3 h-3 rounded-full", statusColors[status] || 'bg-black/[0.010] dark:bg-white/20')} />
            <div className="space-y-1">
                <h4 className="text-[13px] font-semibold text-black/80 dark:text-white/80">{title}</h4>
                {description && (
                    <p className={cn("text-[12px]", isError ? 'text-red-400/80' : 'text-black/5 dark:text-black/50 dark:text-white/50')}>
                        {description}
                    </p>
                )}
                {timestamp && (
                    <p className="text-[11px] text-black/30 dark:text-white/30">
                        {new Date(timestamp).toLocaleString()}
                    </p>
                )}
            </div>
        </div>
    );
}
