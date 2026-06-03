import { callLLM, getText } from '../engine';
import type { ArcusVA } from '../tool-integration-map';
import type {
  ArtifactBuckets,
  CommitteeReport,
  VARunResult,
} from './types';

const VA_LABELS: Record<ArcusVA, string> = {
  inbox: '📧 Inbox VA',
  calendar: '📅 Calendar VA',
  crm: '📝 CRM VA',
  comms: '💬 Comms VA',
  research: '🔍 Research VA',
};

const VA_ORDER: ArcusVA[] = ['inbox', 'calendar', 'crm', 'comms', 'research'];

interface ParsedSections {
  revenue: string[];
  client: string[];
  operations: string[];
  needsAttention: string[];
  crossVA: string[];
  links: string;
  raw: string;
}

const SECTION_RE = /^##\s+(Revenue|Client|Operations|Needs Attention|Cross-VA|Links)\s*$/im;

function parseVASections(body: string): ParsedSections {
  const empty: ParsedSections = { revenue: [], client: [], operations: [], needsAttention: [], crossVA: [], links: '', raw: body };
  if (!body || !body.trim()) return empty;

  if (/^\s*No work in your lane this run\.\s*$/im.test(body)) return empty;

  const out: ParsedSections = { ...empty };
  const lines = body.split('\n');
  let currentKey: keyof Omit<ParsedSections, 'raw' | 'links'> | 'links' | null = null;
  let linksBuf: string[] = [];

  for (const rawLine of lines) {
    const m = rawLine.match(SECTION_RE);
    if (m) {
      const label = m[1].toLowerCase();
      if (label === 'revenue') currentKey = 'revenue';
      else if (label === 'client') currentKey = 'client';
      else if (label === 'operations') currentKey = 'operations';
      else if (label === 'needs attention') currentKey = 'needsAttention';
      else if (label === 'cross-va') currentKey = 'crossVA';
      else if (label === 'links') currentKey = 'links';
      continue;
    }
    if (!currentKey) continue;
    if (currentKey === 'links') {
      linksBuf.push(rawLine);
      continue;
    }
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
      const stripped = trimmed.replace(/^[-*•]\s*/, '').trim();
      if (looksLikeRealContent(stripped)) out[currentKey].push(stripped);
    } else if (out[currentKey].length > 0) {
      out[currentKey][out[currentKey].length - 1] += ' ' + trimmed;
    } else if (looksLikeRealContent(trimmed)) {
      out[currentKey].push(trimmed);
    }
  }
  out.links = linksBuf.join('\n').trim();
  return out;
}

function looksLikeRealContent(s: string): boolean {
  const t = s.trim();
  if (t.length < 6) return false;
  if (/^(none|nothing|n\/a|tbd|no (items|content|updates|activity|signal|results))\.?$/i.test(t)) return false;
  if (/^(no|nothing) .{0,40} (to report|found|noted|flagged|today|this run)\.?$/i.test(t)) return false;
  if (/^_?\(?(empty|placeholder|tbd)\)?_?$/i.test(t)) return false;
  return true;
}

function mergeArtifacts(results: VARunResult[]): ArtifactBuckets {
  const merged: ArtifactBuckets = {};
  for (const r of results) {
    for (const [k, arr] of Object.entries(r.artifacts) as Array<[keyof ArtifactBuckets, ArtifactBuckets[keyof ArtifactBuckets]]>) {
      if (!arr?.length) continue;
      const list = merged[k] ?? (merged[k] = []);
      list.push(...arr);
    }
  }
  return merged;
}

function statusBadge(r: VARunResult): string {
  switch (r.status) {
    case 'success': return 'ran';
    case 'empty':   return 'nothing in lane';
    case 'timeout': return 'timed out';
    case 'error':   return 'failed';
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function mergedSection(
  title: string,
  perVAItems: Array<{ va: ArcusVA; items: string[] }>,
): string {
  const lines: string[] = [];
  for (const { va, items } of perVAItems) {
    for (const item of items) {
      const cleaned = item.trim();
      if (!looksLikeRealContent(cleaned)) continue;
      lines.push(`- ${cleaned} _<small>via ${VA_LABELS[va]}</small>_`);
    }
  }
  if (lines.length === 0) return '';
  return [`## ${title}`, '', ...lines, ''].join('\n');
}

function linksSection(artifacts: ArtifactBuckets, perVALinks: Array<{ va: ArcusVA; links: string }>): string {
  const lines: string[] = ['## 🔗 All Links', ''];
  const buckets: Array<[string, ArtifactBuckets[keyof ArtifactBuckets]]> = [
    ['📧 Gmail', artifacts.gmail],
    ['📅 Calendar', artifacts.calendar],
    ['📝 Notion', artifacts.notion],
    ['💬 Slack', artifacts.slack],
  ];
  let hadAny = false;
  for (const [label, list] of buckets) {
    if (!list?.length) continue;
    hadAny = true;
    lines.push(`**${label}**`);
    for (const item of list) lines.push(`- [${item.label}](${item.url})`);
    lines.push('');
  }
  const perVABlocks = perVALinks
    .filter(p => p.links.trim())
    .map(p => `_From ${VA_LABELS[p.va]}:_\n${p.links}`);
  if (perVABlocks.length) {
    if (hadAny) lines.push('---', '');
    lines.push(...perVABlocks);
    hadAny = true;
  }
  return hadAny ? lines.join('\n') : '';
}

function runFooter(results: VARunResult[]): string {
  const lines: string[] = ['## Run details', ''];
  for (const va of VA_ORDER) {
    const r = results.find(x => x.va === va);
    if (!r) continue;
    lines.push(`- ${VA_LABELS[va]}: ${statusBadge(r)} · ${r.toolCalls} tool ${r.toolCalls === 1 ? 'call' : 'calls'} · ${formatDuration(r.durationMs)}${r.error ? ` · ${r.error}` : ''}`);
  }
  return lines.join('\n');
}

async function synthesizeHeadline(
  results: VARunResult[],
  agentName: string,
  parsed: Map<ArcusVA, ParsedSections>,
): Promise<string> {
  const totalRevenue = Array.from(parsed.values()).reduce((s, p) => s + p.revenue.length, 0);
  const totalClient = Array.from(parsed.values()).reduce((s, p) => s + p.client.length, 0);
  const totalOps = Array.from(parsed.values()).reduce((s, p) => s + p.operations.length, 0);
  const totalAttention = Array.from(parsed.values()).reduce((s, p) => s + p.needsAttention.length, 0);

  if (totalRevenue + totalClient + totalOps + totalAttention === 0) {
    return `${agentName}: quiet run — no actionable work surfaced across any lane.`;
  }

  const summaries = results.map(r => `- ${VA_LABELS[r.va]} (${statusBadge(r)}, ${r.toolCalls} calls): ${r.summary}`).join('\n');
  try {
    const res = await callLLM(
      [
        {
          role: 'system',
          content:
            'You write ONE opening sentence for an executive briefing. ' +
            'Input: per-VA summaries from a parallel committee run. ' +
            'Output: a single past-tense first-person sentence (≤220 chars) naming concrete outcomes — counts, key actions, key blockers. ' +
            'No filler ("successfully", "pleased to"). No emojis. No closing question. End with a period.',
        },
        {
          role: 'user',
          content: `Agent: ${agentName}\n\nTotals: revenue=${totalRevenue} client=${totalClient} ops=${totalOps} needs_attention=${totalAttention}\n\nPer-VA summaries:\n${summaries}\n\nWrite the opening sentence.`,
        },
      ],
      [],
      { maxTokens: 120, temperature: 0.2 },
    );
    const raw = getText(res.content).trim();
    const oneLine = raw.split(/\n+/)[0].replace(/^[-*•]\s*/, '').trim();
    if (oneLine.length >= 12 && oneLine.length <= 280) return oneLine;
  } catch { /* fall through */ }

  const successCount = results.filter(r => r.status === 'success').length;
  return `${agentName}: ${successCount} of ${results.length} VAs reported work this run. ${totalAttention > 0 ? `${totalAttention} item${totalAttention === 1 ? '' : 's'} need${totalAttention === 1 ? 's' : ''} your attention.` : 'Nothing flagged for your attention.'}`;
}

export async function buildCommitteeReport(
  results: VARunResult[],
  agent: { name?: string },
): Promise<CommitteeReport> {
  const ordered = VA_ORDER
    .map(va => results.find(r => r.va === va))
    .filter((r): r is VARunResult => r !== undefined);

  const parsed = new Map<ArcusVA, ParsedSections>();
  for (const r of ordered) parsed.set(r.va, parseVASections(r.body));

  const collect = (key: 'revenue' | 'client' | 'operations' | 'needsAttention' | 'crossVA') =>
    ordered.map(r => ({ va: r.va, items: parsed.get(r.va)?.[key] ?? [] }));

  const totalToolCalls = ordered.reduce((sum, r) => sum + r.toolCalls, 0);
  const artifactLinks = mergeArtifacts(ordered);
  const agentName = agent.name || 'Arcus';

  const headline = await synthesizeHeadline(ordered, agentName, parsed);

  const sections: string[] = [
    headline,
    '',
    `# ${agentName} — Executive Briefing`,
    '',
    mergedSection('💰 Revenue & Opportunities', collect('revenue')),
    mergedSection('🤝 Client & Relationship Updates', collect('client')),
    mergedSection('⚙️ Operations', collect('operations')),
    mergedSection('⚠️ Needs Your Attention', collect('needsAttention')),
    mergedSection('🔄 Cross-VA Observations', collect('crossVA')),
    linksSection(artifactLinks, ordered.map(r => ({ va: r.va, links: parsed.get(r.va)?.links ?? '' }))),
    '',
    '---',
    '',
    runFooter(ordered),
    '',
    `_Sent by Arcus · ${agentName} · ${new Date().toUTCString()}_`,
  ].filter(Boolean);

  return {
    report: sections.join('\n'),
    toolCalls: totalToolCalls,
    artifactLinks,
    vaResults: ordered,
    modeUsed: 'committee',
  };
}
