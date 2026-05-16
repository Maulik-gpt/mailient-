'use client';

/**
 * AgentsPanel — Scheduled AI Agents Management Panel for Arcus
 * Create, manage, and monitor autonomous email agents
 * Manus AI-inspired design with premium glassmorphic cards
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Calendar,
  Mail,
  Search,
  Users,
  TrendingUp,
  Settings,
  RefreshCw,
  X,
  Sparkles,
  Bot,
  Timer,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface ScheduledAgent {
  id: string;
  name: string;
  description: string;
  schedule: string; // cron-like description: "Every morning at 7am", "Every Friday at 5pm"
  status: 'active' | 'paused' | 'error' | 'running';
  lastRun?: {
    timestamp: string;
    summary: string;
    actionsCount: number;
    status: 'success' | 'partial' | 'failed';
  };
  nextRun?: string;
  createdAt: string;
  type: 'triage' | 'follow-up' | 'schedule' | 'custom' | 'report';
  trigger?: 'cron' | 'event' | 'manual';
  icon?: React.ElementType;
}

interface AgentsPanelProps {
  agents?: ScheduledAgent[];
  onCreateAgent?: (description: string, schedule: string) => void;
  onPauseAgent?: (id: string) => void;
  onResumeAgent?: (id: string) => void;
  onDeleteAgent?: (id: string) => void;
  onRunNow?: (id: string) => void;
  onViewHistory?: (id: string) => void;
  onSendMessage?: (message: string) => void;
  className?: string;
}

// ============================================================================
// PRESET AGENT TEMPLATES
// ============================================================================

// No preset templates as requested

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function AgentStatusBadge({ status }: { status: ScheduledAgent['status'] }) {
  const config = {
    active: { label: 'Active', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', dot: 'bg-green-400' },
    paused: { label: 'Paused', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400' },
    error: { label: 'Error', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-400' },
    running: { label: 'Running', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-400' },
  };

  const c = config[status];

  return (
    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider", c.bg, c.border, c.color)}>
      {status === 'running' ? (
        <motion.div
          className={cn("w-1.5 h-1.5 rounded-full", c.dot)}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
      ) : (
        <div className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
      )}
      {c.label}
    </div>
  );
}

function AgentCard({
  agent,
  onPause,
  onResume,
  onDelete,
  onRunNow,
  onViewHistory,
  delay = 0,
}: {
  agent: ScheduledAgent;
  onPause?: () => void;
  onResume?: () => void;
  onDelete?: () => void;
  onRunNow?: () => void;
  onViewHistory?: () => void;
  delay?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const typeIcons: Record<string, React.ElementType> = {
    triage: Mail,
    'follow-up': Users,
    schedule: Calendar,
    custom: Zap,
    report: Activity,
  };

  const TypeIcon = (agent.icon || typeIcons[agent.type] || Bot) as React.FC<any>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative group rounded-2xl border transition-all overflow-hidden",
        "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]",
        agent.status === 'running' && "border-blue-500/20 bg-blue-500/[0.02]"
      )}
    >
      {/* Running shimmer */}
      {agent.status === 'running' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/[0.04] to-transparent w-[200%] pointer-events-none"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        />
      )}

      <div className="relative p-4">
        {/* Header Row */}
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 transition-all",
            agent.status === 'active' ? "bg-white/5 border-white/10 text-white/60" :
            agent.status === 'running' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
            agent.status === 'paused' ? "bg-white/[0.02] border-white/[0.06] text-white/30" :
            "bg-red-500/5 border-red-500/15 text-red-400"
          )}>
            <TypeIcon className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-[14px] font-semibold text-white/90 truncate">{agent.name}</h4>
              <AgentStatusBadge status={agent.status} />
            </div>
            <p className="text-[12px] text-white/40 leading-relaxed line-clamp-2">{agent.description}</p>
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-white/20 hover:text-white/50 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-full mt-1 w-44 bg-[#1a1a1a] border border-white/[0.08] rounded-xl shadow-2xl py-1 z-50"
                >
                  <button
                    onClick={() => { onRunNow?.(); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-[12px] text-white/70 hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5" /> Run now
                  </button>
                  {agent.status === 'active' ? (
                    <button
                      onClick={() => { onPause?.(); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-left text-[12px] text-white/70 hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                  ) : agent.status === 'paused' ? (
                    <button
                      onClick={() => { onResume?.(); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-left text-[12px] text-white/70 hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <Play className="w-3.5 h-3.5" /> Resume
                    </button>
                  ) : null}
                  <button
                    onClick={() => { onViewHistory?.(); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-[12px] text-white/70 hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <Clock className="w-3.5 h-3.5" /> View history
                  </button>
                  <div className="h-[1px] bg-white/[0.05] my-1" />
                  <button
                    onClick={() => { onDelete?.(); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-[12px] text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Schedule & Last Run */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.04]">
          <div className="flex items-center gap-1.5 text-[11px] text-white/30">
            <Timer className="w-3.5 h-3.5" />
            <span>{agent.schedule}</span>
          </div>
          {agent.lastRun && (
            <>
              <div className="w-[1px] h-3 bg-white/[0.06]" />
              <div className="flex items-center gap-1.5 text-[11px] text-white/30">
                {agent.lastRun.status === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400/60" />
                ) : agent.lastRun.status === 'failed' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-400/60" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400/60" />
                )}
                <span>Last run: {agent.lastRun.timestamp}</span>
              </div>
            </>
          )}
          {agent.nextRun && (
            <>
              <div className="w-[1px] h-3 bg-white/[0.06]" />
              <div className="flex items-center gap-1.5 text-[11px] text-white/20">
                <Clock className="w-3.5 h-3.5" />
                <span>Next: {agent.nextRun}</span>
              </div>
            </>
          )}
        </div>

        {/* Expandable Last Run Details */}
        {agent.lastRun && (
          <>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 flex items-center gap-1 text-[11px] text-white/20 hover:text-white/40 transition-colors"
            >
              <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
              {agent.lastRun.actionsCount} actions performed
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className="mt-2 text-[12px] text-white/30 leading-relaxed pl-4 border-l border-white/[0.06]">
                    {agent.lastRun.summary}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  );
}

function CreateAgentInput({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: { title: string, scheduleFreq: string, time: string, prompt: string, skipConfirmations: boolean, expirationDate?: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [scheduleFreq, setScheduleFreq] = useState('Daily');
  const [time, setTime] = useState('08:00');
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const [prompt, setPrompt] = useState('');
  const [skipConfirmations, setSkipConfirmations] = useState(false);

  const handleSubmit = () => {
    if (title.trim() && prompt.trim()) {
      onSubmit({
        title: title.trim(),
        scheduleFreq,
        time,
        prompt: prompt.trim(),
        skipConfirmations,
        expirationDate: hasExpiration ? expirationDate : undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/[0.04]">
          <h2 className="text-xl font-medium text-white tracking-tight">New scheduled task</h2>
          <button onClick={onCancel} className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Summary of unread mail"
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Schedule</label>
            <div className="flex items-center gap-3">
              <div className="relative w-48">
                <select
                  value={scheduleFreq}
                  onChange={e => setScheduleFreq(e.target.value)}
                  className="w-full appearance-none bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-colors cursor-pointer"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="No Repeat">No Repeat</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
              </div>

              <div className="relative w-32">
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-colors [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:invert cursor-pointer"
                />
              </div>
            </div>
            
            <div className="mt-3 flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer w-fit group">
                <div className="relative flex items-center justify-center w-4 h-4 rounded border border-white/20 bg-[#111] group-hover:border-white/40 transition-colors">
                  {hasExpiration && <CheckCircle2 className="w-3 h-3 text-white" />}
                  <input
                    type="checkbox"
                    checked={hasExpiration}
                    onChange={e => setHasExpiration(e.target.checked)}
                    className="absolute opacity-0 w-full h-full cursor-pointer"
                  />
                </div>
                <span className="text-sm text-white/70 group-hover:text-white transition-colors">Set expiration date</span>
              </label>

              <AnimatePresence>
                {hasExpiration && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <input
                      type="date"
                      value={expirationDate}
                      onChange={e => setExpirationDate(e.target.value)}
                      className="w-48 bg-[#111] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-white/30 transition-colors [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:invert cursor-pointer text-sm"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Summarize unread emails and highlight important messages"
              className="w-full h-32 bg-[#111] border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors resize-none"
            />
          </div>

          {/* Skip confirmations */}
          <div className="flex items-center justify-between p-4 bg-[#111] border border-white/10 rounded-xl">
            <div>
              <div className="text-sm font-medium text-white">Skip confirmations</div>
              <div className="text-xs text-white/50 mt-0.5">No approval needed before sending, publishing, or posting.</div>
            </div>
            <button
              onClick={() => setSkipConfirmations(!skipConfirmations)}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative",
                skipConfirmations ? "bg-white" : "bg-white/20"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 w-4 h-4 rounded-full transition-all bg-[#111]",
                  skipConfirmations ? "left-6" : "left-1 bg-white"
                )}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-white/[0.04] bg-[#1a1a1a]">
          <button
            onClick={onCancel}
            className="px-5 py-2 text-sm font-medium text-white border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !prompt.trim()}
            className="px-6 py-2 text-sm font-medium text-black bg-white rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AgentsPanel({
  agents: propAgents,
  onCreateAgent,
  onPauseAgent,
  onResumeAgent,
  onDeleteAgent,
  onRunNow,
  onViewHistory,
  onSendMessage,
  className,
}: AgentsPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [agents, setAgents] = useState<ScheduledAgent[]>(propAgents || []);

  // Sync with prop updates
  useEffect(() => {
    if (propAgents) setAgents(propAgents);
  }, [propAgents]);

  const handleCreateAgent = (data: { title: string, scheduleFreq: string, time: string, prompt: string, skipConfirmations: boolean, expirationDate?: string }) => {
    // Generate a human-readable schedule string
    const timeStr = new Date(`2000-01-01T${data.time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const schedule = `${data.scheduleFreq} at ${timeStr}${data.expirationDate ? ` (Expires ${data.expirationDate})` : ''}`;

    const newAgent: ScheduledAgent = {
      id: `agent_${Date.now()}`,
      name: data.title,
      description: data.prompt,
      schedule,
      status: 'active',
      createdAt: new Date().toISOString(),
      type: 'custom',
      trigger: data.scheduleFreq === 'No Repeat' ? 'manual' : 'cron',
    };

    setAgents(prev => [newAgent, ...prev]);
    setIsCreating(false);
    
    // As per user's prompt: "when user clicks Save, the AI agent should continue from the Arcus AI chat directly with the prompt"
    // So we pass the prompt directly to onSendMessage
    if (onSendMessage) {
      onSendMessage(`Create a scheduled agent named "${data.title}". Schedule: ${schedule}. Task: ${data.prompt}. Skip Confirmations: ${data.skipConfirmations}.`);
    } else {
      onCreateAgent?.(data.prompt, schedule);
    }
    toast.success('Agent created', { description: `${newAgent.name} is now active` });
  };

  const handlePause = (id: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'paused' as const } : a));
    onPauseAgent?.(id);
    toast.info('Agent paused');
  };

  const handleResume = (id: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'active' as const } : a));
    onResumeAgent?.(id);
    toast.success('Agent resumed');
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this agent? This cannot be undone.')) return;
    setAgents(prev => prev.filter(a => a.id !== id));
    onDeleteAgent?.(id);
    toast.success('Agent deleted');
  };

  const handleRunNow = (id: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'running' as const } : a));
    onRunNow?.(id);
    toast.info('Running agent...');
  };



  return (
    <div className={cn("w-full max-w-3xl mx-auto py-6", className)}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h2 className="text-2xl font-medium text-white tracking-tighter" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Scheduled Agents
          </h2>
          <p className="text-[13px] text-white/40 mt-1">
            Autonomous agents that manage your inbox on a schedule
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white text-black text-[12px] font-bold rounded-full hover:bg-neutral-200 transition-all active:scale-95 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          New Agent
        </button>
      </motion.div>

      {/* Create Agent Modal Form */}
      <AnimatePresence>
        {isCreating && (
          <CreateAgentInput
            onSubmit={handleCreateAgent}
            onCancel={() => setIsCreating(false)}
          />
        )}
      </AnimatePresence>

      {/* Agent Cards */}
      {agents.length > 0 ? (
        <div className="space-y-3">
          {agents.map((agent, i) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              delay={i * 0.05}
              onPause={() => handlePause(agent.id)}
              onResume={() => handleResume(agent.id)}
              onDelete={() => handleDelete(agent.id)}
              onRunNow={() => handleRunNow(agent.id)}
              onViewHistory={() => onViewHistory?.(agent.id)}
            />
          ))}
        </div>
      ) : (
        /* Empty State with Templates */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Empty State Message */}
          <div className="text-center py-12 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-[16px] font-medium text-white/60 mb-2">No agents yet</h3>
            <p className="text-[13px] text-white/30 max-w-sm mx-auto">
              Create agents that run automatically — triage your inbox, draft replies, and send follow-ups while you sleep.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default AgentsPanel;
