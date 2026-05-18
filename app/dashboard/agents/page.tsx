'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Clock, Mail, Zap, Loader2, X, ChevronLeft, ChevronRight,
  MoreHorizontal, List, Slack, Trash2, Edit2, AlertCircle, CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { DropdownMenu as DropdownMenuRoot } from 'radix-ui';

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
  if (dowStr === '*') return candidate > now ? candidate : new Date(candidate.getTime() + 86400000);
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
      for (let h = 0; h < 24; h += interval) dates.push(new Date(year, month, day, h, tM, 0));
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + formatTime(date);
}

function formatRunDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + formatTime(d);
}

// ── Toggle Switch ──────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(); }}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-900',
        checked ? 'bg-zinc-300' : 'bg-zinc-700',
      )}
    >
      <span className={cn(
        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
        checked ? 'translate-x-5' : 'translate-x-0',
      )} />
    </button>
  );
}

// ── Schedule constants ─────────────────────────────────────────────────────────

const TEMPLATES = [
  { name: 'Morning Inbox Sweep', description: 'Every morning at 7am, scans inbox for unanswered client emails, drafts replies in your tone, emails you a summary.', cron_schedule: '0 7 * * *', output_channel: 'gmail' as const, task_description: 'Every morning at 7am, search my inbox for any unanswered client emails, study my recent sent emails to learn my writing tone and voice, draft a personalized reply for each unanswered email matching my style exactly, and email me a clear summary with the subject line, sender, and a link to each draft in Gmail.' },
  { name: 'Meeting Autopilot', description: 'Every morning at 9am, finds meeting requests, checks calendar availability, books them with Meet links.', cron_schedule: '0 9 * * *', output_channel: 'both' as const, task_description: 'Every morning at 9am, search my Gmail inbox for any meeting requests or scheduling emails, check my Google Calendar for availability in the proposed time slots, book confirmed meetings with Google Meet links, and send me a Slack message listing everything that was scheduled today.' },
  { name: 'Weekly Opportunity Digest', description: 'Every Sunday at 6pm, scans all emails from the week, identifies revenue opportunities and leads.', cron_schedule: '0 18 * * 0', output_channel: 'gmail' as const, task_description: 'Every Sunday at 6pm, search through all emails I received this week, identify any revenue opportunities, potential partnerships, warm leads, or high-priority follow-ups, and write a comprehensive weekly digest email.' },
  { name: 'Client Pulse', description: 'Every hour, checks if email arrived from your top contacts. Sends an immediate Slack ping.', cron_schedule: '0 */1 * * *', output_channel: 'slack' as const, task_description: 'Every hour, check if any new email arrived from my most important contacts. If so, immediately send me a Slack message with the sender name, subject line, and first two sentences.' },
  { name: 'Notion + Inbox Sync', description: 'Every morning at 8am, cross-references your Notion tasks with Gmail, sends a project briefing.', cron_schedule: '0 8 * * *', output_channel: 'gmail' as const, task_description: 'Every morning at 8am, read my current Notion task list, search my Gmail inbox for emails related to each active project, find which projects have unread messages, and email me a concise project briefing.' },
  { name: 'Lead Harvest', description: 'Every morning at 5am, runs the full lead qualification flow across inbox and web, pushes to Notion.', cron_schedule: '0 5 * * *', output_channel: 'gmail' as const, task_description: 'Every morning at 5am, search my inbox for any new inbound leads, partnership inquiries, or business development emails, use web search to research and qualify each lead, save qualified leads to my Notion database, and email me a harvest report.' },
];

const SCHEDULE_PATTERNS = [
  { label: 'Every day',     key: 'daily',   needsTime: true,  needsDay: false },
  { label: 'Every hour',   key: 'hourly',  needsTime: false, needsDay: false },
  { label: 'Weekdays',     key: 'weekday', needsTime: true,  needsDay: false },
  { label: 'Weekly',       key: 'weekly',  needsTime: true,  needsDay: true  },
  { label: 'Custom cron',  key: 'custom',  needsTime: false, needsDay: false },
];

const WEEK_DAYS = [
  { label: 'Sunday', value: '0' }, { label: 'Monday', value: '1' },
  { label: 'Tuesday', value: '2' }, { label: 'Wednesday', value: '3' },
  { label: 'Thursday', value: '4' }, { label: 'Friday', value: '5' },
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

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── New Schedule Modal (Dialog) ────────────────────────────────────────────────

function NewScheduleModal({ open, onClose, onSave, initial }: {
  open: boolean; onClose: () => void;
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
  const [channel, setChannel] = useState<'gmail'|'slack'|'both'>(initial?.output_channel || 'gmail');
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
        name: agentName, task_description: task.trim(),
        cron_schedule: cron || '0 7 * * *', output_channel: channel,
        slack_channel: channel !== 'gmail' ? slackCh || null : null,
        skip_confirmations: skipConf,
        // @ts-ignore
        _timezone: browserTz,
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'w-full max-w-4xl bg-zinc-950 border border-zinc-700/50 rounded-2xl p-0 overflow-hidden shadow-2xl shadow-black/60',
          'max-h-[95vh] flex flex-col',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-zinc-800/60 flex-shrink-0">
          <div>
            <DialogTitle className="text-[20px] font-bold text-zinc-100">
              {initial?.id ? 'Edit schedule' : 'New schedule'}
            </DialogTitle>
            <p className="text-[14px] text-zinc-500 mt-1">Describe the job and when to run it</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-8 py-6 overflow-y-auto custom-scroll flex-1">
          <style dangerouslySetInnerHTML={{ __html: `
            .custom-scroll::-webkit-scrollbar {
              width: 6px;
              height: 6px;
            }
            .custom-scroll::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scroll::-webkit-scrollbar-thumb {
              background: rgba(63, 63, 70, 0.4);
              border-radius: 9999px;
            }
            .custom-scroll::-webkit-scrollbar-thumb:hover {
              background: rgba(82, 82, 91, 0.6);
            }
          `}} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Task Description & Optional Name */}
            <div className="lg:col-span-7 space-y-6">
              {/* Task description */}
              <div>
                <label className="block text-[13px] font-semibold text-zinc-400 mb-2">What should Arcus do?</label>
                <textarea
                  value={task}
                  onChange={e => setTask(e.target.value)}
                  placeholder="Describe what you want this agent to do in plain English…"
                  rows={8}
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-xl px-4 py-3.5 text-[15px] text-zinc-100 leading-relaxed placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 resize-none transition-all"
                />
              </div>

              {/* Optional name */}
              <div>
                <label className="block text-[13px] font-semibold text-zinc-400 mb-2">Agent name <span className="font-normal text-zinc-500">(optional)</span></label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Morning Client Check"
                  className="w-full bg-zinc-900 border border-zinc-700/60 rounded-xl px-4 py-3 text-[15px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-all"
                />
              </div>
            </div>

            {/* Right Column: Schedule & Deliver & Confirmations */}
            <div className="lg:col-span-5 space-y-6">
              {/* Schedule */}
              <div>
                <label className="block text-[13px] font-semibold text-zinc-400 mb-2">Schedule</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {SCHEDULE_PATTERNS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => setPatternKey(p.key)}
                      className={cn(
                        'px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all border',
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
                  <div className="flex gap-4 mb-4">
                    {activePat.needsDay && (
                      <div className="flex-1">
                        <label className="block text-[11px] font-semibold text-zinc-500 mb-1.5">Day</label>
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
                      <label className="block text-[11px] font-semibold text-zinc-500 mb-1.5">Time <span className="font-normal text-zinc-600">({browserTz})</span></label>
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
                  <div className="mb-4">
                    <label className="block text-[11px] font-semibold text-zinc-500 mb-1.5">Cron expression (UTC)</label>
                    <input
                      value={customCron}
                      onChange={e => setCustomCron(e.target.value)}
                      placeholder="e.g. 0 9 * * 1-5"
                      className="w-full bg-zinc-900 border border-zinc-700/60 rounded-xl px-4 py-3 text-[14px] text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
                    />
                  </div>
                )}

                {cron && patternKey !== 'custom' && (
                  <div className="px-4 py-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/50">
                    <p className="text-[13px] text-zinc-400">
                      Runs: <span className="text-zinc-200 font-medium">{cronToLabel(cron)}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Output channel */}
              <div>
                <label className="block text-[13px] font-semibold text-zinc-400 mb-2">Deliver report to</label>
                <div className="flex gap-2">
                  {(['gmail', 'slack', 'both'] as const).map(ch => (
                    <button
                      key={ch}
                      onClick={() => setChannel(ch)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-medium border transition-all',
                        channel === ch
                          ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                          : 'bg-zinc-900 border-zinc-700/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200',
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
                    className="mt-3 w-full bg-zinc-900 border border-zinc-700/60 rounded-xl px-4 py-3 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-all"
                  />
                )}
              </div>

              {/* Skip confirmations */}
              <div className="flex items-center justify-between bg-zinc-900/70 rounded-xl px-4 py-3.5 border border-zinc-800/60">
                <div>
                  <p className="text-[14px] font-semibold text-zinc-100">Skip confirmations</p>
                  <p className="text-[12px] text-zinc-500 mt-0.5">No approval needed before execution</p>
                </div>
                <Toggle checked={skipConf} onChange={() => setSkipConf(v => !v)} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-zinc-800/60">
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
      </DialogContent>
    </Dialog>
  );
}

// ── Agent Detail Dialog ────────────────────────────────────────────────────────

function AgentDetailModal({ agent, onClose, onToggle, onEdit, onDelete, onToggleConfirmations }: {
  agent: Agent; onClose: () => void; onToggle: () => void;
  onEdit: () => void; onDelete: () => void; onToggleConfirmations: () => void;
}) {
  const nextRun = getNextRunDate(agent.cron_schedule);

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent showCloseButton={false} className="w-full max-w-md bg-zinc-950 border border-zinc-700/50 rounded-2xl p-0 overflow-hidden shadow-2xl shadow-black/60">
        <div className="px-6 pt-6 pb-4 border-b border-zinc-800/60 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-zinc-700/60 bg-zinc-800/60 text-zinc-300">
              {cronToLabel(agent.cron_schedule)}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Toggle checked={agent.status !== 'paused'} onChange={onToggle} />
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          <h3 className="text-[18px] font-bold text-zinc-100 leading-snug mb-2">{agent.name}</h3>
          <p className="text-[14px] text-zinc-400 leading-relaxed line-clamp-4 mb-5">{agent.task_description}</p>

          <div className="space-y-2 mb-5">
            {[
              { label: 'Repeat', value: cronToLabel(agent.cron_schedule) },
              { label: 'Next run', value: formatNextRun(nextRun) },
              { label: 'Confirmations', value: agent.skip_confirmations ? 'Always skip' : 'Ask first' },
              { label: 'Output', value: agent.output_channel === 'both' ? 'Gmail + Slack' : agent.output_channel.charAt(0).toUpperCase() + agent.output_channel.slice(1) },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 px-4 bg-zinc-900/60 rounded-lg border border-zinc-800/50">
                <span className="text-[13px] text-zinc-500">{row.label}</span>
                <span className="text-[13px] text-zinc-200 font-medium">{row.value}</span>
              </div>
            ))}
          </div>

          {agent.last_run_at && (
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">Last run</p>
              <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-4">
                <p className="text-[13px] text-zinc-400 font-medium mb-1">{formatRunDate(agent.last_run_at)}</p>
                <p className="text-[13px] text-zinc-500 leading-relaxed line-clamp-3">{agent.last_report_summary || 'Run completed successfully.'}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { onClose(); onEdit(); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 border border-zinc-700/60 text-[14px] font-semibold text-zinc-300 hover:bg-zinc-800 transition-all"
            >
              <Edit2 className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={() => { onClose(); onDelete(); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[14px] font-semibold text-red-400 hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Full-Page Calendar View ────────────────────────────────────────────────────

function CalendarView({ agents, onAgentClick, onCreateNew }: {
  agents: Agent[];
  onAgentClick: (a: Agent) => void;
  onCreateNew: () => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: Array<{ day: number | null; runs: Array<{ agent: Agent; date: Date }> }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, runs: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(viewYear, viewMonth, d);
    const runs: Array<{ agent: Agent; date: Date }> = [];
    if (cellDate >= todayStart) {
      for (const agent of agents) {
        for (const runDate of getAgentRunsInMonth(agent, viewYear, viewMonth)) {
          if (runDate.getDate() === d) runs.push({ agent, date: runDate });
        }
      }
    }
    cells.push({ day: d, runs });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, runs: [] });
  const weeks = cells.length / 7;

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Calendar nav bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 flex-shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-[17px] font-semibold text-zinc-100 min-w-[160px] text-center">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }}
            className="px-4 py-1.5 rounded-lg text-[13px] font-semibold text-zinc-300 border border-zinc-700/60 hover:border-zinc-500 hover:text-white transition-all"
          >
            Today
          </button>
          <div className="flex border border-zinc-700/60 rounded-lg overflow-hidden">
            <button className="w-8 h-8 flex items-center justify-center bg-zinc-800 text-zinc-100 transition-all">
              <CalendarDays className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-all">
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-zinc-800/60 flex-shrink-0">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[12px] font-medium text-zinc-500 py-2.5 border-r border-zinc-800/60 last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid — fills all remaining space */}
      <div
        className="flex-1 grid grid-cols-7 min-h-0"
        style={{ gridTemplateRows: `repeat(${weeks}, 1fr)` }}
      >
        {cells.map((cell, idx) => {
          const isToday = cell.day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
          const isPast = cell.day !== null && new Date(viewYear, viewMonth, cell.day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          return (
            <div
              key={idx}
              className={cn(
                'flex flex-col border-r border-b border-zinc-800/60 overflow-hidden',
                idx % 7 === 6 && 'border-r-0',
                cell.day === null && 'bg-[#0a0a0a]',
              )}
            >
              {cell.day !== null && (
                <>
                  {/* Date number row */}
                  <div className="flex items-start justify-between px-2 pt-2 pb-1 flex-shrink-0">
                    {isToday ? (
                      <button
                        onClick={onCreateNew}
                        className="w-6 h-6 flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    ) : <span />}
                    <div className={cn(
                      'w-7 h-7 flex items-center justify-center text-[13px] font-medium rounded-full',
                      isToday ? 'bg-white text-black font-bold' : isPast ? 'text-zinc-600' : 'text-zinc-300',
                    )}>
                      {cell.day}
                    </div>
                  </div>

                  {/* Event pills */}
                  <div className="flex-1 px-1.5 pb-1.5 space-y-1 overflow-hidden">
                    {cell.runs.map(({ agent, date }, ri) => (
                      <button
                        key={ri}
                        onClick={() => onAgentClick(agent)}
                        className="w-full text-left bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/40 rounded-md px-2 py-1.5 transition-all active:scale-[0.98]"
                      >
                        <p className="text-[11px] font-medium text-zinc-100 truncate leading-tight">{agent.name}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{formatTime(date)}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Template Cards ─────────────────────────────────────────────────────────────

function TemplateCards({ onActivate }: { onActivate: (t: typeof TEMPLATES[0]) => void }) {
  return (
    <div>
      <p className="text-[15px] text-zinc-400 mb-8 text-center">
        Get started with a pre-built agent — activate in one click, customize anytime.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl p-5 flex flex-col hover:border-zinc-600/70 hover:bg-zinc-900/80 transition-all group shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-800/80 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-700/80 transition-colors">
                <Clock className="w-4.5 h-4.5 text-zinc-400" />
              </div>
              <h4 className="text-[15px] font-bold text-zinc-100 leading-tight">{t.name}</h4>
            </div>
            <p className="text-[13px] text-zinc-400 leading-relaxed flex-1 mb-4">{t.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-zinc-600 font-medium">{cronToLabel(t.cron_schedule)}</span>
              <button
                onClick={() => onActivate(t)}
                className="px-4 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 text-[13px] font-bold hover:bg-white active:scale-95 transition-all"
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

function AgentTaskCard({ agent, onClick, onToggle, onEdit, onDelete, onToggleConfirmations }: {
  agent: Agent; onClick: () => void; onToggle: () => void;
  onEdit: () => void; onDelete: () => void; onToggleConfirmations: () => void;
}) {
  const nextRun = getNextRunDate(agent.cron_schedule);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl overflow-hidden hover:border-zinc-700/70 transition-all shadow-sm group"
    >
      <div className="p-5 pb-4">
        <div className="flex items-start gap-3.5 mb-3">
          <div className="px-2.5 py-1 rounded-lg text-[11px] font-bold border flex-shrink-0 mt-0.5 border-zinc-700/60 bg-zinc-800/60 text-zinc-300">
            {cronToLabel(agent.cron_schedule).split(' ')[0]}
          </div>
          <div className="flex-1 min-w-0">
            <button
              onClick={onClick}
              className="text-[16px] font-bold text-zinc-100 text-left hover:text-zinc-300 transition-colors leading-tight line-clamp-1 block w-full"
            >
              {agent.name}
            </button>
            <p className="text-[13px] text-zinc-500 mt-1.5 leading-relaxed line-clamp-2">{agent.task_description}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
            <Toggle checked={agent.status !== 'paused'} onChange={onToggle} />
            <DropdownMenuRoot.Root>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px] bg-zinc-900 border border-zinc-700/60 rounded-xl p-1 shadow-xl">
                <DropdownMenuItem onClick={onEdit} className="flex items-center gap-2 px-3 py-2 text-[13px] text-zinc-300 hover:text-zinc-100 cursor-pointer rounded-lg">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} variant="destructive" className="flex items-center gap-2 px-3 py-2 text-[13px] cursor-pointer rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuRoot.Root>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-800/50">
          <div className="flex-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 block mb-0.5">Schedule</span>
            <span className="text-[13px] text-zinc-300 font-medium">{cronToLabel(agent.cron_schedule)}</span>
          </div>
          <div className="flex-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 block mb-0.5">Next run</span>
            <span className="text-[13px] text-zinc-300 font-medium">{formatNextRun(nextRun)}</span>
          </div>
          <div>
            <span className={cn(
              'inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border',
              agent.status === 'active'  ? 'bg-zinc-800 text-zinc-300 border-zinc-700/60' :
              agent.status === 'running' ? 'bg-zinc-700 text-zinc-100 border-zinc-600' :
              'bg-transparent text-zinc-600 border-zinc-800',
            )}>
              {agent.status === 'running' ? 'Running' : agent.status === 'active' ? 'Active' : 'Paused'}
            </span>
          </div>
        </div>
      </div>

      {/* Skip confirmations */}
      <div className="mx-5 mb-4 bg-zinc-950/60 border border-zinc-800/50 rounded-xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-zinc-300">Skip confirmations</p>
          <p className="text-[12px] text-zinc-600 mt-0.5">No approval needed before sending, publishing, or posting</p>
        </div>
        <Toggle checked={agent.skip_confirmations} onChange={onToggleConfirmations} />
      </div>
    </motion.div>
  );
}

// ── Inner Page (needs useSearchParams) ────────────────────────────────────────

function ScheduledPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') as 'calendar' | 'tasks') || 'tasks';

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [tableError, setTableError] = useState(false);
  const [activatingTemplate, setActivatingTemplate] = useState<typeof TEMPLATES[0] | null>(null);

  const setTab = (t: 'calendar' | 'tasks') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', t);
    router.replace(`?${params.toString()}`);
  };

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
    try {
      await fetch('/api/arcus/agents/timezone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: tz }),
      });
    } catch { /* silent */ }
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
    if (selectedAgent?.id === agent.id) setSelectedAgent(a => a ? { ...a, status: newStatus } : a);
  };

  const handleToggleConfirmations = async (agent: Agent) => {
    const newVal = !agent.skip_confirmations;
    await fetch('/api/arcus/agents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: agent.id, skip_confirmations: newVal }) });
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

  return (
    <div className="bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-8 pb-0 flex-shrink-0">
        <div>
          <h1 className="text-[30px] font-bold tracking-tight text-zinc-100">Scheduled</h1>
          <p className="text-zinc-500 text-[14px] mt-1">Autonomous agents working for you around the clock</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-zinc-100 text-zinc-950 rounded-xl font-bold text-[14px] hover:bg-white active:scale-95 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New schedule
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-8 mt-6 border-b border-zinc-800/70 flex-shrink-0">
        {([
          { key: 'tasks', label: 'Tasks', icon: List },
          { key: 'calendar', label: 'Calendar', icon: CalendarDays },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-1 py-3.5 mr-8 text-[15px] font-semibold transition-all border-b-2 -mb-px',
              tab === key
                ? 'text-zinc-100 border-zinc-100'
                : 'text-zinc-500 border-transparent hover:text-zinc-300',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-zinc-600 animate-spin" />
        </div>
      ) : tab === 'calendar' ? (
        /* Calendar: no padding, fills remaining viewport height */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {tableError && (
            <div className="mx-8 mt-4 p-3 bg-zinc-900 border border-zinc-700/60 rounded-xl flex items-start gap-3 flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-zinc-400">Run the SQL migration in Supabase for the <code className="text-zinc-200">arcus_agents</code> table.</p>
            </div>
          )}
          <CalendarView
            agents={agents.filter(a => a.status !== 'paused')}
            onAgentClick={a => setSelectedAgent(a)}
            onCreateNew={() => setCreateOpen(true)}
          />
        </div>
      ) : (
        /* Tasks: padded scroll area */
        <div className="flex-1 overflow-y-auto px-8 py-7">
          {tableError && (
            <div className="mb-6 p-4 bg-zinc-900/60 border border-zinc-700/40 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-zinc-300 font-bold text-[14px]">Database not set up</p>
                <p className="text-zinc-500 text-[13px] mt-0.5">Run the SQL migration in Supabase for the <code className="text-zinc-300">arcus_agents</code> table.</p>
              </div>
            </div>
          )}
          {agents.length === 0 ? (
            <TemplateCards onActivate={t => setActivatingTemplate(t)} />
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              <AnimatePresence mode="popLayout">
                {agents.map(agent => (
                  <AgentTaskCard
                    key={agent.id}
                    agent={agent}
                    onClick={() => setSelectedAgent(agent)}
                    onToggle={() => handleToggle(agent)}
                    onEdit={() => setEditAgent(agent)}
                    onDelete={() => handleDelete(agent)}
                    onToggleConfirmations={() => handleToggleConfirmations(agent)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

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
          <NewScheduleModal key="edit" open onClose={() => setEditAgent(null)} onSave={handleEdit} initial={editAgent} />
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

// ── Page export (Suspense required for useSearchParams) ────────────────────────

export default function ScheduledPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-zinc-600 animate-spin" />
      </div>
    }>
      <ScheduledPageInner />
    </Suspense>
  );
}
