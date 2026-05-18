'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, ChevronRight,
  Terminal, FileText, Search, BrainCircuit, Pencil, Code2, Sparkles,
  CheckCircle2, Loader2, AlertTriangle, Clock, Globe, Database,
  ListTodo, Mail, Calendar, Zap, X, Link2, ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES (unchanged — kept for backward compat)
// ─────────────────────────────────────────────────────────────────────────────

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
  todoGraph?: TodoGraph | null;
  showTodoGraph?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ConnectorRequiredItem — one row inside the panel
// ─────────────────────────────────────────────────────────────────────────────

export interface ConnectorRequiredEntry {
  id: string;
  name: string;
  description: string;
  icon?: string;         // URL to icon image
  color?: string;        // brand color hex
  connected?: boolean;
}

export interface ConnectorRequiredPanelProps {
  connectors: ConnectorRequiredEntry[];
  onConnect: (id: string) => void;
  onSkip: () => void;
  onApply: () => void;
  onViewAll?: () => void;
  waitingForUser?: boolean;
}

/**
 * ConnectorRequiredPanel
 * Shown inline when Arcus needs one or more integrations to continue.
 * Modeled after the Manus "Recommended for this task" UI.
 */
export function ConnectorRequiredPanel({
  connectors,
  onConnect,
  onSkip,
  onApply,
  onViewAll,
  waitingForUser = true,
}: ConnectorRequiredPanelProps) {
  return (
    <div className="w-full my-4">
      {/* Card */}
      <div className="bg-zinc-900 border border-zinc-700/60 rounded-2xl overflow-hidden shadow-xl shadow-black/40">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-zinc-800/60">
          <p className="text-[13px] font-bold text-zinc-100 uppercase tracking-widest">
            Recommended for this task
          </p>
        </div>

        {/* Connector rows */}
        <div className="divide-y divide-zinc-800/60">
          {connectors.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-4">
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-zinc-800 border border-zinc-700/60"
                style={c.color ? { backgroundColor: c.color + '18', borderColor: c.color + '40' } : {}}
              >
                {c.icon ? (
                  <img src={c.icon} alt={c.name} className="w-5 h-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <Link2 className="w-4 h-4 text-zinc-400" />
                )}
              </div>

              {/* Name + status + description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[14px] font-bold text-zinc-100">{c.name}</span>
                  {!c.connected && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 border border-zinc-700 text-zinc-400">
                      Not connected
                    </span>
                  )}
                  {c.connected && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 border border-zinc-600 text-zinc-200">
                      Connected
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-zinc-400 leading-snug line-clamp-1">{c.description}</p>
              </div>

              {/* Connect button */}
              {!c.connected && (
                <button
                  onClick={() => onConnect(c.id)}
                  className="flex-shrink-0 px-4 py-2 bg-zinc-100 text-zinc-950 rounded-xl text-[13px] font-bold hover:bg-white active:scale-95 transition-all"
                >
                  Connect
                </button>
              )}
              {c.connected && (
                <CheckCircle2 className="w-5 h-5 text-zinc-300 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-zinc-800/60 flex items-center justify-between gap-4">
          {onViewAll ? (
            <button
              onClick={onViewAll}
              className="text-[13px] text-zinc-400 hover:text-zinc-100 transition-colors flex items-center gap-1.5"
            >
              Looking for something else?{' '}
              <span className="text-zinc-200 font-semibold underline underline-offset-2">View all connectors</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          ) : <span />}

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onSkip}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 transition-all"
            >
              Skip
            </button>
            <button
              onClick={onApply}
              className="px-4 py-2 rounded-xl text-[13px] font-bold text-zinc-950 bg-zinc-100 hover:bg-white active:scale-95 transition-all"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* "Waiting for reply" indicator */}
      {waitingForUser && (
        <div className="flex items-center gap-2.5 mt-3 px-1">
          <div className="relative w-4 h-4 flex-shrink-0">
            <div className="w-4 h-4 rounded-full border-2 border-zinc-500 border-t-zinc-200 animate-spin" />
          </div>
          <p className="text-[13px] font-semibold text-zinc-300">
            Arcus will continue working after your reply
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getStepIcon(type: string, size = 'w-3.5 h-3.5') {
  switch (type) {
    case 'search':  return <Search className={size} />;
    case 'read':    return <FileText className={size} />;
    case 'analyze': return <BrainCircuit className={size} />;
    case 'think':   return <BrainCircuit className={size} />;
    case 'draft':   return <Pencil className={size} />;
    case 'execute': return <Terminal className={size} />;
    case 'code':    return <Code2 className={size} />;
    default:        return <Terminal className={size} />;
  }
}

/** Elapsed-time ticker shown on active steps */
function ElapsedTimer({ startedAt }: { startedAt?: string }) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const start = startedAt ? new Date(startedAt).getTime() : Date.now();
    ref.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(ref.current);
  }, [startedAt]);

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return (
    <span className="text-[11px] font-mono text-zinc-500">
      {m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StepRow — one ThinkingBlock rendered as a Manus-style accordion step
// ─────────────────────────────────────────────────────────────────────────────

function StepRow({
  block,
  index,
  total,
}: {
  block: ThinkingBlock;
  index: number;
  total: number;
}) {
  const [open, setOpen] = useState(block.status !== 'completed');
  const isActive = block.status === 'active';
  const isDone = block.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'rounded-xl border overflow-hidden transition-colors',
        isActive
          ? 'bg-zinc-900 border-zinc-700/80'
          : isDone
          ? 'bg-zinc-900/50 border-zinc-800/60'
          : 'bg-zinc-900/30 border-zinc-800/40',
      )}
    >
      {/* Step header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        {/* Status icon */}
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          {isDone ? (
            <CheckCircle2 className="w-4.5 h-4.5 text-zinc-300" />
          ) : isActive ? (
            <Loader2 className="w-4 h-4 text-zinc-100 animate-spin" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-zinc-700 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
            </div>
          )}
        </div>

        {/* Label */}
        <span
          className={cn(
            'flex-1 text-[14px] font-semibold leading-snug',
            isDone ? 'text-zinc-400' : 'text-zinc-100',
          )}
        >
          {block.title}
        </span>

        {/* Right side: counter + elapsed + chevron */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {isActive && <ElapsedTimer />}
          <span className="text-[12px] font-medium text-zinc-500">
            {index + 1}/{total}
          </span>
          {open ? (
            <ChevronDown className="w-4 h-4 text-zinc-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          )}
        </div>
      </button>

      {/* Sub-steps */}
      <AnimatePresence>
        {open && (block.steps.length > 0 || block.initialContext || block.interimConclusion) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-zinc-800/60"
          >
            <div className="px-4 py-3 space-y-0.5">
              {block.initialContext && (
                <p className="text-[13px] text-zinc-400 leading-relaxed mb-3 pl-1">
                  {block.initialContext}
                </p>
              )}

              {block.steps.map((step) => (
                <div
                  key={step.id}
                  className={cn(
                    'flex items-center gap-3 py-1.5 px-2 rounded-lg',
                    step.status === 'active' ? 'bg-zinc-800/50' : '',
                  )}
                >
                  {/* Sub-step status dot */}
                  <div className="flex-shrink-0">
                    {step.status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                    ) : step.status === 'active' ? (
                      <Loader2 className="w-3.5 h-3.5 text-zinc-300 animate-spin" />
                    ) : step.status === 'error' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-sm border border-zinc-700 flex items-center justify-center bg-zinc-800/60">
                        <div className="text-zinc-600 flex items-center justify-center">
                          {getStepIcon(step.type, 'w-2.5 h-2.5')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tool-type icon pill */}
                  {(step.status === 'completed' || step.status === 'active') && (
                    <div
                      className={cn(
                        'w-5 h-5 rounded flex items-center justify-center flex-shrink-0',
                        step.status === 'completed'
                          ? 'bg-zinc-800 text-zinc-500'
                          : 'bg-zinc-700 text-zinc-200',
                      )}
                    >
                      {getStepIcon(step.type, 'w-3 h-3')}
                    </div>
                  )}

                  <span
                    className={cn(
                      'text-[13px] font-medium leading-snug flex-1',
                      step.status === 'completed'
                        ? 'text-zinc-500'
                        : step.status === 'active'
                        ? 'text-zinc-200'
                        : 'text-zinc-500',
                    )}
                  >
                    {step.label}
                  </span>

                  {step.status === 'active' && (
                    <span className="text-[11px] text-zinc-500 italic flex-shrink-0">Running…</span>
                  )}
                </div>
              ))}

              {(block.interimConclusion || block.nextActionContext) && (
                <p className="text-[13px] text-zinc-400 leading-relaxed mt-3 pl-1">
                  {block.interimConclusion}{block.nextActionContext ? ' ' + block.nextActionContext : ''}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TodoItemRow — one TodoGraphItem in Manus-accordion style
// ─────────────────────────────────────────────────────────────────────────────

function TodoItemRow({
  todo,
  index,
  total,
}: {
  todo: TodoGraphItem;
  index: number;
  total: number;
}) {
  const [open, setOpen] = useState(todo.status === 'running');
  const isRunning = todo.status === 'running';
  const isDone = todo.status === 'completed';
  const isFailed = todo.status === 'failed';
  const isBlocked = todo.status === 'blocked_approval';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'rounded-xl border overflow-hidden transition-colors',
        isRunning
          ? 'bg-zinc-900 border-zinc-700/80'
          : isDone
          ? 'bg-zinc-900/50 border-zinc-800/60'
          : isFailed
          ? 'bg-red-500/5 border-red-500/20'
          : isBlocked
          ? 'bg-zinc-900/60 border-zinc-700/60'
          : 'bg-zinc-900/30 border-zinc-800/40',
      )}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        {/* Status */}
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          {isDone ? (
            <CheckCircle2 className="w-4 h-4 text-zinc-300" />
          ) : isRunning ? (
            <Loader2 className="w-4 h-4 text-zinc-100 animate-spin" />
          ) : isFailed ? (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          ) : isBlocked ? (
            <div className="w-4 h-4 rounded-full border-2 border-zinc-500" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-zinc-700 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
            </div>
          )}
        </div>

        {/* Title */}
        <span
          className={cn(
            'flex-1 text-[14px] font-semibold leading-snug',
            isDone ? 'text-zinc-400' : isFailed ? 'text-red-400' : 'text-zinc-100',
          )}
        >
          {todo.title}
        </span>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          {isRunning && <ElapsedTimer startedAt={todo.startedAt} />}
          <span className="text-[12px] font-medium text-zinc-500">{index + 1}/{total}</span>
          {open ? (
            <ChevronDown className="w-4 h-4 text-zinc-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {open && (todo.description || todo.errorMessage || todo.resultPayload) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-zinc-800/60"
          >
            <div className="px-4 py-3 space-y-2">
              {todo.description && (
                <p className="text-[13px] text-zinc-400 leading-relaxed">{todo.description}</p>
              )}
              {todo.errorMessage && (
                <div className="flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-400">{todo.errorMessage}</p>
                </div>
              )}
              {todo.resultPayload && isDone && (
                <p className="text-[12px] text-zinc-400">
                  {todo.resultPayload.message || 'Completed successfully.'}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TodoGraphPanel — wraps the full todo list with header & progress bar
// ─────────────────────────────────────────────────────────────────────────────

function TodoGraphPanel({ graph }: { graph: TodoGraph }) {
  const progress =
    graph.progress.total > 0
      ? (graph.progress.completed / graph.progress.total) * 100
      : 0;
  const isExecuting = graph.status === 'executing' || graph.status === 'approved';

  return (
    <div className="w-full space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between px-1 mb-1">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-zinc-500" />
          <span className="text-[13px] font-bold text-zinc-100 tracking-tight">{graph.title}</span>
        </div>
        <span className="text-[12px] text-zinc-500">
          {graph.progress.completed}/{graph.progress.total}
        </span>
      </div>

      {/* Progress bar */}
      {isExecuting && graph.progress.total > 0 && (
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
            className="h-full bg-zinc-300 rounded-full"
          />
        </div>
      )}

      {/* Todo items */}
      <div className="space-y-2">
        {graph.todos.map((todo, i) => (
          <TodoItemRow key={todo.todoId} todo={todo} index={i} total={graph.progress.total} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SearchTransparencyPanel — Perplexity-style search steps (restyled)
// ─────────────────────────────────────────────────────────────────────────────

const sourceTypeConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  email:    { icon: <Mail className="w-3.5 h-3.5" />,     label: 'Gmail' },
  notes:    { icon: <FileText className="w-3.5 h-3.5" />, label: 'Notes' },
  web:      { icon: <Globe className="w-3.5 h-3.5" />,    label: 'Web' },
  calendar: { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Calendar' },
  notion:   { icon: <Database className="w-3.5 h-3.5" />, label: 'Notion' },
  tasks:    { icon: <ListTodo className="w-3.5 h-3.5" />, label: 'Tasks' },
};

function SearchTransparencyPanel({ sessions }: { sessions: SearchSession[] }) {
  const [open, setOpen] = useState(true);
  if (!sessions.length) return null;

  const done = sessions.filter(s => s.status === 'complete').length;
  const allDone = done === sessions.length;

  return (
    <div className="w-full">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-[13px] font-semibold text-zinc-300 hover:text-zinc-100 transition-colors mb-2"
      >
        {allDone ? `Completed ${done} search${done !== 1 ? 'es' : ''}` : `Searching… (${done}/${sessions.length})`}
        {open ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pl-1 border-l border-zinc-800 ml-1">
              {sessions.map((session) => {
                const cfg = sourceTypeConfig[session.sourceType] || sourceTypeConfig.web;
                const searching = session.status === 'searching' || session.status === 'source_processing';
                return (
                  <div key={session.sessionId} className="pl-3 py-1">
                    <div className="flex items-center gap-2.5 mb-1">
                      <div className="text-zinc-500">{cfg.icon}</div>
                      <span className={cn('text-[13px] font-semibold', searching ? 'text-zinc-200' : 'text-zinc-400')}>
                        {searching ? `Scanning ${cfg.label}…` : `${cfg.label} — ${session.resultCount ?? 0} results`}
                      </span>
                      {searching && <Loader2 className="w-3 h-3 text-zinc-400 animate-spin" />}
                    </div>
                    {session.selectedSnippets?.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 pl-5 py-0.5">
                        <div className="w-1 h-1 rounded-full bg-zinc-600 flex-shrink-0" />
                        <span className="text-[12px] text-zinc-400 truncate">{s.subject || s.title || 'Result'}</span>
                        {s.from && <span className="text-[11px] text-zinc-600 flex-shrink-0">{s.from.split('<')[0].trim()}</span>}
                      </div>
                    ))}
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

// ─────────────────────────────────────────────────────────────────────────────
// ThinkingLayer — main export (Manus-style vertical accordion)
// ─────────────────────────────────────────────────────────────────────────────

export function ThinkingLayer({
  blocks,
  isVisible,
  currentThought,
  isGenerating,
  onStop,
  searchSessions,
  todoGraph,
  showTodoGraph = true,
}: ThinkingLayerProps) {
  if (
    !isVisible ||
    (blocks.length === 0 &&
      !isGenerating &&
      (!searchSessions || !searchSessions.length) &&
      !todoGraph)
  ) return null;

  return (
    <div className="space-y-3 py-2">
      {/* Search sessions */}
      {!!searchSessions?.length && (
        <SearchTransparencyPanel sessions={searchSessions} />
      )}

      {/* Todo graph */}
      {showTodoGraph && todoGraph && (
        <TodoGraphPanel graph={todoGraph} />
      )}

      {/* Thinking blocks as step accordion */}
      {blocks.length > 0 && (
        <div className="space-y-2">
          {blocks.map((block, i) => (
            <StepRow key={block.id} block={block} index={i} total={blocks.length} />
          ))}
        </div>
      )}

      {/* Live thought stream */}
      {currentThought && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2.5 px-1 py-2"
        >
          <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin flex-shrink-0" />
          <p className="text-[13px] font-medium text-zinc-400 italic leading-snug">
            {currentThought}
          </p>
        </motion.div>
      )}

      {/* Generating spinner with stop */}
      {isGenerating && !currentThought && blocks.length === 0 && (
        <div className="flex items-center gap-3 px-1 py-2">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-zinc-500"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
              />
            ))}
          </div>
          <span className="text-[13px] font-medium text-zinc-400">Thinking…</span>
          {onStop && (
            <button
              onClick={onStop}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-zinc-400 hover:text-zinc-100 bg-zinc-800/60 hover:bg-zinc-700/80 border border-zinc-700/60 transition-all"
            >
              <X className="w-3 h-3" /> Stop
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ResultCard — file artifact card (kept, restyled for full opacity)
// ─────────────────────────────────────────────────────────────────────────────

interface ResultCardProps {
  type: string;
  title: string;
  onView: () => void;
  rawContent?: string;
}

const resultIcons: Record<string, React.ReactNode> = {
  email_draft:      <Mail className="w-5 h-5 text-zinc-300" />,
  summary:          <FileText className="w-5 h-5 text-zinc-300" />,
  research:         <Search className="w-5 h-5 text-zinc-300" />,
  action_plan:      <Zap className="w-5 h-5 text-zinc-300" />,
  reply:            <Mail className="w-5 h-5 text-zinc-300" />,
  notes:            <FileText className="w-5 h-5 text-zinc-300" />,
  meeting_schedule: <Calendar className="w-5 h-5 text-zinc-300" />,
  report:           <FileText className="w-5 h-5 text-zinc-300" />,
  analysis:         <FileText className="w-5 h-5 text-zinc-300" />,
};

const resultLabels: Record<string, string> = {
  email_draft:      'Email · Draft',
  summary:          'Document · MD',
  research:         'Report · MD',
  action_plan:      'Plan · MD',
  reply:            'Email · Reply',
  notes:            'Notes · MD',
  meeting_schedule: 'Schedule · MD',
  report:           'Report · MD',
  analysis:         'Analysis · MD',
};

export function ResultCard({ type, title, onView, rawContent }: ResultCardProps) {
  const label = resultLabels[type] || 'Document · MD';

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!rawContent) return;
    const blob = new Blob([rawContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safe = (title || 'document').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    a.setAttribute('download', `${safe}.${type === 'email_draft' || type === 'reply' ? 'txt' : 'md'}`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <motion.div
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={onView}
      className="group relative flex items-center gap-4 p-4 mt-2 mb-2 w-full max-w-[580px] bg-zinc-900 border border-zinc-700/60 rounded-2xl transition-all hover:bg-zinc-800 hover:border-zinc-600 cursor-pointer"
    >
      {/* Tilted icon card */}
      <div className="relative w-11 h-12 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center flex-shrink-0 shadow-md transform -rotate-3 overflow-hidden transition-transform group-hover:rotate-0">
        {resultIcons[type] || <FileText className="w-5 h-5 text-zinc-300" />}
      </div>

      <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
        <span className="text-zinc-100 text-[14px] font-semibold tracking-tight truncate group-hover:text-white transition-colors">
          {title || 'Untitled Document'}
        </span>
        <span className="text-[12px] text-zinc-500 font-medium">{label}</span>
      </div>

      {rawContent && (
        <button
          onClick={handleDownload}
          className="px-4 py-1.5 rounded-xl border border-zinc-700/60 bg-zinc-800 text-[12px] font-semibold text-zinc-200 hover:bg-zinc-700 hover:border-zinc-600 transition-all active:scale-95 flex-shrink-0"
        >
          Download
        </button>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: planToTodoGraph (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

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
      completedAt: t.completedAt || t.completed_at,
    })),
    progress: {
      total: todos.length,
      completed: todos.filter((t: any) => (t.status || t.todo_status) === 'completed').length,
      failed: todos.filter((t: any) => (t.status || t.todo_status) === 'failed').length,
      running: todos.filter((t: any) => (t.status || t.todo_status) === 'running').length,
      ready: todos.filter((t: any) => (t.status || t.todo_status) === 'ready').length,
    },
  };
}
