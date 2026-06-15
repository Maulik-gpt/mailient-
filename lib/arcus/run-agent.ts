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
// PART 48 — Multi-VA committee orchestrator. runAgentTask now routes through
// runAgentAsCommittee by default; the legacy single-LLM path stays available
// behind an env-var kill switch so we can disable in prod without redeploying.
import { runAgentAsCommittee } from './multi-va/orchestrator';

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

// Prepended to every background run. Turns the agent from a shallow scanner into
// a senior executive assistant that FINISHES coherent jobs and never claims work
// it didn't verify. This is the behavioral core of the super-agent.
export const SUPER_AGENT_DIRECTIVE = `You are Arcus operating as the user's senior executive assistant on a background run — the calibre of a top-tier $3,000/mo chief of staff. Hold yourself to that bar.

HOW YOU WORK:
1. PLAN before acting. Read the task, then think through the complete job — every step needed to truly finish it, not just a surface scan.
2. FINISH the whole job, end to end. Do not stop halfway. If a task has multiple steps that depend on each other, do them in order in this one run:
   • Meeting / call request → read the full thread; check the user's REAL availability (calendar_get_availability and/or Cal.com calcom_get_slots); draft a reply in the user's voice proposing 2–3 specific open times; if the user clearly wants it booked, create the event/booking and include the join link; then surface it for approval.
   • Reply needed → actually draft it with draft_reply (which returns a real draft link). Don't say "drafted" unless the tool returned a draft.
   • Follow-up / stalled item → draft the nudge.
3. USE THE RIGHT TOOLS. You have the full arsenal (Gmail, Calendar, Cal.com, Notion, Slack, memory, web). Prefer batch tools for volume. Pull context (get_recipient_context, memory) so replies are personal, not generic.
4. VERIFY EVERY CLAIM. Only state you did something if the tool actually returned success + an artifact (a draft link, an event link, a booking id). If a tool failed or returned no link, say so plainly and put the item under "Needs Your Attention" — never imply completion you can't prove.
5. BE THOROUGH, NOT TERSE. A real EA gives the full picture: who, what, the proposed times, the draft link, what's still open. Never pad with filler ("let me know if you want me to summarize", tool-call counts) — but never leave the user with a thin, incomplete summary either. Substance over brevity.
6. SURFACE WHAT NEEDS THEM. Anything requiring a human decision — a meeting request you couldn't fully book, a draft awaiting send, a judgement call — goes in "Needs Your Attention" with the link. This section is the most important part of the report; it must reflect reality.

Now do the job below to that standard, then write the report in the required format.
`;

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

## Revenue & Opportunities
Only include if there are revenue signals (contracts, proposals, invoices, deals, renewals, pricing questions).
Use a table with: | Contact | Subject | Signal | Action Taken | Link |
If nothing found: omit this section entirely.

## Client & Relationship Updates
Emails and actions involving existing clients or important relationships.
Table format: | Contact | Thread | Summary | Action Taken | Link |
If nothing found: omit this section entirely.

## Operations
Everything executed: drafts, meetings, Notion logs, Slack messages, labels applied, threads archived.
Table (4+ items) or bullet list (2–3 items):
| Action | Details | Link |
|--------|---------|------|
| Drafted reply | To: Priya Sharma, Re: Q3 proposal | [Open draft](url) |
| Booked meeting | Tuesday 3pm with James — Google Meet | [View event](url) |
If skip_confirmations is FALSE: write "Would have [action]" framing throughout.
If 0 actions: "No operations executed this run."

DECISION REASONING — for every JUDGMENT CALL (drafting vs archiving, flagging vs ignoring, prioritizing), state confidence + a one-line WHY from real signal, so the user understands the call and never has to ask "why did it do that?". Confidence policy: ≥80% act and log it; 70-79% make the educated guess, act, and note it for correction; <70% do NOT act — put it in Needs Your Attention with the uncertainty stated. Never fabricate a confidence number — base it on memory / past runs / sender history / voice profile. Example: "Archived 27 newsletters (97% — senders you've never opened in 90 days)."

## Needs Your Attention
ONLY include if something could not be completed, requires a decision, or hit an error.
- "Priya's email mentions a pricing change I can't confirm from context — review the draft before sending."
- "Couldn't find a free slot for James this week. Draft written but time is unspecified."
- "Notion create failed — content saved as text in the Links section instead."
If nothing needs attention: **OMIT THIS SECTION ENTIRELY.**

## All Links — TRUST RECEIPTS (NON-NEGOTIABLE)

Every artifact you touched this run gets ONE link in this section. The user reads the report and clicks through to verify your work. If you wrote 18 drafts, this section has 18 Gmail draft links. If you logged 24 contacts, this section has 24 Notion page links. Do NOT summarize ("18 drafts created — see Gmail"). LIST every URL.

Required link sources (only include sections that have items):

**Gmail drafts** — every draft_reply / gmail_batch_draft_replies that returned a draftId or draft URL. Format: \`- [<subject> → <recipient>](<gmail draft URL or compose link>)\`
**Emails sent** — every send_email / gmail_batch_send_emails. Format: \`- [<subject> → <recipient>](<gmail message URL>)\`
**Calendar events** — every schedule_meeting / calendar_batch_create_events. Format: \`- [<event title> — <start time>](<htmlLink from the tool result>)\`
**Notion pages** — every create_notion_page / notion_auto_log_all_communication / notion_deal_tracking_automation. Format: \`- [<page title>](<notion page URL>)\`
**Slack messages** — every send_slack_message / slack_post_daily_briefing. Format: \`- [<channel or DM> — <preview>](<slack permalink>)\` (if no permalink, omit the URL but still list it)
**Labels applied** — gmail_auto_label_threads. Format: \`- <label name> applied to N thread(s)\` (no per-thread link needed)
**Threads archived** — gmail_auto_archive_threads. Format: \`- N thread(s) archived\` (counts only)

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
- NO emojis anywhere — not in headings, not in tables, not in prose. Plain professional text only.
- Never deliver a plain paragraph as a report. Never wrap in a code block.
- Omit empty sections entirely — a report with only Operations and Links is better than one with empty Revenue and Client sections.`;


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
  agent: {
    user_id: string; task_description: string; skip_confirmations?: boolean; name?: string; id?: string;
    // Next-gen: cross-run memory + pipeline hand-off input (both optional).
    agent_state?: Record<string, any> | null;
    _chainInput?: { summary?: string; parentAgentId?: string } | null;
  },
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
  const [connectedIntegrations, [selfHistory, topicContext], voicePrompt, userInstructions, userModel] = await Promise.all([
    getConnectedIntegrations(userId),
    Promise.all([
      searchMemories(userId, `[AGENT_RUN] ${agentName || taskDescription.slice(0, 80)}`, 3),
      searchMemories(userId, taskDescription, 4),
    ]),
    getVoiceProfilePromptBlock(userId),
    fetchUserInstructions(userId),
    (async () => { try { const { getUserModelSummary } = await import('./user-model'); return await getUserModelSummary(userId); } catch { return ''; } })(),
  ]);

  // Merge both memory sets, deduplicating identical lines
  const memoryLines = new Set([
    ...selfHistory.split('\n').filter(Boolean),
    ...topicContext.split('\n').filter(Boolean),
  ]);

  // Next-gen context — fold cross-run state and any pipeline hand-off into the
  // memory block so the loop sees them without changing the engine's interface.
  if (agent._chainInput?.summary) {
    memoryLines.add(
      `[PIPELINE INPUT] You were triggered by an upstream agent. Its result (use it as your starting context, do not redo its work):\n${agent._chainInput.summary.slice(0, 1000)}`,
    );
  }
  const st = agent.agent_state || {};
  const stateBits: string[] = [];
  if (st.last_fired_at) stateBits.push(`last fired ${st.last_fired_at}`);
  if (Array.isArray(st.processed_event_ids) && st.processed_event_ids.length) {
    stateBits.push(`${st.processed_event_ids.length} item(s) already handled in prior runs — do not act on them again`);
  }
  if (typeof st.note === 'string' && st.note.trim()) stateBits.push(st.note.trim().slice(0, 300));
  if (stateBits.length) memoryLines.add(`[AGENT STATE] ${stateBits.join(' · ')}`);

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
    userMessage: SUPER_AGENT_DIRECTIVE + '\n\n' + taskDescription + reportSuffix,
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
  /**
   * Structured artifact links the committee already collected. The cron route
   * persists these directly instead of re-parsing them out of the report
   * markdown (which broke whenever the report's link format changed).
   */
  artifactLinks?: { gmail?: Array<{ label: string; url: string }>; calendar?: Array<{ label: string; url: string }>; notion?: Array<{ label: string; url: string }>; slack?: Array<{ label: string; url: string }> } | null;
}

/**
 * Layer 1 — generate a short plain-English plan for a background run BEFORE it
 * executes. Pulls the agent's own past-run history so the plan reflects what
 * the agent learned last time ("last run found 12 meeting requests; this run
 * I'll check for new ones since then"). Cheap: one small LLM call, capped
 * tokens, never throws — a planning failure must not block the run.
 *
 * Returns '' on any failure; callers store whatever comes back (empty = the UI
 * simply omits the plan block).
 */
export async function generateRunPlan(
  agent: { user_id: string; task_description: string; name?: string },
): Promise<string> {
  try {
    const { callLLM, getText } = await import('./engine');
    const selfHistory = await searchMemories(
      agent.user_id,
      `[AGENT_RUN] ${agent.name || agent.task_description.slice(0, 80)}`,
      2,
    ).catch(() => '');

    const res = await callLLM(
      [
        {
          role: 'system',
          content:
            'You write a SHORT execution plan for an autonomous email/calendar agent that is about to run with no user present. ' +
            'Output 2-4 plain-English steps, each one line, starting with a verb (Scan, Read, Draft, Check, Book, Log, Flag). ' +
            'No preamble, no numbering styles beyond "- ", no markdown headings, no closing remarks. ' +
            'If past-run context is given, reflect it (e.g. "Check for requests newer than last run"). ' +
            'Keep the whole thing under 80 words.',
        },
        {
          role: 'user',
          content:
            `Agent: ${agent.name || 'Background agent'}\n` +
            `Task: ${agent.task_description}\n` +
            (selfHistory ? `\nPast-run context:\n${selfHistory.slice(0, 600)}\n` : '') +
            '\nWrite the plan.',
        },
      ],
      [],
      { maxTokens: 200, temperature: 0.2 },
    );
    return getText(res.content).trim().slice(0, 1000);
  } catch {
    return '';
  }
}

export async function runAgentTask(
  agent: { user_id: string; task_description: string; skip_confirmations?: boolean; name?: string; id?: string },
  budget: AgentRunBudget = {},
  agentRunId?: string,
): Promise<AgentRunResult> {
  // SUPER-AGENT — background runs now execute as ONE coherent agent with the
  // full toolset, not the parallel multi-VA committee. The committee fragmented
  // coherent jobs (a meeting request needs inbox + calendar TOGETHER), so the
  // halves never finished and the report papered over the gap with unverified
  // claims. A single agent sees its own work end-to-end: read → check
  // availability → draft proposing times → book with a link → surface for
  // approval. The committee stays available as an opt-in fallback
  // (ARCUS_USE_COMMITTEE=true) — nothing deleted, fully reversible.
  const useCommittee = process.env.ARCUS_USE_COMMITTEE === 'true';
  // Defaults sized for Vercel Hobby's 60s function cap (used when no caller
  // budget is supplied, e.g. the "Run now" path). The cron route passes its own
  // tighter per-agent budget. (On Pro: 80 / 50_000.)
  const maxToolCalls = budget.maxToolCalls ?? 26;
  const deadlineMs = budget.deadlineMs ?? 50_000;

  let report: string;
  let toolCalls: number;
  let artifactLinks: AgentRunResult['artifactLinks'] = null;

  if (useCommittee) {
    const committee = await runAgentAsCommittee(agent, { maxToolCalls, deadlineMs, agentRunId });
    report = committee.report;
    toolCalls = committee.toolCalls;
    artifactLinks = committee.artifactLinks ?? null;
  } else {
    // Legacy single-LLM path — kept verbatim so flipping the kill switch
    // returns exactly the prior behaviour. Will be deleted in a future
    // PART once the committee mode has soak time in prod.
    const args = await buildAgentLoopArgs(agent, budget);
    const stream = runAgentLoop({ ...args, agentRunId });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalText = '';
    let currentEventType = '';
    let canvasMarkdown = '';
    let legacyToolCalls = 0;

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
            if (data.markdown && data.type !== 'scheduled_agent') canvasMarkdown = data.markdown;
          } catch { /* ok */ }
          currentEventType = '';
        }

        if (line.startsWith('data: ') && currentEventType === 'tool_call') {
          legacyToolCalls += 1;
          currentEventType = '';
        }
      }
    }

    report = canvasMarkdown || finalText || 'Agent completed but produced no report.';
    toolCalls = legacyToolCalls;
  }

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

  return { report, toolCalls, artifactLinks };
}
