'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, XCircle, Clock, ArrowRight, AlertTriangle,
  FileText, ListTodo, Target, HelpCircle, Sparkles, Loader2,
  ChevronDown, ChevronUp, ExternalLink, Shield, Zap, Play,
  BrainCircuit, Check, X, Calendar, Mail, Database, Globe,
  BarChart3, Edit3, Search, Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type PlanStatus = 'draft' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled';

export type TodoItem = {
  todoId: string;
  title: string;
  description?: string;
  status: 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'skipped' | 'blocked_approval';
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

export type PlanArtifact = {
  planId: string;
  title: string;
  objective: string;
  assumptions: string[];
  questionsAnswered: string[];
  acceptanceCriteria: string[];
  status: PlanStatus;
  version: number;
  locked: boolean;
  approvedAt?: string;
  completedAt?: string;
  complexity: 'simple' | 'complex';
  intent: string;
  canvasType: string;
  todos: TodoItem[];
  createdAt: string;
  runId?: string;
};

interface PlanArtifactCardProps {
  plan: PlanArtifact;
  onApprove: (planId: string) => Promise<void>;
  onReject?: (planId: string) => void;
  isProcessing?: boolean;
  compact?: boolean;
}

const statusConfig: Record<PlanStatus, { label: string; color: string; gradient: string; icon: any; bgColor: string }> = {
  draft: { 
    label: 'Draft Plan', 
    color: 'text-amber-400', 
    gradient: 'from-amber-500/20 to-orange-500/10',
    icon: FileText,
    bgColor: 'bg-amber-500/10'
  },
  approved: { 
    label: 'Approved', 
    color: 'text-emerald-400', 
    gradient: 'from-emerald-500/20 to-teal-500/10',
    icon: CheckCircle2,
    bgColor: 'bg-emerald-500/10'
  },
  executing: { 
    label: 'Executing', 
    color: 'text-blue-400', 
    gradient: 'from-blue-500/20 to-cyan-500/10',
    icon: Loader2,
    bgColor: 'bg-blue-500/10'
  },
  completed: { 
    label: 'Completed', 
    color: 'text-emerald-400', 
    gradient: 'from-emerald-500/20 to-green-500/10',
    icon: CheckCircle2,
    bgColor: 'bg-emerald-500/10'
  },
  failed: { 
    label: 'Failed', 
    color: 'text-red-400', 
    gradient: 'from-red-500/20 to-rose-500/10',
    icon: XCircle,
    bgColor: 'bg-red-500/10'
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'text-neutral-400', 
    gradient: 'from-neutral-500/20 to-gray-500/10',
    icon: XCircle,
    bgColor: 'bg-neutral-500/10'
  }
};

const todoStatusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any; pulse?: boolean }> = {
  pending: { label: 'Pending', color: 'text-white/30', bgColor: 'bg-white/5', icon: Clock },
  ready: { label: 'Ready', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: CheckCircle2 },
  running: { label: 'Running', color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: Loader2, pulse: true },
  completed: { label: 'Done', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: AlertTriangle },
  skipped: { label: 'Skipped', color: 'text-neutral-400', bgColor: 'bg-neutral-500/10', icon: CheckCircle2 },
  blocked_approval: { label: 'Needs Approval', color: 'text-orange-400', bgColor: 'bg-orange-500/10', icon: Shield }
};

const actionTypeIcons: Record<string, any> = {
  search_email: Search,
  read_thread: Mail,
  draft_reply: Edit3,
  send_email: Mail,
  schedule_meeting: Calendar,
  notion_create_page: Database,
  notion_append: Database,
  tasks_add_tasks: ListTodo,
  analyze_data: BarChart3,
  generic_task: BrainCircuit,
  execute: Zap,
  think: BrainCircuit,
  search: Search,
  read: FileText,
  analyze: BarChart3,
  draft: Edit3
};

export function PlanArtifactCard({ plan, onApprove, onReject, isProcessing, compact = false }: PlanArtifactCardProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [activeTab, setActiveTab] = useState<'overview' | 'todos'>('todos');
  const [isApproving, setIsApproving] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove(plan.planId);
    } finally {
      setIsApproving(false);
    }
  };

  const statusInfo = statusConfig[plan.status];
  const StatusIcon = statusInfo.icon;

  const completedTodos = plan.todos.filter(t => t.status === 'completed').length;
  const totalTodos = plan.todos.length;
  const progress = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;
  const isExecuting = plan.status === 'executing';
  const needsApproval = plan.status === 'draft' && !plan.locked;

  if (compact) {
    return (
      <CompactPlanCard 
        plan={plan} 
        onApprove={handleApprove} 
        isApproving={isApproving}
        isProcessing={isProcessing}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-full max-w-2xl mx-auto my-4"
    >
      <div className={cn(
        "relative overflow-hidden rounded-2xl border bg-[#0d0d0d]",
        plan.status === 'draft' ? 'border-amber-500/30 shadow-lg shadow-amber-500/10' :
        plan.status === 'executing' ? 'border-blue-500/30 shadow-lg shadow-blue-500/10' :
        plan.status === 'completed' ? 'border-emerald-500/30 shadow-lg shadow-emerald-500/10' :
        'border-white/10'
      )}>
        {/* Animated Gradient Background */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-30",
          statusInfo.gradient
        )} />
        
        {/* Progress Bar for Executing State */}
        {isExecuting && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500"
            />
          </div>
        )}

        {/* Header */}
        <div className="relative px-6 py-5 border-b border-white/5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <motion.div 
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 20 }}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
                  plan.status === 'draft' ? 'bg-amber-500/10 border-amber-500/20' :
                  plan.status === 'executing' ? 'bg-blue-500/10 border-blue-500/20' :
                  plan.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20' :
                  'bg-white/5 border-white/10'
                )}
              >
                {isExecuting ? (
                  <Loader2 className={cn("w-6 h-6 animate-spin", statusInfo.color)} />
                ) : (
                  <StatusIcon className={cn("w-6 h-6", statusInfo.color)} />
                )}
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-[16px] font-bold text-white/95 tracking-tight">
                    {plan.title}
                  </h3>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
                    statusInfo.bgColor || 'bg-white/5',
                    statusInfo.color,
                    plan.status === 'draft' ? 'border-amber-500/30' :
                    plan.status === 'executing' ? 'border-blue-500/30' :
                    plan.status === 'completed' ? 'border-emerald-500/30' :
                    'border-white/10'
                  )}>
                    {statusInfo.label}
                  </span>
                </div>
                <p className="text-[13px] text-white/50 leading-relaxed">
                  {plan.objective}
                </p>
              </div>
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white/70"
            >
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5" />
              </motion.div>
            </button>
          </div>

          {/* Progress Bar */}
          {totalTodos > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className={cn(
                    "h-full rounded-full",
                    plan.status === 'executing' 
                      ? 'bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500' 
                      : plan.status === 'completed'
                      ? 'bg-emerald-500'
                      : 'bg-white/30'
                  )}
                />
              </div>
              <span className="text-[11px] text-white/40 font-medium">
                {completedTodos}/{totalTodos}
              </span>
            </div>
          )}
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {/* Tabs */}
              <div className="px-6 pt-4 flex items-center gap-1">
                {(['overview', 'todos'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-2 text-[12px] font-bold rounded-lg transition-all",
                      activeTab === tab 
                        ? "bg-white/10 text-white" 
                        : "text-white/40 hover:text-white/60 hover:bg-white/5"
                    )}
                  >
                    {tab === 'overview' ? 'Overview' : `Steps (${totalTodos})`}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="p-6 pt-4 space-y-4">
                {activeTab === 'overview' ? (
                  <OverviewTab plan={plan} />
                ) : (
                  <TodosTab todos={plan.todos} status={plan.status} />
                )}
              </div>

              {/* Action Footer */}
              {needsApproval && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-6 py-4 border-t border-white/5 bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleApprove}
                      disabled={isApproving || isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white text-black text-[13px] font-bold rounded-xl hover:bg-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/10"
                    >
                      {isApproving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Starting Execution...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Execute Plan
                        </>
                      )}
                    </motion.button>
                    {onReject && (
                      <button
                        onClick={() => onReject(plan.planId)}
                        className="px-5 py-3 bg-white/5 border border-white/10 text-white/60 text-[13px] font-bold rounded-xl hover:bg-white/10 hover:text-white transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-white/30 mt-3 text-center">
                    Once approved, Arcus will execute all {totalTodos} steps automatically
                  </p>
                </motion.div>
              )}

              {isExecuting && (
                <div className="px-6 py-4 border-t border-blue-500/20 bg-blue-500/5">
                  <div className="flex items-center justify-center gap-2 text-blue-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-[13px] font-bold">Executing Plan...</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function CompactPlanCard({ plan, onApprove, isApproving, isProcessing }: { 
  plan: PlanArtifact; 
  onApprove: () => void;
  isApproving: boolean;
  isProcessing?: boolean;
}) {
  const completedTodos = plan.todos.filter(t => t.status === 'completed').length;
  const totalTodos = plan.todos.length;
  const progress = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;
  const statusInfo = statusConfig[plan.status];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-xl mx-auto my-3"
    >
      <div className={cn(
        "relative overflow-hidden rounded-xl border bg-[#111111] p-4",
        plan.status === 'draft' ? 'border-amber-500/30' :
        plan.status === 'executing' ? 'border-blue-500/30' :
        'border-white/10'
      )}>
        {/* Gradient Background */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-20",
          statusInfo.gradient
        )} />

        <div className="relative flex items-start gap-4">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border",
            plan.status === 'draft' ? 'bg-amber-500/10 border-amber-500/20' :
            plan.status === 'executing' ? 'bg-blue-500/10 border-blue-500/20' :
            'bg-white/5 border-white/10'
          )}>
            {plan.status === 'executing' ? (
              <Loader2 className={cn("w-5 h-5 animate-spin", statusInfo.color)} />
            ) : (
              <Sparkles className={cn("w-5 h-5", statusInfo.color)} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-[14px] font-bold text-white/90">{plan.title}</h4>
              <span className={cn(
                "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                statusInfo.bgColor || 'bg-white/5',
                statusInfo.color
              )}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-[12px] text-white/50 line-clamp-1">{plan.objective}</p>

            {/* Mini Progress */}
            {totalTodos > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={cn(
                      "h-full rounded-full",
                      plan.status === 'executing' 
                        ? 'bg-gradient-to-r from-blue-500 to-emerald-500' 
                        : 'bg-white/30'
                    )}
                  />
                </div>
                <span className="text-[10px] text-white/40">
                  {completedTodos}/{totalTodos}
                </span>
              </div>
            )}

            {/* Todos Preview */}
            <div className="mt-3 space-y-1">
              {plan.todos.slice(0, 3).map((todo, i) => (
                <div key={todo.todoId} className="flex items-center gap-2">
                  <div className={cn(
                    "w-4 h-4 rounded flex items-center justify-center",
                    todoStatusConfig[todo.status].bgColor
                  )}>
                    {todo.status === 'completed' ? (
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    ) : todo.status === 'running' ? (
                      <Loader2 className="w-2.5 h-2.5 text-amber-400 animate-spin" />
                    ) : (
                      <Circle className="w-2.5 h-2.5 text-white/20" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[11px] truncate",
                    todo.status === 'completed' ? 'text-white/40 line-through' : 'text-white/60'
                  )}>
                    {todo.title}
                  </span>
                </div>
              ))}
              {plan.todos.length > 3 && (
                <p className="text-[10px] text-white/30 pl-6">
                  +{plan.todos.length - 3} more steps
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Execute Button */}
        {plan.status === 'draft' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onApprove}
            disabled={isApproving || isProcessing}
            className="relative mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-black text-[12px] font-bold rounded-lg hover:bg-neutral-200 transition-all disabled:opacity-50"
          >
            {isApproving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Execute Plan
              </>
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

function OverviewTab({ plan }: { plan: PlanArtifact }) {
  return (
    <div className="space-y-5">
      {/* Assumptions */}
      {plan.assumptions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2 text-white/40">
            <Target className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Assumptions</span>
          </div>
          <ul className="space-y-1.5">
            {plan.assumptions.map((assumption, i) => (
              <motion.li 
                key={i}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="flex items-start gap-2 text-[13px] text-white/60"
              >
                <span className="text-white/30 mt-1">•</span>
                {assumption}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Questions Answered */}
      {plan.questionsAnswered.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2 text-white/40">
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Questions Answered</span>
          </div>
          <ul className="space-y-1.5">
            {plan.questionsAnswered.map((q, i) => (
              <motion.li 
                key={i}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="flex items-start gap-2 text-[13px] text-white/60"
              >
                <span className="text-emerald-400/60 mt-1">✓</span>
                {q}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Acceptance Criteria */}
      {plan.acceptanceCriteria.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2 text-white/40">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Success Criteria</span>
          </div>
          <ul className="space-y-1.5">
            {plan.acceptanceCriteria.map((criteria, i) => (
              <motion.li 
                key={i}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-start gap-2 text-[13px] text-white/60"
              >
                <span className="text-white/30 mt-1">{i + 1}.</span>
                {criteria}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}

function TodosTab({ todos, status: planStatus }: { todos: TodoItem[]; status: PlanStatus }) {
  return (
    <div className="space-y-2">
      {todos.map((todo, index) => {
        const status = todoStatusConfig[todo.status];
        const StatusIcon = status.icon;
        const ActionIcon = actionTypeIcons[todo.actionType] || BrainCircuit;
        const isRunning = todo.status === 'running';
        const isCompleted = todo.status === 'completed';

        return (
          <motion.div
            key={todo.todoId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-start gap-3 p-3 rounded-xl border transition-all duration-300",
              isRunning ? "bg-amber-500/5 border-amber-500/20 shadow-sm shadow-amber-500/5" :
              isCompleted ? "bg-emerald-500/5 border-emerald-500/10" :
              todo.status === 'failed' ? "bg-red-500/5 border-red-500/20" :
              todo.status === 'blocked_approval' ? "bg-orange-500/5 border-orange-500/20" :
              "bg-white/[0.02] border-white/5 hover:border-white/10"
            )}
          >
            {/* Status Icon */}
            <motion.div 
              animate={status.pulse ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                status.bgColor
              )}
            >
              <StatusIcon className={cn("w-3.5 h-3.5", status.pulse && "animate-spin", status.color)} />
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ActionIcon className="w-3.5 h-3.5 text-white/30" />
                  <h4 className={cn(
                    "text-[13px] font-semibold leading-tight",
                    isCompleted ? 'text-white/40 line-through' : 'text-white/80'
                  )}>
                    {todo.title}
                  </h4>
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
                  status.bgColor, status.color
                )}>
                  {status.label}
                </span>
              </div>
              
              {todo.description && !isCompleted && (
                <p className="text-[12px] text-white/40 mt-1 pl-5.5">{todo.description}</p>
              )}

              {/* Error Message */}
              {todo.errorMessage && (
                <div className="flex items-start gap-2 mt-2 text-red-400/80">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <p className="text-[11px]">{todo.errorMessage}</p>
                </div>
              )}

              {/* Result */}
              {todo.resultPayload && isCompleted && (
                <p className="text-[10px] text-emerald-400/60 mt-2 pl-5.5">
                  ✓ {todo.resultPayload.message || 'Completed successfully'}
                </p>
              )}

              {/* Attempt Count */}
              {todo.attemptCount > 1 && (
                <p className="text-[10px] text-white/30 mt-2">
                  Attempt {todo.attemptCount}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
