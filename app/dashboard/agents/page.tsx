'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, Pause, Trash2, Clock, Mail, Slack, Zap, AlertCircle, CheckCircle2, Loader2, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  name: string;
  task_description: string;
  cron_schedule: string;
  output_channel: 'gmail' | 'slack' | 'both';
  slack_channel: string | null;
  status: 'active' | 'paused' | 'running';
  last_run_at: string | null;
  last_report_summary: string | null;
  created_at: string;
}

const SCHEDULE_PRESETS = [
  { label: 'Every morning at 7am', value: '0 7 * * *' },
  { label: 'Every morning at 8am', value: '0 8 * * *' },
  { label: 'Every day at noon', value: '0 12 * * *' },
  { label: 'Every hour', value: '0 */1 * * *' },
  { label: 'Every Sunday at 6pm', value: '0 18 * * 0' },
  { label: 'Custom cron', value: 'custom' },
];

const EXAMPLE_TASKS = [
  'Every morning at 7am: scan my inbox for unanswered client emails, draft replies in my voice, and email me a summary with links to each draft.',
  'Every hour: check if any email arrived from my top clients and send me a Slack ping immediately.',
  'Every Sunday at 6pm: scan all emails from this week, identify opportunities and leads, write a full weekly digest and email it to me.',
  'Every day at 9am: check my inbox for meeting requests, book them on my calendar with Google Meet links, and send me a Slack message listing what was scheduled.',
];

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return iso; }
}

function scheduleLabel(cron: string): string {
  const preset = SCHEDULE_PRESETS.find(p => p.value === cron);
  return preset ? preset.label : cron;
}

// ── Create/Edit Modal ──────────────────────────────────────────────────────────

function AgentModal({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Agent>) => Promise<void>;
  initial?: Partial<Agent>;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [taskDescription, setTaskDescription] = useState(initial?.task_description || '');
  const [schedulePreset, setSchedulePreset] = useState(initial?.cron_schedule || '0 7 * * *');
  const [customCron, setCustomCron] = useState('');
  const [outputChannel, setOutputChannel] = useState<'gmail' | 'slack' | 'both'>(initial?.output_channel || 'gmail');
  const [slackChannel, setSlackChannel] = useState(initial?.slack_channel || '');
  const [saving, setSaving] = useState(false);

  const cronValue = schedulePreset === 'custom' ? customCron : schedulePreset;

  const handleSave = async () => {
    if (!name.trim() || !taskDescription.trim()) {
      toast.error('Name and task description are required.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        task_description: taskDescription.trim(),
        cron_schedule: cronValue,
        output_channel: outputChannel,
        slack_channel: outputChannel !== 'gmail' ? slackChannel || null : null,
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save agent.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-1">{initial?.id ? 'Edit Agent' : 'Create Agent'}</h2>
        <p className="text-white/40 text-sm mb-8">Describe what you want Arcus to do automatically.</p>

        {/* Name */}
        <div className="mb-6">
          <label className="block text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Agent Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Morning Client Check"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>

        {/* Task description */}
        <div className="mb-6">
          <label className="block text-white/60 text-xs font-bold uppercase tracking-widest mb-2">What should Arcus do?</label>
          <textarea
            value={taskDescription}
            onChange={e => setTaskDescription(e.target.value)}
            placeholder="Describe the task in plain English..."
            rows={5}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-white/30 transition-colors resize-none"
          />
          <div className="mt-3 space-y-2">
            <p className="text-white/30 text-xs font-bold uppercase tracking-wider">Examples</p>
            {EXAMPLE_TASKS.map((ex, i) => (
              <button
                key={i}
                onClick={() => setTaskDescription(ex)}
                className="block w-full text-left text-xs text-white/40 hover:text-white/70 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div className="mb-6">
          <label className="block text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Schedule</label>
          <div className="grid grid-cols-2 gap-2">
            {SCHEDULE_PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => setSchedulePreset(p.value)}
                className={cn(
                  'px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all border',
                  schedulePreset === p.value
                    ? 'bg-white/10 border-white/30 text-white'
                    : 'bg-white/[0.03] border-white/5 text-white/40 hover:border-white/15 hover:text-white/70'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {schedulePreset === 'custom' && (
            <input
              value={customCron}
              onChange={e => setCustomCron(e.target.value)}
              placeholder="cron expression e.g. 0 9 * * 1-5"
              className="mt-3 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm font-mono focus:outline-none focus:border-white/30 transition-colors"
            />
          )}
        </div>

        {/* Output channel */}
        <div className="mb-8">
          <label className="block text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Send report to</label>
          <div className="flex gap-3">
            {(['gmail', 'slack', 'both'] as const).map(ch => (
              <button
                key={ch}
                onClick={() => setOutputChannel(ch)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-all capitalize',
                  outputChannel === ch
                    ? 'bg-white/10 border-white/30 text-white'
                    : 'bg-white/[0.03] border-white/5 text-white/40 hover:border-white/15'
                )}
              >
                {ch === 'gmail' && <Mail className="w-4 h-4" />}
                {ch === 'slack' && <Slack className="w-4 h-4" />}
                {ch === 'both' && <Zap className="w-4 h-4" />}
                {ch}
              </button>
            ))}
          </div>
          {outputChannel !== 'gmail' && (
            <input
              value={slackChannel}
              onChange={e => setSlackChannel(e.target.value)}
              placeholder="Slack channel (e.g. #reports or 'dm')"
              className="mt-3 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {saving ? 'Saving…' : initial?.id ? 'Save Changes' : 'Create Agent'}
        </button>
      </motion.div>
    </div>
  );
}

// ── Agent Card ─────────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  onToggle,
  onEdit,
  onDelete,
}: {
  agent: Agent;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusColor = {
    active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    paused: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    running: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  }[agent.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="group bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-6 hover:border-white/12 transition-all"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <h3 className="text-white font-bold text-[15px] truncate">{agent.name}</h3>
            <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', statusColor)}>
              {agent.status === 'running' && <Loader2 className="w-2.5 h-2.5 animate-spin inline mr-1" />}
              {agent.status}
            </span>
          </div>
          <p className="text-white/40 text-[13px] leading-relaxed line-clamp-2">{agent.task_description}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onToggle}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
            title={agent.status === 'paused' ? 'Resume' : 'Pause'}
          >
            {agent.status === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onEdit}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button
            onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[11px] text-white/25 font-mono">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {scheduleLabel(agent.cron_schedule)}
        </div>
        <div className="flex items-center gap-1.5">
          {agent.output_channel === 'gmail' && <Mail className="w-3 h-3" />}
          {agent.output_channel === 'slack' && <Slack className="w-3 h-3" />}
          {agent.output_channel === 'both' && <Zap className="w-3 h-3" />}
          {agent.output_channel}
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3" />
          Last ran: {formatDate(agent.last_run_at)}
        </div>
      </div>

      {agent.last_report_summary && (
        <div className="mt-4 pt-4 border-t border-white/[0.04]">
          <p className="text-white/30 text-[12px] leading-relaxed line-clamp-3 font-mono">
            {agent.last_report_summary}
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [tableError, setTableError] = useState(false);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/arcus/agents');
      const data = await res.json();
      if (data.error?.includes('not set up')) { setTableError(true); return; }
      setAgents(data.agents || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleCreate = async (data: Partial<Agent>) => {
    const res = await fetch('/api/arcus/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.name, taskDescription: data.task_description, ...data }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    toast.success(`Agent "${data.name}" created!`);
    await fetchAgents();
  };

  const handleEdit = async (data: Partial<Agent>) => {
    if (!editAgent) return;
    const res = await fetch('/api/arcus/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editAgent.id, ...data }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    toast.success('Agent updated!');
    setEditAgent(null);
    await fetchAgents();
  };

  const handleToggle = async (agent: Agent) => {
    const newStatus = agent.status === 'paused' ? 'active' : 'paused';
    await fetch('/api/arcus/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: agent.id, status: newStatus }),
    });
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: newStatus } : a));
    toast.success(newStatus === 'active' ? 'Agent resumed' : 'Agent paused');
  };

  const handleDelete = async (agent: Agent) => {
    if (!confirm(`Delete agent "${agent.name}"?`)) return;
    await fetch(`/api/arcus/agents?id=${agent.id}`, { method: 'DELETE' });
    setAgents(prev => prev.filter(a => a.id !== agent.id));
    toast.success('Agent deleted');
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Background Agents</h1>
            <p className="text-white/40 mt-1.5 text-[15px]">
              Autonomous tasks that run on schedule, without you lifting a finger.
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2.5 px-5 py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-white/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Agent
          </button>
        </div>

        {/* Table not set up warning */}
        {tableError && (
          <div className="mb-8 p-5 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-bold text-sm">Database table not set up</p>
              <p className="text-white/40 text-xs mt-1">
                Run the SQL migration in your Supabase project to enable agents. Check the /api/arcus/agents route file for the SQL.
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-32">
            <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-6">
              <Zap className="w-10 h-10 text-white/20" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No agents yet</h3>
            <p className="text-white/30 max-w-sm mx-auto text-[14px] leading-relaxed mb-8">
              Create your first background agent. It will run automatically on schedule and send you a report.
            </p>
            <button
              onClick={() => setCreateOpen(true)}
              className="px-6 py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-white/90 transition-colors"
            >
              Create First Agent
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {agents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onToggle={() => handleToggle(agent)}
                  onEdit={() => setEditAgent(agent)}
                  onDelete={() => handleDelete(agent)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {createOpen && (
          <AgentModal open onClose={() => setCreateOpen(false)} onSave={handleCreate} />
        )}
        {editAgent && (
          <AgentModal open onClose={() => setEditAgent(null)} onSave={handleEdit} initial={editAgent} />
        )}
      </AnimatePresence>
    </div>
  );
}
