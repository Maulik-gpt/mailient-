'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Clock, Mail, Zap, Loader2, X, Slack,
  MoreHorizontal, AlertCircle, ChevronDown, Edit2, Trash2,
  List, CalendarDays, ChevronLeft, ChevronRight,
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' · ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatRunDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ── Calendar helpers ───────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

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
    let match = false;
    if (dowStr === '*') match = true;
    else if (dowStr === '0' && dow === 0) match = true;
    else if (dowStr === '1-5' && dow >= 1 && dow <= 5) match = true;
    else if (!isNaN(parseInt(dowStr)) && parseInt(dowStr) === dow) match = true;
    if (!match) continue;
    if (interval > 0) {
      dates.push(new Date(year, month, day, 0, tM, 0));
    } else {
      dates.push(new Date(year, month, day, tH, tM, 0));
    }
  }
  return dates;
}

function MiniCalendar({ agents, onAgentClick }: { agents: Agent[]; onAgentClick: (a: Agent) => void }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: Array<{ day: number | null; runs: Array<{ agent: Agent; date: Date }> }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, runs: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const runs: Array<{ agent: Agent; date: Date }> = [];
    for (const agent of agents) {
      for (const runDate of getAgentRunsInMonth(agent, viewYear, viewMonth)) {
        if (runDate.getDate() === d) runs.push({ agent, date: runDate });
      }
    }
    cells.push({ day: d, runs: runs.slice(0, 2) });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, runs: [] });

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); };

  return (
    <div className="flex flex-col gap-3">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[15px] font-bold text-zinc-100 min-w-[150px] text-center">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }}
          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-zinc-400 border border-zinc-700/60 hover:border-zinc-500 hover:text-zinc-200 transition-all"
        >
          Today
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-zinc-600 py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div
        className="grid grid-cols-7 border border-zinc-800/70 rounded-xl overflow-hidden"
        style={{ gridTemplateRows: `repeat(${cells.length / 7}, minmax(72px, 1fr))` }}
      >
        {cells.map((cell, idx) => {
          const isToday = cell.day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
          const isPast = cell.day !== null && new Date(viewYear, viewMonth, cell.day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          return (
            <div
              key={idx}
              className={cn(
                'flex flex-col p-1.5 border-r border-b border-zinc-800/50 overflow-hidden',
                cell.day === null ? 'bg-zinc-900/20' : 'bg-zinc-900/40',
                idx % 7 === 6 && 'border-r-0',
              )}
            >
              {cell.day !== null && (
                <>
                  <div className={cn(
                    'w-6 h-6 flex items-center justify-center text-[11px] font-semibold rounded-full self-end mb-1 flex-shrink-0',
                    isToday ? 'bg-zinc-100 text-zinc-950' : isPast ? 'text-zinc-700' : 'text-zinc-400',
                  )}>
                    {cell.day}
                  </div>
                  {cell.runs.map(({ agent }, ri) => (
                    <button
                      key={ri}
                      onClick={() => onAgentClick(agent)}
                      className="w-full text-left rounded px-1.5 py-1 border mb-0.5 bg-zinc-800/80 border-zinc-700/40 hover:bg-zinc-700/80 transition-all"
                    >
                      <p className="text-[10px] font-medium text-zinc-100 truncate leading-tight">{agent.name}</p>
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

// ── Schedule helpers ───────────────────────────────────────────────────────────

const SCHEDULE_PATTERNS = [
  { label: 'Every day',  key: 'daily',   needsTime: true,  needsDay: false },
  { label: 'Every hour', key: 'hourly',  needsTime: false, needsDay: false },
  { label: 'Weekdays',   key: 'weekday', needsTime: true,  needsDay: false },
  { label: 'Weekly',     key: 'weekly',  needsTime: true,  needsDay: true  },
  { label: 'Custom',     key: 'custom',  needsTime: false, needsDay: false },
];

const WEEK_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((l, i) => ({ label: l, value: String(i) }));

function buildCron(key: string, time: string, weekday: string): string {
  const [h, m] = time.split(':').map(s => parseInt(s, 10));
  const hh = isNaN(h) ? 7 : h;
  const mm = isNaN(m) ? 0 : m;
  if (key === 'daily')   return `${mm} ${hh} * * *`;
  if (key === 'hourly')  return `0 */1 * * *`;
  if (key === 'weekday') return `${mm} ${hh} * * 1-5`;
  if (key === 'weekly')  return `${mm} ${hh} * * ${weekday}`;
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
      onClick={e => { e.stopPropagation(); onChange(); }}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none',
        checked ? 'bg-emerald-500' : 'bg-zinc-700',
      )}
    >
      <span className={cn(
        'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out',
        checked ? 'translate-x-5' : 'translate-x-0',
      )} />
    </button>
  );
}

// ── Templates ──────────────────────────────────────────────────────────────────

const TEMPLATES = [
  { name: 'Morning Inbox Sweep', description: 'Scan inbox for unanswered client emails, draft replies in your tone, email a summary.', cron_schedule: '0 7 * * *', output_channel: 'gmail' as const, task_description: 'Every morning at 7am, search my inbox for any unanswered client emails, study my recent sent emails to learn my writing tone, draft a personalized reply for each one, and email me a clear summary with links to each draft.' },
  { name: 'Meeting Autopilot', description: 'Find meeting requests, check calendar, book with Meet links, Slack you a summary.', cron_schedule: '0 9 * * *', output_channel: 'both' as const, task_description: 'Every morning at 9am, search my Gmail inbox for meeting requests, check my Google Calendar for availability, book confirmed meetings with Google Meet links, and send me a Slack message listing what was scheduled.' },
  { name: 'Weekly Opportunity Digest', description: 'Scan all emails from the week, identify revenue opportunities and leads, email a full digest.', cron_schedule: '0 18 * * 0', output_channel: 'gmail' as const, task_description: 'Every Sunday at 6pm, search through all emails I received this week, identify revenue opportunities, potential partnerships, and warm leads, and write a comprehensive weekly digest email.' },
  { name: 'Client Pulse', description: 'Every hour, checks if email arrived from your top contacts. Sends an immediate Slack ping.', cron_schedule: '0 */1 * * *', output_channel: 'slack' as const, task_description: 'Every hour, check if any new email arrived from my most important contacts. If so, immediately send me a Slack message with the sender name, subject line, and first two sentences.' },
  { name: 'Notion + Inbox Sync', description: 'Cross-reference Notion tasks with Gmail, find gaps, send a daily project briefing.', cron_schedule: '0 8 * * *', output_channel: 'gmail' as const, task_description: 'Every morning at 8am, read my Notion task list, search Gmail for emails related to each project, identify gaps, and email me a concise project briefing.' },
  { name: 'Lead Harvest', description: 'Run the lead qualification flow across inbox and web, push to Notion, email a harvest report.', cron_schedule: '0 5 * * *', output_channel: 'gmail' as const, task_description: 'Every morning at 5am, search my inbox for inbound leads, research and qualify each one via web search, save qualified leads to Notion, and email me a harvest report.' },
];

// ── Create / Edit Modal ────────────────────────────────────────────────────────

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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-700/50 rounded-2xl overflow-y-auto scrollbar-hide max-h-[90vh] shadow-2xl shadow-black/70"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-zinc-800/60">
          <div>
            <h2 className="text-[20px] font-bold text-zinc-100">{initial?.id ? 'Edit schedule' : 'New schedule'}</h2>
            <p className="text-[14px] text-zinc-500 mt-1">Describe the job and when to run it</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Task */}
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-widest text-zinc-500 mb-2.5">What should Arcus do?</label>
            <textarea
              value={task}
              onChange={e => setTask(e.target.value)}
              placeholder="Describe what you want this agent to do in plain English…"
              rows={4}
              className="w-full bg-zinc-900 border border-zinc-700/60 rounded-xl px-4 py-3.5 text-[15px] text-zinc-100 leading-relaxed placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 resize-none transition-all"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-widest text-zinc-500 mb-2.5">
              Agent name <span className="normal-case font-normal text-zinc-600">(optional)</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Morning Client Check"
              className="w-full bg-zinc-900 border border-zinc-700/60 rounded-xl px-4 py-3 text-[15px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-all"
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-widest text-zinc-500 mb-3">Schedule</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {SCHEDULE_PATTERNS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPatternKey(p.key)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-[13px] font-medium transition-all border',
                    patternKey === p.key
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                      : 'bg-zinc-900 border-zinc-700/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {activePat.needsTime && (
              <div className="flex gap-4">
                {activePat.needsDay && (
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">Day</label>
                    <select
                      value={scheduleWeekday}
                      onChange={e => setScheduleWeekday(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700/60 rounded-xl px-4 py-3 text-[14px] text-zinc-100 focus:outline-none focus:border-zinc-500 transition-all appearance-none cursor-pointer"
                    >
                      {WEEK_DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                )}
                <div className={activePat.needsDay ? 'flex-1' : 'w-full'}>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">
                    Time <span className="normal-case font-normal text-zinc-700">({browserTz})</span>
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/60 rounded-xl px-4 py-3 text-[14px] text-zinc-100 focus:outline-none focus:border-zinc-500 transition-all"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
            )}

            {patternKey === 'custom' && (
              <input
                value={customCron}
                onChange={e => setCustomCron(e.target.value)}
                placeholder="e.g. 0 9 * * 1-5"
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-xl px-4 py-3 text-[14px] text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
              />
            )}

            {cron && patternKey !== 'custom' && (
              <div className="mt-3 px-4 py-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/50">
                <p className="text-[13px] text-zinc-400">
                  Runs: <span className="text-zinc-200 font-medium">{cronToLabel(cron)}</span>
                </p>
              </div>
            )}
          </div>

          {/* Channel */}
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-widest text-zinc-500 mb-3">Deliver report to</label>
            <div className="flex gap-2">
              {(['gmail','slack','both'] as const).map(ch => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-medium border transition-all',
                    channel === ch
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                      : 'bg-zinc-900 border-zinc-700/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200',
                  )}
                >
                  {ch === 'gmail' && <Mail className="w-4 h-4" />}
                  {ch === 'slack' && <Slack className="w-4 h-4" />}
                  {ch === 'both'  && <Zap className="w-4 h-4" />}
                  {ch === 'both' ? 'Both' : ch.charAt(0).toUpperCase() + ch.slice(1)}
                </button>
              ))}
            </div>
            {channel !== 'gmail' && (
              <input
                value={slackCh}
                onChange={e => setSlackCh(e.target.value)}
                placeholder="Slack channel (e.g. #reports)"
                className="mt-3 w-full bg-zinc-900 border border-zinc-700/60 rounded-xl px-4 py-3 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
              />
            )}
          </div>

          {/* Skip confirmations */}
          <div className="flex items-center justify-between bg-zinc-900/70 rounded-xl px-5 py-4 border border-zinc-800/60">
            <div>
              <p className="text-[15px] font-semibold text-zinc-100">Skip confirmations</p>
              <p className="text-[13px] text-zinc-500 mt-0.5">No approval needed before sending, publishing, or posting</p>
            </div>
            <Toggle checked={skipConf} onChange={() => setSkipConf(v => !v)} />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-xl text-[15px] font-semibold text-zinc-400 bg-zinc-900 hover:bg-zinc-800 transition-all border border-zinc-700/60">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !task.trim()}
              className="flex-1 py-3.5 rounded-xl text-[15px] font-bold text-zinc-950 bg-zinc-100 hover:bg-white active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
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
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl overflow-hidden hover:border-zinc-700/70 transition-all shadow-sm"
    >
      <div className="p-5 pb-4">
        <div className="flex items-start gap-3.5">
          <div className="px-2.5 py-1 rounded-lg text-[11px] font-bold border flex-shrink-0 mt-0.5 bg-zinc-800/60 border-zinc-700/60 text-zinc-300">
            {cronToLabel(agent.cron_schedule).split(' ')[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-zinc-100 leading-tight line-clamp-1">{agent.name}</p>
            <p className="text-[13px] text-zinc-500 mt-1 leading-relaxed line-clamp-2">{agent.task_description}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
            <Toggle checked={agent.status !== 'paused'} onChange={onToggle} />
            <div className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                    className="absolute right-0 top-10 w-36 bg-zinc-900 border border-zinc-700/60 rounded-xl overflow-hidden shadow-xl z-20"
                  >
                    <button
                      onClick={() => { setMenuOpen(false); onEdit(); }}
                      className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); onDelete(); }}
                      className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div className="flex items-center gap-6 mt-4 pt-3.5 border-t border-zinc-800/50">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 block mb-0.5">Schedule</span>
            <span className="text-[13px] text-zinc-300 font-medium">{cronToLabel(agent.cron_schedule)}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 block mb-0.5">Next run</span>
            <span className="text-[13px] text-zinc-300 font-medium">{formatNextRun(nextRun)}</span>
          </div>
          <div className="ml-auto">
            <span className={cn(
              'inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold',
              agent.status === 'active'  ? 'bg-emerald-500/15 text-emerald-400' :
              agent.status === 'running' ? 'bg-sky-500/15 text-sky-400' :
              'bg-zinc-800 text-zinc-500',
            )}>
              {agent.status === 'running' ? 'Running…' : agent.status === 'active' ? 'Active' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Last run expandable */}
        {agent.last_run_at && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1.5 text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
              Last run: {formatRunDate(agent.last_run_at)}
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className="mt-2 text-[13px] text-zinc-500 leading-relaxed pl-4 border-l border-zinc-800">
                    {agent.last_report_summary || 'Run completed.'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Skip confirmations */}
      <div className="mx-5 mb-4 bg-zinc-950/60 border border-zinc-800/50 rounded-xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-zinc-300">Skip confirmations</p>
          <p className="text-[12px] text-zinc-600 mt-0.5">No approval needed before sending or posting</p>
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
  const [tab, setTab] = useState<'tasks' | 'calendar'>('tasks');
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
          <h2 className="text-[24px] font-bold text-zinc-100 tracking-tight">Scheduled</h2>
          <p className="text-[14px] text-zinc-500 mt-0.5">Agents working for you around the clock</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 text-zinc-950 rounded-xl font-bold text-[14px] hover:bg-white active:scale-95 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New schedule
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-zinc-800/70 mb-5">
        {([
          { key: 'tasks',    label: 'Tasks',    Icon: List },
          { key: 'calendar', label: 'Calendar', Icon: CalendarDays },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-1 py-3 mr-6 text-[14px] font-semibold transition-all border-b-2 -mb-px',
              tab === key ? 'text-zinc-100 border-zinc-100' : 'text-zinc-500 border-transparent hover:text-zinc-300',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tableError && (
        <div className="mb-5 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-zinc-400">Run the SQL migration in Supabase to enable agents (<code className="text-zinc-300">arcus_agents</code> table).</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
        </div>
      ) : tab === 'calendar' ? (
        <MiniCalendar
          agents={agents.filter(a => a.status !== 'paused')}
          onAgentClick={() => {}}
        />
      ) : agents.length === 0 ? (
        <div>
          <p className="text-[14px] text-zinc-500 mb-6 text-center">
            Get started with a pre-built agent — activate in one click, customize anytime.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEMPLATES.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl p-4 flex flex-col hover:border-zinc-700/70 hover:bg-zinc-900/80 transition-all group"
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-8 h-8 rounded-xl bg-zinc-800/80 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-zinc-400" />
                  </div>
                  <p className="text-[14px] font-bold text-zinc-100 leading-tight">{t.name}</p>
                </div>
                <p className="text-[13px] text-zinc-500 leading-relaxed flex-1 mb-3">{t.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-zinc-600 font-medium">{cronToLabel(t.cron_schedule)}</span>
                  <button
                    onClick={() => setTemplateInit(t)}
                    className="px-3.5 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 text-[12px] font-bold hover:bg-white active:scale-95 transition-all"
                  >
                    Activate
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {agents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
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
          <CreateModal
            key="create"
            onClose={() => { setCreateOpen(false); setTemplateInit(null); }}
            onSave={handleCreate}
            initial={templateInit ? {
              name: templateInit.name,
              task_description: templateInit.task_description,
              cron_schedule: templateInit.cron_schedule,
              output_channel: templateInit.output_channel,
            } : undefined}
          />
        )}
        {editAgent && (
          <CreateModal key="edit" onClose={() => setEditAgent(null)} onSave={handleEdit} initial={editAgent} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default AgentsPanel;
