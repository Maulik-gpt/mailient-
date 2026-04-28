/**
 * Arcus Plan Mode Engine
 * Generates AI-driven plans with objectives, assumptions, todos with dependencies
 * Integrates with ArcusPlanEngine for persistence
 */

import { ArcusPlanEngine } from './arcus-plan-engine.js';

export class PlanModeEngine {
  constructor({ arcusAI, db, userEmail }) {
    this.arcusAI = arcusAI;
    this.db = db;
    this.userEmail = userEmail;
    this.planEngine = new ArcusPlanEngine({ db, userEmail });
  }

  /**
   * Generate a comprehensive Plan Artifact using AI
   * This creates objectives, assumptions, todos with dependencies, acceptance criteria
   */
  async generatePlan({
    message,
    runId,
    conversationId,
    context = {},
    intent = 'general',
    complexity = 'simple'
  }) {
    // Build the system prompt for plan generation
    const systemPrompt = this._buildPlanGenerationPrompt(context);

    try {
      // Call AI to generate structured plan
      const response = await this.arcusAI.callOpenRouter([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create an execution plan for: ${message}` }
      ], {
        maxTokens: 2000,
        temperature: 0.3,
        taskType: 'planning'
      });

      const content = this._extractResponse(response);
      const planData = this._parsePlanJSON(content);

      // Enrich plan with execution metadata
      const enrichedPlan = this._enrichPlanWithMetadata(planData, message, intent, complexity);

      // Build in-memory plan artifact first (always works)
      const inMemoryPlanId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const inMemoryPlan = {
        plan_id: inMemoryPlanId,
        title: enrichedPlan.title,
        objective: enrichedPlan.objective,
        status: 'draft',
        version: 1,
        locked: false,
        intent,
        complexity,
        canvas_type: this._inferCanvasType(intent, enrichedPlan.todos),
        assumptions: JSON.stringify(enrichedPlan.assumptions || []),
        questions_answered: JSON.stringify(enrichedPlan.questionsAnswered || []),
        acceptance_criteria: JSON.stringify(enrichedPlan.acceptanceCriteria || []),
        created_at: new Date().toISOString()
      };

      const inMemoryTodos = enrichedPlan.todos.map((todo, index) => ({
        todo_id: `todo_${inMemoryPlanId}_${index}`,
        title: todo.title,
        description: todo.description || '',
        action_type: todo.actionType || 'generic_task',
        status: 'pending',
        sort_order: todo.order || index,
        depends_on: todo.dependsOn || [],
        approval_mode: todo.approvalMode || 'auto',
        attempt_count: 0,
        result_payload: null
      }));

      // Attempt DB persistence (best-effort, do not block the plan card)
      let persistedPlanId = inMemoryPlanId;
      try {
        const { planId } = await this.planEngine.createPlan({
          runId,
          conversationId,
          title: enrichedPlan.title,
          objective: enrichedPlan.objective,
          assumptions: enrichedPlan.assumptions,
          questionsAnswered: enrichedPlan.questionsAnswered,
          acceptanceCriteria: enrichedPlan.acceptanceCriteria,
          todos: enrichedPlan.todos,
          sourceMessage: message,
          intent,
          complexity,
          canvasType: this._inferCanvasType(intent, enrichedPlan.todos)
        });
        persistedPlanId = planId;
        console.log(`Plan persisted to DB: ${planId}`);
      } catch (dbError) {
        console.warn(`Plan DB persistence failed (plan will still render): ${dbError.message}`);
      }

      return {
        planId: persistedPlanId,
        plan: inMemoryPlan,
        todos: inMemoryTodos,
        thinkingBlocks: this._generateThinkingBlocks(enrichedPlan)
      };
    } catch (error) {
      console.error('Plan generation failed:', error.message);
      // Fallback to simple in-memory plan (no DB dependency)
      return this._generateInMemoryFallbackPlan({ message, intent, complexity });
    }
  }

  /**
   * Build the AI prompt for plan generation
   */
  _buildPlanGenerationPrompt(context) {
    return `You are ARCUS Plan Engine. Generate ULTRA-DETAILED, structured execution plans.
Your goal is to provide a comprehensive roadmap that leaves no ambiguity.

CONTEXT AWARENESS:
Use the provided email/notes context to make todos specific. 
- Mention specific names, dates, and subjects from the user's data.
- If the user asks to "prepare for a meeting with X", the plan should include searching for emails from X, checking the calendar for X, and drafting a brief for X.

OUTPUT FORMAT - Strict JSON:
{
  "title": "Clear, actionable plan title (5-10 words)",
  "objective": "Detailed paragraph describing the mission goal and success state",
  "assumptions": [
    "Assumption 1: Technical (e.g. Gmail connectivity)",
    "Assumption 2: Contextual (e.g. User wants a formal tone)",
    "Assumption 3: Data-based (e.g. Lead data is in the most recent thread)"
  ],
  "questionsAnswered": [
    "What is the core request?",
    "Which integration is the primary target?",
    "What is the expected outcome of the final step?"
  ],
  "acceptanceCriteria": [
    "Specific outcome 1 (e.g. Email sent to recipient@example.com)",
    "Specific outcome 2 (e.g. Notion page created with all 5 action items)",
    "Specific outcome 3 (e.g. Calendar invite sent for tomorrow at 2 PM)"
  ],
  "todos": [
    {
      "title": "Very descriptive step name",
      "description": "Deeply detailed context: what to look for, specific parameters, and how this relates to the overall goal.",
      "actionType": "one of: search_email, read_thread, draft_reply, send_email, schedule_meeting, notion_create_page, tasks_add_tasks, analyze_data, generic_task",
      "dependsOn": [],
      "approvalMode": "manual (for send_email, notion_create_page) or auto",
      "estimatedDuration": "detailed estimate"
    }
  ],
  "riskLevel": "low|medium|high",
  "requiresApproval": true
}

PLANNING PRINCIPLES:
1. GRANULARITY: Break complex tasks into tiny, verifiable steps. 10-12 steps is ideal for complex requests.
2. VERIFICATION: Include "generic_task" steps to 'Verify content quality' or 'Sync results' between tools.
3. DEPENDENCIES: Use "dependsOn" array to reference todo indices (0-based) correctly.
4. MUTATING ACTIONS: Always set approvalMode to "manual" for actions that send messages or create public/permanent data.
5. CONTEXTUAL: If context is missing, include a step to 'Search for missing details'.

EXAMPLE:
If the user says "Help me prep for my meeting with Sarah from last week", don't just say "Search for Sarah". Say:
1. search_email: "Search for emails from 'Sarah' received between [Last Week Start] and [Last Week End]"
2. read_thread: "Identify the meeting agenda and key topics from Sarah's last response"
3. generic_task: "Synthesize a 3-point briefing note based on the email context"
4. notion_create_page: "Create a Notion 'Meeting Brief' page with the synthesized notes" (manual)

Return ONLY valid JSON. No markdown, no explanation.`;
  }

  /**
   * Extract response content from API
   */
  _extractResponse(data) {
    return data?.choices?.[0]?.message?.content || '';
  }

  /**
   * Parse and validate plan JSON
   */
  _parsePlanJSON(content) {
    try {
      // Clean markdown indicators
      let cleanContent = content.trim();
      if (cleanContent.includes('```json')) {
        cleanContent = cleanContent.split('```json')[1].split('```')[0];
      } else if (cleanContent.includes('```')) {
        cleanContent = cleanContent.split('```')[1].split('```')[0];
      }

      const parsed = JSON.parse(cleanContent.trim());

      // Validate required fields
      if (!parsed.title || !parsed.objective || !Array.isArray(parsed.todos)) {
        throw new Error('Invalid plan structure: missing required fields');
      }

      return parsed;
    } catch (error) {
      console.error('Failed to parse plan JSON:', error);
      throw error;
    }
  }

  /**
   * Enrich plan with execution metadata
   */
  _enrichPlanWithMetadata(planData, sourceMessage, intent, complexity) {
    const todos = planData.todos.map((todo, index) => ({
      ...todo,
      order: index,
      // Convert dependsOn indices to todo IDs (will be set after creation)
      dependsOn: (todo.dependsOn || []).map(depIndex => `todo_step_${depIndex}`),
      // Infer mutating status for approval mode
      approvalMode: todo.approvalMode || this._inferApprovalMode(todo.actionType),
      // Add retry policy
      retryPolicy: {
        max_attempts: todo.approvalMode === 'manual' ? 1 : 3,
        backoff_ms: 1000
      },
      // Add input schema based on action type
      inputSchema: this._getInputSchemaForAction(todo.actionType)
    }));

    return {
      title: planData.title,
      objective: planData.objective,
      assumptions: planData.assumptions || [],
      questionsAnswered: planData.questionsAnswered || [],
      acceptanceCriteria: planData.acceptanceCriteria || [],
      todos,
      riskLevel: planData.riskLevel || 'medium',
      requiresApproval: planData.requiresApproval !== false // default true
    };
  }

  /**
   * Infer approval mode based on action type
   */
  _inferApprovalMode(actionType) {
    const manualActions = [
      'send_email',
      'arcus_outreach',
      'arcus_auto_pilot',
      'schedule_meeting',
      'notion_create_page',
      'notion_append',
      'tasks_complete',
      'execute_plan'
    ];
    return manualActions.includes(actionType) ? 'manual' : 'auto';
  }

  /**
   * Get input schema for action type
   */
  _getInputSchemaForAction(actionType) {
    const schemas = {
      search_email: {
        query: { type: 'string', required: true },
        limit: { type: 'number', default: 10 },
        dateRange: { type: 'string', optional: true }
      },
      read_thread: {
        threadId: { type: 'string', required: true }
      },
      draft_reply: {
        threadId: { type: 'string', required: true },
        tone: { type: 'string', default: 'professional' },
        keyPoints: { type: 'array', optional: true }
      },
      send_email: {
        to: { type: 'string', required: true },
        subject: { type: 'string', required: true },
        body: { type: 'string', required: true },
        cc: { type: 'array', optional: true }
      },
      schedule_meeting: {
        attendees: { type: 'array', required: true },
        date: { type: 'string', required: true },
        time: { type: 'string', required: true },
        duration: { type: 'number', default: 30 },
        agenda: { type: 'string', optional: true }
      },
      notion_create_page: {
        title: { type: 'string', required: true },
        content: { type: 'string', optional: true },
        databaseId: { type: 'string', optional: true },
        parentPageId: { type: 'string', optional: true },
        tags: { type: 'array', optional: true }
      },
      tasks_add_tasks: {
        tasks: { type: 'array', required: true },
        taskListId: { type: 'string', optional: true },
        taskListTitle: { type: 'string', optional: true }
      },
      analyze_data: {
        metricType: { type: 'string', required: true },
        dateRange: { type: 'string', required: true }
      },
      generic_task: {
        taskName: { type: 'string', required: true },
        params: { type: 'object', default: {} }
      }
    };

    return schemas[actionType] || schemas.generic_task;
  }

  /**
   * Infer canvas type from intent and todos
   */
  _inferCanvasType(intent, todos) {
    const actionTypes = todos.map(t => t.actionType);

    if (actionTypes.includes('send_email') || actionTypes.includes('draft_reply')) {
      return 'email_draft';
    }
    if (actionTypes.includes('schedule_meeting')) {
      return 'meeting_schedule';
    }
    if (actionTypes.includes('analyze_data')) {
      return 'analytics';
    }
    if (intent === 'multi_step' || intent === 'execute_plan') {
      return 'action_plan';
    }

    return 'summary';
  }

  /**
   * Generate thinking blocks for UI display
   */
  _generateThinkingBlocks(plan) {
    return [{
      id: `plan-${Date.now()}`,
      title: plan.title,
      status: 'active',
      initialContext: `Planning execution for: ${plan.objective}`,
      steps: plan.todos.map((todo, i) => ({
        id: `step-${i}`,
        label: todo.title,
        status: 'pending',
        type: this._mapActionTypeToStepType(todo.actionType)
      })),
      interimConclusion: `Created ${plan.todos.length} step execution plan with ${plan.todos.filter(t => t.approvalMode === 'manual').length} requiring approval`,
      nextActionContext: 'Waiting for user approval to begin execution'
    }];
  }

  /**
   * Map action type to step type for UI
   */
  _mapActionTypeToStepType(actionType) {
    const mapping = {
      search_email: 'search',
      read_thread: 'read',
      draft_reply: 'draft',
      send_email: 'execute',
      schedule_meeting: 'execute',
      notion_create_page: 'execute',
      notion_append: 'execute',
      tasks_add_tasks: 'execute',
      analyze_data: 'analyze',
      generic_task: 'think'
    };
    return mapping[actionType] || 'think';
  }

  /**
   * Fallback plan generation when AI fails (uses DB)
   */
  async _generateFallbackPlan({ message, runId, conversationId, intent, complexity }) {
    const fallbackTodos = [
      {
        title: 'Analyze request and gather context',
        description: 'Understand user intent and required inputs',
        actionType: 'generic_task',
        order: 0,
        dependsOn: [],
        approvalMode: 'auto'
      },
      {
        title: 'Execute primary action',
        description: 'Perform the main task requested by user',
        actionType: 'generic_task',
        order: 1,
        dependsOn: ['todo_step_0'],
        approvalMode: 'manual'
      },
      {
        title: 'Verify and report results',
        description: 'Confirm completion and present outcomes',
        actionType: 'generic_task',
        order: 2,
        dependsOn: ['todo_step_1'],
        approvalMode: 'auto'
      }
    ];

    const { planId, plan } = await this.planEngine.createPlan({
      runId,
      conversationId,
      title: `Plan: ${intent}`,
      objective: message,
      todos: fallbackTodos,
      intent,
      complexity,
      canvasType: 'action_plan'
    });

    return {
      planId,
      plan,
      todos: fallbackTodos,
      thinkingBlocks: this._generateThinkingBlocks({
        title: `Plan: ${intent}`,
        objective: message,
        todos: fallbackTodos
      })
    };
  }

  /**
   * Generate a fallback plan purely in-memory (no DB calls).
   * Used when both AI generation AND DB persistence fail.
   */
  _generateInMemoryFallbackPlan({ message, intent = 'general', complexity = 'simple' }) {
    const fallbackPlanId = `plan_fallback_${Date.now()}`;
    const fallbackTodos = [
      {
        todo_id: `${fallbackPlanId}_todo_0`,
        title: 'Analyze request and gather context',
        description: 'Understand user intent and required inputs',
        action_type: 'generic_task',
        status: 'pending',
        sort_order: 0,
        depends_on: [],
        approval_mode: 'auto',
        attempt_count: 0,
        result_payload: null
      },
      {
        todo_id: `${fallbackPlanId}_todo_1`,
        title: 'Execute primary action',
        description: 'Perform the main task requested by user',
        action_type: 'generic_task',
        status: 'pending',
        sort_order: 1,
        depends_on: [`${fallbackPlanId}_todo_0`],
        approval_mode: 'manual',
        attempt_count: 0,
        result_payload: null
      },
      {
        todo_id: `${fallbackPlanId}_todo_2`,
        title: 'Verify and report results',
        description: 'Confirm completion and present outcomes',
        action_type: 'generic_task',
        status: 'pending',
        sort_order: 2,
        depends_on: [`${fallbackPlanId}_todo_1`],
        approval_mode: 'auto',
        attempt_count: 0,
        result_payload: null
      }
    ];

    const fallbackPlan = {
      plan_id: fallbackPlanId,
      title: `Plan: ${message.substring(0, 50)}`,
      objective: message,
      status: 'draft',
      version: 1,
      locked: false,
      intent,
      complexity,
      canvas_type: 'action_plan',
      assumptions: JSON.stringify(['Request understood from context']),
      questions_answered: JSON.stringify(['What is the core request?']),
      acceptance_criteria: JSON.stringify(['Task completed as requested']),
      created_at: new Date().toISOString()
    };

    return {
      planId: fallbackPlanId,
      plan: fallbackPlan,
      todos: fallbackTodos,
      thinkingBlocks: this._generateThinkingBlocks({
        title: fallbackPlan.title,
        objective: message,
        todos: fallbackTodos.map(t => ({ ...t, actionType: t.action_type }))
      })
    };
  }

  /**
   * Convert an approved plan to executable todo graph and begin execution
   */
  async beginExecution(planId, operatorSteps = []) {
    return this.planEngine.convertPlanToTodoGraph(planId, operatorSteps);
  }

  /**
   * Get next ready todo for execution
   */
  async getNextExecutableTodo(planId) {
    return this.planEngine.getNextReadyTodo(planId);
  }

  /**
   * Transition a todo to a new status
   */
  async transitionTodo(todoId, targetStatus, resultPayload = null, errorMessage = null) {
    return this.planEngine.transitionTodo(todoId, targetStatus, resultPayload, errorMessage);
  }

  /**
   * Get full plan with all todos
   */
  async getFullPlan(planId) {
    const [plan, todos] = await Promise.all([
      this.planEngine.getPlan(planId),
      this.planEngine.getTodos(planId)
    ]);

    if (!plan) return null;

    return {
      ...plan,
      todos
    };
  }
}

export default PlanModeEngine;
