'use client';

/**
 * PlanVisualization - Manus AI Style
 * Detailed plan view with todos, dependencies, and execution status
 * Premium dark interface with interactive elements
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Shield,
  Play,
  X,
  ChevronRight,
  ChevronDown,
  Target,
  HelpCircle,
  ListTodo,
  GitBranch,
  Zap,
  Lock,
  Edit3,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface TodoItem {
  todoId: string;
  title: string;
  description?: string;
  status: 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'skipped' | 'blocked_approval';
  actionType: string;
  sortOrder: number;
  dependsOn: string[];
  approvalMode: 'auto' | 'manual' | 'conditional';
  attemptCount: number;
  maxAttempts: number;
  actionResult?: {
    success: boolean;
    message: string;
    externalRefs?: Record<string, string>;
  };
  errorMessage?: string;
  errorCategory?: string;
  recoveryHint?: {
    userMessage: string;
    recoveryAction: string;
    requiresUserAction: boolean;
  };
  startedAt?: string;
  completedAt?: string;
}

interface PlanArtifact {
  planId: string;
  title: string;
  objective: string;
  status: 'draft' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled';
  version: number;
  locked: boolean;
  todos: TodoItem[];
  assumptions: string[];
  questionsAnswered: string[];
  acceptanceCriteria: string[];
  createdAt?: string;
  approvedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  runId?: string;
  createdBy: string;
  parentPlanId?: string;
  revisionOf?: string;
  approval?: {
    approvedBy: string;
    approvedAt: string;
    token: string;
  };
}

interface PlanVisualizationProps {
  plan: PlanArtifact;
  onApprove?: () => void;
  onDecline?: () => void;
  onRevise?: () => void;
  onExecute?: () => void;
  onResume?: () => void;
  onTodoClick?: (todo: TodoItem) => void;
  className?: string;
  showTabs?: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const statusConfig: Record<string, { label: string; icon: any; color: string; bgColor: string; borderColor: string; animate: boolean; description: string }> = {
  draft: {
    label: 'Draft',
    icon: Edit3,
    color: 'text-black/70 dark:text-white/70',
    bgColor: 'bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10',
    borderColor: 'border-neutral-300 dark:border-white/20',
    animate: false,
    description: 'Review and approve to execute'
  },
  approved: {
    label: 'Approved',
    icon: Shield,
    color: 'text-black/80 dark:text-white/80',
    bgColor: 'bg-white/15',
    borderColor: 'border-white/25',
    animate: false,
    description: 'Ready for execution'
  },
  executing: {
    label: 'Executing',
    icon: Play,
    color: 'text-black/90 dark:text-white/90',
    bgColor: 'bg-white/15',
    borderColor: 'border-white/25',
    animate: true,
    description: 'In progress'
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-black/90 dark:text-white/90',
    bgColor: 'bg-white/15',
    borderColor: 'border-white/25',
    animate: false,
    description: 'All tasks finished'
  },
  failed: {
    label: 'Failed',
    icon: AlertTriangle,
    color: 'text-black/5 dark:text-black/50 dark:text-white/50',
    bgColor: 'bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10',
    borderColor: 'border-neutral-300 dark:border-white/20',
    animate: false,
    description: 'Execution failed'
  },
  cancelled: {
    label: 'Cancelled',
    icon: X,
    color: 'text-black/40 dark:text-white/40',
    bgColor: 'bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5',
    borderColor: 'border-neutral-200 dark:border-white/10',
    animate: false,
    description: 'Plan was cancelled'
  }
};

const todoStatusConfig = {
  pending: {
    label: 'Pending',
    icon: Circle,
    color: 'text-black/40 dark:text-white/40',
    bgColor: 'bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5',
    borderColor: 'border-neutral-200 dark:border-white/10',
    animate: false
  },
  ready: {
    label: 'Ready',
    icon: Clock,
    color: 'text-black/60 dark:text-white/60',
    bgColor: 'bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10',
    borderColor: 'border-neutral-300 dark:border-white/20',
    animate: false
  },
  running: {
    label: 'Running',
    icon: RefreshCw,
    color: 'text-black/80 dark:text-white/80',
    bgColor: 'bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10',
    borderColor: 'border-neutral-300 dark:border-white/20',
    animate: true
  },
  completed: {
    label: 'Done',
    icon: CheckCircle2,
    color: 'text-black/90 dark:text-white/90',
    bgColor: 'bg-white/15',
    borderColor: 'border-white/25',
    animate: false
  },
  failed: {
    label: 'Failed',
    icon: AlertTriangle,
    color: 'text-black/5 dark:text-black/50 dark:text-white/50',
    bgColor: 'bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10',
    borderColor: 'border-neutral-300 dark:border-white/20',
    animate: false
  },
  skipped: {
    label: 'Skipped',
    icon: X,
    color: 'text-black/40 dark:text-white/40',
    bgColor: 'bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5',
    borderColor: 'border-neutral-200 dark:border-white/10',
    animate: false
  },
  blocked_approval: {
    label: 'Blocked',
    icon: Shield,
    color: 'text-black/60 dark:text-white/60',
    bgColor: 'bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10',
    borderColor: 'border-neutral-300 dark:border-white/20',
    animate: false
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PlanVisualization({
  plan,
  onApprove,
  onDecline,
  onRevise,
  onExecute,
  onResume,
  onTodoClick,
  className,
  showTabs = true
}: PlanVisualizationProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'todos' | 'timeline'>('overview');
  const [expandedTodos, setExpandedTodos] = useState<Set<string>>(new Set());

  const status = statusConfig[plan.status];
  const StatusIcon = status.icon;

  // Calculate progress
  const completedTodos = plan.todos.filter(t => t.status === 'completed').length;
  const totalTodos = plan.todos.length;
  const progressPercent = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

  const toggleTodo = (todoId: string) => {
    setExpandedTodos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(todoId)) newSet.delete(todoId);
      else newSet.add(todoId);
      return newSet;
    });
  };

  const needsApproval = plan.status === 'draft';
  const isExecuting = plan.status === 'executing';
  const canRevise = ['approved', 'completed', 'failed'].includes(plan.status);

  return (
    <div className={cn(
      "bg-white dark:bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden",
      "shadow-2xl shadow-black/50",
      className
    )}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Status Icon */}
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center border shrink-0",
              status.bgColor,
              status.borderColor,
              "shadow-lg shadow-black/20"
            )}>
              <StatusIcon className={cn("w-6 h-6", status.color)} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-semibold text-black/95 dark:text-white/95 tracking-tight">
                {plan.title}
              </h2>
              <p className="text-[13px] text-black/5 dark:text-black/50 dark:text-white/50 mt-1 leading-relaxed">
                {plan.objective}
              </p>

              {/* Meta Info */}
              <div className="flex items-center gap-4 mt-3">
                <span className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium uppercase tracking-wider border",
                  status.bgColor,
                  status.borderColor,
                  status.color
                )}>
                  {status.label}
                </span>

                {plan.locked && (
                  <span className="flex items-center gap-1.5 text-[11px] text-black/30 dark:text-white/30">
                    <Lock className="w-3 h-3" />
                    v{plan.version}
                  </span>
                )}

                {plan.approvedAt && (
                  <span className="text-[11px] text-black/30 dark:text-white/30">
                    Approved {new Date(plan.approvedAt).toLocaleDateString()}
                  </span>
                )}

                {plan.runId && (
                  <span className="text-[11px] text-black/30 dark:text-white/30 font-mono">
                    Run: {plan.runId.slice(-8)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {needsApproval && (
              <>
                <button
                  onClick={onDecline}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium text-black/60 dark:text-white/60 hover:text-black/80 dark:text-white/80 hover:bg-white/[0.05] transition-all"
                >
                  Decline
                </button>
                <button
                  onClick={onApprove}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[13px] font-medium transition-all",
                    "bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10 hover:bg-black/[0.010] dark:bg-white/20 border border-white/30",
                    "text-black dark:text-white flex items-center gap-2"
                  )}
                >
                  <Shield className="w-4 h-4" />
                  Approve
                </button>
              </>
            )}

            {plan.status === 'approved' && (
              <button
                onClick={onExecute}
                className={cn(
                  "px-4 py-2 rounded-lg text-[13px] font-medium transition-all",
                  "bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10 hover:bg-black/[0.010] dark:bg-white/20 border border-white/30",
                  "text-black dark:text-white flex items-center gap-2"
                )}
              >
                <Play className="w-4 h-4" />
                Execute
              </button>
            )}

            {plan.status === 'executing' && (
              <button
                onClick={onResume}
                className={cn(
                  "px-4 py-2 rounded-lg text-[13px] font-medium transition-all",
                  "bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10 hover:bg-black/[0.010] dark:bg-white/20 border border-white/30",
                  "text-black dark:text-white flex items-center gap-2"
                )}
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            )}

            {canRevise && (
              <button
                onClick={onRevise}
                className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all"
              >
                <Edit3 className="w-4 h-4 text-black/5 dark:text-black/50 dark:text-white/50" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {totalTodos > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-[11px] mb-2">
              <span className="text-black/40 dark:text-white/40">Execution Progress</span>
              <span className="text-black/60 dark:text-white/60 font-mono">{completedTodos}/{totalTodos}</span>
            </div>
            <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  plan.status === 'failed' ? 'bg-black/[0.020] dark:bg-white/40' :
                  plan.status === 'completed' ? 'bg-white' :
                  'bg-gradient-to-r from-white/60 via-white/80 to-white'
                )}
              />
            </div>
            <div className="flex items-center gap-4 mt-2 text-[11px]">
              {plan.todos.some(t => t.status === 'running') && (
                <span className="text-black/70 dark:text-white/70 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  {plan.todos.filter(t => t.status === 'running').length} running
                </span>
              )}
              {plan.todos.some(t => t.status === 'failed') && (
                <span className="text-black/5 dark:text-black/50 dark:text-white/50 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {plan.todos.filter(t => t.status === 'failed').length} failed
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      {showTabs && (
        <div className="flex items-center gap-1 p-1.5 bg-white/[0.02] border-b border-white/[0.06]">
          {(['overview', 'todos', 'timeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2.5 text-[13px] font-medium rounded-lg transition-all capitalize",
                activeTab === tab
                  ? "bg-white/[0.08] text-black dark:text-white"
                  : "text-black/40 dark:text-white/40 hover:text-black/60 dark:text-white/60 hover:bg-white/[0.04]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              {/* Assumptions */}
              {plan.assumptions.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-black/40 dark:text-white/40" />
                    <h3 className="text-[13px] font-semibold text-black/70 dark:text-white/70 uppercase tracking-wider">
                      Assumptions
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {plan.assumptions.map((assumption, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-[13px] text-black/60 dark:text-white/60 pl-1"
                      >
                        <span className="text-black/5 dark:text-black/50 dark:text-white/50 mt-0.5">•</span>
                        {assumption}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Questions Answered */}
              {plan.questionsAnswered.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <HelpCircle className="w-4 h-4 text-black/40 dark:text-white/40" />
                    <h3 className="text-[13px] font-semibold text-black/70 dark:text-white/70 uppercase tracking-wider">
                      Questions Answered
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {plan.questionsAnswered.map((q, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-[13px] text-black/60 dark:text-white/60 pl-1"
                      >
                        <span className="text-black/60 dark:text-white/60 mt-0.5">✓</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Acceptance Criteria */}
              {plan.acceptanceCriteria.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-black/40 dark:text-white/40" />
                    <h3 className="text-[13px] font-semibold text-black/70 dark:text-white/70 uppercase tracking-wider">
                      Acceptance Criteria
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {plan.acceptanceCriteria.map((criteria, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-[13px] text-black/60 dark:text-white/60 pl-1"
                      >
                        <span className="text-black/30 dark:text-white/30 mt-0.5">{i + 1}.</span>
                        {criteria}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Todo Summary */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ListTodo className="w-4 h-4 text-black/40 dark:text-white/40" />
                  <h3 className="text-[13px] font-semibold text-black/70 dark:text-white/70 uppercase tracking-wider">
                    Task Summary
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(todoStatusConfig).map(([status, config]) => {
                    const count = plan.todos.filter(t => t.status === status).length;
                    if (count === 0) return null;
                    const Icon = config.icon;
                    return (
                      <div
                        key={status}
                        className={cn(
                          "p-3 rounded-xl border",
                          config.bgColor,
                          config.borderColor
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={cn("w-4 h-4", config.color)} />
                          <span className={cn("text-lg font-semibold", config.color)}>
                            {count}
                          </span>
                        </div>
                        <span className="text-[11px] text-black/40 dark:text-white/40 mt-1 block">
                          {config.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </motion.div>
          )}

          {/* Todos Tab */}
          {activeTab === 'todos' && (
            <motion.div
              key="todos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 space-y-2"
            >
              {plan.todos.map((todo, index) => {
                const todoStatus = todoStatusConfig[todo.status];
                const StatusIcon = todoStatus.icon;
                const isExpanded = expandedTodos.has(todo.todoId);
                const hasDependencies = todo.dependsOn.length > 0;

                return (
                  <motion.div
                    key={todo.todoId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <button
                      onClick={() => toggleTodo(todo.todoId)}
                      className={cn(
                        "w-full p-4 rounded-xl border transition-all",
                        todo.status === 'running' ? "bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 border-neutral-300 dark:border-white/20" :
                        todo.status === 'completed' ? "bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 border-neutral-200 dark:border-white/10" :
                        todo.status === 'failed' ? "bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 border-neutral-300 dark:border-white/20" :
                        todo.status === 'blocked_approval' ? "bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 border-neutral-300 dark:border-white/20" :
                        "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Status Icon */}
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                          todoStatus.bgColor
                        )}>
                          <StatusIcon
                            className={cn(
                              "w-4 h-4",
                              todoStatus.color,
                              todoStatus.animate ? "animate-spin" : ""
                            )}
                          />
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={cn(
                              "text-[14px] font-medium",
                              todo.status === 'completed' ? 'text-black/40 dark:text-white/40 line-through' : 'text-black/80 dark:text-white/80'
                            )}>
                              {index + 1}. {todo.title}
                            </h4>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider shrink-0",
                              todoStatus.bgColor,
                              todoStatus.color
                            )}>
                              {todoStatus.label}
                            </span>
                          </div>

                          {todo.description && (
                            <p className="text-[12px] text-black/40 dark:text-white/40 mt-1">
                              {todo.description}
                            </p>
                          )}

                          {/* Dependencies */}
                          {hasDependencies && (
                            <div className="flex items-center gap-2 mt-2 text-[11px] text-black/30 dark:text-white/30">
                              <GitBranch className="w-3 h-3" />
                              <span>Depends on: {todo.dependsOn.length} task(s)</span>
                            </div>
                          )}

                          {/* Error Message */}
                          {todo.errorMessage && (
                            <div className="mt-2 p-2 bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 rounded border border-neutral-200 dark:border-white/10">
                              <p className="text-[11px] text-black/5 dark:text-black/50 dark:text-white/50">{todo.errorMessage}</p>
                            </div>
                          )}

                          {/* Recovery Hint */}
                          {todo.recoveryHint && (
                            <div className="mt-2 p-2 bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 rounded border border-neutral-200 dark:border-white/10">
                              <p className="text-[11px] text-black/60 dark:text-white/60">
                                {todo.recoveryHint.userMessage}
                              </p>
                            </div>
                          )}

                          {/* Attempt Counter */}
                          {todo.attemptCount > 1 && (
                            <p className="text-[10px] text-black/30 dark:text-white/30 mt-2">
                              Attempt {todo.attemptCount} of {todo.maxAttempts}
                            </p>
                          )}
                        </div>

                        {/* Expand Icon */}
                        {todo.actionResult && (
                          <ChevronDown className={cn(
                            "w-4 h-4 text-black/30 dark:text-white/30 transition-transform shrink-0",
                            isExpanded && "rotate-180"
                          )} />
                        )}
                      </div>

                      {/* Expanded Action Result */}
                      <AnimatePresence>
                        {isExpanded && todo.actionResult && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-3 pt-3 border-t border-white/[0.06]"
                          >
                            <div className="pl-11">
                              <p className={cn(
                                "text-[12px] font-medium",
                                todo.actionResult.success ? 'text-black/80 dark:text-white/80' : 'text-black/5 dark:text-black/50 dark:text-white/50'
                              )}>
                                {todo.actionResult.message}
                              </p>
                              {todo.actionResult.externalRefs && (
                                <div className="mt-2 space-y-1">
                                  {Object.entries(todo.actionResult.externalRefs).map(([key, value]) => (
                                    <div
                                      key={key}
                                      className="flex items-center gap-2 text-[11px] text-black/40 dark:text-white/40 font-mono"
                                    >
                                      <span className="text-black/30 dark:text-white/30">{key}:</span>
                                      <span className="truncate">{value}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <div className="relative pl-4">
                {/* Timeline Line */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10" />

                <div className="space-y-6">
                  {/* Plan Created */}
                  <TimelineItem
                    status="completed"
                    title="Plan Created"
                    timestamp={plan.createdAt || new Date().toISOString()}
                    description={`By ${plan.createdBy}`}
                  />

                  {/* Approved */}
                  {plan.approvedAt && (
                    <TimelineItem
                      status="completed"
                      title="Plan Approved"
                      timestamp={plan.approvedAt}
                      description={plan.approval?.approvedBy ? `By ${plan.approval.approvedBy}` : undefined}
                    />
                  )}

                  {/* Todo Events */}
                  {plan.todos
                    .filter(t => t.startedAt || t.completedAt || t.errorMessage)
                    .map(todo => (
                      <TimelineItem
                        key={todo.todoId}
                        status={
                          todo.status === 'completed' ? 'completed' :
                          todo.status === 'failed' ? 'failed' :
                          todo.status === 'running' ? 'running' :
                          'pending'
                        }
                        title={todo.title}
                        timestamp={todo.completedAt || todo.startedAt}
                        description={
                          todo.errorMessage ?
                            <span className="text-black/5 dark:text-black/50 dark:text-white/50">{todo.errorMessage}</span> :
                            todo.status === 'completed' ? 'Task completed successfully' :
                            'Task started'
                        }
                      />
                    ))}

                  {/* Completed */}
                  {plan.completedAt && (
                    <TimelineItem
                      status="completed"
                      title="Plan Completed"
                      timestamp={plan.completedAt}
                      description="All tasks finished successfully"
                    />
                  )}

                  {/* Cancelled */}
                  {plan.cancelledAt && (
                    <TimelineItem
                      status="failed"
                      title="Plan Cancelled"
                      timestamp={plan.cancelledAt}
                      description="Execution was cancelled"
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
      `}</style>
    </div>
  );
}

// ============================================================================
// TIMELINE ITEM COMPONENT
// ============================================================================

interface TimelineItemProps {
  status: string;
  title: string;
  timestamp?: string;
  description?: React.ReactNode;
}

function TimelineItem({ status, title, timestamp, description }: TimelineItemProps) {
  const statusColors = {
    completed: 'bg-white',
    failed: 'bg-black/[0.020] dark:bg-white/40',
    running: 'bg-black/[0.035] dark:bg-white/70 animate-pulse',
    pending: 'bg-black/[0.015] dark:bg-white/30'
  };

  return (
    <div className="relative pl-6">
      <div className={cn(
        "absolute left-0 top-1 w-2 h-2 rounded-full -translate-x-[3px]",
        statusColors[status as keyof typeof statusColors] || 'bg-slate-500'
      )} />
      <div className="space-y-1">
        <h4 className="text-[13px] font-medium text-black/80 dark:text-white/80">{title}</h4>
        {description && (
          <p className="text-[12px] text-black/5 dark:text-black/50 dark:text-white/50">{description}</p>
        )}
        {timestamp && (
          <p className="text-[11px] text-black/30 dark:text-white/30 font-mono">
            {new Date(timestamp).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

export default PlanVisualization;
