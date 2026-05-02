'use client';

/**
 * AgentExecutionTimeline — Phase 2: Live Execution Visualisation
 * 
 * Implements the 7-step Arcus Thinking & Agentic Process:
 * 1. Clarify | 2. Reason | 3. Plan | 4. Tool Usage | 5. Execute Safely | 6. Deliver Value | 7. Reflect & Iterate
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Search, Mail, Calendar, FileText, Database, ListTodo,
  CheckCircle2, ChevronDown, BrainCircuit,
  Zap, ShieldCheck, BarChart3, RefreshCcw, ClipboardList,
  Sparkles, MousePointer2, Settings2, Info, Clock
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentStep {
  id: string;
  type: 'thinking' | 'tool_call' | 'tool_result' | 'tool_error' | 'approval' | 'respond' | 'message';
  tool?: string;
  label: string;
  status: 'active' | 'completed' | 'error';
  summary?: string;
  startedAt: number;
  completedAt?: number;
  iteration: number;
  params?: any;
}

interface AgentExecutionTimelineProps {
  steps: AgentStep[];
  isActive: boolean;
  runId?: string;
  totalDurationMs?: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const PHASES = [
  { id: 1, name: 'Clarify', icon: <Sparkles className="w-3.5 h-3.5" />, desc: 'Understanding intent' },
  { id: 2, name: 'Reason', icon: <BrainCircuit className="w-3.5 h-3.5" />, desc: 'Context analysis' },
  { id: 3, name: 'Plan', icon: <ClipboardList className="w-3.5 h-3.5" />, desc: 'Strategy mapping' },
  { id: 4, name: 'Tool Usage', icon: <Settings2 className="w-3.5 h-3.5" />, desc: 'Fetching real data' },
  { id: 5, name: 'Execute Safely', icon: <ShieldCheck className="w-3.5 h-3.5" />, desc: 'Securing actions' },
  { id: 6, name: 'Deliver Value', icon: <Zap className="w-3.5 h-3.5" />, desc: 'Final response' },
  { id: 7, name: 'Reflect', icon: <RefreshCcw className="w-3.5 h-3.5" />, desc: 'Post-run iteration' },
];

const toolIcons: Record<string, React.ReactNode> = {
  search_inbox: <Search className="w-3.5 h-3.5" />,
  read_email: <Mail className="w-3.5 h-3.5" />,
  send_email: <Zap className="w-3.5 h-3.5" />,
  save_draft: <FileText className="w-3.5 h-3.5" />,
  schedule_meeting: <Calendar className="w-3.5 h-3.5" />,
  check_availability: <Calendar className="w-3.5 h-3.5" />,
  create_task: <ListTodo className="w-3.5 h-3.5" />,
  notion_create_page: <Database className="w-3.5 h-3.5" />,
  notion_search: <Database className="w-3.5 h-3.5" />,
  think: <BrainCircuit className="w-3.5 h-3.5" />,
  respond: <Sparkles className="w-3.5 h-3.5" />,
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const formatToolLabel = (tool?: string, status?: string) => {
  if (!tool) return 'Processing...';
  const name = tool.replace(/_/g, ' ');
  
  if (status === 'active') {
    if (name.includes('search')) return `Searching ${name.split(' ')[1] || 'Inbox'}`;
    if (name.startsWith('read')) return 'Reading Email';
    if (name.startsWith('send')) return 'Sending Email';
    if (name.startsWith('save')) return 'Saving Draft';
    if (name.startsWith('schedule')) return 'Scheduling Meeting';
    if (name.startsWith('check')) return 'Checking Availability';
    if (name.startsWith('create')) return 'Creating Task';
    return name.charAt(0).toUpperCase() + name.slice(1) + 'ing...';
  }

  if (status === 'completed') {
    if (name.includes('search')) return 'Searched Inbox';
    if (name.startsWith('read')) return 'Read Email';
    if (name.startsWith('send')) return 'Sent Email';
    if (name.startsWith('save')) return 'Saved Draft';
    if (name.startsWith('schedule')) return 'Scheduled Meeting';
    if (name.startsWith('check')) return 'Checked Availability';
    if (name.startsWith('create')) return 'Created Task';
    return name.charAt(0).toUpperCase() + name.slice(1) + 'ed';
  }

  return name.charAt(0).toUpperCase() + name.slice(1);
};

// ─── Sub-Components ─────────────────────────────────────────────────────────

function PhaseIndicator({ currentPhase, completedPhases }: { currentPhase: number, completedPhases: number[] }) {
  return (
    <div className="flex items-center justify-between w-full mb-6 px-1">
      {PHASES.map((phase, idx) => {
        const isCompleted = completedPhases.includes(phase.id);
        const isActive = currentPhase === phase.id;
        
        return (
          <div key={phase.id} className="flex flex-col items-center gap-2 group relative">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 border",
              isActive 
                ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-110 z-10" 
                : isCompleted
                  ? "bg-black/5 dark:bg-white/10 text-black/40 dark:text-white/40 border-black/5 dark:border-white/10"
                  : "bg-transparent text-black/20 dark:text-white/10 border-black/10 dark:border-white/5"
            )}>
              {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : phase.icon}
            </div>
            
            {/* Tooltip on hover */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              {phase.name}: {phase.desc}
            </div>

            {/* Connecting Line */}
            {idx < PHASES.length - 1 && (
              <div className="absolute left-[28px] top-4 w-[calc(100%-24px)] h-[1px] bg-black/5 dark:bg-white/5 -z-10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: isCompleted ? '100%' : '0%' }}
                  className="h-full bg-black/20 dark:bg-white/20"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AgentExecutionTimeline({
  steps,
  isActive,
  runId,
  totalDurationMs,
}: AgentExecutionTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Derive Current Phase
  const currentPhase = useMemo(() => {
    if (!isActive && steps.length > 0) return 6; // Deliver Value / Reflect
    
    const lastStep = steps[steps.length - 1];
    if (!lastStep) return 1;

    if (lastStep.type === 'approval') return 5;
    if (lastStep.type === 'tool_call' || lastStep.type === 'tool_result') return 4;
    
    // First iteration usually clarify/reason/plan
    if (lastStep.iteration === 1) {
      if (steps.length === 1) return 1; // Clarify
      return 2; // Reason
    }
    
    if (lastStep.iteration === 2) return 3; // Plan
    
    return 4; // Tool Usage
  }, [steps, isActive]);

  const completedPhases = useMemo(() => {
    return Array.from({ length: currentPhase - 1 }, (_, i) => i + 1);
  }, [currentPhase]);

  useEffect(() => {
    if (isActive && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [steps.length, isActive]);

  if (steps.length === 0) return null;

  return (
    <div className="w-full mt-6 font-sans max-w-full">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="overflow-hidden rounded-[32px] bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-white/10 p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] relative"
          >
            {/* Apple-style background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-50/50 to-transparent dark:from-white/[0.03] dark:to-transparent pointer-events-none" />

            {/* Header / Phase Indicator */}
            <div className="relative z-10 flex flex-col gap-1 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                  <h3 className="text-base font-bold tracking-tight text-black dark:text-white">Arcus Thinking Process</h3>
                  <p className="text-[11px] text-neutral-500 dark:text-white/40 font-medium">Phase {currentPhase}: {PHASES[currentPhase - 1]?.name}</p>
                </div>
                {isActive && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full border border-black/5 dark:border-white/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <span className="text-[10px] font-bold text-neutral-600 dark:text-white/60 uppercase tracking-widest">Live</span>
                  </div>
                )}
              </div>
              
              <PhaseIndicator currentPhase={currentPhase} completedPhases={completedPhases} />
            </div>

            {/* Steps Timeline */}
            <div className="relative z-10 flex flex-col gap-4">
              {steps.map((step, idx) => {
                const isTool = step.type === 'tool_call' || step.type === 'tool_result';
                const isThinking = step.type === 'thinking';
                const isLast = idx === steps.length - 1;
                
                if (isThinking && !step.label) return null;
                if (isThinking && (step.label === 'Reasoning...' || step.label === 'Processing...')) return null;

                return (
                  <motion.div 
                    key={step.id}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "flex gap-4 group",
                      !isLast && "pb-4"
                    )}
                  >
                    {/* Left Connector Icon */}
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300",
                        step.status === 'active' 
                          ? "bg-black dark:bg-white text-white dark:text-black shadow-lg" 
                          : "bg-neutral-100 dark:bg-white/5 text-neutral-400 dark:text-white/30 border border-neutral-200 dark:border-white/5"
                      )}>
                        {isTool ? toolIcons[step.tool || 'default'] : <BrainCircuit className="w-3 h-3" />}
                      </div>
                      {!isLast && (
                        <div className="w-[1px] flex-1 bg-neutral-200 dark:bg-white/5 mt-2 rounded-full" />
                      )}
                    </div>

                    {/* Content Card */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <span className={cn(
                          "text-[13px] font-bold tracking-tight transition-colors",
                          step.status === 'active' ? "text-black dark:text-white" : "text-neutral-500 dark:text-white/40"
                        )}>
                          {isTool ? formatToolLabel(step.tool, step.status) : PHASES[currentPhase - 1]?.name}
                        </span>
                        {step.status === 'active' && (
                          <span className="flex items-center gap-1">
                             <motion.span 
                               animate={{ opacity: [0.4, 1, 0.4] }} 
                               transition={{ repeat: Infinity, duration: 1.5 }}
                               className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter"
                             >
                               Executing
                             </motion.span>
                          </span>
                        )}
                      </div>
                      
                      {step.label && (
                        <p className={cn(
                          "text-[12px] leading-relaxed line-clamp-2 transition-all",
                          step.status === 'active' 
                            ? "text-neutral-600 dark:text-white/70 font-medium" 
                            : "text-neutral-400 dark:text-white/20"
                        )}>
                          {step.label}
                        </p>
                      )}

                      {step.summary && (
                        <div className="mt-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/5">
                          <p className="text-[11px] text-neutral-500 dark:text-white/40 leading-relaxed italic">
                            {step.summary}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              <div ref={bottomRef} className="h-2" />
            </div>

            {/* Duration / Footer */}
            {!isActive && totalDurationMs && (
              <div className="relative z-10 mt-6 pt-6 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-neutral-400" />
                  <span className="text-[11px] font-medium text-neutral-400">Mission completed in {(totalDurationMs / 1000).toFixed(1)}s</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold uppercase tracking-widest">
                  Success
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Bar */}
      <div className="flex items-center justify-between px-2 mt-3">
         <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 hover:text-black dark:hover:text-white uppercase tracking-widest transition-colors"
          >
            {isExpanded ? 'Minimize Analysis' : 'Show Thinking Loop'}
            <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", !isExpanded && "-rotate-90")} />
          </button>
          
          {isActive && (
            <div className="flex items-center gap-4">
              <div className="h-1 w-24 bg-neutral-100 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="h-full w-1/2 bg-neutral-900 dark:bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                />
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

export default AgentExecutionTimeline;
