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
import { searchMemories } from './memory';

export const REPORT_FORMAT_SUFFIX = `

---
📋 **Report Formatting Instructions**
When writing your final report, follow this structure EXACTLY:
- Use emojis liberally throughout — make it fun and engaging! 🎉
- Start with a brief # H1 title with an emoji
- Use ## H2 for major sections, ### H3 for subsections, #### H4 for sub-details
- Use ##### H5 and ###### H6 sparingly for the deepest detail levels
- Use **bold** for key numbers, names, and important highlights
- Use tables (with | pipes) for any comparative data, stats, or lists with multiple attributes
- Use bullet points (- ) for actionable items and unordered facts
- Use numbered lists (1. ) for ranked items or sequential steps
- Include a 📊 **Summary** section near the top with the key stats in a table
- End with a 🎯 **Next Steps** or **Key Takeaways** section
- Keep the tone playful, warm, and helpful — like a brilliant assistant who loves their job
- Do NOT wrap the response in a code block`;

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
  agent: { user_id: string; task_description: string },
  budget: AgentRunBudget = {},
) {
  const userId = agent.user_id;
  const taskDescription = agent.task_description;

  const [connectedIntegrations, memories] = await Promise.all([
    getConnectedIntegrations(userId),
    searchMemories(userId, taskDescription, 3),
  ]);

  const systemPrompt = buildSystemPrompt({
    userName: 'User',
    userId,
    connectedIntegrations,
    memories,
    isBackgroundAgent: true,
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
  agent: { user_id: string; task_description: string },
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

  // Canvas markdown is the full report; message event text is typically just
  // a brief "The report is in the Canvas panel." fallback sentence.
  return canvasMarkdown || finalText || 'Agent completed but produced no report.';
}
