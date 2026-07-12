'use client';

/**
 * /dashboard/outreach/[id] — the campaign war room.
 *
 * One screen for the whole outbound motion:
 *  - funnel tiles + status actions (approve / pause / resume / cancel)
 *  - drafting: live progress + automatic top-up (the open page keeps the
 *    pipeline moving between cron ticks)
 *  - REVIEW FLOW: keyboard-first draft review — J/K or ↑/↓ move · E edit ·
 *    X exclude · R regenerate · Enter next. Evidence chips show WHY each
 *    email says what it says; deliverability + generic flags surface risk.
 *  - replies lane: classified replies as they land
 *  - sticky approve bar — the ONLY path that starts sending. Arcus itself
 *    can never approve a campaign.
 *
 * Dual-theme, glass per docs/design-language.md.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Check, Loader2, Pause, Play, X, Pencil,
  RefreshCw, AlertTriangle, Sparkles, ChevronDown, Send,
} from 'lucide-react';
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Recipient {
  id: string;
  email: string;
  name?: string | null;
  company?: string | null;
  hook?: string | null;
  research?: Array<{ source: string; fact: string }> | null;
  subject?: string | null;
  body?: string | null;
  status: string;
  voice_score?: number | null;
  deliverability_score?: number | null;
  generic_flag?: boolean;
  reply_intent?: string | null;
  reply_snippet?: string | null;
  error?: string | null;
}

interface Detail {
  campaign: {
    id: string; name: string; status: string; dailyCap: number; effectiveCapToday: number;
    counts: Record<string, number>;
    domainHealth?: { advice?: string | null } | null;
    lastError?: string | null;
  };
  recipients: Recipient[];
  total: number;
}

const PAGE_SIZE = 30;

const INTENT_STYLES: Record<string, string> = {
  interested:  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  question:    'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  objection:   'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  not_now:     'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300',
  unsubscribe: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  wrong_person:'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300',
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Review-flow state
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const load = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/arcus/campaigns/${id}?limit=200`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not load campaign.');
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Could not load campaign.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const c = data?.campaign;
  const recipients = data?.recipients || [];

  // While drafting: top up the pipeline + refresh — the open page keeps
  // drafting moving between cron ticks. While sending: light refresh.
  useEffect(() => {
    if (!c || !id) return;
    if (c.status === 'drafting') {
      const t = setInterval(async () => {
        try { await fetch(`/api/arcus/campaigns/${id}/draft`, { method: 'POST' }); } catch { /* cron continues regardless */ }
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
    } catch (e: any) {
      toast.error(e.message || 'Action failed.');
    } finally {
      setBusy(false);
    }
  };
  const patchCampaign = (body: unknown) => action(`/api/arcus/campaigns/${id}`, body, 'PATCH');
  const patchRecipient = (rid: string, body: unknown) => action(`/api/arcus/campaigns/${id}/recipients/${rid}`, body, 'PATCH');

  // ── Buckets ──
  const drafted = useMemo(() => recipients.filter(r => r.status === 'drafted'), [recipients]);
  const inFlight = useMemo(() => recipients.filter(r => ['queued', 'sent'].includes(r.status)), [recipients]);
  const replies = useMemo(() => recipients.filter(r => ['replied', 'meeting'].includes(r.status)), [recipients]);
  const excluded = useMemo(() => recipients.filter(r => ['excluded', 'suppressed'].includes(r.status)), [recipients]);
  const pendingCount = useMemo(() => recipients.filter(r => ['pending', 'researching'].includes(r.status)).length, [recipients]);
  const failed = useMemo(() => recipients.filter(r => r.status === 'failed'), [recipients]);

  const reviewList = c?.status === 'review' || c?.status === 'drafting' ? drafted : [];
  const visibleReview = reviewList.slice(0, visibleCount);

  // ── Edit helpers ──
  const startEdit = useCallback((r: Recipient) => {
    setEditingId(r.id);
    setEditSubject(r.subject || '');
    setEditBody(r.body || '');
  }, []);
  const saveEdit = async () => {
    if (!editingId) return;
    setSavingEdit(true);
    await patchRecipient(editingId, { subject: editSubject, body: editBody });
    setSavingEdit(false);
    setEditingId(null);
  };

  // ── Keyboard-first review: J/K or ↑/↓ · E edit · X exclude · R regenerate · Enter next ──
  useEffect(() => {
    if (!reviewList.length) return;
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (editingId) return; // edit mode owns the keyboard
      const max = Math.min(reviewList.length, visibleCount) - 1;
      const move = (d: number) => {
        e.preventDefault();
        setSelectedIdx(i => {
          const next = Math.max(0, Math.min(max, i + d));
          rowRefs.current[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          return next;
        });
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
    <div className="min-h-screen bg-[#fafafa] text-zinc-950 dark:bg-[#09090b] dark:text-zinc-50">
      <HomeFeedSidebar />
      <main className="mx-auto max-w-5xl px-6 py-10 md:ml-[260px] md:px-10 pb-32">
        <Link href="/dashboard/outreach" className="mb-7 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> All campaigns
        </Link>

        {loading ? (
          <div className="py-20 text-center text-sm text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3" />
            Loading campaign…
          </div>
        ) : !c ? (
          <div className="py-20 text-center text-sm text-zinc-500">{error || 'Campaign not found.'}</div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="mb-2 text-[11px] uppercase tracking-[0.16em] font-semibold text-zinc-400 dark:text-zinc-500">Outreach campaign</p>
                <h1 className="text-3xl font-semibold tracking-tight">{c.name}</h1>
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
                {c.status === 'sending' && (
                  <button disabled={busy} onClick={() => patchCampaign({ action: 'pause' })}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors">
                    <Pause className="h-4 w-4" /> Pause
                  </button>
                )}
                {c.status === 'paused' && (
                  <button disabled={busy} onClick={() => patchCampaign({ action: 'resume' })}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors">
                    <Play className="h-4 w-4" /> Resume
                  </button>
                )}
                {['drafting', 'review', 'paused', 'sending'].includes(c.status) && (
                  <button disabled={busy} onClick={() => patchCampaign({ action: 'cancel' })}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40 transition-colors">
                    <X className="h-4 w-4" /> Cancel
                  </button>
                )}
              </div>
            </div>

            {error && <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}

            {/* Domain health — the pre-flight deliverability guardian */}
            {c.domainHealth?.advice && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="leading-relaxed">{c.domainHealth.advice}</p>
              </div>
            )}
            {c.lastError && c.status !== 'cancelled' && (
              <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">{c.lastError}</div>
            )}

            {/* ── Funnel ── */}
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

            {/* ── Replies lane ── */}
            {replies.length > 0 && (
              <section className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
                  <h2 className="font-semibold">Replies</h2>
                  <p className="mt-1 text-sm text-zinc-500">Classified as they land — warm ones first.</p>
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {replies.map(r => (
                    <div key={r.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-medium text-[14px]">{r.name || r.email}</span>
                        {r.reply_intent && (
                          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize', INTENT_STYLES[r.reply_intent] || INTENT_STYLES.not_now)}>
                            {r.reply_intent.replace('_', ' ')}
                          </span>
                        )}
                        {r.status === 'meeting' && (
                          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">meeting</span>
                        )}
                      </div>
                      {r.reply_snippet && (
                        <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">“{r.reply_snippet}”</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Review flow ── */}
            {reviewList.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Review drafts</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      Each one is individual — spot-check a few, edit or pull anyone out, then approve the campaign.
                    </p>
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
                    {[['J/K', 'move'], ['E', 'edit'], ['X', 'exclude'], ['R', 'regenerate']].map(([k, l]) => (
                      <span key={k} className="inline-flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-[10px] font-semibold">{k}</kbd>
                        {l}
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
                        className={cn(
                          'px-6 py-5 transition-colors cursor-default',
                          selected && 'bg-zinc-50 dark:bg-zinc-800/40 border-l-2 border-l-zinc-900 dark:border-l-zinc-100 -ml-[2px]',
                        )}
                      >
                        {/* Row header */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-medium text-[14.5px]">{r.name || r.email}</span>
                            <span className="ml-2 text-[12.5px] text-zinc-400">{r.email}{r.company ? ` · ${r.company}` : ''}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {typeof r.voice_score === 'number' && (
                              <Chip label={`voice ${r.voice_score}`} tone={r.voice_score >= 80 ? 'good' : r.voice_score >= 60 ? 'warn' : 'bad'} />
                            )}
                            {typeof r.deliverability_score === 'number' && r.deliverability_score < 80 && (
                              <Chip label={`inbox risk ${100 - r.deliverability_score}`} tone="warn" />
                            )}
                            {r.generic_flag && <Chip label="reads generic" tone="bad" />}
                          </div>
                        </div>

                        {/* Hook + evidence — WHY this email says what it says */}
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

                        {/* Draft */}
                        {isEditing ? (
                          <div className="mt-4 space-y-3">
                            <input
                              value={editSubject}
                              onChange={(e) => setEditSubject(e.target.value)}
                              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-[14px] font-medium focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                              placeholder="Subject"
                            />
                            <textarea
                              value={editBody}
                              onChange={(e) => setEditBody(e.target.value)}
                              rows={Math.min(14, Math.max(6, editBody.split('\n').length + 1))}
                              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 py-3 text-[13.5px] leading-relaxed focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 resize-y"
                              placeholder="Email body"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={saveEdit}
                                disabled={savingEdit || editBody.trim().length < 10}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 text-[13px] font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 transition-colors"
                              >
                                {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-3 py-2 text-[13px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {r.subject && <p className="mt-3.5 text-[13.5px] font-semibold">{r.subject}</p>}
                            {r.body && (
                              <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">{r.body}</p>
                            )}
                            {/* Row actions */}
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
                  <button
                    onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                    className="w-full py-3.5 text-[13px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 border-t border-zinc-100 dark:border-zinc-800 inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    Show {Math.min(PAGE_SIZE, reviewList.length - visibleCount)} more <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                )}
              </section>
            )}

            {/* Drafting placeholder when nothing drafted yet */}
            {c.status === 'drafting' && reviewList.length === 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-10 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3 text-zinc-400" />
                <p className="text-sm text-zinc-500">Researching each person and writing the first drafts — they appear here as they land.</p>
              </div>
            )}

            {/* In-flight / sent list (compact) */}
            {inFlight.length > 0 && c.status !== 'review' && (
              <section className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
                  <h2 className="font-semibold">Sent & queued</h2>
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[420px] overflow-y-auto">
                  {inFlight.map(r => (
                    <div key={r.id} className="px-6 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[13.5px] font-medium">{r.name || r.email}</span>
                        <span className="ml-2 text-[12px] text-zinc-400 truncate">{r.subject}</span>
                      </div>
                      <span className={cn(
                        'text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                        r.status === 'sent' ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' : 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
                      )}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Failed */}
            {failed.length > 0 && (
              <section className="mt-8 overflow-hidden rounded-2xl border border-rose-200/60 dark:border-rose-900/60 bg-white dark:bg-zinc-900">
                <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
                  <h2 className="font-semibold text-rose-700 dark:text-rose-300">Failed</h2>
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {failed.map(r => (
                    <div key={r.id} className="px-6 py-3">
                      <span className="text-[13.5px] font-medium">{r.email}</span>
                      {r.error && <span className="ml-2 text-[12px] text-zinc-500">{r.error}</span>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Excluded (collapsed detail) */}
            {excluded.length > 0 && (
              <details className="mt-8 group">
                <summary className="cursor-pointer text-[13px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 inline-flex items-center gap-1.5 transition-colors">
                  <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                  {excluded.length} excluded
                </summary>
                <div className="mt-3 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {excluded.map(r => (
                    <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[13px] font-medium">{r.email}</span>
                        {r.error && <span className="ml-2 text-[12px] text-zinc-400">{r.error}</span>}
                      </div>
                      {['drafting', 'review'].includes(c.status) && (
                        <button
                          onClick={() => patchRecipient(r.id, { exclude: false })}
                          className="text-[12px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 shrink-0 transition-colors"
                        >
                          Re-include
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* ── Sticky approve bar — the ONLY path to sending ── */}
            {c.status === 'review' && (
              <div className="fixed bottom-0 left-0 right-0 md:left-[260px] z-30 border-t border-zinc-200 dark:border-zinc-800 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl">
                <div className="max-w-5xl mx-auto px-6 md:px-10 py-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[13px] text-zinc-500">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{drafted.length} drafts</span> ready
                    {excluded.length > 0 && <> · {excluded.length} excluded</>} · starts at ~15/day ramping to {c.dailyCap}/day, business hours
                  </p>
                  <button
                    disabled={busy || drafted.length === 0}
                    onClick={() => action(`/api/arcus/campaigns/${id}/approve`)}
                    className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 transition-all"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Approve campaign
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Chip({ label, tone }: { label: string; tone: 'good' | 'warn' | 'bad' }) {
  return (
    <span className={cn(
      'px-2 py-0.5 rounded-full text-[10.5px] font-semibold whitespace-nowrap',
      tone === 'good' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      tone === 'warn' && 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
      tone === 'bad' && 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    )}>
      {label}
    </span>
  );
}

function RowAction({ icon, label, onClick, tone }: { icon: React.ReactNode; label: string; onClick: () => void; tone?: 'danger' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
        tone === 'danger'
          ? 'text-zinc-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:text-rose-300 dark:hover:bg-rose-950/40'
          : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-800',
      )}
    >
      {icon} {label}
    </button>
  );
}
