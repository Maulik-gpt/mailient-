'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Binary, Sparkles, BrainCircuit, Mail, FileText, Search, Zap, Calendar, BarChart3, Pencil, Terminal, CheckCircle2, Globe, Database, ListTodo, ExternalLink } from 'lucide-react';
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

interface ThinkingLayerProps {
    blocks: ThinkingBlock[];
    isVisible: boolean;
    currentThought?: string;
    isGenerating?: boolean;
    onStop?: () => void;
    searchSessions?: SearchSession[];
}

const sourceTypeConfig: Record<string, { icon: any; label: string }> = {
    email: { icon: <Mail className="w-3.5 h-3.5" />, label: 'Gmail' },
    notes: { icon: <FileText className="w-3.5 h-3.5" />, label: 'Notes' },
    web: { icon: <Globe className="w-3.5 h-3.5" />, label: 'Web' },
    calendar: { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Calendar' },
    notion: { icon: <Database className="w-3.5 h-3.5" />, label: 'Notion' },
    tasks: { icon: <ListTodo className="w-3.5 h-3.5" />, label: 'Tasks' }
};

function ShiningLabel({ text, className }: { text: string; className?: string }) {
    return (
        <motion.span
            className={cn(
                "bg-[linear-gradient(110deg,#666,35%,#fff,50%,#666,75%,#666)] bg-[length:200%_100%] bg-clip-text text-transparent",
                className
            )}
            initial={{ backgroundPosition: "200% 0" }}
            animate={{ backgroundPosition: "-200% 0" }}
            transition={{
                repeat: Infinity,
                duration: 2,
                ease: "linear",
            }}
        >
            {text}
        </motion.span>
    );
}

/**
 * SearchTransparencyPanel — Refined minimal search block
 */
function SearchTransparencyPanel({ sessions }: { sessions: SearchSession[] }) {
    const [expanded, setExpanded] = useState<boolean>(true);

    if (!sessions || sessions.length === 0) return null;

    const completedCount = sessions.filter(s => s.status === 'complete').length;
    const isAllComplete = completedCount === sessions.length;

    return (
        <div className="w-full mb-4 relative pl-1">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 py-1 text-[12px] font-semibold text-black/40 dark:text-white/30 hover:text-black/60 dark:hover:text-white/50 transition-colors"
            >
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", !expanded && "-rotate-90")} />
                <span className="uppercase tracking-widest">
                    {isAllComplete ? `Completed ${completedCount} step${completedCount !== 1 ? 's' : ''}` : `Executing ${sessions.length} step${sessions.length !== 1 ? 's' : ''}...`}
                </span>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-2 relative"
                    >
                        {/* Vertical Connector Line */}
                        <div className="absolute left-[7px] top-0 bottom-4 w-[1px] bg-black/[0.08] dark:bg-white/[0.08]" />

                        <div className="space-y-4">
                            {sessions.map((session, index) => {
                                const config = sourceTypeConfig[session.sourceType] || sourceTypeConfig.email;
                                const isSearching = session.status === 'searching' || session.status === 'source_processing';
                                const queries = session.query ? session.query.split('|').map(q => q.trim()).filter(Boolean) : [];
                                const displayQueries = queries.length > 0 ? queries : [`Scanning ${config.label}`];

                                return (
                                    <div key={session.sessionId} className="relative pl-6">
                                        {/* Dot */}
                                        <div className={cn(
                                            "absolute left-[5px] top-[6px] w-[5px] h-[5px] rounded-full z-10 border border-white dark:border-black",
                                            isSearching ? "bg-white dark:bg-white animate-pulse" : "bg-black/20 dark:bg-white/20"
                                        )} />
                                        
                                        <div className="space-y-2">
                                            <p className={cn(
                                                "text-[13px] font-medium tracking-tight",
                                                isSearching ? "text-black dark:text-white" : "text-black/50 dark:text-white/40"
                                            )}>
                                                {isSearching ? <ShiningLabel text={`Searching ${config.label}...`} /> : `Searched ${config.label}`}
                                            </p>

                                            {displayQueries.map((q, i) => (
                                                <div key={i} className="flex items-center gap-2 group/q">
                                                    <ChevronRight className="w-3 h-3 text-black/20 dark:text-white/10 group-hover/q:text-black/40 dark:group-hover/q:text-white/30" />
                                                    <span className="text-[12px] text-black/30 dark:text-white/20 font-medium tracking-tight">{q}</span>
                                                </div>
                                            ))}

                                            {session.selectedSnippets && session.selectedSnippets.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {session.selectedSnippets.map((snippet, i) => (
                                                        <div key={i} className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05]">
                                                            <div className="w-1 h-1 rounded-full bg-black/20 dark:bg-white/20" />
                                                            <span className="text-[11px] text-black/40 dark:text-white/30 font-medium truncate max-w-[120px]">
                                                                {snippet.subject || snippet.title || 'Match'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * ThinkingLayer — Minimal, monochromatic task list
 */
export function ThinkingLayer({ blocks, isVisible, currentThought, isGenerating, searchSessions }: ThinkingLayerProps) {
    if (!isVisible || (blocks.length === 0 && !isGenerating && (!searchSessions || searchSessions.length === 0))) return null;

    return (
        <div className="relative pt-1 pb-2 space-y-4">
            {/* Search Transparency */}
            {searchSessions && searchSessions.length > 0 && (
                <SearchTransparencyPanel sessions={searchSessions} />
            )}

            <div className="relative">
                {/* Vertical Connector Line for blocks */}
                {blocks.length > 0 && (
                    <div className="absolute left-[7px] top-2 bottom-2 w-[1px] bg-black/[0.08] dark:bg-white/[0.08]" />
                )}

                <AnimatePresence mode="popLayout">
                    {blocks.map((block) => (
                        <motion.div
                            key={block.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative pl-6 mb-4 last:mb-0"
                        >
                            {/* Block Dot */}
                            <div className={cn(
                                "absolute left-[5px] top-[8px] w-[5px] h-[5px] rounded-full z-10 border border-white dark:border-black",
                                block.status === 'active' ? "bg-white dark:bg-white animate-pulse" : "bg-black/20 dark:bg-white/20"
                            )} />

                            <div className="space-y-2">
                                <h3 className={cn(
                                    "text-[13px] font-bold tracking-tight transition-all duration-500",
                                    block.status === 'completed' ? "text-black/30 dark:text-white/20" : "text-black/90 dark:text-white/90"
                                )}>
                                    {block.status === 'active' ? <ShiningLabel text={block.title} /> : block.title}
                                </h3>

                                {block.initialContext && block.status === 'active' && (
                                    <p className="text-[12px] text-black/40 dark:text-white/30 tracking-tight leading-relaxed font-medium">
                                        {block.initialContext}
                                    </p>
                                )}

                                {/* Steps as clean list items */}
                                <div className="space-y-1.5 mt-2">
                                    {block.steps.map((step) => (
                                        <div key={step.id} className="flex items-center gap-2 group/step">
                                            <div className={cn(
                                                "w-1 h-1 rounded-full shrink-0 transition-all",
                                                step.status === 'active' ? "bg-white dark:bg-white" : "bg-black/10 dark:bg-white/10"
                                            )} />
                                            <span className={cn(
                                                "text-[12px] font-medium tracking-tight",
                                                step.status === 'active' ? "text-black dark:text-white" : "text-black/30 dark:text-white/20"
                                            )}>
                                                {step.status === 'active' ? <ShiningLabel text={step.label} /> : step.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Live Thought Stream */}
            {currentThought && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="pl-6 py-1"
                >
                    <p className="text-[12px] text-black/40 dark:text-white/30 italic font-medium tracking-tight leading-relaxed flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 opacity-30" />
                        <ShiningLabel text={currentThought} className="italic" />
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
            className="group relative flex items-center gap-4 p-5 mt-4 mb-4 w-full max-w-[400px] bg-neutral-50 dark:bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-2xl transition-all hover:bg-neutral-100 dark:hover:bg-[#161616] hover:border-neutral-300 dark:hover:border-white/10"
        >
            <div className="w-10 h-10 rounded-xl bg-black/[0.03] dark:bg-white/5 flex items-center justify-center shrink-0 border border-neutral-200 dark:border-white/5 group-hover:border-neutral-300 dark:group-hover:border-white/10 group-hover:bg-black/[0.06] dark:group-hover:bg-white/10 transition-all text-black/40 dark:text-white/40 group-hover:text-black/80 dark:group-hover:text-white/80">
                {resultIcons[type] || <Sparkles className="w-4 h-4" />}
            </div>

            <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
                <span className="text-black/90 dark:text-white/90 text-[14px] font-bold tracking-tight truncate group-hover:text-black dark:group-hover:text-white transition-colors">
                    {title || label}
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-black/20 dark:text-white/20 group-hover:text-black/40 dark:group-hover:text-white/40 transition-colors">
                    {label}
                </span>
            </div>

            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black/[0.03] dark:bg-white/5 text-black/10 dark:text-white/10 group-hover:text-black/40 dark:group-hover:text-white/40 transition-all">
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
        </motion.button>
    );
}

