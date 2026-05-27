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

CRITICAL: Output ONLY the final markdown report. No internal reasoning, no conversational filler before or after. The report IS your entire output.
CRITICAL: Even if 0 actions were taken, produce the full structure. Do not abbreviate.

**SECTION 1 — ONE-LINE SUMMARY (first line, no heading)**
The very first line of the report is a single sentence that tells the user everything in 3 seconds:
- "Processed 23 emails, drafted 6 replies, archived 12, flagged 5 for review."
- "Booked 3 meetings, sent 3 confirmation emails, updated 3 Notion pages."
- "Scanned inbox, found 0 unanswered client emails, nothing needed."
This line is used as the email subject and the Slack header. The user knows the outcome before reading anything else.

**FULL STRUCTURE — use exactly this order:**

[One-line summary]

# [Agent Name] — Run Report

## What I Did
Use a **table** when 4+ actions were taken:
| Action | Details | Link |
|--------|---------|------|
| Drafted reply | To: Priya Sharma, Re: Q3 proposal | [Open draft](link) |
| Booked meeting | Tuesday 3pm with Priya | [View event](link) |

Use a **bullet list** when 2–3 actions:
- **Drafted reply** — To: Priya Sharma, Re: Q3 proposal — [Open draft](link)
- **Booked meeting** — Tuesday 3pm with Priya — [View event](link)

If 0 actions: "No actions were required during this run."
If skip_confirmations is FALSE: write "would have" framing — "Would have drafted a reply to Priya about Q3 pricing."

## Needs Your Attention
ONLY include this section if something could not be completed, required a decision, or hit an error. Examples:
- "Priya's email mentioned a pricing question I couldn't answer from context. Review the draft before sending."
- "Couldn't find a free calendar slot for James this week. The draft suggests a call but leaves the time unspecified."
- "Tried to create a Notion page but the CRM database schema has changed. Content saved as text below."
If nothing needs attention, **OMIT THIS SECTION ENTIRELY**. Do not write "Nothing needs your attention" as filler.

## Links
Direct links to every artifact created:
- 📧 Gmail drafts/threads
- 📅 Calendar events
- 📝 Notion pages
- 💬 Slack messages

If no links: "No links produced this run."
If skip_confirmations was FALSE: "No links — this was a proposal run. Enable skip_confirmations to execute."

---
Sent by Arcus for Mailient • mailient.xyz
Run completed: [current UTC timestamp]
Next run: [next scheduled run time, e.g. "Tomorrow at 8:00 AM" or "In 24 hours" — derive from agent schedule if known, otherwise omit this line]

**VOICE & TONE (NON-NEGOTIABLE):**
- First person from Arcus: "I drafted 6 replies" not "6 replies were drafted."
- Confident, not boastful: "Processed 23 emails" not "Successfully processed 23 emails." The word "successfully" is filler.
- Specific: "Drafted reply to Priya Sharma about Q3 pricing" not "Drafted email reply."
- Never apologize unless something genuinely failed. "I couldn't book the meeting because your calendar had no free slots" is fine. "I'm sorry I couldn't book the meeting" is unnecessary.
- NEVER say "I hope this helps" or "Let me know if you need anything else." The report is a work log, not a customer service email.
- Write as a CONFIRMED WORK LOG. Past tense. Every action noted. Every link included. If the tool told you an action was "queued for user approval", say "Queued reply to Priya" instead of "Sent reply to Priya".

**FORMAT RULES:**
- Rich markdown always. Tables for 4+ items, bullet lists for 2–3.
- **Bold** for names, email subjects, key numbers.
- Targeted emoji for section headers only (📧 📅 📝 ⚠️ ❌). Never overuse — one per item max.
- Never deliver a plain paragraph as a report. Never wrap in a code block.`;


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
  agent: { user_id: string; task_description: string; skip_confirmations?: boolean; name?: string; id?: string },
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
    isBackgroundAgent: true,
    skipConfirmations: agent.skip_confirmations ?? false,
    agentId: agent.id,
  };
}

export async function runAgentTask(
  agent: { user_id: string; task_description: string; name?: string; id?: string },
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
