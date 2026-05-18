'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Clock, Mail, Zap, Loader2, X, ChevronLeft, ChevronRight,
  MoreHorizontal, Calendar as CalendarIcon, List, Slack, Pause, Play,
  Trash2, Check, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

// ── Cron Utilities ─────────────────────────────────────────────────────────────

function cronToLabel(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const [minStr, hourStr, , , dowStr] = parts;

  if (hourStr.startsWith('*/')) {
    const n = hourStr.split('/')[1];
    return n === '1' ? 'Every hour' : `Every ${n} hours`;
  }

  const h = hourStr.padStart(2, '0');
  const m = minStr.padStart(2, '0');
  const time = `${h}:${m}`;

  if (dowStr === '*') return `Daily at ${time}`;
  if (dowStr === '0') return `Sundays at ${time}`;
  if (dowStr === '1-5') return `Weekdays at ${time}`;
  if (!isNaN(parseInt(dowStr))) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[parseInt(dowStr)]}s at ${time}`;
  }
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

  if (dowStr === '*') {
    return candidate > now ? candidate : new Date(candidate.getTime() + 86400000);
  }
  if (dowStr === '1-5') {
    let next = new Date(candidate > now ? candidate : new Date(candidate.getTime() + 86400000));
    for (let i = 0; i < 7; i++) {
      const d = next.getDay();
      if (d >= 1 && d <= 5) return next;
      next = new Date(next.getTime() + 86400000);
    }
    return next;
  }
  const targetDow = parseInt(dowStr) || 0;
  const curDow = now.getDay();
  let daysUntil = (targetDow - curDow + 7) % 7;
  if (daysUntil === 0 && candidate <= now) daysUntil = 7;
  const next = new Date(candidate);
  next.setDate(next.getDate() + daysUntil);
  return next;
}

function getAgentRunsInMonth(agent: Agent, year: number, month: number): Date[] {
  const dates: Date[] = [];
  const parts = agent.cron_schedule.split(' ');
  if (parts.length !== 5) return dates;
  const [minStr, hourStr, , , dowStr] = parts;

  const tH = hourStr.startsWith('*/') ? 0 : (parseInt(hourStr) || 0);
  const tM = parseInt(minStr) || 0;
  const interval = hourStr.startsWith('*/') ? parseInt(hourStr.split('/')[1]) || 1 : 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month, day).getDay();
    let dayMatches = false;
    if (dowStr === '*') dayMatches = true;
    else if (dowStr === '0' && dow === 0) dayMatches = true;
    else if (dowStr === '1-5' && dow >= 1 && dow <= 5) dayMatches = true;
    else if (!isNaN(parseInt(dowStr)) && parseInt(dowStr) === dow) dayMatches = true;

    if (!dayMatches) continue;

    if (interval > 0) {
      for (let h = 0; h < 24; h += interval) {
        dates.push(new Date(year, month, day, h, tM, 0));
      }
    } else {
      dates.push(new Date(year, month, day, tH, tM, 0));
    }
  }
  return dates;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatNextRun(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}-${m}-${d} ${formatTime(date)}`;
}

function formatRunDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${mo}-${day} ${formatTime(d)}`;
}

// ── Toggle Switch ──────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none',
        checked ? 'bg-blue-500' : 'bg-white/15',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

// ── Templates ──────────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    name: 'Morning Inbox Sweep',
    description: 'Every morning at 7am, scans inbox for unanswered client emails, drafts replies in your tone, emails you a summary with links.',
    cron_schedule: '0 7 * * *',
    output_channel: 'gmail' as const,
    task_description: 'Every morning at 7am, search my inbox for any unanswered client emails, study my recent sent emails to learn my writing tone and voice, draft a personalized reply for each unanswered email matching my style exactly, and email me a clear summary with the subject line, sender, and a link to each draft in Gmail.',
  },
  {
    name: 'Meeting Autopilot',
    description: 'Every morning at 9am, finds meeting requests, checks calendar availability, books them with Meet links, Slacks you a summary.',
    cron_schedule: '0 9 * * *',
    output_channel: 'both' as const,
    task_description: 'Every morning at 9am, search my Gmail inbox for any meeting requests or scheduling emails, check my Google Calendar for availability in the proposed time slots, book confirmed meetings with Google Meet links, and send me a Slack message listing everything that was scheduled today.',
  },
  {
    name: 'Weekly Opportunity Digest',
    description: 'Every Sunday at 6pm, scans all emails from the week, identifies revenue opportunities and leads, writes a full digest.',
    cron_schedule: '0 18 * * 0',
    output_channel: 'gmail' as const,
    task_description: 'Every Sunday at 6pm, search through all emails I received this week, identify any revenue opportunities, potential partnerships, warm leads, or high-priority follow-ups, and write a comprehensive weekly digest email summarizing everything I should know and act on in the coming week.',
  },
  {
    name: 'Client Pulse',
    description: 'Every hour, checks if email arrived from your top contacts. Sends an immediate Slack ping if so.',
    cron_schedule: '0 */1 * * *',
    output_channel: 'slack' as const,
    task_description: 'Every hour, check if any new email arrived from my most important contacts. If so, immediately send me a Slack message with the sender name, subject line, and first two sentences so I can respond quickly without opening my inbox.',
  },
  {
    name: 'Notion + Inbox Sync',
    description: 'Every morning at 8am, cross-references your Notion tasks with Gmail, finds gaps, sends a daily project briefing.',
    cron_schedule: '0 8 * * *',
    output_channel: 'gmail' as const,
    task_description: 'Every morning at 8am, read my current Notion task list, search my Gmail inbox for emails related to each active project, find which projects have unread messages, identify inbox items that should become Notion tasks, and email me a concise project briefing showing what is moving and what needs attention today.',
  },
  {
    name: 'Lead Harvest',
    description: 'Every morning at 5am, runs the full lead qualification flow across inbox and web, pushes to Notion, emails a harvest report.',
    cron_schedule: '0 5 * * *',
    output_channel: 'gmail' as const,
    task_description: 'Every morning at 5am, search my inbox for any new inbound leads, partnership inquiries, or business development emails, use web search to research and qualify each lead, save qualified leads to my Notion database with key details, and email me a clean harvest report showing what was found, qualified, and saved.',
  },
];

const SCHEDULE_PATTERNS = [
  { label: 'Every day', key: 'daily', needsTime: true, needsDay: false },
  { label: 'Every hour', key: 'hourly', needsTime: false, needsDay: false },
  { label: 'Every weekday', key: 'weekday', needsTime: true, needsDay: false },
  { label: 'Every week', key: 'weekly', needsTime: true, needsDay: true },
  { label: 'Custom cron', key: 'custom', needsTime: false, needsDay: false },
];

const WEEK_DAYS = [
  { label: 'Sunday', value: '0' },
  { label: 'Monday', value: '1' },
  { label: 'Tuesday', value: '2' },
  { label: 'Wednesday', value: '3' },
  { label: 'Thursday', value: '4' },
  { label: 'Friday', value: '5' },
  { label: 'Saturday', value: '6' },
];

function buildCron(patternKey: string, time: string, weekday: string): string {
  const [h, m] = time.split(':').map(s => parseInt(s, 10));
  const hh = isNaN(h) ? 7 : h;
  const mm = isNaN(m) ? 0 : m;
  switch (patternKey) {
    case 'daily':   return `${mm} ${hh} * * *`;
    case 'hourly':  return `0 */1 * * *`;
    case 'weekday': return `${mm} ${hh} * * 1-5`;
    case 'weekly':  return `${mm} ${hh} * * ${weekday}`;
    default:        return '';
  }
}

function parseCronToSchedule(cron: string): { key: string; time: string; weekday: string } {
  if (!cron || cron === '0 */1 * * *') return { key: 'hourly', time: '07:00', weekday: '0' };
  const parts = cron.split(' ');
  if (parts.length !== 5) return { key: 'custom', time: '07:00', weekday: '0' };
  const [mm, hh, , , dow] = parts;
  const time = `${String(parseInt(hh) || 0).padStart(2, '0')}:${String(parseInt(mm) || 0).padStart(2, '0')}`;
  if (dow === '1-5') return { key: 'weekday', time, weekday: '1' };
  if (dow !== '*' && !dow.includes('/')) return { key: 'weekly', time, weekday: dow };
  return { key: 'daily', time, weekday: '0' };
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── New Schedule Modal ─────────────────────────────────────────────────────────

function NewScheduleModal({
  open, onClose, onSave, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Agent>) => Promise<void>;
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
  const [channel, setChannel] = useState<'gmail' | 'slack' | 'both'>(initial?.output_channel || 'gmail');
  const [slackCh, setSlackCh] = useState(initial?.slack_channel || '');
  const [skipConf, setSkipConf] = useState(initial?.skip_confirmations ?? false);
  const [saving, setSaving] = useState(false);

  const activePat = SCHEDULE_PATTERNS.find(p => p.key === patternKey) || SCHEDULE_PATTERNS[0];
  const cron = patternKey === 'custom' ? customCron : buildCron(patternKey, scheduleTime, scheduleWeekday);

  const handleSave = async () => {
    if (!task.trim()) { toast.error('Describe what you want Arcus to do.'); return; }
    if (patternKey === 'custom' && !customCron.trim()) { toast.error('Enter a cron expression.'); return; }
    setSaving(true);
    try {
      const agentName = name.trim() || task.trim().slice(0, 40).replace(/\.$/, '') + (task.trim().length > 40 ? '…' : '');
      await onSave({
        name: agentName,
        task_description: task.trim(),
        cron_schedule: cron || '0 7 * * *',
        output_channel: channel,
        slack_channel: channel !== 'gmail' ? slackCh || null : null,
        skip_confirmations: skipConf,
        // @ts-ignore — extra field used by handleCreate to save timezone
        _timezone: browserTz,
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="relative w-full max-w-xl bg-[#111] border border-white/10 rounded-3xl overflow-y-auto max-h-[92vh] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-0">
          <div>
            <h2 className="text-[18px] font-bold text-white">
              {initial?.id ? 'Edit schedule' : 'New schedule'}
            </h2>
            <p className="text-[13px] text-white/35 mt-0.5">Describe the job in plain English</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-7 py-6 space-y-5">
          {/* Task description */}
          <textarea
            value={task}
            onChange={e => setTask(e.target.value)}
            placeholder="Describe what you want this agent to do..."
            rows={5}
            className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white text-[14px] leading-relaxed placeholder:text-white/20 focus:outline-none focus:border-white/25 resize-none transition-colors"
          />

          {/* Optional name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-white/30 mb-2">Agent name (optional)</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Morning Client Check"
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-white text-[13px] placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-white/30 mb-3">Schedule</label>

            {/* Pattern pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {SCHEDULE_PATTERNS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPatternKey(p.key)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all border',
                    patternKey === p.key
                      ? 'bg-white text-black border-white'
                      : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white/70',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Time picker — shown for day/weekday/weekly */}
            {activePat.needsTime && (
              <div className="flex gap-3">
                {activePat.needsDay && (
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/25 mb-1.5">Day</label>
                    <select
                      value={scheduleWeekday}
                      onChange={e => setScheduleWeekday(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-white text-[13px] focus:outline-none focus:border-white/25 transition-colors appearance-none"
                    >
                      {WEEK_DAYS.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={activePat.needsDay ? 'flex-1' : 'w-full'}>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/25 mb-1.5">Time (your local time)</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-white text-[13px] focus:outline-none focus:border-white/25 transition-colors"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
            )}

            {/* Custom cron input */}
            {patternKey === 'custom' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/25 mb-1.5">Cron expression (UTC)</label>
                <input
                  value={customCron}
                  onChange={e => setCustomCron(e.target.value)}
                  placeholder="e.g. 0 9 * * 1-5"
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-[12px] placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
                />
              </div>
            )}

            {/* Live preview + timezone */}
            {cron && patternKey !== 'custom' && (
              <div className="mt-2.5 flex items-center justify-between">
                <p className="text-[11px] text-white/25 font-mono">
                  Runs: <span className="text-white/50">{cronToLabel(cron)}</span>
                </p>
                {activePat.needsTime && (
                  <p className="text-[11px] text-white/30 font-mono">{browserTz}</p>
                )}
              </div>
            )}
          </div>

          {/* Output channel */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-white/30 mb-3">Deliver report to</label>
            <div className="flex gap-2">
              {(['gmail', 'slack', 'both'] as const).map(ch => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-medium border transition-all',
                    channel === ch
                      ? 'bg-white/10 border-white/30 text-white'
                      : 'bg-white/[0.03] border-white/8 text-white/40 hover:border-white/15 hover:text-white/70',
                  )}
                >
                  {ch === 'gmail' && <Mail className="w-3.5 h-3.5" />}
                  {ch === 'slack' && <Slack className="w-3.5 h-3.5" />}
                  {ch === 'both' && <Zap className="w-3.5 h-3.5" />}
                  {ch === 'both' ? 'Both' : ch.charAt(0).toUpperCase() + ch.slice(1)}
                </button>
              ))}
            </div>
            {channel !== 'gmail' && (
              <input
                value={slackCh}
                onChange={e => setSlackCh(e.target.value)}
                placeholder="Slack channel (e.g. #reports)"
                className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-[12px] placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
              />
            )}
          </div>

          {/* Skip confirmations */}
          <div className="flex items-center justify-between bg-white/[0.03] rounded-2xl px-4 py-3.5 border border-white/[0.06]">
            <div>
              <p className="text-[13px] font-semibold text-white">Skip confirmations</p>
              <p className="text-[11px] text-white/30 mt-0.5">No approval needed before sending, publishing, or posting</p>
            </div>
            <Toggle checked={skipConf} onChange={() => setSkipConf(v => !v)} />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-[13px] font-semibold text-white/50 bg-white/5 hover:bg-white/10 transition-all border border-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !task.trim()}
              className="flex-1 py-3 rounded-xl text-[13px] font-bold text-black bg-white hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Saving…' : initial?.id ? 'Save changes' : 'Create schedule'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Agent Detail Modal ─────────────────────────────────────────────────────────

function AgentDetailModal({
  agent, onClose, onToggle, onEdit, onDelete, onToggleConfirmations,
}: {
  agent: Agent;
  onClose: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleConfirmations: () => void;
}) {
  const nextRun = getNextRunDate(agent.cron_schedule);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="relative w-full max-w-sm bg-[#141414] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h2 className="text-[13px] font-bold text-white/40 uppercase tracking-widest">Scheduled</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Agent name row */}
        <div className="flex items-center gap-3 px-5 mb-2">
          <h3 className="text-[15px] font-bold text-white flex-1 leading-snug">{agent.name}</h3>
          <Toggle
            checked={agent.status !== 'paused'}
            onChange={onToggle}
          />
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -4 }}
                  className="absolute right-0 top-9 w-36 bg-[#1e1e1e] border border-white/10 rounded-xl overflow-hidden shadow-xl z-10"
                >
                  <button onClick={() => { setMenuOpen(false); onEdit(); }} className="w-full px-4 py-2.5 text-left text-[12px] text-white/70 hover:bg-white/8 hover:text-white transition-all">
                    Edit
                  </button>
                  <button onClick={() => { setMenuOpen(false); onDelete(); }} className="w-full px-4 py-2.5 text-left text-[12px] text-red-400 hover:bg-red-500/10 transition-all">
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Description */}
        <p className="px-5 text-[12px] text-white/40 leading-relaxed mb-4 line-clamp-3">
          {agent.task_description}
        </p>

        {/* Info rows */}
        <div className="mx-5 border border-white/[0.06] rounded-2xl overflow-hidden mb-4">
          {[
            { label: 'Repeat', value: cronToLabel(agent.cron_schedule) },
            { label: 'Next run', value: formatNextRun(nextRun) },
          ].map((row, i) => (
            <div key={i} className={cn('flex items-center justify-between px-4 py-3', i > 0 && 'border-t border-white/[0.06]')}>
              <span className="text-[12px] text-white/40">{row.label}</span>
              <span className="text-[12px] text-white/70 font-medium">{row.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <span className="text-[12px] text-white/40">Skip confirmations</span>
            <span className="text-[12px] text-white/70 font-medium">
              {agent.skip_confirmations ? 'Always skip' : 'Ask first'}
            </span>
          </div>
        </div>

        {/* Past runs */}
        {agent.last_run_at && (
          <>
            <div className="px-5 mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/25">Past runs</p>
            </div>
            <div className="px-5 pb-5">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                <p className="text-[12px] text-white/50 font-medium mb-1">
                  {formatRunDate(agent.last_run_at)}
                </p>
                <p className="text-[12px] text-white/35 leading-relaxed line-clamp-3">
                  {agent.last_report_summary || 'Run completed successfully.'}
                </p>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

// ── Calendar View ──────────────────────────────────────────────────────────────

function CalendarView({ agents, onAgentClick }: { agents: Agent[]; onAgentClick: (a: Agent) => void }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Build calendar grid (6 rows x 7 cols)
  const cells: Array<{ day: number | null; runs: Array<{ agent: Agent; date: Date }> }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, runs: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const runs: Array<{ agent: Agent; date: Date }> = [];
    for (const agent of agents) {
      const agentRuns = getAgentRunsInMonth(agent, viewYear, viewMonth);
      for (const runDate of agentRuns) {
        if (runDate.getDate() === d) {
          runs.push({ agent, date: runDate });
        }
      }
    }
    cells.push({ day: d, runs: runs.slice(0, 2) }); // max 2 shown per cell
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, runs: [] });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Calendar nav */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/8 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-[16px] font-bold text-white min-w-[140px] text-center">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/8 transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }}
          className="px-3.5 py-1.5 rounded-xl text-[12px] font-semibold text-white/60 border border-white/10 hover:border-white/25 hover:text-white transition-all"
        >
          Today
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[12px] font-medium text-white/30 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1 gap-px bg-white/[0.04] rounded-2xl overflow-hidden border border-white/[0.06]">
        {cells.map((cell, idx) => {
          const isToday = cell.day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
          const isPast = cell.day !== null && new Date(viewYear, viewMonth, cell.day) < today;
          return (
            <div
              key={idx}
              className={cn(
                'bg-[#0c0c0c] min-h-[90px] p-2 flex flex-col gap-1',
                !cell.day && 'bg-[#080808]',
              )}
            >
              {cell.day !== null && (
                <>
                  <div className={cn(
                    'w-6 h-6 flex items-center justify-center text-[12px] font-medium rounded-full self-end',
                    isToday ? 'bg-white text-black font-bold' : isPast ? 'text-white/35' : 'text-white/70',
                  )}>
                    {cell.day}
                  </div>
                  {cell.runs.map(({ agent, date }, ri) => (
                    <button
                      key={ri}
                      onClick={() => onAgentClick(agent)}
                      className="text-left bg-[#1e1e1e] hover:bg-[#252525] rounded-md px-1.5 py-1 transition-colors"
                    >
                      <p className="text-[10px] font-medium text-white/60 truncate leading-none">{agent.name}</p>
                      <p className="text-[9px] text-white/30 mt-0.5">{formatTime(date)}</p>
                    </button>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Template Cards (empty state) ───────────────────────────────────────────────

function TemplateCards({ onActivate }: { onActivate: (t: typeof TEMPLATES[0]) => void }) {
  return (
    <div>
      <p className="text-[13px] text-white/30 mb-6 text-center">
        Get started with a pre-built agent — activate in one click, customize anytime.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[#0e0e0e] border border-white/[0.07] rounded-2xl p-5 flex flex-col hover:border-white/15 transition-all group"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-white/40" />
              </div>
              <h4 className="text-[13px] font-bold text-white leading-tight">{t.name}</h4>
            </div>
            <p className="text-[12px] text-white/40 leading-relaxed flex-1 mb-4">{t.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/25 font-mono">{cronToLabel(t.cron_schedule)}</span>
              <button
                onClick={() => onActivate(t)}
                className="px-3.5 py-1.5 rounded-xl bg-white text-black text-[11px] font-bold hover:bg-white/90 active:scale-95 transition-all"
              >
                Activate
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Agent Task Card ────────────────────────────────────────────────────────────

function AgentTaskCard({
  agent, onClick, onToggle, onToggleConfirmations,
}: {
  agent: Agent;
  onClick: () => void;
  onToggle: () => void;
  onToggleConfirmations: () => void;
}) {
  const nextRun = getNextRunDate(agent.cron_schedule);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="bg-[#111] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/15 transition-all"
    >
      {/* Main body */}
      <div className="p-5 pb-4">
        <div className="flex items-start gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Clock className="w-4 h-4 text-white/40" />
          </div>
          <div className="flex-1 min-w-0">
            <button
              onClick={onClick}
              className="text-[14px] font-bold text-white text-left hover:text-white/80 transition-colors leading-tight line-clamp-1"
            >
              {agent.name}
            </button>
            <p className="text-[12px] text-white/40 mt-1 leading-relaxed line-clamp-3">
              {agent.task_description}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Toggle checked={agent.status !== 'paused'} onChange={onToggle} />
            <button
              onClick={onClick}
              className="w-7 h-7 flex items-center justify-center rounded-full text-white/25 hover:text-white hover:bg-white/10 transition-all"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Repeat / Next run rows */}
        <div className="ml-12 mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/30">Repeat</span>
            <span className="text-[11px] text-white/55 font-medium">{cronToLabel(agent.cron_schedule)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/30">Next run</span>
            <span className="text-[11px] text-white/55 font-medium">{formatNextRun(nextRun)}</span>
          </div>
        </div>
      </div>

      {/* Skip confirmations bar */}
      <div className="mx-5 mb-4 bg-[#0a0a0a] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[12px] font-semibold text-white">Skip confirmations</p>
          <p className="text-[11px] text-white/30 mt-0.5">No approval needed before sending, publishing, or posting</p>
        </div>
        <Toggle checked={agent.skip_confirmations} onChange={onToggleConfirmations} />
      </div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ScheduledPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'tasks'>('tasks');
  const [createOpen, setCreateOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [tableError, setTableError] = useState(false);
  const [activatingTemplate, setActivatingTemplate] = useState<typeof TEMPLATES[0] | null>(null);

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

  const saveTimezone = async (tz: string) => {
    if (!tz) return;
    try {
      await fetch('/api/arcus/agents/timezone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: tz }),
      });
    } catch { /* silent — non-critical */ }
  };

  const handleCreate = async (data: Partial<Agent> & { _timezone?: string }) => {
    const { _timezone, ...agentData } = data;
    const res = await fetch('/api/arcus/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: agentData.name,
        taskDescription: agentData.task_description,
        cronSchedule: agentData.cron_schedule,
        outputChannel: agentData.output_channel,
        slackChannel: agentData.slack_channel,
        skipConfirmations: agentData.skip_confirmations,
      }),
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
    await fetch('/api/arcus/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: agent.id, status: newStatus }),
    });
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: newStatus } : a));
    if (selectedAgent?.id === agent.id) setSelectedAgent(a => a ? { ...a, status: newStatus } : a);
  };

  const handleToggleConfirmations = async (agent: Agent) => {
    const newVal = !agent.skip_confirmations;
    await fetch('/api/arcus/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: agent.id, skip_confirmations: newVal }),
    });
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, skip_confirmations: newVal } : a));
    if (selectedAgent?.id === agent.id) setSelectedAgent(a => a ? { ...a, skip_confirmations: newVal } : a);
  };

  const handleDelete = async (agent: Agent) => {
    if (!confirm(`Delete "${agent.name}"?`)) return;
    await fetch(`/api/arcus/agents?id=${agent.id}`, { method: 'DELETE' });
    setAgents(prev => prev.filter(a => a.id !== agent.id));
    if (selectedAgent?.id === agent.id) setSelectedAgent(null);
    toast.success('Schedule deleted');
  };

  const handleActivateTemplate = async (t: typeof TEMPLATES[0]) => {
    setActivatingTemplate(t);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between px-8 pt-8 pb-0 flex-shrink-0">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="text-red-400">Scheduled</span>
          </h1>
          <p className="text-white/30 text-[13px] mt-0.5">Autonomous agents working for you around the clock</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl font-bold text-[13px] hover:bg-white/90 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          New schedule
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-8 mt-6 border-b border-white/[0.06] flex-shrink-0">
        {(['calendar', 'tasks'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setView(tab)}
            className={cn(
              'px-1 py-3 mr-6 text-[14px] font-semibold capitalize transition-all border-b-2 -mb-px',
              view === tab
                ? 'text-white border-white'
                : 'text-white/30 border-transparent hover:text-white/60',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-7">
        {/* DB error */}
        {tableError && (
          <div className="mb-6 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-bold text-sm">Database not set up</p>
              <p className="text-white/40 text-xs mt-0.5">Run the SQL migration in your Supabase project for the arcus_agents table. Also add column: <code className="text-white/60">skip_confirmations boolean default false</code></p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-7 h-7 text-white/20 animate-spin" />
          </div>
        ) : view === 'calendar' ? (
          <CalendarView
            agents={agents.filter(a => a.status !== 'paused')}
            onAgentClick={a => setSelectedAgent(a)}
          />
        ) : agents.length === 0 ? (
          <TemplateCards onActivate={handleActivateTemplate} />
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            <AnimatePresence mode="popLayout">
              {agents.map(agent => (
                <AgentTaskCard
                  key={agent.id}
                  agent={agent}
                  onClick={() => setSelectedAgent(agent)}
                  onToggle={() => handleToggle(agent)}
                  onToggleConfirmations={() => handleToggleConfirmations(agent)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(createOpen || activatingTemplate) && (
          <NewScheduleModal
            key="create"
            open
            onClose={() => { setCreateOpen(false); setActivatingTemplate(null); }}
            onSave={handleCreate}
            initial={activatingTemplate ? {
              name: activatingTemplate.name,
              task_description: activatingTemplate.task_description,
              cron_schedule: activatingTemplate.cron_schedule,
              output_channel: activatingTemplate.output_channel,
            } : undefined}
          />
        )}
        {editAgent && (
          <NewScheduleModal
            key="edit"
            open
            onClose={() => setEditAgent(null)}
            onSave={handleEdit}
            initial={editAgent}
          />
        )}
        {selectedAgent && (
          <AgentDetailModal
            agent={selectedAgent}
            onClose={() => setSelectedAgent(null)}
            onToggle={() => handleToggle(selectedAgent)}
            onEdit={() => { setEditAgent(selectedAgent); setSelectedAgent(null); }}
            onDelete={() => { handleDelete(selectedAgent); setSelectedAgent(null); }}
            onToggleConfirmations={() => handleToggleConfirmations(selectedAgent)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
