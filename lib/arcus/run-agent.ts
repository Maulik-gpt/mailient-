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

/**
 * Fetch the user's free-text "Arcus AI Instructions" from user_profiles.
 * Returns empty string when:
 *   - the user hasn't saved any instructions
 *   - the user has explicitly toggled instructions OFF
 *   - any error occurs (we don't want to fail an agent run on a profile lookup)
 *
 * Background-agent runs use this so saved rules ("always cc legal@",
 * "never schedule weekends", "use bullet points") apply to autonomous work
 * just like they do to interactive chat.
 */
async function fetchUserInstructions(userId: string): Promise<string> {
  try {
    // @ts-ignore — JS module
    const { getSupabaseAdmin } = await import('../supabase.js');
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('user_profiles')
      .select('preferences')
      .ilike('user_id', userId)
      .maybeSingle();
    const prefs = (data?.preferences as Record<string, unknown>) || {};
    if (prefs.arcus_instructions_enabled === false) return '';
    const text = (prefs.arcus_personality as string) || '';
    return typeof text === 'string' ? text.trim() : '';
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

## 🔗 All Links — TRUST RECEIPTS (NON-NEGOTIABLE)

Every artifact you touched this run gets ONE link in this section. The user reads the report and clicks through to verify your work. If you wrote 18 drafts, this section has 18 Gmail draft links. If you logged 24 contacts, this section has 24 Notion page links. Do NOT summarize ("18 drafts created — see Gmail"). LIST every URL.

Required link sources (only include sections that have items):

**📧 Gmail drafts** — every draft_reply / gmail_batch_draft_replies that returned a draftId or draft URL. Format: \`- [<subject> → <recipient>](<gmail draft URL or compose link>)\`
**📤 Emails sent** — every send_email / gmail_batch_send_emails. Format: \`- [<subject> → <recipient>](<gmail message URL>)\`
**📅 Calendar events** — every schedule_meeting / calendar_batch_create_events. Format: \`- [<event title> — <start time>](<htmlLink from the tool result>)\`
**📝 Notion pages** — every create_notion_page / notion_auto_log_all_communication / notion_deal_tracking_automation. Format: \`- [<page title>](<notion page URL>)\`
**💬 Slack messages** — every send_slack_message / slack_post_daily_briefing. Format: \`- [<channel or DM> — <preview>](<slack permalink>)\` (if no permalink, omit the URL but still list it)
**🏷️ Labels applied** — gmail_auto_label_threads. Format: \`- <label name> applied to N thread(s)\` (no per-thread link needed)
**📦 Threads archived** — gmail_auto_archive_threads. Format: \`- N thread(s) archived\` (counts only)

CRITICAL: extract URLs from the tool results. Every successful tool result returns either a \`pageMeta.url\`, an \`htmlLink\`, or a similar URL field. Use those exact URLs. NEVER fabricate a URL. If a tool succeeded but returned no URL, omit the link but still list the action.

If a tool was queued for approval (skip_confirmations was OFF): say "Queued — pending your approval" instead of a URL. Do NOT pretend it was sent.

If no artifacts were created this run, write: "No artifacts produced — this was a read-only scan." Do NOT pad with filler.

---
Sent by Arcus for Mailient • [mailient.xyz](https://mailient.xyz/dashboard?tab=agents)
Run completed: [INSERT_CURRENT_UTC_TIMESTAMP]
Next run: [derive from agent's cron schedule — e.g. "Tomorrow at 9:00 AM" or "Monday at 8:00 AM". If schedule unknown, omit this line.]

[Edit this agent](https://mailient.xyz/dashboard?tab=agents&agentId=[INSERT_AGENT_ID]) · [Pause](https://mailient.xyz/dashboard?tab=agents&agentId=[INSERT_AGENT_ID]&action=pause) · [Run history](https://mailient.xyz/dashboard?tab=agents&agentId=[INSERT_AGENT_ID]&view=history)

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
  // PART 23 also pulls the user's binding instructions from their profile
  // so background runs obey "always cc legal@", "never schedule weekends",
  // etc. exactly like interactive chat does.
  const [connectedIntegrations, [selfHistory, topicContext], voicePrompt, userInstructions] = await Promise.all([
    getConnectedIntegrations(userId),
    Promise.all([
      searchMemories(userId, `[AGENT_RUN] ${agentName || taskDescription.slice(0, 80)}`, 3),
      searchMemories(userId, taskDescription, 4),
    ]),
    getVoiceProfilePromptBlock(userId),
    fetchUserInstructions(userId),
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
    userInstructions: userInstructions || undefined,
    isBackgroundAgent: true,
    skipConfirmations: agent.skip_confirmations ?? false,
    agentTaskDescription: taskDescription,
  });

  // Stamp the current UTC time AND the agent id into the report footer at
  // call time (not module-load time). F9.4 — every report now has deep-links
  // to the agent's settings page for edit / pause / history.
  const agentIdForFooter = agent.id || '';
  const reportSuffix = REPORT_FORMAT_SUFFIX
    .replace('[INSERT_CURRENT_UTC_TIMESTAMP]', new Date().toUTCString())
    .replace(/\[INSERT_AGENT_ID\]/g, agentIdForFooter);

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

export interface AgentRunResult {
  /** Final report markdown (canvas if present, else final message). */
  report: string;
  /** Count of tool_call SSE events observed during the run. */
  toolCalls: number;
}

export async function runAgentTask(
  agent: { user_id: string; task_description: string; name?: string; id?: string },
  budget: AgentRunBudget = {},
): Promise<AgentRunResult> {
  const args = await buildAgentLoopArgs(agent, budget);
  const stream = runAgentLoop(args);

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalText = '';
  let currentEventType = '';

  let canvasMarkdown = '';
  let toolCalls = 0;

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

      if (line.startsWith('data: ') && currentEventType === 'tool_call') {
        // Count without parsing — every emitted tool_call frame is one call.
        toolCalls += 1;
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

  return { report, toolCalls };
}
