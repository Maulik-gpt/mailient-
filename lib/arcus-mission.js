import { ArcusAIService } from './arcus-ai';
import { DatabaseService } from './supabase';

const uuidv4 = () => crypto.randomUUID();

/**
 * Arcus Mission Control
 * Manages the agentic lifecycle: Goal -> Plan -> Execute -> Review
 */
export class ArcusMissionService {
    constructor(userEmail, gmailAccessToken) {
        this.userEmail = userEmail;
        this.gmailAccessToken = gmailAccessToken;
        this.db = new DatabaseService();
        this.arcusAI = new ArcusAIService(gmailAccessToken);
    }

    /**
     * Initialize a new mission from a user request
     */
    async createMission(goal, conversationId) {
        const missionId = `mission_${uuidv4()}`;

        // 1. Plan the mission using AI
        const plan = await this.arcusAI.planMission(goal);

        // 2. Create mission object
        const mission = {
            id: missionId,
            goal: goal,
            status: 'draft',
            linkedThreadIds: [],
            steps: plan.steps.map((step, index) => ({
                id: `step_${uuidv4()}`,
                order: index + 1,
                ...step,
                status: 'pending'
            })),
            planCards: [],
            auditTrail: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            conversationId: conversationId,
            nudgeCount: 0
        };

        // 3. Save to DB (mock for now, or real if we have a table)
        // await this.db.saveMission(mission);

        return mission;
    }

    /**
     * Execute the next step in a mission
     */
    async executeNextStep(mission, context = {}) {
        const currentStep = mission.steps.find(s => s.status === 'pending');

        if (!currentStep) {
            mission.status = 'done';
            return { mission, result: null, process: { phase: 'done', label: 'Mission completed' } };
        }

        // Mark running
        currentStep.status = 'running';
        currentStep.startedAt = new Date().toISOString();

        // Build context from previous steps
        const missionContext = {
            ...context,
            missionId: mission.id,
            previousResults: mission.steps
                .filter(s => s.status === 'done')
                .reduce((acc, s) => ({ ...acc, [s.actionType]: s.result }), {})
        };

        // Create process update
        const process = {
            id: `proc_${Date.now()}`,
            phase: 'executing',
            label: currentStep.label,
            steps: mission.steps,
            isExpanded: true,
            thoughts: [{ id: 't1', text: `Executing: ${currentStep.label}...`, timestamp: new Date().toISOString(), phase: 'executing' }]
        };

        let result = null;
        let error = null;

        try {
            // Execute based on action type
            switch (currentStep.actionType) {
                case 'search_email':
                    result = await this.executeSearchEmail(currentStep, missionContext);
                    // If results are ambiguous, we might want to pause here
                    if (result.count > 1 && !missionContext.selectedEmailId) {
                        mission.status = 'waiting_on_user';
                        process.thoughts.push({ id: 't2', text: `Found ${result.count} matching emails. Asking for clarification.`, timestamp: new Date().toISOString(), phase: 'executing' });
                    }
                    break;
                case 'read_thread':
                    // Use thread ID from previous search result if not provided
                    const searchResult = missionContext.previousResults?.search_email;
                    const threadId = missionContext.threadId || searchResult?.emails?.[0]?.threadId || searchResult?.emails?.[0]?.id;
                    result = await this.executeReadThread(currentStep, { ...missionContext, threadId });
                    break;
                case 'draft_reply':
                    // Use content from read_thread
                    const readResult = missionContext.previousResults?.read_thread;
                    const emailContent = missionContext.emailContent || readResult?.messages?.map(m => m.content).join('\n');
                    const subject = missionContext.subject || readResult?.subject;

                    const draft = await this.executeDraftReply(currentStep, { ...missionContext, emailContent, subject });
                    mission.planCards.push(draft);
                    mission.status = 'waiting_on_user';
                    result = draft;
                    break;
                case 'schedule_check':
                    result = await this.executeScheduleCheck(currentStep, missionContext);
                    break;
            }

            currentStep.status = 'done';
            currentStep.result = result;
        } catch (e) {
            console.error('Step execution failed:', e);
            currentStep.status = 'failed';
            currentStep.error = e.message;
            error = e;
        }

        currentStep.completedAt = new Date().toISOString();
        mission.updatedAt = new Date().toISOString();

        return { mission, result, error, process };
    }

    /**
   * Execute Email Search
   */
    async executeSearchEmail(step, context) {
        const query = step.query || context.query || 'newer_than:7d';
        // Mock realistic search results
        return {
            count: 2,
            emails: [
                { id: 'msg_101', threadId: 'thread_101', subject: 'Re: Q3 Report Review', from: 'Sarah Jenkins <sarah@example.com>', snippet: 'I have attached the preliminary figures for Q3...' },
                { id: 'msg_102', threadId: 'thread_102', subject: 'Project Alpha Updates', from: 'Sarah Jenkins <sarah@example.com>', snippet: 'Just checking in on the status of the Alpha implementation...' }
            ]
        };
    }

    /**
     * Execute Read Thread
     */
    async executeReadThread(step, context) {
        // Mock thread content to feed into the drafter
        return {
            threadId: 'thread_123',
            messages: [
                { role: 'user', content: 'Hi, can you review the Q3 report by Friday? - Sarah' }
            ]
        };
    }

    /**
     * Execute Draft Reply
     */
    async executeDraftReply(step, context) {
        // Use Arcus AI to generate draft
        const draft = await this.arcusAI.generateDraftReply(context.emailContent || '', {
            userName: 'User', // should come from context
            userEmail: this.userEmail,
            replyInstructions: step.description
        });

        return {
            id: `card_${uuidv4()}`,
            missionId: context.missionId,
            actionType: 'draft_reply',
            recipients: [draft.recipientEmail],
            subject: 'Re: ' + (context.subject || 'Meeting'), // simplified
            body: draft.draftContent,
            confidence: 0.9,
            assumptions: [],
            questionsForUser: [],
            safetyFlags: [], // implement safety check
            status: 'pending',
            createdAt: new Date().toISOString()
        };
    }

    async executeScheduleCheck(step, context) {
        // Logic to check calendar
        return { available: true };
    }
}
