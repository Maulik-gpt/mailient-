'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Loader2, CheckCircle2, Circle, Clock, X,
  Sparkles, ArrowRight, Target, Shield, ChevronRight,
  BrainCircuit, Search, Mail, Edit3, Calendar, Database,
  BarChart3, FileText, ListTodo, Zap, Globe, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlanArtifact, TodoItem, PlanStatus } from './PlanArtifactCard';

// ─── Action Type Icons ────────────────────────────────────────
const actionIcons: Record<string, any> = {
  search_email: Search, read_thread: Mail, draft_reply: Edit3,
  send_email: Mail, schedule_meeting: Calendar, notion_create_page: Database,
  notion_append: Database, tasks_add_tasks: ListTodo, analyze_data: BarChart3,
  generic_task: BrainCircuit, execute: Zap, think: BrainCircuit,
  search: Search, read: FileText, analyze: BarChart3, draft: Edit3
};

// ─── Status Colors ────────────────────────────────────────────
const stepStatusStyles: Record<string, { dot: string; text: string; bg: string }> = {
  pending:          { dot: 'bg-white/20',        text: 'text-white/30', bg: 'bg-white/[0.02]' },
  ready:            { dot: 'bg-blue-400',        text: 'text-blue-400', bg: 'bg-blue-500/5' },
  running:          { dot: 'bg-amber-400',       text: 'text-amber-400', bg: 'bg-amber-500/5' },
  completed:        { dot: 'bg-emerald-400',     text: 'text-emerald-400', bg: 'bg-emerald-500/5' },
  failed:           { dot: 'bg-red-400',         text: 'text-red-400', bg: 'bg-red-500/5' },
  skipped:          { dot: 'bg-white/20',        text: 'text-white/30', bg: 'bg-white/[0.02]' },
  blocked_approval: { dot: 'bg-orange-400',      text: 'text-orange-400', bg: 'bg-orange-500/5' },
};

// ─── Inline Plan Card ─────────────────────────────────────────
interface PlanCanvasProps {
  plan: PlanArtifact;
  onExecute: (planId: string) => Promise<void>;
  onDecline?: (planId: string) => void;
  isProcessing?: boolean;
}

export function PlanCanvas({ plan, onExecute, onDecline, isProcessing }: PlanCanvasProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const completedCount = plan.todos.filter(t => t.status === 'completed').length;
  const totalCount = plan.todos.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isDraft = plan.status === 'draft' && !plan.locked;
  const isRunning = plan.status === 'executing';

  const handleExecute = async () => {
    setIsExecuting(true);
    try { await onExecute(plan.planId); } finally { setIsExecuting(false); }
  };

  return (
    <>
      {/* ── Inline Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="w-full max-w-2xl my-4 cursor-pointer group"
        onClick={() => setIsModalOpen(true)}
      >
        <div className={cn(
          "relative overflow-hidden rounded-2xl border bg-white dark:bg-[#0a0a0a] transition-all duration-300",
          "hover:border-white/15 hover:shadow-[0_0_40px_rgba(255,255,255,0.03)]",
          isDraft ? "border-white/10" : isRunning ? "border-blue-500/25" : "border-white/[0.06]"
        )}>
          {/* Subtle top accent line */}
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent" />

          {/* ── Header ── */}
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                {isRunning
                  ? <Loader2 className="w-5 h-5 text-blue-500 dark:text-blue-400 animate-spin" />
                  : <Sparkles className="w-5 h-5 text-black/40 dark:text-white/40" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <h3 className="text-[15px] font-bold text-black dark:text-white tracking-tight truncate">{plan.title}</h3>
                  <StatusPill status={plan.status} />
                </div>
                <p className="text-[13px] text-black/40 dark:text-white/40 leading-relaxed line-clamp-2">{plan.objective}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-black/20 dark:text-white/20 group-hover:text-black/40 dark:group-hover:text-white/40 transition-colors shrink-0 mt-1" />
            </div>
          </div>

          {/* ── Steps Preview (max 3) ── */}
          <div className="px-6 pb-4">
            <div className="space-y-1.5">
              {plan.todos.slice(0, 3).map((todo, i) => (
                <StepRow key={todo.todoId} todo={todo} index={i} compact />
              ))}
              {plan.todos.length > 3 && (
                <p className="text-[11px] text-black/40 dark:text-white/20 pl-7 pt-1">
                  +{plan.todos.length - 3} more steps
                </p>
              )}
            </div>
          </div>

          {/* ── Progress Bar ── */}
          {totalCount > 0 && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1 bg-black/[0.04] dark:bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className={cn(
                      "h-full rounded-full",
                      isRunning ? "bg-gradient-to-r from-blue-500 to-emerald-400" :
                      plan.status === 'completed' ? "bg-emerald-500 dark:bg-emerald-400" : "bg-black/20 dark:bg-white/20"
                    )}
                  />
                </div>
                <span className="text-[10px] text-black/40 dark:text-white/25 font-mono">{completedCount}/{totalCount}</span>
              </div>
            </div>
          )}

          {/* ── Action Bar ── */}
          {isDraft && (
            <div className="px-6 py-4 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); handleExecute(); }}
                disabled={isExecuting || isProcessing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black text-[12px] font-bold rounded-xl hover:bg-black/80 dark:hover:bg-neutral-200 transition-all disabled:opacity-40 active:scale-[0.98]"
              >
                {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {isExecuting ? 'Starting...' : 'Execute Plan'}
              </button>
              {onDecline && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDecline(plan.planId); }}
                  className="px-4 py-2.5 text-black/40 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 text-[12px] font-bold rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.04] transition-all"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}

          {isRunning && (
            <div className="px-6 py-3 border-t border-blue-500/10 bg-blue-500/[0.03]">
              <div className="flex items-center justify-center gap-2 text-blue-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[12px] font-bold tracking-tight">Executing plan...</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Full-Screen Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <PlanModal
            plan={plan}
            onClose={() => setIsModalOpen(false)}
            onExecute={handleExecute}
            onDecline={onDecline}
            isExecuting={isExecuting}
            isProcessing={isProcessing}
            progress={progress}
            completedCount={completedCount}
            totalCount={totalCount}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Full-Screen Plan Modal ───────────────────────────────────
function PlanModal({
  plan, onClose, onExecute, onDecline, isExecuting, isProcessing,
  progress, completedCount, totalCount
}: {
  plan: PlanArtifact;
  onClose: () => void;
  onExecute: () => Promise<void>;
  onDecline?: (planId: string) => void;
  isExecuting: boolean;
  isProcessing?: boolean;
  progress: number;
  completedCount: number;
  totalCount: number;
}) {
  const isDraft = plan.status === 'draft' && !plan.locked;
  const isRunning = plan.status === 'executing';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="w-full max-w-3xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="shrink-0 px-8 py-6 border-b border-white/[0.05]">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                {isRunning
                  ? <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  : <Sparkles className="w-6 h-6 text-white/40" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <h2 className="text-xl font-bold text-white tracking-tight">{plan.title}</h2>
                  <StatusPill status={plan.status} />
                  {plan.version > 1 && (
                    <span className="text-[9px] font-mono text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                      v{plan.version}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[14px] text-white/40 leading-relaxed flex-1">{plan.objective}</p>
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0",
                    plan.complexity === 'complex' ? "text-amber-400/60 bg-amber-500/5" : "text-white/20 bg-white/[0.03]"
                  )}>
                    {plan.complexity}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white transition-all shrink-0 ml-4"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress */}
          {totalCount > 0 && (
            <div className="flex items-center gap-3 mt-5">
              <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8 }}
                  className={cn(
                    "h-full rounded-full",
                    isRunning ? "bg-gradient-to-r from-blue-500 to-emerald-400" :
                    plan.status === 'completed' ? "bg-emerald-400" : "bg-white/20"
                  )}
                />
              </div>
              <span className="text-[11px] text-white/30 font-mono">{completedCount}/{totalCount} steps</span>
            </div>
          )}
        </div>

        {/* ── Modal Body (Scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 arcus-scrollbar">
          {/* Section 1: Introduction */}
          <PlanSection title="Objective" icon={Target}>
            <p className="text-[14px] text-white/60 leading-[1.7]">{plan.objective}</p>
            {plan.intent && (
              <p className="text-[13px] text-white/30 mt-2 italic">Intent: {plan.intent}</p>
            )}
          </PlanSection>

          {/* Section 2: Assumptions */}
          {plan.assumptions.length > 0 && (
            <PlanSection title="Assumptions" icon={Shield}>
              <ul className="space-y-2">
                {plan.assumptions.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-[13px] text-white/50">
                    <span className="w-1 h-1 rounded-full bg-white/20 mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </PlanSection>
          )}

          {/* Section 3: Execution Steps */}
          <PlanSection title={`Execution Steps (${totalCount})`} icon={ListTodo}>
            <div className="space-y-2">
              {plan.todos.map((todo, i) => (
                <StepRow key={todo.todoId} todo={todo} index={i} />
              ))}
            </div>
          </PlanSection>

          {/* Section 4: Success Criteria */}
          {plan.acceptanceCriteria.length > 0 && (
            <PlanSection title="Success Criteria" icon={CheckCircle2}>
              <ul className="space-y-2">
                {plan.acceptanceCriteria.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-[13px] text-white/50">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/40 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </PlanSection>
          )}

          {/* Section 5: Summary */}
          {plan.questionsAnswered.length > 0 && (
            <PlanSection title="Resolved Questions" icon={BrainCircuit}>
              <ul className="space-y-2">
                {plan.questionsAnswered.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-[13px] text-white/50">
                    <span className="text-emerald-400/50 mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </PlanSection>
          )}
        </div>

        {/* ── Modal Footer (Action Bar) ── */}
        {isDraft && (
          <div className="shrink-0 px-8 py-5 border-t border-white/[0.05] bg-[#070707]">
            <div className="flex items-center gap-3">
              <button
                onClick={onExecute}
                disabled={isExecuting || isProcessing}
                className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3 bg-white text-black text-[13px] font-bold rounded-xl hover:bg-neutral-200 transition-all disabled:opacity-40 active:scale-[0.98] shadow-lg shadow-white/5"
              >
                {isExecuting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting Execution...</>
                  : <><Play className="w-4 h-4" /> Execute Plan</>
                }
              </button>
              {onDecline && (
                <button
                  onClick={() => onDecline(plan.planId)}
                  className="px-5 py-3 text-white/30 hover:text-white/60 text-[13px] font-bold rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
            <p className="text-[11px] text-white/15 mt-3 text-center tracking-wide">
              Arcus will execute all {totalCount} steps autonomously once approved
            </p>
          </div>
        )}

        {isRunning && (
          <div className="shrink-0 px-8 py-4 border-t border-blue-500/10 bg-blue-500/[0.02]">
            <div className="flex items-center justify-center gap-2.5 text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[13px] font-bold">Plan execution in progress...</span>
              <span className="text-[11px] text-blue-400/40 font-mono ml-2">{completedCount}/{totalCount}</span>
            </div>
          </div>
        )}

        {plan.status === 'completed' && (
          <div className="shrink-0 px-8 py-4 border-t border-emerald-500/10 bg-emerald-500/[0.02]">
            <div className="flex items-center justify-center gap-2.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[13px] font-bold">Plan executed successfully</span>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Shared Sub-Components ────────────────────────────────────

function StatusPill({ status }: { status: PlanStatus }) {
  const config: Record<PlanStatus, { label: string; cls: string }> = {
    draft:     { label: 'Draft',      cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    approved:  { label: 'Approved',   cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    executing: { label: 'Executing',  cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    completed: { label: 'Completed',  cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    failed:    { label: 'Failed',     cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
    cancelled: { label: 'Cancelled',  cls: 'text-white/30 bg-white/5 border-white/10' },
  };
  const c = config[status];
  return (
    <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border", c.cls)}>
      {c.label}
    </span>
  );
}

function PlanSection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3">
        <Icon className="w-4 h-4 text-white/20" />
        <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/30">{title}</h4>
      </div>
      <div className="pl-[26px]">
        {children}
      </div>
    </div>
  );
}

function StepRow({ todo, index, compact }: { todo: TodoItem; index: number; compact?: boolean }) {
  const styles = stepStatusStyles[todo.status] || stepStatusStyles.pending;
  const Icon = actionIcons[todo.actionType] || Circle;
  const isCompleted = todo.status === 'completed';
  const isRunning = todo.status === 'running';

  return (
    <div className={cn(
      "flex items-start gap-3 rounded-xl transition-all",
      compact ? "py-1.5" : "p-3 border",
      compact ? "" : styles.bg,
      compact ? "" : isRunning ? "border-amber-500/15" : isCompleted ? "border-emerald-500/10" : "border-white/[0.03]"
    )}>
      {/* Step indicator */}
      <div className="relative mt-0.5 shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400/70" />
        ) : isRunning ? (
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
        ) : (
          <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center",
            todo.status === 'blocked_approval' ? "border-orange-400/40" : "border-white/10"
          )}>
            {todo.status === 'blocked_approval' && <Shield className="w-2 h-2 text-orange-400" />}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="w-3 h-3 text-white/15 shrink-0" />
          <span className={cn(
            "text-[13px] font-medium truncate",
            isCompleted ? "text-white/30 line-through" : "text-white/60"
          )}>
            {todo.title}
          </span>
        </div>
        {!compact && todo.description && !isCompleted && (
          <p className="text-[11px] text-white/25 mt-1 pl-5 line-clamp-2">{todo.description}</p>
        )}
        {!compact && todo.errorMessage && (
          <div className="flex items-start gap-1.5 mt-1.5 pl-5">
            <AlertTriangle className="w-3 h-3 text-red-400/60 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-400/50">{todo.errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
