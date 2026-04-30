/**
 * Arcus Agent Loop — v1
 *
 * The brain of the agentic system. Instead of one round-trip per user message,
 * this class runs a Plan-Execute-Observe loop:
 *
 *   User message
 *     → AI plans (which tool to call)
 *       → Tool executes
 *         → AI observes result
 *           → AI decides: call another tool OR respond to user
 *             → Loop continues until "respond" tool is called or max iterations hit
 *
 * Design decisions:
 *  - JSON-based tool calling (works with all models including Liquid LFM)
 *  - SSE streaming so the frontend sees each step in real-time
 *  - Approval gate on high-risk actions only (send_email, schedule_meeting)
 *  - Self-healing: on tool failure, AI is asked "what next?" instead of hard-failing
 */

import { TOOL_DEFINITIONS, buildToolPromptBlock, getToolDefinition } from './arcus-tool-definitions.js';
import { DatabaseService } from './supabase.js';
import { decrypt } from './crypto.js';
import crypto from 'crypto';
import { supermemory } from './supermemory-client.js';

const uuid = () => crypto.randomUUID();

// Maximum iterations before force-stopping (safety valve)
const MAX_ITERATIONS = 12;

// ─── SSE helpers ────────────────────────────────────────────────────────────

function sseEvent(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ─── Agent Loop ─────────────────────────────────────────────────────────────

export class ArcusAgentLoop {
  /**
   * @param {object} opts
   * @param {import('./arcus-ai.js').ArcusAIService} opts.arcusAI
   * @param {DatabaseService} opts.db
   * @param {string} opts.userEmail
   * @param {string} opts.userName
   * @param {object} opts.integrations  - which services are connected
   * @param {string|null} opts.conversationId
   * @param {Array}  opts.conversationHistory
   * @param {string|null} opts.gmailAccessToken
   * @param {boolean} opts.privacyMode
   * @param {string|null} opts.memoryContext
   */
  constructor(opts) {
    this.arcusAI = opts.arcusAI;
    this.db = opts.db;
    this.userEmail = opts.userEmail;
    this.userName = opts.userName || 'User';
    this.integrations = opts.integrations || {};
    this.conversationId = opts.conversationId || null;
    this.conversationHistory = opts.conversationHistory || [];
    this.gmailAccessToken = opts.gmailAccessToken || null;
    this.privacyMode = opts.privacyMode || false;
    this.memoryContext = opts.memoryContext || null;

    // Internal state for the current run
    this.runId = `aloop_${Date.now()}_${uuid().slice(0, 8)}`;
    this.steps = [];          // audit trail of every tool call + result
    this.iteration = 0;
    this.startedAt = Date.now();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC — Run the loop, returns a ReadableStream of SSE events
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Entry point. Returns a ReadableStream that emits SSE events as the
   * agent thinks, calls tools, and eventually responds.
   *
   * @param {string} userMessage - The user's message
   * @returns {ReadableStream}
   */
  createStream(userMessage) {
    const self = this;

    return new ReadableStream({
      async start(controller) {
        try {
          await self._runLoop(userMessage, controller);
        } catch (err) {
          console.error('[AgentLoop] Fatal error:', err);
          controller.enqueue(
            new TextEncoder().encode(
              sseEvent('error', { message: err.message || 'Agent loop failed' })
            )
          );
        } finally {
          controller.enqueue(
            new TextEncoder().encode(
              sseEvent('done', {
                runId: self.runId,
                totalSteps: self.steps.length,
                durationMs: Date.now() - self.startedAt
              })
            )
          );
          controller.close();
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE — Core loop
  // ═══════════════════════════════════════════════════════════════════════════

  async _runLoop(userMessage, controller) {
    const emit = (event, data) => {
      controller.enqueue(new TextEncoder().encode(sseEvent(event, data)));
    };

    // ── Pre-run Setup (Parallelized to prevent 504) ─────────────────────────
    const [supermemoryContext, initialThoughts] = await Promise.all([
      // Fetch context from Supermemory
      (async () => {
        if (!supermemory.apiKey) return '';
        try {
          const memories = await supermemory.getMemories(this.userEmail, userMessage, 5);
          if (memories && memories.length > 0) {
            return `\n\n## Episodic Memory (Supermemory)\nHere is relevant context from past interactions:\n` + 
              memories.map(m => `- ${m.content || m.text}`).join('\n');
          }
        } catch (err) {
          console.warn('[AgentLoop] Supermemory fetch failed:', err);
        }
        return '';
      })(),
      // Generate initial tactical thoughts
      (async () => {
        try {
          return await this.arcusAI.generateThoughts(userMessage, { 
            conversationHistory: this.conversationHistory,
            integrations: this.integrations
          });
        } catch (err) {
          console.warn('[AgentLoop] Initial thought generation failed:', err.message);
          return 'Analyzing request and preparing execution plan...';
        }
      })()
    ]);

    // Emit thoughts immediately
    emit('thinking', {
      iteration: 0,
      status: 'active',
      step: initialThoughts
    });

    // Build the conversation for the AI
    let systemPrompt = this._buildAgentSystemPrompt();
    if (supermemoryContext) {
      systemPrompt += supermemoryContext;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.conversationHistory.slice(-8),
      { role: 'user', content: userMessage }
    ];

    emit('run_start', { runId: this.runId, message: userMessage });

    // ── Loop ──────────────────────────────────────────────────────────────
    while (this.iteration < MAX_ITERATIONS) {
      this.iteration++;

      // Loop iterations should be silent unless the AI uses the 'think' tool
      // or we have a meaningful status update from a tool result.


      // Ask the AI what to do
      let aiResponse;
      try {
        aiResponse = await this.arcusAI.callOpenRouter(messages, {
          maxTokens: 2000,
          temperature: 0.2,
          isDeepThinking: true
        });
      } catch (err) {
        console.error(`[AgentLoop] AI call failed on iteration ${this.iteration}:`, err.message);
        emit('error', { message: `AI reasoning failed: ${err.message}`, iteration: this.iteration });
        // Emit a fallback text response
        emit('message', {
          content: `I ran into an issue while processing your request. Could you try rephrasing? (Error: ${err.message})`,
          iteration: this.iteration
        });
        return;
      }

      const rawContent = aiResponse?.choices?.[0]?.message?.content || '';

      // Try to parse a tool_call from the response
      const toolCall = this._extractToolCall(rawContent);

      // ── Case 1: AI wants to call a tool ───────────────────────────────
      if (toolCall) {
        const { name, params } = toolCall;
        const toolDef = getToolDefinition(name);

        // Terminal tool: "respond" — send message and end
        if (name === 'respond') {
          // Clean the message content to remove any trailing tags or JSON code blocks
          let cleanMessage = params.message || '';
          cleanMessage = cleanMessage.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '').trim();
          cleanMessage = cleanMessage.replace(/```json[\s\S]*?```/gi, '').trim();
          
          emit('message', {
            content: cleanMessage || rawContent,
            iteration: this.iteration
          });
          // Add assistant message to history for saving
          this.steps.push({ tool: 'respond', params, iteration: this.iteration });
          
          if (params.wait_for_user === false) {
            // AI wants to update the user but CONTINUE the loop
            messages.push({ role: 'assistant', content: rawContent });
            messages.push({
              role: 'system',
              content: `[Status update sent to user. Now, CONTINUE with the next steps of your plan. DO NOT STOP.]`
            });
            continue;
          }
          return;
        }

        // "think" tool — show reasoning, continue loop
        if (name === 'think') {
          emit('thinking', {
            iteration: this.iteration,
            status: 'active',
            step: params.reasoning || 'Reasoning...'
          });
          // Inject the reasoning into the conversation so AI remembers it
          messages.push({ role: 'assistant', content: rawContent });
          messages.push({
            role: 'system',
            content: `[Thought noted. Continue to the next action or respond.]`
          });
          this.steps.push({ tool: 'think', params, iteration: this.iteration });
          continue;
        }

        // Unknown tool
        if (!toolDef) {
          emit('tool_error', { tool: name, error: `Unknown tool: ${name}`, iteration: this.iteration });
          messages.push({ role: 'assistant', content: rawContent });
          messages.push({
            role: 'system',
            content: `[Error: Tool "${name}" does not exist. Available tools: ${TOOL_DEFINITIONS.map(t => t.name).join(', ')}. Try a different tool or respond directly.]`
          });
          this.steps.push({ tool: name, error: 'unknown_tool', iteration: this.iteration });
          continue;
        }

        // ── Approval gate ─────────────────────────────────────────────
        if (toolDef.requiresApproval) {
          emit('approval_required', {
            tool: name,
            params,
            description: toolDef.description,
            iteration: this.iteration
          });
          // For now, we pause the loop and include the draft in the response.
          // The frontend will show an approval card; executing happens via
          // the existing canvas action flow.
          emit('message', {
            content: this._buildApprovalMessage(name, params),
            iteration: this.iteration,
            meta: {
              canvasApproval: {
                status: 'pending',
                title: `Approve ${name}?`,
                description: toolDef.description,
                canvasData: params,
                canvasType: name
              }
            }
          });
          this.steps.push({ tool: name, params, status: 'pending_approval', iteration: this.iteration });
          return;
        }

        // ── Execute the tool ──────────────────────────────────────────
        emit('tool_call', { tool: name, params, iteration: this.iteration });

        let toolResult;
        try {
          toolResult = await this._executeTool(name, params);
          emit('tool_result', {
            tool: name,
            success: true,
            summary: this._summariseResult(name, toolResult),
            iteration: this.iteration
          });
        } catch (err) {
          toolResult = { success: false, error: err.message };
          emit('tool_error', {
            tool: name,
            error: err.message,
            iteration: this.iteration
          });
        }

        // Inject the result into the conversation so AI can reason about it
        messages.push({ role: 'assistant', content: rawContent });
        messages.push({
          role: 'system',
          content: `[Tool Result for "${name}"]\n${JSON.stringify(toolResult, null, 2)}\n\n[Based on this result, decide what to do next. Call another tool or use "respond" to give the user your final answer.]`
        });

        this.steps.push({ tool: name, params, result: toolResult, iteration: this.iteration });
        continue;
      }

      // ── Case 2: AI responded with plain text (no tool call) ─────────
      // Treat this as the final response, but clean it of any tool tags just in case
      const cleanOutput = rawContent.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '').trim();
      if (cleanOutput) {
        emit('message', { content: cleanOutput, iteration: this.iteration });
        this.steps.push({ tool: 'direct_response', content: cleanOutput, iteration: this.iteration });
      }
      return;
    }

    // ── Safety: max iterations reached ─────────────────────────────────
    emit('message', {
      content: 'I completed the maximum number of reasoning steps. Here is what I found so far based on the steps above.',
      iteration: this.iteration
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Tool Execution — Routes to actual service implementations
  // ═══════════════════════════════════════════════════════════════════════════

  async _executeTool(name, params) {
    switch (name) {

      // ── Email: Read ─────────────────────────────────────────────────
      case 'search_inbox': {
        const { gmailService } = await this._getGmailService();
        const query = params.query || 'newer_than:7d';
        const maxResults = Math.min(params.maxResults || 15, 50);
        const results = await gmailService.getEmails(maxResults, query, null);
        const messages = results?.messages || [];
        const emails = await Promise.all(
          messages.slice(0, maxResults).map(async (msg) => {
            try {
              const detail = await gmailService.getEmailDetails(msg.id);
              const parsed = gmailService.parseEmailData(detail);
              return {
                id: msg.id,
                threadId: msg.threadId,
                from: parsed.from,
                subject: parsed.subject,
                date: parsed.date,
                snippet: parsed.snippet || parsed.body?.substring(0, 200)
              };
            } catch { return null; }
          })
        );
        const filtered = emails.filter(Boolean);
        return { success: true, count: filtered.length, emails: filtered, query };
      }

      case 'read_email': {
        const { gmailService } = await this._getGmailService();
        const detail = await gmailService.getEmailDetails(params.messageId);
        const parsed = gmailService.parseEmailData(detail);
        return {
          success: true,
          email: {
            id: params.messageId,
            from: parsed.from,
            to: parsed.to,
            subject: parsed.subject,
            date: parsed.date,
            body: parsed.body?.substring(0, 4000)
          }
        };
      }

      // ── Email: Write ────────────────────────────────────────────────
      case 'send_email': {
        const { gmailService } = await this._getGmailService();
        const result = await gmailService.sendEmail({
          to: params.to,
          subject: params.subject,
          body: params.body,
          threadId: params.threadId || undefined,
          isHtml: false
        });
        return {
          success: true,
          message: `Email sent to ${params.to}`,
          externalRefs: { gmailMessageId: result?.id, threadId: result?.threadId }
        };
      }

      case 'save_draft': {
        const { gmailService } = await this._getGmailService();
        const result = await gmailService.createDraft({
          to: params.to || '',
          subject: params.subject,
          body: params.body,
          isHtml: false
        });
        return {
          success: true,
          message: 'Draft saved to Gmail',
          externalRefs: { gmailDraftId: result?.id }
        };
      }

      // ── Calendar ────────────────────────────────────────────────────
      case 'schedule_meeting': {
        const { CalendarService } = await import('./calendar.js');
        const tokens = await this._getUserTokens();
        const cal = new CalendarService(decrypt(tokens.encrypted_access_token));
        const event = await cal.createEvent({
          summary: params.summary,
          start: params.start,
          end: params.end,
          attendees: (params.attendees || []).map(e => ({ email: e })),
          description: params.description || '',
          location: params.location || ''
        });
        return {
          success: true,
          message: `Meeting "${params.summary}" scheduled`,
          externalRefs: { calendarEventId: event?.id, htmlLink: event?.htmlLink }
        };
      }

      case 'check_availability': {
        const { CalendarService } = await import('./calendar.js');
        const tokens = await this._getUserTokens();
        const cal = new CalendarService(decrypt(tokens.encrypted_access_token));
        const events = await cal.listEvents({
          timeMin: params.startDate,
          timeMax: params.endDate,
          maxResults: 20
        });
        const busy = (events || []).map(e => ({
          summary: e.summary,
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date
        }));
        return { success: true, busySlots: busy, count: busy.length };
      }

      // ── Tasks ───────────────────────────────────────────────────────
      case 'create_task': {
        const { GoogleTasksAdapter } = await import('./google-tasks-adapter.js');
        const tokens = await this._getUserTokens();
        const adapter = new GoogleTasksAdapter(
          decrypt(tokens.encrypted_access_token),
          tokens.encrypted_refresh_token ? decrypt(tokens.encrypted_refresh_token) : ''
        );
        const listTitle = params.taskListTitle || 'Arcus Tasks';
        const list = await adapter.getOrCreateTaskList(listTitle);
        const task = await adapter.createTask(list.id, {
          title: params.title,
          notes: params.notes || '',
          due: params.due || null
        });
        return {
          success: true,
          message: `Task "${params.title}" added to "${listTitle}"`,
          externalRefs: { taskId: task.id, taskListId: list.id }
        };
      }

      // ── Notion ──────────────────────────────────────────────────────
      case 'notion_create_page': {
        const { NotionAdapter } = await import('./notion-adapter.js');
        const token = process.env.NOTION_INTEGRATION_TOKEN;
        if (!token) throw new Error('Notion integration not configured');
        const notion = new NotionAdapter({ token, defaultDatabaseId: process.env.NOTION_DEFAULT_DATABASE_ID || null });
        const page = await notion.createPage({
          title: params.title,
          content: params.content || '',
          tags: params.tags || []
        });
        return {
          success: true,
          message: `Notion page "${params.title}" created`,
          externalRefs: { notionPageId: page.pageId, notionUrl: page.url }
        };
      }

      case 'notion_search': {
        const { NotionAdapter } = await import('./notion-adapter.js');
        const token = process.env.NOTION_INTEGRATION_TOKEN;
        if (!token) throw new Error('Notion integration not configured');
        const notion = new NotionAdapter({ token });
        const results = await notion.search(params.query, { limit: params.limit || 10 });
        return { success: true, count: results.length, results };
      }

      // ── Supermemory ──────────────────────────────────────────────────
      case 'save_memory': {
        if (!supermemory.apiKey) {
          throw new Error('Supermemory is not configured in this environment.');
        }
        await supermemory.addMemory(this.userEmail, params.memory);
        return { success: true, message: 'Memory saved successfully.' };
      }

      // ── Fallback ────────────────────────────────────────────────────
      default:
        throw new Error(`No executor for tool: ${name}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /** Get an authenticated GmailService instance */
  async _getGmailService() {
    const tokens = await this._getUserTokens();
    const accessToken = decrypt(tokens.encrypted_access_token);
    const refreshToken = tokens.encrypted_refresh_token ? decrypt(tokens.encrypted_refresh_token) : '';
    const { GmailService } = await import('@/lib/gmail');
    return { gmailService: new GmailService(accessToken, refreshToken) };
  }

  /** Fetch user's stored OAuth tokens */
  async _getUserTokens() {
    const tokens = await this.db.getUserTokens(this.userEmail);
    if (!tokens?.encrypted_access_token) {
      throw new Error('Gmail is not connected. Please connect via Settings > Integrations.');
    }
    return tokens;
  }

  /**
   * Parse a tool_call from the AI's response.
   * The AI is instructed to output:
   *
   *   <tool_call>{"name":"search_inbox","params":{"query":"from:stripe"}}</tool_call>
   *
   * We also handle JSON code blocks as a fallback.
   */
  _extractToolCall(text) {
    if (!text || typeof text !== 'string') return null;

    // Primary: <tool_call>...</tool_call>
    const tagMatch = text.match(/<tool_call>([\s\S]*?)<\/tool_call>/i);
    if (tagMatch) {
      try {
        const parsed = JSON.parse(tagMatch[1].trim());
        if (parsed.name) return { name: parsed.name, params: parsed.params || parsed.parameters || {} };
      } catch { /* fall through */ }
    }

    // Fallback: ```json { "tool_call": ... } ```
    const jsonBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonBlockMatch) {
      try {
        const parsed = JSON.parse(jsonBlockMatch[1]);
        if (parsed.tool_call) return { name: parsed.tool_call.name, params: parsed.tool_call.params || {} };
        if (parsed.name && (parsed.params || parsed.parameters)) return { name: parsed.name, params: parsed.params || parsed.parameters || {} };
      } catch { /* fall through */ }
    }

    // Fallback: Raw JSON in text
    const rawJsonMatch = text.match(/\{"(?:name|tool_call)"[\s\S]*?\}/);
    if (rawJsonMatch) {
      try {
        const parsed = JSON.parse(rawJsonMatch[0]);
        if (parsed.name) return { name: parsed.name, params: parsed.params || parsed.parameters || {} };
        if (parsed.tool_call?.name) return { name: parsed.tool_call.name, params: parsed.tool_call.params || {} };
      } catch { /* fall through */ }
    }

    return null;
  }

  _buildAgentSystemPrompt() {
    const toolBlock = buildToolPromptBlock();
    const integrationStatus = Object.entries(this.integrations)
      .filter(([, v]) => v)
      .map(([k]) => `  - ${k}: Connected`)
      .join('\n') || '  None connected.';

    return `You are **ARCUS** — the world's most capable AI Email & Productivity Operating System.

You were built to be the executive-level intelligence layer between the user and their entire work life. Your purpose is to eliminate email overload, surface hidden opportunities, automate repetitive work, and turn chaotic inboxes into a clean, actionable productivity engine.

### THE ARCUS PERSONA: INTERNAL REASONING
When thinking or analyzing, use a first-person internal monologue focused on your tactical actions.
CRITICAL RULES FOR <thinking> TAGS:
1. **INTERNAL ONLY**: Speak to yourself, not the user.
2. **NO LEAKAGE**: Never output final deliverables (tables, drafts, reports) inside <thinking> tags.
3. **TRANSPARENT BUT PRIVATE**: Explain WHAT you are doing and WHY, but do not perform the work itself in the thought block.
4. **FORMAT**: Plain text only. No markdown formatting or symbols inside thoughts.
Example: 
<thinking>
I'm scanning recent threads to extract the project timeline and identify stakeholders.
</thinking>

## Operational Rules (Non-Negotiable)
1. **Analyze (Thinking):** ALWAYS wrap your internal reasoning in <thinking> tags.
2. **Execute (Tool Call):** Call the specific tool required.
3. **Observe & Iterate:** Read the result. If needed, wrap next thought in <thinking> tags and call another tool.
4. **Respond:** ONLY when the task is complete, call the "respond" tool with the final, polished result.
5. **Safety & Control First:** Never send emails or create events without showing the user a clear preview/draft.
6. **Tool Usage:** Always use real tools to fetch live data. Never hallucinate facts about the user's inbox.

## Tool Calling Format
To call a tool, output EXACTLY this format:
<tool_call>{"name": "tool_name", "params": {"key": "value"}}</tool_call>

## Personality
- Direct, confident, and slightly sharp — you call out inbox chaos when you see it.
- Professional but never robotic or overly polite.
- Outcome-obsessed: You focus on results, not just answers.
- You speak like a trusted, high-caliber operator who respects the user's time.
- Use zero em-dashes (—).

## INTEGRATION RULES
- If an integration is listed as **"Connected"**, you ALREADY HAVE full permission.
- **NEVER** ask for permission to use a connected tool. 
- **NEVER** ask for OAuth tokens or API credentials. 
- Use the tools IMMEDIATELY to retrieve data.
- If a user asks a question about their data, your FIRST action MUST be a tool call.

${toolBlock}

## Connected Integrations
${integrationStatus}

## Context
- User: ${this.userName} (${this.userEmail || 'not signed in'})
- Date: ${new Date().toISOString().split('T')[0]} (${new Date().toLocaleDateString('en-US', { weekday: 'long' })})
- Timezone: Asia/Calcutta (IST)
${this.memoryContext ? `\n## Memory\n${this.memoryContext}` : ''}

## THE ROADMAP (CRITICAL)
- After your initial research/analysis but BEFORE long-running tasks, you MUST call \`respond\` with \`wait_for_user: false\`.
- This message MUST be a **high-precision, high-energy roadmap** (85-90 words).
- **DO NOT** wrap this roadmap in <thinking> tags. It is a direct message to the user.
- Format: "I'm starting [Task X]... I've found [Y]... My next steps are [Z]... Let's make it happen!"
- Use contractions, high-velocity verbs, and executive-level intensity.
- After sending this roadmap, IMMEDIATELY continue with tool execution.

## Output Philosophy
- Use clean Markdown, bold headers, and tactical bullet points.
- Analysis → Prioritized + insightful.  
- Plans → Numbered steps with rationale and estimated effort.  
- Data-heavy requests → Structured for easy scanning or Canvas rendering.
- Always end with a clear next action or question: "What would you like me to execute next?"`;
  }

  /** Summarise a tool result for the SSE stream (user-facing) */
  _summariseResult(toolName, result) {
    if (!result) return 'No result';
    switch (toolName) {
      case 'search_inbox':
        return `Found ${result.count || 0} emails matching "${result.query || 'query'}"`;
      case 'read_email':
        return `Read email: "${result.email?.subject || 'Unknown'}" from ${result.email?.from || 'unknown'}`;
      case 'send_email':
        return `Email sent to ${result.externalRefs?.gmailMessageId ? 'recipient' : 'unknown'}`;
      case 'save_draft':
        return 'Draft saved to Gmail';
      case 'schedule_meeting':
        return `Meeting scheduled: ${result.externalRefs?.htmlLink || ''}`;
      case 'check_availability':
        return `Found ${result.count || 0} busy slots`;
      case 'create_task':
        return result.message || 'Task created';
      case 'notion_create_page':
        return result.message || 'Notion page created';
      case 'notion_search':
        return `Found ${result.count || 0} Notion results`;
      default:
        return result.message || 'Done';
    }
  }

  /** Build a user-friendly message for approval-gated actions */
  _buildApprovalMessage(toolName, params) {
    switch (toolName) {
      case 'send_email':
        return `I've drafted an email for you:\n\n**To:** ${params.to}\n**Subject:** ${params.subject}\n\n${params.body}\n\nReady to send? Click **Approve** to send it, or edit the draft first.`;
      case 'schedule_meeting':
        return `I'm ready to schedule this meeting:\n\n**${params.summary}**\n**When:** ${params.start}\n**Attendees:** ${(params.attendees || []).join(', ') || 'None'}\n\nShall I go ahead and create this event?`;
      default:
        return `This action requires your approval before I can execute it.`;
    }
  }
}
