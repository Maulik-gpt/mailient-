'use client';

/**
 * OutreachWorkstation — the Arcus Outreach system, embedded as a tab inside
 * the Agents page. NOT a separate route: outreach is a deployable agent
 * people opt into, living alongside Tasks / Calendar / Marketplace.
 *
 * Two views, one component, URL-synced via ?campaign=<id> so chat cards and
 * home-feed pulses deep-link straight in:
 *   • list      — every campaign + the two ways to deploy (chat / scheduled)
 *   • war room  — funnel, keyboard-first review, replies lane, approve bar
 *
 * Fills the tab's flex container (no page chrome of its own). Dual-theme,
 * glass per docs/design-language.md.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, ArrowUpRight, Check, Loader2, Pause, Play, X, Pencil, RefreshCw,
  AlertTriangle, Sparkles, ChevronDown, Send, MessageSquare, CalendarClock, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CampaignRow {
  id: string; name: string; status: string; dailyCap: number; effectiveCapToday: number;
  counts: { recipients: number; drafted: number; sent: number; replied: number; meeting: number; failed: number };
  domainHealth?: { advice?: string | null } | null; lastError?: string | null; createdAt: string;
}
interface Recipient {
  id: string; email: string; name?: string | null; company?: string | null; hook?: string | null;
  research?: Array<{ source: string; fact: string }> | null; subject?: string | null; body?: string | null;
  status: string; voice_score?: number | null; deliverability_score?: number | null; generic_flag?: boolean;
  reply_intent?: string | null; reply_snippet?: string | null; error?: string | null;
}
interface Detail {
  campaign: CampaignRow & { brief?: string };
  recipients: Recipient[]; total: number;
}

const STATUS_STYLES: Record<string, string> = {
  drafting: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300',
  review: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  sending: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  paused: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  completed: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400',
  cancelled: 'bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500',
};
const STATUS_LABELS: Record<string, string> = {
  drafting: 'Writing drafts', review: 'Ready to review', sending: 'Sending',
  paused: 'Paused', completed: 'Completed', cancelled: 'Cancelled',
};
const INTENT_STYLES: Record<string, string> = {
  interested: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  question: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  objection: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  not_now: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300',
  unsubscribe: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  wrong_person: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300',
};

export function OutreachWorkstation({ onDeployAgent }: { onDeployAgent?: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaign');

  const open = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'outreach');
    if (id) params.set('campaign', id); else params.delete('campaign');
    router.replace(`?${params.toString()}`);
  };

  return campaignId
    ? <WarRoom id={campaignId} onBack={() => open(null)} />
    : <CampaignList onOpen={(id) => open(id)} onDeployAgent={onDeployAgent} />;
}

/* ═══════════════════════════ LIST VIEW ═══════════════════════════ */

function CampaignList({ onOpen, onDeployAgent }: { onOpen: (id: string) => void; onDeployAgent?: () => void }) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/arcus/campaigns');
        if (!res.ok) throw new Error();
        const d = await res.json();
        if (!cancelled) setCampaigns(d.campaigns || []);
      } catch { if (!cancelled) setCampaigns([]); }
    };
    load();
    const t = setInterval(load, 20_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Land in a clean chat — the intro card above already primed what to say
  // ("cold-email these about…" + a list/CSV). No auto-prefill: the composer's
  // prefill bridge is for briefing hand-offs and would fire the wrong toast.
  const startInChat = () => router.push('/dashboard/agent-talk');

  return (
    <div className="max-w-3xl mx-auto">
      {/* Intro — what this system is */}
      <div className="mb-6 arcus-glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center">
            <Send className="w-4 h-4 text-black/60 dark:text-white/60" strokeWidth={1.75} />
          </div>
          <h2 className="text-[16px] font-semibold">Outreach</h2>
        </div>
        <p className="text-[13.5px] text-zinc-500 leading-relaxed mb-4 max-w-xl">
          Hand Arcus a list — it researches each person, writes them an individual email in your voice, and (after your approval)
          sends paced to protect your reputation, then handles the replies. Two ways to run it:
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={startInChat}
            className="text-left rounded-xl border border-black/[0.07] dark:border-white/[0.08] p-4 hover:border-black/20 dark:hover:border-white/20 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group"
          >
            <MessageSquare className="w-4 h-4 text-black/50 dark:text-white/50 mb-2" />
            <p className="text-[13.5px] font-semibold mb-0.5 flex items-center gap-1">Live in chat <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" /></p>
            <p className="text-[12px] text-zinc-500 leading-relaxed">Paste a list or attach a CSV and say "cold-email these about…". Best for one-off campaigns.</p>
          </button>
          <button
            onClick={onDeployAgent}
            className="text-left rounded-xl border border-black/[0.07] dark:border-white/[0.08] p-4 hover:border-black/20 dark:hover:border-white/20 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-all group"
          >
            <CalendarClock className="w-4 h-4 text-black/50 dark:text-white/50 mb-2" />
            <p className="text-[13.5px] font-semibold mb-0.5 flex items-center gap-1">Deploy as an agent <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" /></p>
            <p className="text-[12px] text-zinc-500 leading-relaxed">Schedule Arcus to find fresh leads and prep campaigns on a cadence — you just approve.</p>
          </button>
        </div>
      </div>

      {/* Campaigns */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">Your campaigns</h3>
      </div>

      {campaigns === null ? (
        <div className="space-y-3">
          {[0, 1].map(i => <div key={i} className="h-[84px] rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-zinc-900 animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="arcus-glass-card rounded-2xl px-8 py-12 text-center">
          <p className="text-[14px] font-medium mb-1.5">No campaigns yet</p>
          <p className="text-[13px] text-zinc-500 max-w-sm mx-auto leading-relaxed mb-5">
            Start one from chat, or deploy Arcus to run outreach on a schedule.
          </p>
          <button onClick={startInChat} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white text-[13px] font-semibold active:scale-95 transition-all">
            Start in chat <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const pct = c.counts.recipients > 0 ? Math.round((c.counts.sent / c.counts.recipients) * 100) : 0;
            return (
              <button
                key={c.id}
                onClick={() => onOpen(c.id)}
                className="w-full text-left arcus-glass-card arcus-glass-hover rounded-2xl px-5 py-4 group"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {c.status === 'drafting' && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400 shrink-0" />}
                    <h3 className="text-[15px] font-semibold truncate">{c.name}</h3>
                  </div>
                  <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0', STATUS_STYLES[c.status] || STATUS_STYLES.completed)}>
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[12.5px] text-zinc-500 tabular-nums">
                  <span>{c.counts.recipients} people</span>
                  {c.status === 'drafting' ? <span>{c.counts.drafted} drafted</span> : <span>{c.counts.sent} sent{c.counts.recipients ? ` (${pct}%)` : ''}</span>}
                  {c.counts.replied > 0 && <span className="text-emerald-700 dark:text-emerald-400 font-medium">{c.counts.replied} replied</span>}
                  {c.counts.failed > 0 && <span className="text-rose-600 dark:text-rose-400">{c.counts.failed} failed</span>}
                  <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors" />
                </div>
                {c.status === 'review' && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium text-blue-700 dark:text-blue-300">
                    <ShieldCheck className="w-3.5 h-3.5" /> {c.counts.drafted} drafts waiting for your approval
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ WAR ROOM ═══════════════════════════ */

const PAGE_SIZE = 30;

function WarRoom({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/arcus/campaigns/${id}?limit=200`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not load campaign.');
      setData(json); setError(null);
    } catch (e: any) { setError(e.message || 'Could not load campaign.'); }
    finally { if (!silent) setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const c = data?.campaign;
  const recipients = data?.recipients || [];

  useEffect(() => {
    if (!c) return;
    if (c.status === 'drafting') {
      const t = setInterval(async () => {
        try { await fetch(`/api/arcus/campaigns/${id}/draft`, { method: 'POST' }); } catch { /* cron continues */ }
        load(true);
      }, 15_000);
      return () => clearInterval(t);
    }
    if (c.status === 'sending') {
      const t = setInterval(() => load(true), 20_000);
      return () => clearInterval(t);
    }
  }, [c?.status, id, load, c]);

  const action = async (endpoint: string, body?: unknown, method = 'POST') => {
    setBusy(true);
    try {
      const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Action failed.');
      await load(true);
    } catch (e: any) { toast.error(e.message || 'Action failed.'); }
    finally { setBusy(false); }
  };
  const patchCampaign = (body: unknown) => action(`/api/arcus/campaigns/${id}`, body, 'PATCH');
  const patchRecipient = (rid: string, body: unknown) => action(`/api/arcus/campaigns/${id}/recipients/${rid}`, body, 'PATCH');

  const drafted = useMemo(() => recipients.filter(r => r.status === 'drafted'), [recipients]);
  const inFlight = useMemo(() => recipients.filter(r => ['queued', 'sent'].includes(r.status)), [recipients]);
  const replies = useMemo(() => recipients.filter(r => ['replied', 'meeting'].includes(r.status)), [recipients]);
  const excluded = useMemo(() => recipients.filter(r => ['excluded', 'suppressed'].includes(r.status)), [recipients]);
  const failed = useMemo(() => recipients.filter(r => r.status === 'failed'), [recipients]);
  const pendingCount = useMemo(() => recipients.filter(r => ['pending', 'researching'].includes(r.status)).length, [recipients]);

  const reviewList = c?.status === 'review' || c?.status === 'drafting' ? drafted : [];
  const visibleReview = reviewList.slice(0, visibleCount);

  const startEdit = useCallback((r: Recipient) => { setEditingId(r.id); setEditSubject(r.subject || ''); setEditBody(r.body || ''); }, []);
  const saveEdit = async () => {
    if (!editingId) return;
    setSavingEdit(true);
    await patchRecipient(editingId, { subject: editSubject, body: editBody });
    setSavingEdit(false); setEditingId(null);
  };

  useEffect(() => {
    if (!reviewList.length) return;
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (editingId) return;
      const max = Math.min(reviewList.length, visibleCount) - 1;
      const move = (d: number) => {
        e.preventDefault();
        setSelectedIdx(i => { const next = Math.max(0, Math.min(max, i + d)); rowRefs.current[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return next; });
      };
      const sel = visibleReview[selectedIdx];
      switch (e.key.toLowerCase()) {
        case 'j': case 'arrowdown': move(1); break;
        case 'k': case 'arrowup': move(-1); break;
        case 'enter': move(1); break;
        case 'e': if (sel) { e.preventDefault(); startEdit(sel); } break;
        case 'x': if (sel) { e.preventDefault(); patchRecipient(sel.id, { exclude: true }); } break;
        case 'r': if (sel) { e.preventDefault(); patchRecipient(sel.id, { regenerate: true }); toast.info('Regenerating — a fresh draft lands in a few seconds.'); } break;
        default: break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewList.length, visibleCount, selectedIdx, editingId, visibleReview]);

  return (
    <div className="max-w-4xl mx-auto pb-28 relative">
      <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" /> All campaigns
      </button>

      {loading ? (
        <div className="py-20 text-center text-sm text-zinc-500"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-3" /> Loading campaign…</div>
      ) : !c ? (
        <div className="py-20 text-center text-sm text-zinc-500">{error || 'Campaign not found.'}</div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-2 text-[11px] uppercase tracking-[0.16em] font-semibold text-zinc-400 dark:text-zinc-500">Outreach campaign</p>
              <h1 className="text-[26px] font-semibold tracking-tight">{c.name}</h1>
              <p className="mt-2 text-sm text-zinc-500">
                {c.status === 'drafting' && <>Writing drafts — {c.counts.drafted ?? 0} of {c.counts.recipients ?? 0} done{pendingCount > 0 ? `, ${pendingCount} in progress` : ''}.</>}
                {c.status === 'review' && <>{drafted.length} drafts ready · nothing sends until you approve.</>}
                {c.status === 'sending' && <>Sending at up to {c.effectiveCapToday}/day (cap {c.dailyCap}) · business hours · minutes apart.</>}
                {c.status === 'paused' && <>Paused — queued emails were cancelled; resume to continue.</>}
                {c.status === 'completed' && <>Completed — {c.counts.sent ?? 0} sent, {c.counts.replied ?? 0} replied.</>}
                {c.status === 'cancelled' && <>Cancelled.</>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {c.status === 'sending' && <ActionBtn onClick={() => patchCampaign({ action: 'pause' })} disabled={busy} icon={<Pause className="h-4 w-4" />}>Pause</ActionBtn>}
              {c.status === 'paused' && <ActionBtn onClick={() => patchCampaign({ action: 'resume' })} disabled={busy} icon={<Play className="h-4 w-4" />}>Resume</ActionBtn>}
              {['drafting', 'review', 'paused', 'sending'].includes(c.status) && (
                <ActionBtn onClick={() => patchCampaign({ action: 'cancel' })} disabled={busy} icon={<X className="h-4 w-4" />} danger>Cancel</ActionBtn>
              )}
            </div>
          </div>

          {c.domainHealth?.advice && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><p className="leading-relaxed">{c.domainHealth.advice}</p>
            </div>
          )}
          {c.lastError && c.status !== 'cancelled' && (
            <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">{c.lastError}</div>
          )}

          {/* Funnel */}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ['Drafted', c.counts.drafted ?? 0, ''],
              ['Sent', c.counts.sent ?? 0, ''],
              ['Replies', c.counts.replied ?? 0, 'text-emerald-700 dark:text-emerald-400'],
              ['Meetings', c.counts.meeting ?? 0, 'text-emerald-700 dark:text-emerald-400'],
              ['Failed', c.counts.failed ?? 0, (c.counts.failed ?? 0) > 0 ? 'text-rose-600 dark:text-rose-400' : ''],
            ].map(([label, count, tone]) => (
              <div key={String(label)} className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className={cn('text-2xl font-semibold tabular-nums', String(tone))}>{Number(count)}</p>
                <p className="mt-1 text-xs text-zinc-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Replies lane */}
          {replies.length > 0 && (
            <section className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
                <h2 className="font-semibold">Replies</h2>
                <p className="mt-1 text-sm text-zinc-500">Classified as they land — responses drafted for you in Gmail.</p>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {replies.map(r => (
                  <div key={r.id} className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-medium text-[14px]">{r.name || r.email}</span>
                      {r.reply_intent && <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize', INTENT_STYLES[r.reply_intent] || INTENT_STYLES.not_now)}>{r.reply_intent.replace('_', ' ')}</span>}
                      {r.status === 'meeting' && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">meeting</span>}
                    </div>
                    {r.reply_snippet && <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">“{r.reply_snippet}”</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Review flow */}
          {reviewList.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Review drafts</h2>
                  <p className="mt-1 text-sm text-zinc-500">Each one is individual — spot-check, edit or pull anyone, then approve.</p>
                </div>
                <div className="hidden md:flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
                  {[['J/K', 'move'], ['E', 'edit'], ['X', 'exclude'], ['R', 'regenerate']].map(([k, l]) => (
                    <span key={k} className="inline-flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-[10px] font-semibold">{k}</kbd>{l}
                    </span>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {visibleReview.map((r, idx) => {
                  const selected = idx === selectedIdx;
                  const isEditing = editingId === r.id;
                  return (
                    <div
                      key={r.id}
                      ref={(el) => { rowRefs.current[idx] = el; }}
                      onClick={() => setSelectedIdx(idx)}
                      className={cn('px-6 py-5 transition-colors cursor-default', selected && 'bg-zinc-50 dark:bg-zinc-800/40 border-l-2 border-l-zinc-900 dark:border-l-zinc-100 -ml-[2px]')}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-medium text-[14.5px]">{r.name || r.email}</span>
                          <span className="ml-2 text-[12.5px] text-zinc-400">{r.email}{r.company ? ` · ${r.company}` : ''}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {typeof r.voice_score === 'number' && <Chip label={`voice ${r.voice_score}`} tone={r.voice_score >= 80 ? 'good' : r.voice_score >= 60 ? 'warn' : 'bad'} />}
                          {typeof r.deliverability_score === 'number' && r.deliverability_score < 80 && <Chip label={`inbox risk ${100 - r.deliverability_score}`} tone="warn" />}
                          {r.generic_flag && <Chip label="reads generic" tone="bad" />}
                        </div>
                      </div>
                      {r.hook && (
                        <p className="mt-2.5 text-[12.5px] text-zinc-500 flex items-start gap-1.5">
                          <Sparkles className="w-3 h-3 mt-[3px] shrink-0 text-zinc-400" />
                          <span><span className="font-medium text-zinc-600 dark:text-zinc-300">Hook:</span> {r.hook}</span>
                        </p>
                      )}
                      {r.research && r.research.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {r.research.slice(0, 3).map((ev, i) => (
                            <span key={i} className="inline-flex max-w-full items-center px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                              {ev.source}: {ev.fact.slice(0, 60)}{ev.fact.length > 60 ? '…' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      {isEditing ? (
                        <div className="mt-4 space-y-3">
                          <input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-[14px] font-medium focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500" placeholder="Subject" />
                          <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={Math.min(14, Math.max(6, editBody.split('\n').length + 1))} className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-3 text-[13.5px] leading-relaxed focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 resize-y" placeholder="Email body" />
                          <div className="flex items-center gap-2">
                            <button onClick={saveEdit} disabled={savingEdit || editBody.trim().length < 10} className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 text-[13px] font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 transition-colors">
                              {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                            </button>
                            <button onClick={() => setEditingId(null)} className="px-3 py-2 text-[13px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {r.subject && <p className="mt-3.5 text-[13.5px] font-semibold">{r.subject}</p>}
                          {r.body && <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">{r.body}</p>}
                          <div className="mt-3.5 flex items-center gap-1.5">
                            <RowAction icon={<Pencil className="w-3.5 h-3.5" />} label="Edit" onClick={() => startEdit(r)} />
                            <RowAction icon={<RefreshCw className="w-3.5 h-3.5" />} label="Regenerate" onClick={() => { patchRecipient(r.id, { regenerate: true }); toast.info('Regenerating — a fresh draft lands in a few seconds.'); }} />
                            <RowAction icon={<X className="w-3.5 h-3.5" />} label="Exclude" tone="danger" onClick={() => patchRecipient(r.id, { exclude: true })} />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {reviewList.length > visibleCount && (
                <button onClick={() => setVisibleCount(v => v + PAGE_SIZE)} className="w-full py-3.5 text-[13px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 border-t border-zinc-100 dark:border-zinc-800 inline-flex items-center justify-center gap-1.5 transition-colors">
                  Show {Math.min(PAGE_SIZE, reviewList.length - visibleCount)} more <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}
            </section>
          )}

          {c.status === 'drafting' && reviewList.length === 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-10 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3 text-zinc-400" />
              <p className="text-sm text-zinc-500">Researching each person and writing the first drafts — they appear here as they land.</p>
            </div>
          )}

          {inFlight.length > 0 && c.status !== 'review' && (
            <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800"><h2 className="font-semibold">Sent &amp; queued</h2></div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[420px] overflow-y-auto">
                {inFlight.map(r => (
                  <div key={r.id} className="px-6 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0"><span className="text-[13.5px] font-medium">{r.name || r.email}</span><span className="ml-2 text-[12px] text-zinc-400 truncate">{r.subject}</span></div>
                    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0', r.status === 'sent' ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' : 'bg-blue-500/10 text-blue-700 dark:text-blue-300')}>{r.status}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {failed.length > 0 && (
            <section className="mt-8 overflow-hidden rounded-2xl border border-rose-200/60 dark:border-rose-900/60 bg-white dark:bg-zinc-900">
              <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800"><h2 className="font-semibold text-rose-700 dark:text-rose-300">Failed</h2></div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {failed.map(r => <div key={r.id} className="px-6 py-3"><span className="text-[13.5px] font-medium">{r.email}</span>{r.error && <span className="ml-2 text-[12px] text-zinc-500">{r.error}</span>}</div>)}
              </div>
            </section>
          )}

          {excluded.length > 0 && (
            <details className="mt-8 group">
              <summary className="cursor-pointer text-[13px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 inline-flex items-center gap-1.5 transition-colors">
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" /> {excluded.length} excluded
              </summary>
              <div className="mt-3 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                {excluded.map(r => (
                  <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0"><span className="text-[13px] font-medium">{r.email}</span>{r.error && <span className="ml-2 text-[12px] text-zinc-400">{r.error}</span>}</div>
                    {['drafting', 'review'].includes(c.status) && <button onClick={() => patchRecipient(r.id, { exclude: false })} className="text-[12px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 shrink-0 transition-colors">Re-include</button>}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Sticky approve bar — the ONLY path to sending */}
          {c.status === 'review' && (
            <div className="fixed bottom-0 left-0 right-0 md:left-[var(--sidebar-w,0px)] z-30 border-t border-zinc-200 dark:border-zinc-800 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl">
              <div className="max-w-4xl mx-auto px-8 py-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-zinc-500">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{drafted.length} drafts</span> ready
                  {excluded.length > 0 && <> · {excluded.length} excluded</>} · starts at ~15/day ramping to {c.dailyCap}/day, business hours
                </p>
                <button disabled={busy || drafted.length === 0} onClick={() => action(`/api/arcus/campaigns/${id}/approve`)} className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 transition-all">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Approve campaign
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ActionBtn({ children, onClick, disabled, icon, danger }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; icon: React.ReactNode; danger?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} className={cn(
      'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 transition-colors',
      danger
        ? 'border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40'
        : 'border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800',
    )}>{icon}{children}</button>
  );
}

function Chip({ label, tone }: { label: string; tone: 'good' | 'warn' | 'bad' }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10.5px] font-semibold whitespace-nowrap',
      tone === 'good' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      tone === 'warn' && 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
      tone === 'bad' && 'bg-rose-500/10 text-rose-700 dark:text-rose-300')}>{label}</span>
  );
}

function RowAction({ icon, label, onClick, tone }: { icon: React.ReactNode; label: string; onClick: () => void; tone?: 'danger' }) {
  return (
    <button type="button" onClick={onClick} className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
      tone === 'danger' ? 'text-zinc-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:text-rose-300 dark:hover:bg-rose-950/40' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-800')}>{icon} {label}</button>
  );
}
