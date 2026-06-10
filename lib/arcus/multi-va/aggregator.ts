import { callLLM, getText } from '../engine';
import { summarizeToolUse } from '../tool-labels';
import type { ArcusVA } from '../tool-integration-map';
import type {
  ArtifactBuckets,
  CommitteeReport,
  VARunResult,
} from './types';

const VA_LABELS: Record<ArcusVA, string> = {
  inbox: 'Inbox',
  calendar: 'Calendar',
  crm: 'CRM',
  comms: 'Comms',
  research: 'Research',
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

// "Next Actions" — what the user should do now, in priority order, each a
// clickable artifact link: "→ Review the draft to Priya: <link>". Replaces the
// old grouped "All Links" dump so the user gets directed actions, not a
// reference list. Priority: drafts to review/send first, then meetings to
// confirm, then logged records, then Slack.
function nextActionsSection(artifacts: ArtifactBuckets, perVALinks: Array<{ va: ArcusVA; links: string }>): string {
  const actions: string[] = [];

  for (const item of artifacts.gmail ?? []) actions.push(`→ Review & send: [${item.label}](${item.url})`);
  for (const item of artifacts.calendar ?? []) actions.push(`→ Confirm meeting: [${item.label}](${item.url})`);
  for (const item of artifacts.notion ?? []) actions.push(`→ Check the log: [${item.label}](${item.url})`);
  for (const item of artifacts.slack ?? []) actions.push(`→ View message: [${item.label}](${item.url})`);

  // Per-VA freeform link blocks (raw markdown the VA emitted) — append as-is so
  // we never drop a link the structured buckets missed.
  const perVABlocks = perVALinks.filter(p => p.links.trim()).map(p => p.links.trim());

  if (!actions.length && !perVABlocks.length) {
    // Nothing to click, but the spec wants the section present with a clear
    // "you're done" signal rather than an empty/ambiguous gap.
    return ['## Next Actions', '', 'All done — nothing needs your action right now.', ''].join('\n');
  }

  const lines: string[] = ['## Next Actions', ''];
  lines.push(...actions);
  if (perVABlocks.length) {
    if (actions.length) lines.push('');
    lines.push(...perVABlocks);
  }
  lines.push('');
  return lines.join('\n');
}

// "Tools Used" — concise, humanized, per the report spec. Built from the tool
// names each VA captured from its own SSE stream (race-free, no DB read). Full
// per-tool input/output/duration lives in the expandable HomeFeed run card.
function toolsUsedSection(results: VARunResult[]): string {
  const calls: Array<{ tool_name: string; success: boolean }> = [];
  for (const r of results) {
    const failed = new Set(r.failedTools ?? []);
    for (const name of r.toolNames ?? []) {
      calls.push({ tool_name: name, success: !failed.has(name) });
    }
  }
  if (!calls.length) return '';
  const lines = summarizeToolUse(calls).map(t =>
    `- ${t.label}${t.count > 1 ? ` ×${t.count}` : ''}${!t.ok ? ' — failed' : ''}`,
  );
  return ['## Tools Used', '', ...lines, ''].join('\n');
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
  const concreteBullets: string[] = [];
  for (const [, sections] of parsed) {
    for (const key of ['needsAttention', 'revenue', 'client', 'operations', 'crossVA'] as const) {
      for (const item of sections[key]) {
        const t = item.trim();
        if (t.length < 12) continue;
        if (/^(none|nothing|n\/a|tbd|empty)/i.test(t)) continue;
        concreteBullets.push(t.slice(0, 200));
      }
    }
  }

  if (concreteBullets.length === 0) return '';

  const topBullets = concreteBullets.slice(0, 6);
  try {
    const res = await callLLM(
      [
        {
          role: 'system',
          content:
            'You write ONE opening sentence for an executive briefing. The reader is the founder; they only have 5 seconds before scrolling. ' +
            'Input: the actual items the agent surfaced this run, as bullet text. ' +
            'Output: a single past-tense first-person sentence (≤220 chars) that NAMES the 1-2 most specific real items — recipients, companies, topics, dollar amounts. ' +
            'RULES:\n' +
            '- Never read out raw counts ("logged 1 revenue, 1 client") — those sound like mock data. Always name the actual thing.\n' +
            '- Never invent specifics not in the input.\n' +
            '- No filler ("successfully", "pleased to", "I have processed"). No emojis. No closing question.\n' +
            '- Start with a past-tense verb ("Surfaced", "Drafted", "Flagged", "Logged", "Caught").\n' +
            '- End with a period.\n\n' +
            'GOOD: "Surfaced Priya\'s SOW redlines for sign-off and flagged the stalled Acme thread."\n' +
            'BAD: "I logged revenue 1, secured 1 client, completed 1 ops task, flagged 1 need-attention item."',
        },
        {
          role: 'user',
          content: `Agent: ${agentName}\n\nReal items this run:\n${topBullets.map(b => `- ${b}`).join('\n')}\n\nWrite the opening sentence.`,
        },
      ],
      [],
      { maxTokens: 120, temperature: 0.2 },
    );
    const raw = getText(res.content).trim();
    const oneLine = raw.split(/\n+/)[0].replace(/^[-*•]\s*/, '').trim();
    if (
      oneLine.length >= 20
      && oneLine.length <= 280
      && !/\b(revenue|client|ops|operations|needs[- ]attention)\s+\d+/i.test(oneLine)
      && !/\bexecuted\s+\d+\s+\w+\s+tool\s+calls?/i.test(oneLine)
    ) {
      return oneLine;
    }
  } catch { /* fall through */ }

  const top = topBullets[0]?.split(/[.!?]/)[0]?.trim().slice(0, 180);
  return top ? `Surfaced: ${top}.` : '';
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

  const contentSections = [
    mergedSection('Revenue & Opportunities', collect('revenue')),
    mergedSection('Client & Relationship Updates', collect('client')),
    mergedSection('Operations', collect('operations')),
    mergedSection('Needs Your Attention', collect('needsAttention')),
    mergedSection('Cross-VA Observations', collect('crossVA')),
  ].filter(Boolean);

  // Fallback — the VAs ran but emitted no parseable section content (weak models
  // skip the required tagged format, or do work without writing it up). Rather
  // than ship a bare "Run details" footer with zero transparency, synthesize a
  // "What each agent did" section from each VA's own one-line summary and the
  // concrete tool count. This guarantees the report always says what happened.
  const fallbackWhatHappened = (): string => {
    const lines: string[] = [];
    for (const r of ordered) {
      const did = r.toolCalls > 0;
      const summary = (r.summary || '').trim();
      const usefulSummary =
        summary &&
        !/^no work in your lane/i.test(summary) &&
        !new RegExp(`^${r.va} VA`, 'i').test(summary) &&
        summary.length >= 12;
      if (usefulSummary) {
        lines.push(`- **${VA_LABELS[r.va]}** — ${summary}`);
      } else if (did) {
        lines.push(`- **${VA_LABELS[r.va]}** — completed ${r.toolCalls} ${r.toolCalls === 1 ? 'action' : 'actions'} (details in the linked artifacts).`);
      }
      // VAs with no work and no summary are simply omitted (kept out of noise).
    }
    if (!lines.length) return '';
    return ['## What Happened', '', ...lines, ''].join('\n');
  };

  const sections: string[] = [
    headline,
    '',
    `# ${agentName} — Executive Briefing`,
    '',
    ...(contentSections.length > 0 ? contentSections : [fallbackWhatHappened()]),
    toolsUsedSection(ordered),
    nextActionsSection(artifactLinks, ordered.map(r => ({ va: r.va, links: parsed.get(r.va)?.links ?? '' }))),
    '',
    '---',
    '',
    runFooter(ordered),
    '',
    `Sent by Arcus · ${agentName} · ${new Date().toUTCString()}`,
  ].filter(Boolean);

  return {
    report: sections.join('\n'),
    toolCalls: totalToolCalls,
    artifactLinks,
    vaResults: ordered,
    modeUsed: 'committee',
  };
}
