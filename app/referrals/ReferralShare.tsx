'use client';

import { useState, useCallback } from 'react';
import { Check, Copy, Share2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Stats {
  code: string | null;
  link: string | null;
  invited: number;
  converted: number;
  monthsEarned: number;
  freeUntil: string | null;
  pending: number;
}

/**
 * The message people actually send. Written in the FIRST PERSON as the sharer,
 * not as the brand — a link that arrives sounding like an ad gets ignored, one
 * that sounds like your friend gets opened. It also leads with the gift, so the
 * sender isn't asking for a favour.
 */
function shareMessage(link: string) {
  return `I've been using Mailient — it runs my inbox and leaves me one briefing every morning instead of 200 emails. Here's a free month if you want to try it: ${link}`;
}

export default function ReferralShare({ stats, firstName }: { stats: Stats; firstName: string | null }) {
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);
  const link = stats.link || '';
  const message = shareMessage(link);

  const copy = useCallback(async (text: string, which: 'link' | 'message') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard is blocked in some in-app browsers. Select the text instead of
      // failing silently — a dead copy button reads as a broken page.
      const el = document.getElementById('ref-link-input') as HTMLInputElement | null;
      el?.select();
    }
  }, []);

  // Native share sheet is the single highest-conversion path on mobile: it opens
  // the user's real contacts in their real messaging app. Desktop has no
  // equivalent, so we fall back to explicit channels.
  const nativeShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: 'Mailient', text: message, url: link });
        return;
      } catch { /* user dismissed — not an error */ }
    }
    copy(message, 'message');
  }, [message, link, copy]);

  const channels = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(message)}` },
    { label: 'Email', href: `mailto:?subject=${encodeURIComponent('A free month of Mailient')}&body=${encodeURIComponent(message)}` },
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}` },
  ];

  const freeUntilLabel = stats.freeUntil
    ? new Date(stats.freeUntil).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      {/* Ambient wash — one soft light source, no decoration for its own sake. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-white/[0.035] blur-[160px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-2xl px-5 py-14 sm:py-20">
        <Link href="/home-feed" className="inline-flex items-center gap-2 text-[13px] text-neutral-500 hover:text-neutral-300 transition-colors mb-10">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>

        {/* The offer, framed as a gift. */}
        <h1 className="text-[34px] sm:text-[44px] font-medium tracking-[-0.03em] leading-[1.08] bg-gradient-to-b from-white via-white to-neutral-500 bg-clip-text text-transparent">
          Give a friend<br />a free month.
        </h1>
        <p className="mt-4 text-[15px] sm:text-base leading-relaxed text-neutral-400 max-w-lg">
          {firstName ? `${firstName}, anyone ` : 'Anyone '}you invite gets a full month of Mailient free — not a 3-day trial.
          When they stay on, you get a free month too.
        </p>

        {/* No code means the referral tables are missing or the insert failed.
            Showing an empty input with a Copy button would look like the page
            works and hand out a blank link — say what's true instead. */}
        {!link && (
          <div className="mt-9 rounded-2xl border border-white/[0.10] bg-white/[0.03] p-5">
            <p className="text-[14px] text-neutral-200 font-medium">Your invite link isn&apos;t ready yet.</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-400">
              We couldn&apos;t generate your code just now. Refresh in a moment — if it keeps happening, reply to any
              Mailient email and we&apos;ll sort it out.
            </p>
          </div>
        )}

        {/* Link + primary share. Everything above the fold is one action. */}
        <div className={cn('mt-9 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm', !link && 'hidden')}>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="ref-link-input"
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 rounded-xl bg-black/40 border border-white/[0.08] px-4 py-3 text-[13.5px] text-neutral-200 font-mono tracking-tight outline-none focus:border-white/20"
            />
            <button
              onClick={() => copy(link, 'link')}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[13.5px] font-semibold text-black hover:bg-neutral-200 transition-colors"
            >
              {copied === 'link' ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy link</>}
            </button>
          </div>

          <button
            onClick={nativeShare}
            className="mt-2.5 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.04] px-5 py-3 text-[13.5px] font-medium text-white hover:bg-white/[0.08] transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share with a friend
          </button>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {channels.map(c => (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-center text-[12.5px] text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                {c.label}
              </a>
            ))}
          </div>
        </div>

        {/* The exact words that get sent — visible, and editable by copying. */}
        <div className={cn('mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5', !link && 'hidden')}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">What they&apos;ll receive</span>
            <button onClick={() => copy(message, 'message')} className="text-[12px] text-neutral-400 hover:text-white transition-colors">
              {copied === 'message' ? 'Copied' : 'Copy message'}
            </button>
          </div>
          <p className="text-[13.5px] leading-relaxed text-neutral-300">{message}</p>
        </div>

        {/* Progress. Pending is shown deliberately: "2 friends signed up" is the
            proof that sharing worked, even before anyone converts. */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          <Stat label="Invited" value={stats.invited} />
          <Stat label="Joined" value={stats.pending} />
          <Stat label="Months earned" value={stats.monthsEarned} highlight />
        </div>

        {freeUntilLabel && (
          <p className="mt-4 text-[13px] text-neutral-400">
            Your free Pro runs through <span className="text-white font-medium">{freeUntilLabel}</span>.
          </p>
        )}

        <p className="mt-10 text-[12px] leading-relaxed text-neutral-600">
          Your friend&apos;s free month starts when they sign up. Your month is added once they become a paying
          customer — so there&apos;s nothing to claim and nothing to chase.
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={cn(
      'rounded-xl border px-4 py-4 text-center',
      highlight ? 'border-white/[0.14] bg-white/[0.06]' : 'border-white/[0.06] bg-white/[0.02]'
    )}>
      <div className={cn('text-[26px] font-medium tracking-tight', highlight ? 'text-white' : 'text-neutral-300')}>{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-neutral-500">{label}</div>
    </div>
  );
}
