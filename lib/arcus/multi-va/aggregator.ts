/**
 * Committee-report aggregator — PART 48.
 *
 * Takes the per-VA results from runVA() × N and produces ONE cohesive
 * markdown briefing the cron runner ships via email + Slack. The structure
 * mirrors the existing single-LLM report so delivery + the agent_runs UI
 * keep working unchanged:
 *
 *   <opening line — what got done across the whole committee>
 *
 *   # <Agent Name> — Committee Briefing
 *
 *   ## 📧 Inbox VA   (success · 12 tool calls · 4.3s)
 *   <VA body>
 *
 *   ## 📅 Calendar VA   (success · 5 tool calls · 2.1s)
 *   <VA body>
 *
 *   ... etc per VA ...
 *
 *   ## ⚠️ Needs Your Attention
 *   <only if any VA flagged something OR a VA failed>
 *
 *   ## 🔗 All Links
 *   <merged across all VAs, per bucket>
 *
 *   Sent by Arcus · <agent name> · <run time>
 *
 * The cross-VA "opening line" is the only synthesis step that touches the
 * LLM here — a tiny call that turns the per-VA summaries into a single
 * "Processed 31 emails, drafted 8 replies, booked 2 meetings, logged 5
 * contacts to Notion" headline. Cached behind a feature flag; falls back
 * to a deterministic concatenation when the LLM is unavailable.
 */

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

// Order VAs deterministically in the final briefing — matches the system
// prompt's enumeration so users see the same ordering across runs.
const VA_ORDER: ArcusVA[] = ['inbox', 'calendar', 'crm', 'comms', 'research'];

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
    case 'success': return 'success';
    case 'empty':   return 'no work needed';
    case 'timeout': return '⏱ timed out';
    case 'error':   return '⚠ failed';
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function vaSection(r: VARunResult): string {
  const meta = `*${statusBadge(r)} · ${r.toolCalls} tool ${r.toolCalls === 1 ? 'call' : 'calls'} · ${formatDuration(r.durationMs)}*`;
  if (r.status === 'error') {
    return [`## ${VA_LABELS[r.va]}`, meta, '', `> ${r.error || 'No error message returned.'}`, ''].join('\n');
  }
  if (r.status === 'timeout') {
    return [`## ${VA_LABELS[r.va]}`, meta, '', '> Hit the per-VA time budget before completing — partial work above (if any).', ''].join('\n');
  }
  if (r.status === 'empty') {
    return [`## ${VA_LABELS[r.va]}`, meta, '', `_${r.summary}_`, ''].join('\n');
  }
  return [`## ${VA_LABELS[r.va]}`, meta, '', r.body.trim(), ''].join('\n');
}

function linksSection(artifacts: ArtifactBuckets): string {
  const buckets: Array<[string, ArtifactBuckets[keyof ArtifactBuckets]]> = [
    ['📧 Gmail', artifacts.gmail],
    ['📅 Calendar', artifacts.calendar],
    ['📝 Notion', artifacts.notion],
    ['💬 Slack', artifacts.slack],
  ];
  const lines: string[] = [];
  for (const [label, list] of buckets) {
    if (!list?.length) continue;
    lines.push(`**${label}**`);
    for (const item of list) lines.push(`- [${item.label}](${item.url})`);
    lines.push('');
  }
  if (lines.length === 0) return '';
  return ['## 🔗 All Links', '', ...lines].join('\n');
}

function needsAttentionSection(results: VARunResult[]): string {
  const items: string[] = [];
  for (const r of results) {
    if (r.status === 'error') {
      items.push(`- **${VA_LABELS[r.va]} failed.** ${r.error || 'No error message returned.'}`);
    } else if (r.status === 'timeout') {
      items.push(`- **${VA_LABELS[r.va]} timed out.** Re-running on next scheduled tick should pick up where it stopped.`);
    }
  }
  if (items.length === 0) return '';
  return ['## ⚠️ Needs Your Attention', '', ...items, ''].join('\n');
}

/**
 * Tiny LLM call: turn the per-VA summaries into one cohesive opening
 * sentence the user reads at the top of the briefing. Falls back to a
 * deterministic concatenation if the LLM is unavailable / times out.
 *
 * 1 LLM call per run is acceptable cost — the entire reason we ran 5 VAs
 * in parallel is to give the chief of staff a coordinated cross-domain
 * view. Concatenating summaries with bullets would defeat that purpose.
 */
async function synthesizeOpeningLine(results: VARunResult[], agentName: string): Promise<string> {
  const lines = results.map(r => `- ${VA_LABELS[r.va]} (${statusBadge(r)}, ${r.toolCalls} tool calls): ${r.summary}`).join('\n');
  const successful = results.filter(r => r.status === 'success').length;
  if (successful === 0) {
    // No useful work to synthesize — return a deterministic line.
    return `${agentName}: ${results.length} VA${results.length === 1 ? '' : 's'} ran, none produced actionable output this turn.`;
  }
  try {
    const res = await callLLM(
      [
        {
          role: 'system',
          content:
            'You write ONE concrete opening sentence for an executive briefing. ' +
            'Input is a list of per-VA summaries from a parallel committee run. ' +
            'Output: a single sentence (max 220 chars) naming the top-line outcome — counts, key actions, key blockers — in past tense, first person ("I").  ' +
            'Skip filler ("Successfully", "I am pleased to"). No emojis. No closing question. End with a period.',
        },
        { role: 'user', content: `Agent: ${agentName}\n\nPer-VA summaries:\n${lines}\n\nWrite the opening sentence.` },
      ],
      [],
      { maxTokens: 120, temperature: 0.2 },
    );
    const raw = getText(res.content).trim();
    const oneLine = raw.split(/\n+/)[0].replace(/^[-*•]\s*/, '').trim();
    if (oneLine.length >= 12 && oneLine.length <= 280) return oneLine;
  } catch { /* fall through to deterministic line */ }
  return `${agentName} committee: ${successful} of ${results.length} VAs reported actionable work this run.`;
}

export async function buildCommitteeReport(
  results: VARunResult[],
  agent: { name?: string },
): Promise<CommitteeReport> {
  // Order results deterministically + drop VAs we didn't actually run.
  const ordered = VA_ORDER
    .map(va => results.find(r => r.va === va))
    .filter((r): r is VARunResult => r !== undefined);

  const totalToolCalls = ordered.reduce((sum, r) => sum + r.toolCalls, 0);
  const artifactLinks = mergeArtifacts(ordered);
  const agentName = agent.name || 'Arcus';

  const opening = await synthesizeOpeningLine(ordered, agentName);
  const vaSections = ordered.map(vaSection).join('\n');
  const attention = needsAttentionSection(ordered);
  const links = linksSection(artifactLinks);

  const report = [
    opening,
    '',
    `# ${agentName} — Committee Briefing`,
    '',
    vaSections,
    attention,
    links,
    '---',
    `_Sent by Arcus · ${agentName} · ${new Date().toUTCString()}_`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    report,
    toolCalls: totalToolCalls,
    artifactLinks,
    vaResults: ordered,
    modeUsed: 'committee',
  };
}
