'use client';

/**
 * CampaignCard — the inline chat card for an Arcus Outreach campaign.
 *
 * Status-aware: drafting (live progress, polls the campaign API) → review
 * ("N drafts ready — review & approve" CTA) → sending (paced stats) →
 * completed/paused/cancelled summaries. Links into the command center at
 * /dashboard/outreach/[id], where review + approval actually happen — the
 * card itself can never send anything.
 *
 * Glass per docs/design-language.md; correct in both themes.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Send, Loader2, CheckCircle2, PauseCircle, ArrowUpRight, AlertTriangle, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CampaignSnapshotData {
  id: string;
  name: string;
  status: string;
  brief?: string;
  dailyCap: number;
  effectiveCapToday?: number;
  counts: {
    recipients: number;
    drafted: number;
    sent: number;
    replied: number;
    meeting?: number;
    failed?: number;
    excluded?: number;
  };
  domainHealth?: { advice?: string | null } | null;
  lastError?: string | null;
}

const STATUS_META: Record<string, { label: string; tone: 'working' | 'ready' | 'live' | 'done' | 'muted' | 'warn' }> = {
  drafting:  { label: 'Writing drafts', tone: 'working' },
  review:    { label: 'Ready to review', tone: 'ready' },
  sending:   { label: 'Sending', tone: 'live' },
  paused:    { label: 'Paused', tone: 'warn' },
  completed: { label: 'Completed', tone: 'done' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
};

export function CampaignCard({ campaign: initial }: { campaign: CampaignSnapshotData }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignSnapshotData>(initial);

  // While drafting/sending, keep the card honest with a light poll. Stops on
  // terminal states; interval is slow enough to be free.
  useEffect(() => {
    if (!['drafting', 'sending'].includes(campaign.status)) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/arcus/campaigns/${campaign.id}`);
        if (!res.ok) return;
        const d = await res.json();
        if (d?.campaign) setCampaign(d.campaign);
      } catch { /* keep last known state */ }
    }, 12_000);
    return () => clearInterval(t);
  }, [campaign.id, campaign.status]);

  const meta = STATUS_META[campaign.status] || { label: campaign.status, tone: 'muted' as const };
  const c = campaign.counts;
  const draftPct = c.recipients > 0 ? Math.round((c.drafted / c.recipients) * 100) : 0;
  const sentPct = c.recipients > 0 ? Math.round((c.sent / c.recipients) * 100) : 0;

  const open = () => router.push(`/dashboard/outreach/${campaign.id}`);

  return (
    <div className="mt-3 mb-1 w-full max-w-[560px] arcus-glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Send className="w-3.5 h-3.5 text-black/45 dark:text-white/45" strokeWidth={2} />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
              Outreach campaign
            </span>
          </div>
          <h3 className="text-[15px] font-semibold text-black dark:text-white leading-snug truncate">
            {campaign.name}
          </h3>
        </div>
        <StatusPill tone={meta.tone} label={meta.label} />
      </div>

      {/* Body per status */}
      <div className="px-5 pb-4">
        {campaign.status === 'drafting' && (
          <>
            <p className="text-[13px] text-black/55 dark:text-white/55 mb-2.5">
              Researching each person and writing individual drafts in your voice — {c.drafted} of {c.recipients} done.
            </p>
            <ProgressBar pct={draftPct} live />
          </>
        )}

        {campaign.status === 'review' && (
          <p className="text-[13px] text-black/55 dark:text-white/55">
            <span className="font-medium text-black/80 dark:text-white/80">{c.drafted} drafts ready.</span>{' '}
            Nothing sends until you review and approve — spot-check a few, edit or exclude any, then approve the whole campaign.
          </p>
        )}

        {campaign.status === 'sending' && (
          <>
            <p className="text-[13px] text-black/55 dark:text-white/55 mb-2.5">
              <span className="font-medium text-black/80 dark:text-white/80 tabular-nums">{c.sent}/{c.recipients} sent</span>
              {c.replied > 0 && <> · <span className="font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">{c.replied} replied</span></>}
              {' '}· paced at up to {campaign.effectiveCapToday ?? campaign.dailyCap}/day
            </p>
            <ProgressBar pct={sentPct} />
          </>
        )}

        {campaign.status === 'paused' && (
          <p className="text-[13px] text-black/55 dark:text-white/55">
            Paused at <span className="tabular-nums">{c.sent}/{c.recipients}</span> sent. Queued emails were cancelled — resume anytime from the command center.
          </p>
        )}

        {campaign.status === 'completed' && (
          <p className="text-[13px] text-black/55 dark:text-white/55">
            Done — <span className="tabular-nums font-medium text-black/80 dark:text-white/80">{c.sent} sent</span>
            {c.replied > 0 ? <>, <span className="font-medium text-emerald-700 dark:text-emerald-400">{c.replied} replied</span></> : ', replies tracked here as they land'}.
          </p>
        )}

        {campaign.status === 'cancelled' && (
          <p className="text-[13px] text-black/45 dark:text-white/45">Cancelled — nothing further will send.</p>
        )}

        {/* Deliverability advice — the one thing worth interrupting for */}
        {campaign.domainHealth?.advice && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={2} />
            <p className="text-[12px] leading-relaxed text-amber-800 dark:text-amber-200/90">{campaign.domainHealth.advice}</p>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <button
        type="button"
        onClick={open}
        className={cn(
          'w-full flex items-center justify-center gap-1.5 px-5 py-3 border-t text-[13px] font-semibold transition-colors',
          campaign.status === 'review'
            ? 'border-black/[0.06] dark:border-white/[0.08] bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90'
            : 'border-black/[0.05] dark:border-white/[0.06] text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
        )}
      >
        {campaign.status === 'review' ? 'Review & approve' : 'Open command center'}
        <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.25} />
      </button>
    </div>
  );
}

function StatusPill({ tone, label }: { tone: string; label: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0',
      tone === 'working' && 'bg-black/[0.05] dark:bg-white/[0.07] text-black/60 dark:text-white/60',
      tone === 'ready' && 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
      tone === 'live' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      tone === 'done' && 'bg-black/[0.05] dark:bg-white/[0.07] text-black/55 dark:text-white/55',
      tone === 'warn' && 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
      tone === 'muted' && 'bg-black/[0.04] dark:bg-white/[0.05] text-black/40 dark:text-white/40',
    )}>
      {tone === 'working' && <Loader2 className="w-3 h-3 animate-spin" />}
      {tone === 'ready' && <Mail className="w-3 h-3" />}
      {tone === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
      {tone === 'done' && <CheckCircle2 className="w-3 h-3" />}
      {tone === 'warn' && <PauseCircle className="w-3 h-3" />}
      {label}
    </span>
  );
}

function ProgressBar({ pct, live }: { pct: number; live?: boolean }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
      <motion.div
        className={cn('h-full rounded-full', live ? 'bg-black/50 dark:bg-white/50' : 'bg-black/70 dark:bg-white/70')}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
