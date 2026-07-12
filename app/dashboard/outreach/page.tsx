'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Mail, RefreshCw, Send, ShieldCheck, Users } from 'lucide-react';
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';

type Campaign = {
  id: string; name: string; status: string; dailyCap: number; effectiveCapToday: number;
  counts: { recipients: number; drafted: number; sent: number; replied: number; meeting: number; failed: number };
  domainHealth?: { advice?: string | null } | null; lastError?: string | null; createdAt: string;
};

const statusClass: Record<string, string> = {
  drafting: 'bg-blue-500/15 text-blue-700 dark:text-blue-300', review: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  sending: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', paused: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300',
  completed: 'bg-violet-500/15 text-violet-700 dark:text-violet-300', cancelled: 'bg-red-500/15 text-red-700 dark:text-red-300',
};

export default function OutreachPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/arcus/campaigns', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load campaigns.');
      setCampaigns(data.campaigns || []); setError(null);
    } catch (e: any) { setError(e.message || 'Could not load campaigns.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const totals = campaigns.reduce((all, c) => ({ sent: all.sent + c.counts.sent, replied: all.replied + c.counts.replied, meetings: all.meetings + c.counts.meeting }), { sent: 0, replied: 0, meetings: 0 });
  return <div className="min-h-screen bg-[#fafafa] text-zinc-950 dark:bg-[#09090b] dark:text-zinc-50">
    <HomeFeedSidebar />
    <main className="mx-auto max-w-6xl px-6 py-10 md:ml-[260px] md:px-10">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-sm font-medium text-zinc-500">Arcus Outreach</p><h1 className="text-3xl font-semibold tracking-tight">Your outbound motion</h1><p className="mt-2 max-w-xl text-zinc-500">Every recipient is researched, written to individually, and held for your approval.</p></div>
        <div className="flex gap-2"><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"><RefreshCw className="h-4 w-4" />Refresh</button><Link href="/dashboard/agent-talk" className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"><Send className="h-4 w-4" />Create in Arcus</Link></div>
      </div>
      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        {[['Sent', totals.sent, Mail], ['Replies', totals.replied, Users], ['Meetings', totals.meetings, ShieldCheck]].map(([label, value, Icon]: any) => <div key={label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><Icon className="mb-5 h-5 w-5 text-zinc-500" /><p className="text-3xl font-semibold">{value}</p><p className="mt-1 text-sm text-zinc-500">{label} across campaigns</p></div>)}
      </section>
      {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800"><h2 className="font-semibold">Campaigns</h2></div>
        {loading ? <div className="p-10 text-center text-sm text-zinc-500">Loading campaigns…</div> : campaigns.length === 0 ? <div className="p-12 text-center"><Send className="mx-auto mb-4 h-8 w-8 text-zinc-400" /><p className="font-medium">No campaigns yet</p><p className="mt-1 text-sm text-zinc-500">Ask Arcus to create one from a pasted list, CSV, or Notion database.</p></div> : <div className="divide-y divide-zinc-100 dark:divide-zinc-800">{campaigns.map(c => <Link key={c.id} href={`/dashboard/outreach/${c.id}`} className="block px-6 py-5 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-3"><h3 className="font-medium">{c.name}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[c.status] || statusClass.paused}`}>{c.status}</span></div><p className="mt-2 text-sm text-zinc-500">{c.counts.recipients} recipients · {c.counts.drafted} drafted · {c.counts.sent} sent · {c.counts.replied} replies{c.domainHealth?.advice ? ' · attention needed' : ''}</p></div><ArrowRight className="h-5 w-5 text-zinc-400" /></div></Link>)}</div>}
      </section>
    </main>
  </div>;
}
