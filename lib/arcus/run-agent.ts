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
EXECUTIVE BRIEFING REQUIREMENTS — MANDATORY STRUCTURE

CRITICAL: Output ONLY the final markdown report. No internal reasoning, no conversational filler before or after. The report IS your entire output.
CRITICAL: Even if 0 actions were taken, produce the full structure. Do not abbreviate.

**OPENING LINE — mandatory first line, no heading:**
One sentence. Tells the user everything in 3 seconds. This becomes the email subject and the Slack header.
Examples:
- "Processed 31 emails, drafted 8 replies, booked 2 meetings, logged 5 contacts to Notion."
- "Scanned inbox and calendar — 3 revenue opportunities identified, 2 meetings booked, 14 newsletters archived."
- "No new client emails; calendar clear for tomorrow; nothing required."

**FULL EXECUTIVE BRIEFING STRUCTURE — use exactly this order:**

[One-line opening]

# [Agent Name] — Run Report

## 💰 Revenue & Opportunities
Only include if there are revenue signals (contracts, proposals, invoices, deals, renewals, pricing questions).
Use a table with: | Contact | Subject | Signal | Action Taken | Link |
If nothing found: omit this section entirely.

## 🤝 Client & Relationship Updates
Emails and actions involving existing clients or important relationships.
Table format: | Contact | Thread | Summary | Action Taken | Link |
If nothing found: omit this section entirely.

## ⚙️ Operations
Everything executed: drafts, meetings, Notion logs, Slack messages, labels applied, threads archived.
Table (4+ items) or bullet list (2–3 items):
| Action | Details | Link |
|--------|---------|------|
| Drafted reply | To: Priya Sharma, Re: Q3 proposal | [Open draft](url) |
| Booked meeting | Tuesday 3pm with James — Google Meet | [View event](url) |
If skip_confirmations is FALSE: write "Would have [action]" framing throughout.
If 0 actions: "No operations executed this run."

## ⚠️ Needs Your Attention
ONLY include if something could not be completed, requires a decision, or hit an error.
- "Priya's email mentions a pricing change I can't confirm from context — review the draft before sending."
- "Couldn't find a free slot for James this week. Draft written but time is unspecified."
- "Notion create failed — content saved as text in the Links section instead."
If nothing needs attention: **OMIT THIS SECTION ENTIRELY.**

## 🔗 All Links
Every artifact created this run:
- 📧 Gmail drafts — [Draft: Re: Q3 Proposal to Priya](url)
- 📅 Calendar events — [Meeting: Tuesday 3pm with James](url)
- 📝 Notion pages — [Contact log: Priya Sharma](url)
- 💬 Slack messages — [#client-updates: weekly briefing](url)
If no links: "No artifacts created this run."
If skip_confirmations was FALSE: "No artifacts — proposal run only. Enable skip_confirmations to execute."

---
Sent by Arcus for Mailient • mailient.xyz
Run completed: [INSERT_CURRENT_UTC_TIMESTAMP]
Next run: [derive from agent's cron schedule — e.g. "Tomorrow at 9:00 AM" or "Monday at 8:00 AM". If schedule unknown, omit this line.]

**VOICE & TONE (NON-NEGOTIABLE):**
- First person from Arcus: "I drafted 6 replies" not "6 replies were drafted."
- Confident and direct: "Processed 23 emails" not "Successfully processed 23 emails." The word "successfully" is filler. So is "pleased to" and "happy to."
- Specific always: "Drafted reply to Priya Sharma about Q3 pricing" not "Drafted email reply."
- Never apologize unless something genuinely failed. "I couldn't book the meeting because your calendar had no free slots" is honest. "I'm sorry I couldn't book the meeting" is unnecessary.
- NEVER say "I hope this helps" or "Let me know if you need anything else." This is a work log, not customer service.
- NEVER start a section with "In summary," "To summarize," "In conclusion," or any filler phrase.
- Write as a CONFIRMED WORK LOG. Past tense. Every action noted. Every link included.
- If the tool told you an action was "queued for user approval," say "Queued reply to Priya" instead of "Sent reply to Priya."

**FORMAT RULES:**
- Rich markdown always. Tables for 4+ items, bullet lists for 2–3.
- **Bold** for names, email subjects, key numbers.
- Section emojis as shown (💰 🤝 ⚙️ ⚠️ 🔗). One per section header. Never inside tables.
- Never deliver a plain paragraph as a report. Never wrap in a code block.
- Omit empty sections entirely — a report with only ⚙️ Operations and 🔗 Links is better than one with empty Revenue and Client sections.`;


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

  // Stamp the current UTC time into the report footer at call time (not module-load time)
  const reportSuffix = REPORT_FORMAT_SUFFIX.replace(
    '[INSERT_CURRENT_UTC_TIMESTAMP]',
    new Date().toUTCString(),
  );

  return {
    userId,
    systemPrompt,
    history: [] as Array<{ role: 'user' | 'assistant'; content: string }>,
    userMessage: taskDescription + reportSuffix,
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
