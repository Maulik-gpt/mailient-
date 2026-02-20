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
      status: 'draft', // Draft -> Thinking -> Executing -> Waiting on them / Done
      linkedThreadIds: [],
      steps,
      planCards: [],
      auditTrail: [],
      createdAt,
      updatedAt: createdAt,
      conversationId,
      maxNudges: 2, // Default to 2 follow-ups
      nudgeCount: 0,
      lastNudgeAt: null
    };

    await this.db.createMission(this.userEmail, mission);

    mission.auditTrail.push(this._auditEntry(mission.id, 'mission_created', {
      goal
    }));

    return mission;
  }

  /**
   * Execute the mission until it requires user intervention or is finished.
   */
  async executeMission(mission, context = {}) {
    let currentStep = mission.steps.find(s => s.status === 'pending');
    let lastResult = null;
    let lastError = null;
    let missionProcess = null;

    // Execute steps as long as they are automated and the mission status allows
    while (currentStep && mission.status !== 'waiting_on_user' && mission.status !== 'waiting_on_other') {
      currentStep.status = 'running';
      currentStep.startedAt = new Date().toISOString();

      const missionContext = {
        ...context,
        missionId: mission.id,
        previousResults: mission.steps
          .filter(s => s.status === 'done')
          .reduce((acc, s) => ({ ...acc, [s.actionType]: s.result }), {})
      };

      // Set process label for UI
      missionProcess = this._buildProcess(mission, 'executing', currentStep.label);

      try {
        let stepResult = null;
        switch (currentStep.actionType) {
          case 'search_email': {
            stepResult = await this.tools.searchEmail(currentStep.description || mission.goal, {});
            currentStep.result = stepResult;

            // If we found exactly one thread or have a reason to proceed, we don't necessarily stop
            // But if it's ambiguous, we wait
            if (stepResult.count > 1 && !missionContext.selectedThreadId) {
              // For now, let's pick the first one to be "proactive" but flag it
              // Or if we want strict behavior, we wait:
              // mission.status = 'waiting_on_user';
            }
            break;
          }

          case 'read_thread': {
            const searchResult = missionContext.previousResults?.search_email;
            const threadId = missionContext.threadId || mission.linkedThreadIds[0] || searchResult?.threads?.[0]?.thread_id;
            if (threadId) {
              if (!mission.linkedThreadIds.includes(threadId)) mission.linkedThreadIds.push(threadId);
              stepResult = await this.tools.getThread(threadId);
              currentStep.result = stepResult;
            }
            break;
          }

          case 'draft_reply': {
            const threadResult = missionContext.previousResults?.read_thread;
            const messages = threadResult?.messages || [];

            // Plan the action
            const aiPlan = await this.arcusAI.planNextAction(mission.goal, {
              lastMessages: messages,
              userPreferences: context.userPreferences || {}
            });

            // Autonomous Execution - The AI decided what to do, so we DO it.
            if (aiPlan.next_action === 'draft_reply' || aiPlan.next_action === 'send_email') {
              // In this spec, 'draft_reply' from the planner means 'prepare and send'
              const sendResult = await this.tools.sendEmail({
                threadId: mission.linkedThreadIds[0],
                to: aiPlan.send_to,
                cc: aiPlan.cc,
                subject: aiPlan.draft_subject,
                body: aiPlan.draft_body
              }, aiPlan.safety_flags);

              stepResult = sendResult;
              mission.status = 'waiting_on_other';
            } else if (aiPlan.next_action === 'create_meeting') {
              const meetingResult = await this.tools.createMeeting({
                title: aiPlan.draft_subject,
                attendees: aiPlan.send_to,
                slot: aiPlan.meeting_details?.slot,
                notes: aiPlan.draft_body
              });

              stepResult = meetingResult;
              mission.status = 'done';
            } else {
              // Clarify or other non-immediate actions
              mission.status = 'waiting_on_user';
              stepResult = aiPlan;
            }

            currentStep.result = stepResult;
            break;
          }

          default:
            break;
        }

        currentStep.status = 'done';
        currentStep.completedAt = new Date().toISOString();
        lastResult = stepResult;

        mission.auditTrail.push(
          this._auditEntry(mission.id, currentStep.actionType, {
            stepId: currentStep.id,
            result: stepResult
          })
        );
      } catch (e) {
        console.error('Step execution failed:', e);
        currentStep.status = 'failed';
        currentStep.error = e.message;
        lastError = e;
        mission.status = 'waiting_on_user'; // Stop for error
        break;
      }

      // Check for next step
      currentStep = mission.steps.find(s => s.status === 'pending');
    }

    if (!currentStep && mission.status === 'executing') {
      // If we finished all steps and status is still generic, finalize
      mission.status = 'done';
    }

    mission.updatedAt = new Date().toISOString();
    await this.db.updateMission(this.userEmail, mission);

    return { mission, result: lastResult, error: lastError, process: missionProcess };
  }

  /**
   * Monitor missions and trigger nudges if needed.
   */
  async checkAndTriggerNudge(missionId) {
    const mission = await this.db.getMissionById?.(this.userEmail, missionId);
    if (!mission || mission.status !== 'waiting_on_other') return null;

    if (mission.nudgeCount >= (mission.maxNudges || 2)) {
      mission.status = 'waiting_on_user';
      mission.updatedAt = new Date().toISOString();
      await this.db.updateMission(this.userEmail, mission);
      return {
        mission,
        message: "I've followed up a few times now with no response. How would you like to proceed?"
      };
    }

    // Trigger nudge flow
    mission.nudgeCount++;
    mission.lastNudgeAt = new Date().toISOString();

    // Create a "Follow-up" action step
    const nudgeStep = {
      id: `step_nudge_${uuidv4()}`,
      order: mission.steps.length + 1,
      actionType: 'draft_reply',
      label: `Follow-up #${mission.nudgeCount}`,
      description: `Following up on: ${mission.goal}`,
      status: 'pending'
    };
    mission.steps.push(nudgeStep);

    // Execute the nudge autonomously
    return await this.executeMission(mission);
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

