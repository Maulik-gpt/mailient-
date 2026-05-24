/**
 * Shared agent execution — runs a single Arcus background agent's task
 * through the agentic loop and returns the final report text.
 *
 * Used by:
 *   - GET  /api/cron/run-agents        (scheduled runs)
 *   - POST /api/arcus/agents/run       ("Run now" from the agent card)
 */

import { runAgentLoop } from './loop';
import { buildSystemPrompt, getConnectedIntegrations } from './system-prompt';
import { searchMemories, saveMemory } from './memory';

/**
 * Fetch the user's stored voice profile as a system-prompt block, so background
 * agents draft email in the user's actual voice. Mirrors getVoiceContext() from
 * app/api/arcus/chat/route.ts but trimmed for the background case: we don't
 * bootstrap-from-sent-mail here (the chat path does that on first interactive
 * use; if it has never been built, we fall back to the legacy persona prompt
 * rules instead of stalling a cron run on a 22-second Gmail analysis).
 */
async function getVoiceProfilePromptBlock(userId: string): Promise<string> {
  try {
    // @ts-ignore — JS module, no .d.ts
    const { voiceProfileService } = await import('../voice-profile-service.js');
    const profile: any = await voiceProfileService.getVoiceProfile(userId);
    if (!profile || profile.status === 'default') return '';
    const prompt = voiceProfileService.generateVoicePrompt(profile);
    return typeof prompt === 'string' ? prompt.trim() : '';
  } catch {
    return '';
  }
}

export const REPORT_FORMAT_SUFFIX = `

---
REPORT REQUIREMENTS — MANDATORY STRUCTURE

CRITICAL INSTRUCTION: You must output ONLY the final markdown report. DO NOT output any internal thought processes, reasoning, conversational filler, or anything else before or after the report. If you output anything other than the exact report structure, you have failed.
CRITICAL INSTRUCTION 2: EVEN IF THERE IS NO WORK TO DO (e.g., 0 emails processed), YOU MUST STILL OUTPUT THE FULL STRUCTURE BELOW. Do not abbreviate or skip the report structure.

**FIRST LINE** (required, no heading): One-line outcome summary. Example: "Processed 12 emails, drafted 6 replies, booked 2 meetings." The user reads this in one second and knows what happened.

**FULL STRUCTURE** — use exactly this order:

Good [Morning/Afternoon/Evening]! Here is your report.

# [Agent Name] — Run Report

## Summary
A table of key metrics. At minimum: actions taken, emails processed, items skipped, items needing attention. Even if all values are 0, you MUST include this table.
| Metric | Value |
|--------|-------|

## What I Did
Table or structured list of every action taken. For each: what it was, who it involved, what the outcome was, and a direct link where applicable. If 0 actions were taken, explicitly write "No actions were required during this run." If skip_confirmations was FALSE, write "would have" — describe every proposed action in full detail.

## Needs Your Attention
Every failure, every skipped item, every ambiguous email the agent could not resolve. If a tool failed, name the exact error. If nothing failed or no items were processed, write: "None — everything completed successfully."

## Links
Direct links to every Gmail draft, Google Calendar event, Notion page, and Slack message from this run. If no links were generated, write "No links for this run."
- If skip_confirmations was FALSE: "No links — this was a proposal run. Enable skip_confirmations to take these actions."

---
*Run by Arcus · mailient.xyz · [insert current UTC timestamp]*

**TONE RULES:**
- skip_confirmations FALSE → Write as a DETAILED PROPOSAL. Every sentence uses "would have". Preview every email draft in full. List every meeting that would have been booked with proposed time and attendees. The user must be able to read this report and immediately decide to flip skip_confirmations on.
- skip_confirmations TRUE → Write as a CONFIRMED WORK LOG. Every sentence uses past tense. Every action confirmed. Every link included. No hedging.

**FORMAT RULES:** Rich markdown always. Tables for 3+ items. **Bold** for names, email subjects, key numbers. No emojis anywhere. Never deliver a plain paragraph as a report. Never wrap in a code block.`;

export interface AgentRunBudget {
  /** Hard cap on tool calls (default: loop default of 20). */
  maxToolCalls?: number;
  /** Wall-clock budget in ms before the loop forces a final report. */
  deadlineMs?: number;
}

/**
 * Build the runAgentLoop arguments for a background agent. Shared by the
 * streaming "Run now" route and the synchronous cron runner so both produce
 * identical agent behaviour.
 */
export async function buildAgentLoopArgs(
  agent: { user_id: string; task_description: string; skip_confirmations?: boolean; name?: string },
  budget: AgentRunBudget = {},
) {
  const userId = agent.user_id;
  const taskDescription = agent.task_description;
  const agentName = agent.name || '';

  // FIX 2: Two parallel memory searches —
  //   1. Self-history: what this agent did in previous runs
  //   2. Topic context: relationship/preference context relevant to this task
  const [connectedIntegrations, [selfHistory, topicContext], voicePrompt] = await Promise.all([
    getConnectedIntegrations(userId),
    Promise.all([
      searchMemories(userId, `[AGENT_RUN] ${agentName || taskDescription.slice(0, 80)}`, 3),
      searchMemories(userId, taskDescription, 4),
    ]),
    getVoiceProfilePromptBlock(userId),
  ]);

  // Merge both memory sets, deduplicating identical lines
  const memoryLines = new Set([
    ...selfHistory.split('\n').filter(Boolean),
    ...topicContext.split('\n').filter(Boolean),
  ]);
  const memories = [...memoryLines].join('\n');

  const systemPrompt = buildSystemPrompt({
    userName: 'User',
    userId,
    connectedIntegrations,
    memories,
    personality: voicePrompt || undefined,
    isBackgroundAgent: true,
    skipConfirmations: agent.skip_confirmations ?? false,
    agentTaskDescription: taskDescription,
  });

  return {
    userId,
    systemPrompt,
    history: [] as Array<{ role: 'user' | 'assistant'; content: string }>,
    userMessage: taskDescription + REPORT_FORMAT_SUFFIX,
    connectedIntegrations,
    maxToolCalls: budget.maxToolCalls,
    deadlineMs: budget.deadlineMs,
  };
}

export async function runAgentTask(
  agent: { user_id: string; task_description: string; name?: string },
  budget: AgentRunBudget = {},
): Promise<string> {
  const args = await buildAgentLoopArgs(agent, budget);
  const stream = runAgentLoop(args);

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalText = '';
  let currentEventType = '';

  let canvasMarkdown = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event: ')) { currentEventType = line.slice(7).trim(); continue; }

      if (line.startsWith('data: ') && currentEventType === 'message') {
        try {
          const data = JSON.parse(line.slice(6).trim());
          if (data.content) finalText = data.content;
        } catch { /* ok */ }
        currentEventType = '';
      }

      if (line.startsWith('data: ') && currentEventType === 'canvas') {
        try {
          const data = JSON.parse(line.slice(6).trim());
          // Capture the full report markdown; skip scheduled_agent canvas events
          if (data.markdown && data.type !== 'scheduled_agent') {
            canvasMarkdown = data.markdown;
          }
        } catch { /* ok */ }
        currentEventType = '';
      }
    }
  }

  const report = canvasMarkdown || finalText || 'Agent completed but produced no report.';

  // FIX 2: Save structured end-of-run memory so future runs can query history
  const agentName = agent.name || agent.task_description.slice(0, 60);
  const runRecord = [
    `[AGENT_RUN] Agent: "${agentName}"`,
    `Ran: ${new Date().toISOString()}`,
    `Task: ${agent.task_description.slice(0, 200)}`,
    `Report summary: ${report.replace(/\s+/g, ' ').slice(0, 350)}`,
  ].join(' | ');

  // Fire-and-forget — never block the cron run on memory write
  saveMemory(agent.user_id, runRecord, ['agent_run', 'background']).catch(() => {});

  return report;
}
