import { ArcusAIService } from './arcus-ai';
import { DatabaseService } from './supabase';
import { MissionTools } from './mission-tools';

const uuidv4 = () => crypto.randomUUID();

/**
 * Arcus Mission Control
 * Chat-to-Mission state machine using sandboxed tools.
 */
export class ArcusMissionService {
  constructor(userEmail) {
    this.userEmail = userEmail;
    this.db = new DatabaseService();
    this.arcusAI = new ArcusAIService();
    this.tools = new MissionTools(userEmail);
  }

  /**
   * Create a new mission from a chat goal.
   */
  async createMission(goal, conversationId) {
    const missionId = `mission_${uuidv4()}`;
    const createdAt = new Date().toISOString();

    const steps = [
      {
        id: `step_${uuidv4()}`,
        order: 1,
        actionType: 'search_email',
        label: 'Find the right thread or contact',
        description: goal,
        status: 'pending'
      },
      {
        id: `step_${uuidv4()}`,
        order: 2,
        actionType: 'read_thread',
        label: 'Read the latest context',
        description: '',
        status: 'pending'
      },
      {
        id: `step_${uuidv4()}`,
        order: 3,
        actionType: 'draft_reply',
        label: 'Draft a reply or scheduling email',
        description: goal,
        status: 'pending'
      }
    ];

    const mission = {
      id: missionId,
      goal,
      status: 'draft',
      linkedThreadIds: [],
      steps,
      planCards: [],
      auditTrail: [],
      createdAt,
      updatedAt: createdAt,
      conversationId,
      nudgeCount: 0
    };

    await this.db.createMission(this.userEmail, mission);

    mission.auditTrail.push(this._auditEntry(mission.id, 'mission_created', {
      goal
    }));

    return mission;
  }

  /**
   * Execute the next pending step in the mission.
   */
  async executeNextStep(mission, context = {}) {
    const currentStep = mission.steps.find(s => s.status === 'pending');

    if (!currentStep) {
      mission.status = 'done';
      mission.updatedAt = new Date().toISOString();
      await this.db.updateMission(this.userEmail, mission);
      return {
        mission,
        result: null,
        error: null,
        process: this._buildProcess(mission, 'done', 'Mission completed'),
        planCard: null
      };
    }

    currentStep.status = 'running';
    currentStep.startedAt = new Date().toISOString();

    const missionContext = {
      ...context,
      missionId: mission.id,
      previousResults: mission.steps
        .filter(s => s.status === 'done')
        .reduce((acc, s) => ({ ...acc, [s.actionType]: s.result }), {})
    };

    const process = this._buildProcess(mission, 'executing', currentStep.label, [
      `Executing: ${currentStep.label}...`
    ]);

    let result = null;
    let error = null;
    let planCard = null;

    try {
      switch (currentStep.actionType) {
        case 'search_email': {
          result = await this.tools.searchEmail(currentStep.description || mission.goal, {});
          currentStep.result = result;

          if (result.count > 1 && !missionContext.selectedThreadId) {
            mission.status = 'waiting_on_user';
            process.thoughts.push({
              id: `t_${uuidv4()}`,
              text: `Found ${result.count} matching threads. I’ll ask you to pick the right one.`,
              timestamp: new Date().toISOString(),
              phase: 'executing'
            });
          }
          break;
        }

        case 'read_thread': {
          const searchResult = missionContext.previousResults?.search_email;
          const threadId =
            missionContext.threadId ||
            mission.linkedThreadIds[0] ||
            searchResult?.threads?.[0]?.thread_id ||
            null;

          if (threadId && !mission.linkedThreadIds.includes(threadId)) {
            mission.linkedThreadIds.push(threadId);
          }

          result = await this.tools.getThread(threadId);
          currentStep.result = result;
          break;
        }

        case 'draft_reply': {
          const threadResult = missionContext.previousResults?.read_thread;
          const messages = threadResult?.messages || [];
          const subject = messages[0]?.subject || 'Re: your email';

          const aiPlan = await this.arcusAI.planNextAction(mission.goal, {
            threadSummary: '',
            lastMessages: messages,
            extractedFacts: {},
            userPreferences: context.userPreferences || {}
          });

          const safetyFlags = aiPlan.safety_flags || [];

          planCard = {
            id: `card_${uuidv4()}`,
            missionId: mission.id,
            actionType: aiPlan.next_action || 'draft_reply',
            recipients: aiPlan.send_to || [],
            cc: aiPlan.cc || [],
            subject: aiPlan.draft_subject || subject,
            body: aiPlan.draft_body || '',
            meetingDetails: undefined,
            confidence: aiPlan.confidence ?? 0.8,
            assumptions: aiPlan.assumptions || [],
            questionsForUser: aiPlan.questions_for_user || [],
            safetyFlags,
            status: 'pending',
            createdAt: new Date().toISOString()
          };

          mission.planCards.push(planCard);
          mission.status = 'waiting_on_user';
          result = planCard;

          process.thoughts.push({
            id: `t_${uuidv4()}`,
            text: 'Drafted a response. Waiting for your approval before doing anything.',
            timestamp: new Date().toISOString(),
            phase: 'executing'
          });
          break;
        }

        case 'schedule_check': {
          result = await this.tools.scheduleCheck(mission.id, new Date());
          currentStep.result = result;
          mission.status = 'waiting_on_other';
          break;
        }

        default:
          break;
      }

      currentStep.status = 'done';
    } catch (e) {
      console.error('Step execution failed:', e);
      currentStep.status = 'failed';
      currentStep.error = e.message;
      error = e;
    }

    currentStep.completedAt = new Date().toISOString();
    mission.updatedAt = new Date().toISOString();

    mission.auditTrail.push(
      this._auditEntry(mission.id, currentStep.actionType, {
        stepId: currentStep.id,
        result,
        error: error ? error.message : null
      })
    );

    await this.db.updateMission(this.userEmail, mission);

    return { mission, result, error, process, planCard };
  }

  _buildProcess(mission, phase, label, thoughtTexts = []) {
    const now = new Date().toISOString();
    return {
      id: `proc_${Date.now()}`,
      phase,
      label,
      steps: mission.steps,
      isExpanded: true,
      thoughts: thoughtTexts.map((text, idx) => ({
        id: `t_${idx}_${uuidv4()}`,
        text,
        timestamp: now,
        phase
      }))
    };
  }

  _auditEntry(missionId, actionType, extra = {}) {
    return {
      id: `audit_${uuidv4()}`,
      missionId,
      timestamp: new Date().toISOString(),
      actionType,
      approvedBy: 'system',
      ...extra
    };
  }
}

