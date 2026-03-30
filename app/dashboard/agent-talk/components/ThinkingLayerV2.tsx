'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Binary, Sparkles, BrainCircuit, Mail, FileText, Search, Zap, Calendar, BarChart3, Pencil, Terminal, CheckCircle2, Globe, Database, ListTodo, ExternalLink, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

export type ThinkingStep = {
    id: string;
    label: string;
    status: 'pending' | 'active' | 'completed' | 'error' | 'blocked_approval';
    type: 'think' | 'search' | 'read' | 'analyze' | 'draft' | 'execute' | 'code';
    detail?: string;
};

export type ThinkingBlock = {
    id: string;
    title: string;
    status: 'pending' | 'active' | 'completed';
    initialContext?: string;
    steps: ThinkingStep[];
    interimConclusion?: string;
    nextActionContext?: string;
    isPreviewable?: boolean;
    previewData?: any;
};

export type SearchSession = {
    sessionId: string;
    query: string;
    sourceType: 'email' | 'notes' | 'web' | 'calendar' | 'notion' | 'tasks';
    status: 'queued' | 'searching' | 'source_processing' | 'complete';
    resultCount?: number;
    selectedSnippets?: { subject?: string; from?: string; date?: string; title?: string }[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// TODO GRAPH TYPES (NEW FOR PHASE 2)
// ═══════════════════════════════════════════════════════════════════════════════

export type TodoGraphStatus = 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'skipped' | 'blocked_approval';

export type TodoGraphItem = {
    todoId: string;
    title: string;
    description?: string;
    status: TodoGraphStatus;
    actionType: string;
    sortOrder: number;
    dependsOn: string[];
    approvalMode: 'auto' | 'manual';
    attemptCount: number;
    resultPayload?: any;
    errorMessage?: string;
    startedAt?: string;
    completedAt?: string;
};

export type TodoGraph = {
    planId: string;
    title: string;
    objective: string;
    status: 'draft' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled';
    todos: TodoGraphItem[];
    progress: {
        total: number;
        completed: number;
        failed: number;
        running: number;
        ready: number;
    };
};

interface ThinkingLayerProps {
    blocks: ThinkingBlock[];
    isVisible: boolean;
    currentThought?: string;
    isGenerating?: boolean;
    onStop?: () => void;
    searchSessions?: SearchSession[];
    // NEW: Todo Graph Props
    todoGraph?: TodoGraph | null;
    showTodoGraph?: boolean;
}

const sourceTypeConfig: Record<string, { icon: any; label: string; color: string }> = {
    email: { icon: <Mail className="w-3.5 h-3.5" />, label: 'Gmail', color: 'text-red-400' },
    notes: { icon: <FileText className="w-3.5 h-3.5" />, label: 'Notes', color: 'text-amber-400' },
    web: { icon: <Globe className="w-3.5 h-3.5" />, label: 'Web', color: 'text-blue-400' },
    calendar: { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Calendar', color: 'text-green-400' },
    notion: { icon: <Database className="w-3.5 h-3.5" />, label: 'Notion', color: 'text-white/70' },
    tasks: { icon: <ListTodo className="w-3.5 h-3.5" />, label: 'Tasks', color: 'text-cyan-400' }
};

const todoStatusConfig: Record<TodoGraphStatus, { label: string; color: string; bgColor: string; icon: any }> = {
    pending: { label: 'Pending', color: 'text-white/30', bgColor: 'bg-white/5', icon: Clock },
    ready: { label: 'Ready', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: CheckCircle2 },
    running: { label: 'Running', color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: Loader2 },
    completed: { label: 'Done', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckCircle2 },
    failed: { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: AlertTriangle },
  skipped: { label: 'Skipped', color: 'text-neutral-400', bgColor: 'bg-neutral-500/10', icon: CheckCircle2 },
    blocked_approval: { label: 'Blocked', color: 'text-orange-400', bgColor: 'bg-orange-500/10', icon: AlertTriangle }
};

/**
 * SearchTransparencyPanel — Perplexity-style collapsible search block
 */
function SearchTransparencyPanel({ sessions }: { sessions: SearchSession[] }) {
    const [expanded, setExpanded] = useState<boolean>(true);

    if (!sessions || sessions.length === 0) return null;

    const completedCount = sessions.filter(s => s.status === 'complete').length;
    const isAllComplete = completedCount === sessions.length;

    return (
        <div className="w-full mb-6 relative">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 py-1 px-1 text-[13px] font-medium text-white/50 hover:text-white/80 transition-colors"
            >
                {isAllComplete ? `Completed ${completedCount} step${completedCount !== 1 ? 's' : ''}` : `Executing ${sessions.length} step${sessions.length !== 1 ? 's' : ''}...`}
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", !expanded && "-rotate-90")} />
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-3 pl-2 border-l border-white/5 ml-3"
                    >
                        {sessions.map((session, index) => {
                            const config = sourceTypeConfig[session.sourceType] || sourceTypeConfig.email;
                            const isSearching = session.status === 'searching' || session.status === 'source_processing';
                            const queries = session.query ? session.query.split('|').map(q => q.trim()).filter(Boolean) : [];
                            const displayQueries = queries.length > 0 ? queries : [`Searching ${config.label} data`];

                            return (
                                <div key={session.sessionId} className={cn("relative pb-6", index === sessions.length - 1 && "pb-0")}>
                                    <div className="flex items-start gap-3 mb-3 relative group">
                                        <div className={cn("mt-0.5 relative z-10 bg-[#121212] p-0.5", config.color)}>
                                            {isSearching ? (
                                                <div className="relative">
                                                  <Globe className="w-4 h-4 text-white/40" />
                                                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
                                                </div>
                                            ) : (
                                                <Globe className="w-4 h-4 text-white/40" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className={cn("text-[14px] font-medium tracking-tight", isSearching ? "text-white/90 animate-pulse" : "text-white/70")}>
                                                {isSearching ? `Scanning ${config.label} for matches...` : `Analyzing ${config.label} data for requested insights`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pl-7 space-y-2 mb-4">
                                        {displayQueries.map((q, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <Search className="w-3.5 h-3.5 text-white/30" />
                                                <span className="text-[13px] text-white/40 font-mono tracking-tight">{q}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {session.selectedSnippets && session.selectedSnippets.length > 0 && (
                                        <div className="pl-7 space-y-2.5">
                                            {session.selectedSnippets.map((snippet, i) => {
                                                const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500'];
                                                const bgColor = colors[i % colors.length];
                                                return (
                                                    <div key={i} className="flex items-center gap-3 group/source cursor-pointer">
                                                        <div className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0", bgColor)}>
                                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1 min-w-0 flex items-baseline gap-2">
                                                            <span className="text-[13px] text-blue-400 font-medium truncate group-hover/source:underline underline-offset-2">
                                                                {snippet.subject || snippet.title || 'Source Match'}
                                                            </span>
                                                            <span className="text-[11px] text-white/30 shrink-0">
                                                                {snippet.from ? snippet.from.split('<')[0].trim() : config.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {session.resultCount && session.resultCount > session.selectedSnippets.length && (
                                                <div className="pt-1">
                                                    <span className="text-[12px] text-white/30 font-medium hover:text-white/60 cursor-pointer">
                                                        +{session.resultCount - session.selectedSnippets.length} more
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * TodoGraphPanel — Visualizes the executable todo graph (NEW FOR PHASE 2)
 */
function TodoGraphPanel({ graph }: { graph: TodoGraph }) {
    const [expanded, setExpanded] = useState(true);
    const progress = graph.progress.total > 0 
        ? (graph.progress.completed / graph.progress.total) * 100 
        : 0;

    const isExecuting = graph.status === 'executing' || graph.status === 'approved';

    return (
        <div className="w-full mb-6 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        isExecuting ? 'bg-blue-500/10 border border-blue-500/20' :
                        graph.status === 'completed' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                        'bg-white/5 border border-white/10'
                    )}>
                        <ListTodo className={cn(
                            "w-4 h-4",
                            isExecuting ? 'text-blue-400' :
                            graph.status === 'completed' ? 'text-emerald-400' :
                            'text-white/40'
                        )} />
                    </div>
                    <div>
                        <h4 className="text-[13px] font-bold text-white/90">{graph.title}</h4>
                        <p className="text-[11px] text-white/40">
                            {graph.progress.completed} of {graph.progress.total} completed
                            {graph.progress.failed > 0 && ` • ${graph.progress.failed} failed`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isExecuting && (
                        <span className="text-[11px] text-blue-400 font-medium flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Executing
                        </span>
                    )}
                    {expanded ? <ChevronDown className="w-4 h-4 text-white/40" /> : <ChevronRight className="w-4 h-4 text-white/40" />}
                </div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden border-t border-white/5"
                    >
                        {/* Progress Bar */}
                        {isExecuting && (
                            <div className="px-4 py-3 border-b border-white/5">
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500 rounded-full"
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Todo Items */}
                        <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {graph.todos.map((todo, index) => (
                                <TodoItemRow key={todo.todoId} todo={todo} index={index} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function TodoItemRow({ todo, index }: { todo: TodoGraphItem; index: number }) {
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
                "flex items-start gap-3 p-2.5 rounded-lg border transition-all",
                isRunning ? "bg-amber-500/5 border-amber-500/20" :
                isCompleted ? "bg-emerald-500/5 border-emerald-500/10" :
                todo.status === 'failed' ? "bg-red-500/5 border-red-500/20" :
                todo.status === 'blocked_approval' ? "bg-orange-500/5 border-orange-500/20" :
                "bg-white/[0.02] border-white/5 hover:border-white/10"
            )}
        >
            <div className={cn(
                "w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                status.bgColor
            )}>
                <StatusIcon className={cn("w-3 h-3", isRunning && "animate-spin", status.color)} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn(
                    "text-[12px] font-medium leading-tight",
                    isCompleted ? 'text-white/40 line-through' : 'text-white/70'
                )}>
                    {todo.title}
                </p>
                {todo.description && !isCompleted && (
                    <p className="text-[11px] text-white/40 mt-0.5">{todo.description}</p>
                )}
                {todo.errorMessage && (
                    <p className="text-[11px] text-red-400/80 mt-1">{todo.errorMessage}</p>
                )}
                {todo.resultPayload && isCompleted && (
                    <p className="text-[10px] text-emerald-400/60 mt-1">
                        ✓ {todo.resultPayload.message || 'Completed'}
                    </p>
                )}
            </div>
        </motion.div>
    );
}

/**
 * ThinkingLayer — Redesigned "Managed AI" Flow with Todo Graph (Phase 2)
 */
export function ThinkingLayer({ 
    blocks, 
    isVisible, 
    currentThought, 
    isGenerating, 
    searchSessions,
    todoGraph,
    showTodoGraph = true
}: ThinkingLayerProps) {
    if (!isVisible || (blocks.length === 0 && !isGenerating && (!searchSessions || searchSessions.length === 0) && !todoGraph)) return null;

    const getIcon = (type: string) => {
        switch (type) {
            case 'search': return <Search className="w-3 h-3" />;
            case 'read': return <FileText className="w-3 h-3" />;
            case 'analyze': return <Binary className="w-3 h-3" />;
            case 'think': return <BrainCircuit className="w-3 h-3" />;
            case 'draft': return <Pencil className="w-3 h-3" />;
            case 'execute': return <Terminal className="w-3 h-3" />;
            case 'code': return <Binary className="w-3 h-3" />;
            default: return <Sparkles className="w-3 h-3" />;
        }
    };

    return (
        <div className="relative pt-2 pb-2 space-y-6">
            {/* Search Transparency (Perplexity-style) */}
            {searchSessions && searchSessions.length > 0 && (
                <SearchTransparencyPanel sessions={searchSessions} />
            )}

            {/* Todo Graph (NEW FOR PHASE 2) */}
            {showTodoGraph && todoGraph && (
                <TodoGraphPanel graph={todoGraph} />
            )}

            <AnimatePresence mode="popLayout">
                {blocks.map((block) => (
                    <motion.div
                        key={block.id}
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="group flex flex-col gap-3 relative"
                    >
                        {/* Major Objective Header */}
                        <div className="flex items-start gap-2.5 group/header cursor-default">
                            <div className={cn(
                                "mt-1 flex items-center justify-center w-4 h-4 rounded-full border shrink-0 transition-all duration-700",
                                block.status === 'completed' 
                                    ? "bg-white/10 border-white/20 text-white/50" 
                                    : "bg-white/5 border-white/10 text-white/20 ring-1 ring-white/10 ring-offset-0"
                            )}>
                                {block.status === 'completed' ? (
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                                )}
                            </div>
                            <h3 className={cn(
                                "text-[14px] font-bold tracking-tight py-0.5 transition-all duration-500",
                                block.status === 'completed' ? "text-white/60" : "text-white/95"
                            )}>
                                {block.title}
                            </h3>
                        </div>

                        {/* Initial Context Statement */}
                        {block.initialContext && block.status !== 'pending' && (
                            <motion.p 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="pl-6.5 text-[14px] text-white/50 leading-relaxed tracking-tight max-w-[95%] font-medium"
                            >
                                {block.initialContext}
                            </motion.p>
                        )}

                        {/* Nested Activity Pills */}
                        <div className="pl-6.5 flex flex-wrap gap-2 py-1">
                            {block.steps.map((step) => (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={cn(
                                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500",
                                        step.status === 'completed' 
                                            ? "bg-white/[0.03] border-white/[0.06] text-white/25" 
                                            : "bg-white/[0.06] border-white/15 text-white/90 shadow-[0_0_20px_rgba(255,255,255,0.03)]"
                                    )}
                                >
                                    <div className={cn(
                                        "p-0.5 rounded shrink-0",
                                        step.status === 'active' ? "text-white/80" : "text-white/15"
                                    )}>
                                        {getIcon(step.type)}
                                    </div>
                                    <span className="text-[12px] font-semibold tracking-tight">
                                        {step.label}
                                    </span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Transition/Conclusion Context */}
                        {(block.interimConclusion || block.nextActionContext) && block.status !== 'pending' && (
                            <motion.p 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="pl-6.5 text-[14px] text-white/50 leading-relaxed tracking-tight max-w-[95%] font-medium"
                            >
                                {block.interimConclusion} {block.nextActionContext}
                            </motion.p>
                        )}
                        
                        {/* Preview (Small Data Square) */}
                        {block.isPreviewable && block.previewData && (
                            <div className="pl-6.5 mt-1">
                                <div className="w-12 h-12 bg-white/[0.02] border border-white/10 rounded-lg flex flex-col items-center justify-center p-2 group hover:bg-white/5 transition-all cursor-pointer">
                                    <div className="w-full h-0.5 bg-white/10 rounded-full mb-1" />
                                    <div className="w-3/4 h-0.5 bg-white/10 rounded-full mb-1" />
                                    <div className="w-full h-0.5 bg-white/10 rounded-full" />
                                    <span className="text-[6px] text-white/20 mt-1 uppercase font-black tracking-tighter">PREVIEW</span>
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Live Thought Stream (Footer) */}
            {currentThought && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="pl-6.5 py-1"
                >
                    <p className="text-[13px] text-white/40 italic font-medium tracking-tight leading-relaxed flex items-center gap-2">
                        <span className="w-1 h-3 bg-white/10 rounded-full animate-pulse" />
                        {currentThought}
                    </p>
                </motion.div>
            )}
        </div>
    );
}

/**
 * ResultCard — Simple and clear card for Arcus execution results
 */
interface ResultCardProps {
    type: string;
    title: string;
    onView: () => void;
}

const resultIcons: Record<string, any> = {
    email_draft: <Mail className="w-4 h-4" />,
    summary: <FileText className="w-4 h-4" />,
    research: <Search className="w-4 h-4" />,
    action_plan: <Zap className="w-4 h-4" />,
    reply: <Mail className="w-4 h-4" />,
    notes: <FileText className="w-4 h-4" />,
    meeting_schedule: <Calendar className="w-4 h-4" />,
    analytics: <BarChart3 className="w-4 h-4" />,
    notion: <Database className="w-4 h-4" />,
    tasks: <ListTodo className="w-4 h-4" />,
};

const resultLabels: Record<string, string> = {
    email_draft: 'Draft',
    summary: 'Summary',
    research: 'Report',
    action_plan: 'Plan',
    reply: 'Reply',
    notes: 'Notes',
    meeting_schedule: 'Schedule',
    analytics: 'Analytics',
    notion: 'Notion Page',
    tasks: 'Tasks',
};

export function ResultCard({ type, title, onView }: ResultCardProps) {
    const label = resultLabels[type] || 'View Result';
    
    return (
        <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={onView}
            className="group relative flex items-center gap-4 p-5 mt-4 mb-4 w-full max-w-[400px] bg-[#111111] border border-white/5 rounded-2xl transition-all hover:bg-[#161616] hover:border-white/10"
        >
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-white/10 group-hover:bg-white/10 transition-all text-white/40 group-hover:text-white/80">
                {resultIcons[type] || <Sparkles className="w-4 h-4" />}
            </div>

            <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
                <span className="text-white/90 text-[14px] font-bold tracking-tight truncate group-hover:text-white transition-colors">
                    {title || label}
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-white/20 group-hover:text-white/40 transition-colors">
                    {label}
                </span>
            </div>

            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-white/10 group-hover:text-white/40 transition-all">
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
        </motion.button>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert PlanArtifact to TodoGraph for ThinkingLayer display
 */
export function planToTodoGraph(plan: any): TodoGraph {
    const todos = plan.todos || [];
    return {
        planId: plan.planId,
        title: plan.title,
        objective: plan.objective,
        status: plan.status,
        todos: todos.map((t: any) => ({
            todoId: t.todoId || t.todo_id,
            title: t.title,
            description: t.description,
            status: t.status,
            actionType: t.actionType || t.action_type,
            sortOrder: t.sortOrder || t.sort_order || 0,
            dependsOn: t.dependsOn || t.depends_on || [],
            approvalMode: t.approvalMode || t.approval_mode || 'auto',
            attemptCount: t.attemptCount || t.attempt_count || 0,
            resultPayload: t.resultPayload || t.result_payload,
            errorMessage: t.errorMessage || t.error_message,
            startedAt: t.startedAt || t.started_at,
            completedAt: t.completedAt || t.completed_at
        })),
        progress: {
            total: todos.length,
            completed: todos.filter((t: any) => (t.status || t.todo_status) === 'completed').length,
            failed: todos.filter((t: any) => (t.status || t.todo_status) === 'failed').length,
            running: todos.filter((t: any) => (t.status || t.todo_status) === 'running').length,
            ready: todos.filter((t: any) => (t.status || t.todo_status) === 'ready').length
        }
    };
}
