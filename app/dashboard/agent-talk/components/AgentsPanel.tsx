'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Clock, Mail, Zap, Loader2, X, Trash2, Slack,
  MoreHorizontal, Check, AlertCircle, ChevronDown, Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  task_description: string;
  cron_schedule: string;
  output_channel: 'gmail' | 'slack' | 'both';
  slack_channel: string | null;
  status: 'active' | 'paused' | 'running';
  skip_confirmations: boolean;
  last_run_at: string | null;
  last_report_summary: string | null;
  created_at: string;
}

// ── Cron helpers ───────────────────────────────────────────────────────────────

function cronToLabel(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const [minStr, hourStr, , , dowStr] = parts;
  if (hourStr.startsWith('*/')) return hourStr === '*/1' ? 'Every hour' : `Every ${hourStr.split('/')[1]}h`;
  const h = hourStr.padStart(2, '0');
  const m = minStr.padStart(2, '0');
  const time = `${h}:${m}`;
  if (dowStr === '*') return `Daily at ${time}`;
  if (dowStr === '0') return `Sundays at ${time}`;
  if (dowStr === '1-5') return `Weekdays at ${time}`;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (!isNaN(parseInt(dowStr))) return `${days[parseInt(dowStr)]}s at ${time}`;
  return cron;
}

function getNextRunDate(cron: string): Date {
  const now = new Date();
  const parts = cron.split(' ');
  if (parts.length !== 5) return new Date(now.getTime() + 86400000);
  const [minStr, hourStr, , , dowStr] = parts;
  if (hourStr.startsWith('*/')) {
    const interval = parseInt(hourStr.split('/')[1]) || 1;
    const next = new Date(now);
    next.setMinutes(parseInt(minStr) || 0, 0, 0);
    if (next <= now) next.setHours(next.getHours() + interval);
    return next;
  }
  const tH = parseInt(hourStr) || 0;
  const tM = parseInt(minStr) || 0;
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), tH, tM, 0);
  if (dowStr === '*') return candidate > now ? candidate : new Date(candidate.getTime() + 86400000);
  if (dowStr === '1-5') {
    let next = candidate > now ? candidate : new Date(candidate.getTime() + 86400000);
    for (let i = 0; i < 7; i++) { if (next.getDay() >= 1 && next.getDay() <= 5) return next; next = new Date(next.getTime() + 86400000); }
    return next;
  }
  const targetDow = parseInt(dowStr) || 0;
  const daysUntil = (targetDow - now.getDay() + 7) % 7 || (candidate <= now ? 7 : 0);
  const next = new Date(candidate);
  next.setDate(next.getDate() + daysUntil);
  return next;
}

function formatNextRun(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
}

function formatRunDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
}

// ── Schedule helpers ───────────────────────────────────────────────────────────

const SCHEDULE_PATTERNS = [
  { label: 'Every day', key: 'daily', needsTime: true, needsDay: false },
  { label: 'Every hour', key: 'hourly', needsTime: false, needsDay: false },
  { label: 'Every weekday', key: 'weekday', needsTime: true, needsDay: false },
  { label: 'Every week', key: 'weekly', needsTime: true, needsDay: true },
  { label: 'Custom cron', key: 'custom', needsTime: false, needsDay: false },
];

const WEEK_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((l, i) => ({ label: l, value: String(i) }));

function buildCron(key: string, time: string, weekday: string): string {
  const [h, m] = time.split(':').map(s => parseInt(s, 10));
  const hh = isNaN(h) ? 7 : h;
  const mm = isNaN(m) ? 0 : m;
  if (key === 'daily') return `${mm} ${hh} * * *`;
  if (key === 'hourly') return `0 */1 * * *`;
  if (key === 'weekday') return `${mm} ${hh} * * 1-5`;
  if (key === 'weekly') return `${mm} ${hh} * * ${weekday}`;
  return '';
}

function parseCronToSchedule(cron: string) {
  if (!cron || cron === '0 */1 * * *') return { key: 'hourly', time: '07:00', weekday: '0' };
  const parts = cron.split(' ');
  if (parts.length !== 5) return { key: 'custom', time: '07:00', weekday: '0' };
  const [mm, hh, , , dow] = parts;
  const time = `${String(parseInt(hh) || 0).padStart(2, '0')}:${String(parseInt(mm) || 0).padStart(2, '0')}`;
  if (dow === '1-5') return { key: 'weekday', time, weekday: '1' };
  if (dow !== '*' && !dow.includes('/')) return { key: 'weekly', time, weekday: dow };
  return { key: 'daily', time, weekday: '0' };
}

// ── Toggle ─────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn('relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200',
        checked ? 'bg-blue-500' : 'bg-white/15')}
    >
      <span className={cn('inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200', checked ? 'translate-x-5' : 'translate-x-0')} />
    </button>
  );
}

// ── Templates ──────────────────────────────────────────────────────────────────

const TEMPLATES = [
  { name: 'Morning Inbox Sweep', description: 'Scan inbox for unanswered client emails, draft replies in your tone, email a summary with links.', cron_schedule: '0 7 * * *', output_channel: 'gmail' as const, task_description: 'Every morning at 7am, search my inbox for any unanswered client emails, study my recent sent emails to learn my writing tone, draft a personalized reply for each one, and email me a clear summary with links to each draft.' },
  { name: 'Meeting Autopilot', description: 'Find meeting requests, check calendar availability, book with Meet links, Slack you a summary.', cron_schedule: '0 9 * * *', output_channel: 'both' as const, task_description: 'Every morning at 9am, search my Gmail inbox for meeting requests, check my Google Calendar for availability, book confirmed meetings with Google Meet links, and send me a Slack message listing what was scheduled.' },
  { name: 'Weekly Opportunity Digest', description: 'Scan all emails from the week, identify revenue opportunities and leads, email a full digest every Sunday.', cron_schedule: '0 18 * * 0', output_channel: 'gmail' as const, task_description: 'Every Sunday at 6pm, search through all emails I received this week, identify revenue opportunities, potential partnerships, and warm leads, and write a comprehensive weekly digest email.' },
  { name: 'Client Pulse', description: 'Every hour, checks if email arrived from your top contacts. Sends an immediate Slack ping.', cron_schedule: '0 */1 * * *', output_channel: 'slack' as const, task_description: 'Every hour, check if any new email arrived from my most important contacts. If so, immediately send me a Slack message with the sender name, subject line, and first two sentences.' },
  { name: 'Notion + Inbox Sync', description: 'Cross-reference your Notion tasks with Gmail, find gaps, send a daily project briefing.', cron_schedule: '0 8 * * *', output_channel: 'gmail' as const, task_description: 'Every morning at 8am, read my Notion task list, search Gmail for emails related to each project, identify gaps, and email me a concise project briefing.' },
  { name: 'Lead Harvest', description: 'Run the lead qualification flow across inbox and web, push to Notion, email a harvest report.', cron_schedule: '0 5 * * *', output_channel: 'gmail' as const, task_description: 'Every morning at 5am, search my inbox for inbound leads, research and qualify each one via web search, save qualified leads to Notion, and email me a harvest report.' },
];

// ── Create Modal ───────────────────────────────────────────────────────────────

function CreateModal({ onClose, onSave, initial }: {
  onClose: () => void;
  onSave: (data: Partial<Agent> & { _timezone?: string }) => Promise<void>;
  initial?: Partial<Agent>;
}) {
  const parsed = initial?.cron_schedule ? parseCronToSchedule(initial.cron_schedule) : { key: 'daily', time: '07:00', weekday: '0' };
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [name, setName] = useState(initial?.name || '');
  const [task, setTask] = useState(initial?.task_description || '');
  const [patternKey, setPatternKey] = useState(parsed.key);
  const [scheduleTime, setScheduleTime] = useState(parsed.time);
  const [scheduleWeekday, setScheduleWeekday] = useState(parsed.weekday);
  const [customCron, setCustomCron] = useState(patternKey === 'custom' ? (initial?.cron_schedule || '') : '');
  const [channel, setChannel] = useState<'gmail'|'slack'|'both'>(initial?.output_channel || 'gmail');
  const [slackCh, setSlackCh] = useState(initial?.slack_channel || '');
  const [skipConf, setSkipConf] = useState(initial?.skip_confirmations ?? false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activePat = SCHEDULE_PATTERNS.find(p => p.key === patternKey) || SCHEDULE_PATTERNS[0];
  const cron = patternKey === 'custom' ? customCron : buildCron(patternKey, scheduleTime, scheduleWeekday);

  const handleSave = async () => {
    if (!task.trim()) { toast.error('Describe what you want Arcus to do.'); return; }
    setSaving(true);
    try {
      const agentName = name.trim() || task.trim().slice(0, 40) + (task.trim().length > 40 ? '…' : '');
      await onSave({ name: agentName, task_description: task.trim(), cron_schedule: cron || '0 7 * * *', output_channel: channel, slack_channel: channel !== 'gmail' ? slackCh || null : null, skip_confirmations: skipConf, _timezone: browserTz });
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="relative w-full max-w-xl bg-[#141414] border border-white/10 rounded-3xl overflow-y-auto max-h-[92vh] shadow-2xl"
      >
        <div className="flex items-center justify-between px-7 pt-7 pb-0">
          <div>
            <h2 className="text-[17px] font-bold text-white">{initial?.id ? 'Edit schedule' : 'New schedule'}</h2>
            <p className="text-[12px] text-white/35 mt-0.5">Describe the job in plain English</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-7 py-5 space-y-4">
          <textarea
            value={task}
            onChange={e => setTask(e.target.value)}
            placeholder="Describe what you want this agent to do..."
            rows={4}
            className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3.5 text-white text-[13px] leading-relaxed placeholder:text-white/20 focus:outline-none focus:border-white/25 resize-none transition-colors"
          />

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Agent name (optional)</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Morning Client Check" className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-white text-[12px] placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors" />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2.5">Schedule</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {SCHEDULE_PATTERNS.map(p => (
                <button key={p.key} onClick={() => setPatternKey(p.key)} className={cn('px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border', patternKey === p.key ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white/70')}>
                  {p.label}
                </button>
              ))}
            </div>

            {activePat.needsTime && (
              <div className="flex gap-3">
                {activePat.needsDay && (
                  <div className="flex-1">
                    <label className="block text-[10px] text-white/25 mb-1">Day</label>
                    <select value={scheduleWeekday} onChange={e => setScheduleWeekday(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-[12px] focus:outline-none focus:border-white/25 transition-colors appearance-none">
                      {WEEK_DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                )}
                <div className={activePat.needsDay ? 'flex-1' : 'w-full'}>
                  <label className="block text-[10px] text-white/25 mb-1">Time (your local time · {browserTz})</label>
                  <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-[12px] focus:outline-none focus:border-white/25 transition-colors" style={{ colorScheme: 'dark' }} />
                </div>
              </div>
            )}

            {patternKey === 'custom' && (
              <input value={customCron} onChange={e => setCustomCron(e.target.value)} placeholder="e.g. 0 9 * * 1-5" className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-[11px] placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors" />
            )}

            {cron && patternKey !== 'custom' && (
              <p className="mt-2 text-[10px] text-white/25 font-mono">Runs: <span className="text-white/45">{cronToLabel(cron)}</span></p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2.5">Deliver report to</label>
            <div className="flex gap-2">
              {(['gmail','slack','both'] as const).map(ch => (
                <button key={ch} onClick={() => setChannel(ch)} className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-medium border transition-all', channel === ch ? 'bg-white/10 border-white/30 text-white' : 'bg-white/[0.03] border-white/8 text-white/40 hover:border-white/15 hover:text-white/70')}>
                  {ch === 'gmail' && <Mail className="w-3 h-3" />}
                  {ch === 'slack' && <Slack className="w-3 h-3" />}
                  {ch === 'both' && <Zap className="w-3 h-3" />}
                  {ch === 'both' ? 'Both' : ch.charAt(0).toUpperCase() + ch.slice(1)}
                </button>
              ))}
            </div>
            {channel !== 'gmail' && (
              <input value={slackCh} onChange={e => setSlackCh(e.target.value)} placeholder="Slack channel (e.g. #reports)" className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-[11px] placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors" />
            )}
          </div>

          <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.06]">
            <div>
              <p className="text-[12px] font-semibold text-white">Skip confirmations</p>
              <p className="text-[10px] text-white/30 mt-0.5">No approval needed before sending or posting</p>
            </div>
            <Toggle checked={skipConf} onChange={() => setSkipConf(v => !v)} />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white/50 bg-white/5 hover:bg-white/10 transition-all border border-white/10">Cancel</button>
            <button onClick={handleSave} disabled={saving || !task.trim()} className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-black bg-white hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {saving ? 'Saving…' : initial?.id ? 'Save changes' : 'Create schedule'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// ── Agent Card ─────────────────────────────────────────────────────────────────

function AgentCard({ agent, onToggle, onEdit, onDelete, onToggleConf }: {
  agent: Agent; onToggle: () => void; onEdit: () => void; onDelete: () => void; onToggleConf: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const nextRun = getNextRunDate(agent.cron_schedule);

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
      className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/12 transition-all">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-white/40" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white leading-tight line-clamp-1">{agent.name}</p>
            <p className="text-[11px] text-white/40 mt-1 leading-relaxed line-clamp-2">{agent.task_description}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Toggle checked={agent.status !== 'paused'} onChange={onToggle} />
            <div className="relative">
              <button onClick={() => setMenuOpen(v => !v)} className="w-6 h-6 flex items-center justify-center rounded-lg text-white/25 hover:text-white hover:bg-white/10 transition-all">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
                    className="absolute right-0 top-8 w-32 bg-[#1e1e1e] border border-white/10 rounded-xl overflow-hidden shadow-xl z-10">
                    <button onClick={() => { setMenuOpen(false); onEdit(); }} className="w-full px-3 py-2 text-left text-[11px] text-white/70 hover:bg-white/8 hover:text-white transition-all">Edit</button>
                    <button onClick={() => { setMenuOpen(false); onDelete(); }} className="w-full px-3 py-2 text-left text-[11px] text-red-400 hover:bg-red-500/10 transition-all">Delete</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="ml-11 mt-2.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/25">Repeat</span>
            <span className="text-[10px] text-white/50 font-medium">{cronToLabel(agent.cron_schedule)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/25">Next run</span>
            <span className="text-[10px] text-white/50 font-medium">{formatNextRun(nextRun)}</span>
          </div>
        </div>

        {agent.last_run_at && (
          <div className="ml-11 mt-2">
            <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/40 transition-colors">
              <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
              Last run: {formatRunDate(agent.last_run_at)}
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <p className="mt-1.5 text-[11px] text-white/30 leading-relaxed pl-4 border-l border-white/[0.06]">
                    {agent.last_report_summary || 'Run completed.'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Skip confirmations row */}
      <div className="mx-4 mb-3 bg-[#0d0d0d] border border-white/[0.05] rounded-xl px-3.5 py-2.5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold text-white">Skip confirmations</p>
          <p className="text-[10px] text-white/25">No approval before sending or posting</p>
        </div>
        <Toggle checked={agent.skip_confirmations} onChange={onToggleConf} />
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export interface AgentsPanelProps {
  className?: string;
  onSendMessage?: (msg: string) => void;
}

export function AgentsPanel({ className, onSendMessage }: AgentsPanelProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [templateInit, setTemplateInit] = useState<Partial<Agent> | null>(null);
  const [tableError, setTableError] = useState(false);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/arcus/agents');
      const data = await res.json();
      if (data.error?.includes('not set up')) { setTableError(true); return; }
      setAgents(data.agents || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchAgents(); }, []);

  const saveTimezone = async (tz: string) => {
    if (!tz) return;
    try { await fetch('/api/arcus/agents/timezone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timezone: tz }) }); } catch { /* silent */ }
  };

  const handleCreate = async (data: Partial<Agent> & { _timezone?: string }) => {
    const { _timezone, ...agentData } = data;
    const res = await fetch('/api/arcus/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: agentData.name, taskDescription: agentData.task_description, cronSchedule: agentData.cron_schedule, outputChannel: agentData.output_channel, slackChannel: agentData.slack_channel, skipConfirmations: agentData.skip_confirmations }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    if (_timezone) saveTimezone(_timezone);
    toast.success(`"${agentData.name}" is now live`);
    await fetchAgents();
  };

  const handleEdit = async (data: Partial<Agent> & { _timezone?: string }) => {
    if (!editAgent) return;
    const { _timezone, ...agentData } = data;
    const res = await fetch('/api/arcus/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editAgent.id, ...agentData }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    if (_timezone) saveTimezone(_timezone);
    toast.success('Schedule updated');
    setEditAgent(null);
    await fetchAgents();
  };

  const handleToggle = async (agent: Agent) => {
    const newStatus = agent.status === 'paused' ? 'active' : 'paused';
    await fetch('/api/arcus/agents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: agent.id, status: newStatus }) });
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: newStatus } : a));
  };

  const handleToggleConf = async (agent: Agent) => {
    const newVal = !agent.skip_confirmations;
    await fetch('/api/arcus/agents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: agent.id, skip_confirmations: newVal }) });
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, skip_confirmations: newVal } : a));
  };

  const handleDelete = async (agent: Agent) => {
    if (!confirm(`Delete "${agent.name}"?`)) return;
    await fetch(`/api/arcus/agents?id=${agent.id}`, { method: 'DELETE' });
    setAgents(prev => prev.filter(a => a.id !== agent.id));
    toast.success('Schedule deleted');
  };

  return (
    <div className={cn('w-full max-w-2xl mx-auto py-6 px-1', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-bold text-white tracking-tight">
            <span className="text-red-400">Scheduled</span>
          </h2>
          <p className="text-[12px] text-white/30 mt-0.5">Agents working for you around the clock</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl font-bold text-[12px] hover:bg-white/90 active:scale-95 transition-all">
          <Plus className="w-3.5 h-3.5" />
          New schedule
        </button>
      </div>

      {tableError && (
        <div className="mb-4 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-white/40">Run the SQL migration in Supabase to enable agents. See <code className="text-white/60">arcus_agents</code> table setup.</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <div>
          <div className="text-center py-8 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
              <Bot className="w-7 h-7 text-white/20" />
            </div>
            <h3 className="text-[14px] font-semibold text-white/50 mb-1">No agents yet</h3>
            <p className="text-[12px] text-white/25 max-w-xs mx-auto">Activate a template or create your own schedule.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEMPLATES.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col hover:border-white/12 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                  <p className="text-[12px] font-bold text-white leading-tight">{t.name}</p>
                </div>
                <p className="text-[11px] text-white/35 leading-relaxed flex-1 mb-3">{t.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/20 font-mono">{cronToLabel(t.cron_schedule)}</span>
                  <button onClick={() => setTemplateInit(t)} className="px-3 py-1 rounded-lg bg-white text-black text-[10px] font-bold hover:bg-white/90 active:scale-95 transition-all">Activate</button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {agents.map(agent => (
              <AgentCard key={agent.id} agent={agent}
                onToggle={() => handleToggle(agent)}
                onEdit={() => setEditAgent(agent)}
                onDelete={() => handleDelete(agent)}
                onToggleConf={() => handleToggleConf(agent)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {(createOpen || templateInit) && (
          <CreateModal key="create" onClose={() => { setCreateOpen(false); setTemplateInit(null); }} onSave={handleCreate}
            initial={templateInit ? { name: templateInit.name, task_description: templateInit.task_description, cron_schedule: templateInit.cron_schedule, output_channel: templateInit.output_channel } : undefined} />
        )}
        {editAgent && (
          <CreateModal key="edit" onClose={() => setEditAgent(null)} onSave={handleEdit} initial={editAgent} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default AgentsPanel;
