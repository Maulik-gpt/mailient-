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

    const isScheduling = /schedule|meeting|call|demo|calendar|slot/i.test(goal);
    const isCatchUp = /catch up|summarize|what did i miss|unread/i.test(goal);

    const steps = [
      {
        id: `step_${uuidv4()}`,
        order: 1,
        actionType: 'search_email',
        label: isCatchUp ? 'Searching for recent unread emails' : 'Find the right thread or contact',
        description: isCatchUp ? 'is:unread' : goal,
        status: 'pending'
      },
      {
        id: `step_${uuidv4()}`,
        order: 2,
        actionType: 'read_thread',
        label: 'Analyzing thread context',
        description: '',
        status: 'pending'
      }
    ];

    // Add availability check if it's a scheduling task
    if (isScheduling) {
      steps.push({
        id: `step_${uuidv4()}`,
        order: 3,
        actionType: 'get_availability',
        label: 'Check availability (Google/Cal.com)',
        description: goal,
        status: 'pending'
      });
    }

    steps.push({
      id: `step_${uuidv4()}`,
      order: isScheduling ? 4 : 3,
      actionType: 'draft_reply',
      label: 'Drafting response',
      description: goal,
      status: 'pending'
    });

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
      maxNudges: 2,
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

    // Initial Thinking Phase
    if (mission.status === 'draft' || mission.status === 'thinking') {
      const thoughts = await this.arcusAI.generateThoughts(mission.goal, context);
      missionProcess = this._buildProcess(mission, 'thinking', 'Thinking...', [thoughts]);
      mission.status = 'thinking';
    }
    mission.status = 'executing';

    // Execute steps as long as they are automated and the mission status allows
    while (currentStep && mission.status === 'executing') {
      currentStep.status = 'running';
      currentStep.startedAt = new Date().toISOString();

      const missionContext = {
        ...context,
        missionId: mission.id,
        previousResults: mission.steps
          .filter(s => s.status === 'done')
          .reduce((acc, s) => ({ ...acc, [s.actionType]: s.result }), {})
      };

      // Set process label for UI based on action type
      const phase = currentStep.actionType === 'search_email' || currentStep.actionType === 'get_availability' ? 'searching' : 'executing';
      const label = phase === 'searching' ? 'Searching...' : 'Executing...';

      missionProcess = this._buildProcess(mission, phase, label);

      try {
        let stepResult = null;
        switch (currentStep.actionType) {
          case 'search_email': {
            stepResult = await this.tools.searchEmail(currentStep.description || mission.goal, {});
            currentStep.result = stepResult;

            // Check for tool-level errors
            if (stepResult.error) {
              currentStep.label = `Search failed: ${stepResult.error}`;
              currentStep.status = 'failed';
              currentStep.error = stepResult.error;
              mission.status = 'waiting_on_user';
              lastError = new Error(stepResult.error);
              break;
            }

            currentStep.label = stepResult.count > 0 ? `Found ${stepResult.count} threads` : 'No threads found';
            break;
          }

          case 'read_thread': {
            const searchResult = missionContext.previousResults?.search_email;
            const threadId = missionContext.threadId || mission.linkedThreadIds[0] || searchResult?.threads?.[0]?.thread_id;

            if (!threadId) {
              currentStep.label = 'No thread to read (search returned no results)';
              stepResult = { thread_id: null, messages: [], error: 'No thread ID available' };
              currentStep.result = stepResult;
              break;
            }

            if (!mission.linkedThreadIds.includes(threadId)) mission.linkedThreadIds.push(threadId);
            stepResult = await this.tools.getThread(threadId);
            currentStep.result = stepResult;

            if (stepResult.error) {
              currentStep.label = `Failed to read thread: ${stepResult.error}`;
              currentStep.status = 'failed';
              currentStep.error = stepResult.error;
              mission.status = 'waiting_on_user';
              lastError = new Error(stepResult.error);
              break;
            }

            const subject = searchResult?.threads?.find((t) => t.thread_id === threadId)?.subject || 'thread';
            currentStep.label = `Analyzed context from ${subject.substring(0, 30)}${subject.length > 30 ? '...' : ''}`;
            break;
          }

          case 'get_availability': {
            missionProcess = this._buildProcess(mission, 'searching', 'Checking availability...');
            stepResult = await this.tools.getAvailability({
              duration: 30
            });
            currentStep.result = stepResult;

            if (stepResult.error) {
              currentStep.label = `Availability check failed: ${stepResult.error}`;
              currentStep.status = 'failed';
              currentStep.error = stepResult.error;
              mission.status = 'waiting_on_user';
              lastError = new Error(stepResult.error);
              break;
            }

            currentStep.label = stepResult.slots?.length > 0 ? `Found ${stepResult.slots.length} available slots` : 'No available slots found';
            break;
          }

          case 'draft_reply': {
            const threadResult = missionContext.previousResults?.read_thread;
            const messages = threadResult?.messages || [];
            const searchResult = missionContext.previousResults?.search_email;

            // Build extractedFacts from completed steps
            const extractedFacts = {};
            if (searchResult) {
              extractedFacts.searchQuery = searchResult.query;
              extractedFacts.threadsFound = searchResult.count;
              extractedFacts.topThreadSubject = searchResult.threads?.[0]?.subject;
              extractedFacts.topThreadParticipants = searchResult.threads?.[0]?.participants;
            }
            if (threadResult) {
              extractedFacts.lastMessageFrom = messages[messages.length - 1]?.from;
              extractedFacts.lastMessageDate = messages[messages.length - 1]?.date;
              extractedFacts.threadSubject = messages[0]?.subject;
            }

            // Plan the action using Grounded Generation with FULL context
            const aiPlan = await this.arcusAI.planNextAction(mission.goal, {
              threadSummary: searchResult?.threads?.[0]?.snippet || '',
              lastMessages: messages,
              extractedFacts,
              userPreferences: context.userPreferences || {},
              conversationHistory: context.conversationHistory || []
            });

            // 1. Safety & Confidence Check
            const risky = aiPlan.safety_flags?.length > 0;
            const uncertain = aiPlan.confidence < 0.6 || aiPlan.questions_for_user?.length > 0;

            if (risky || uncertain) {
              mission.status = 'waiting_on_user';
              stepResult = {
                type: 'clarification_required',
                questions: aiPlan.questions_for_user,
                flags: aiPlan.safety_flags,
                plan: aiPlan
              };
              currentStep.result = stepResult;
              currentStep.label = aiPlan.questions_for_user?.[0]
                ? `Need clarification: ${aiPlan.questions_for_user[0].substring(0, 50)}...`
                : 'Needs your approval before proceeding';
              currentStep.status = 'done';
              break;
            }

            // 2. Autonomous Execution with validation

            if (aiPlan.next_action === 'send_email' || aiPlan.next_action === 'draft_reply') {
              const sendResult = await this.tools.sendEmail({
                threadId: mission.linkedThreadIds[0],
                to: aiPlan.send_to,
                cc: aiPlan.cc,
                subject: aiPlan.draft_subject,
                body: aiPlan.draft_body
              }, aiPlan.safety_flags);

              // VALIDATION: must have a real message_id
              if (!sendResult.message_id) {
                throw new Error('Send succeeded but no message_id returned. Email may not have been sent.');
              }
              stepResult = sendResult;
              mission.status = 'waiting_on_other';
              currentStep.label = `Sent email to ${(aiPlan.send_to || []).join(', ') || 'recipient'}`;

            } else if (aiPlan.next_action === 'create_draft') {
              const draftResult = await this.tools.createDraft({
                threadId: mission.linkedThreadIds[0],
                to: aiPlan.send_to,
                subject: aiPlan.draft_subject,
                body: aiPlan.draft_body
              });

              // VALIDATION: must have a real draft_id
              if (!draftResult.draft_id) {
                throw new Error('Draft creation succeeded but no draft_id returned.');
              }
              stepResult = draftResult;
              mission.status = 'waiting_on_user';
              currentStep.label = `Created draft for ${(aiPlan.send_to || []).join(', ') || 'recipient'}`;

            } else if (aiPlan.next_action === 'get_availability') {
              const availability = await this.tools.getAvailability({
                attendees: aiPlan.send_to,
                duration: 30
              });
              stepResult = availability;
              mission.status = 'waiting_on_user';
              currentStep.label = availability.slots?.length > 0
                ? `Found ${availability.slots.length} available slots`
                : 'No available slots found';

            } else if (aiPlan.next_action === 'summarize') {
              mission.status = 'done';
              stepResult = {
                type: 'summary',
                content: aiPlan.draft_body
              };
              currentStep.label = 'Summarized threads';

            } else if (aiPlan.next_action === 'create_meeting') {
              const meetingResult = await this.tools.createMeeting({
                title: aiPlan.draft_subject,
                attendees: aiPlan.send_to,
                slot: aiPlan.meeting_details?.slot,
                notes: aiPlan.draft_body
              });

              // VALIDATION: must have a real event_id
              if (!meetingResult.event_id) {
                throw new Error('Meeting creation succeeded but no event_id returned.');
              }
              // VALIDATION: meet_link must be a real Google Meet URL if present
              if (meetingResult.meet_link && !meetingResult.meet_link.startsWith('https://')) {
                meetingResult.meet_link = null; // Don't propagate fake links
              }
              stepResult = meetingResult;
              mission.status = 'done';
              currentStep.label = `Scheduled meeting: ${meetingResult.title || 'Event'}`;

            } else {
              // clarify or unknown action
              mission.status = 'waiting_on_user';
              stepResult = aiPlan;
              currentStep.label = 'Waiting for your input';
            }

            currentStep.result = stepResult;
            break;
          }

          default:
            break;
        }

        // Only mark as done if not already marked as failed inside the handler
        if (currentStep.status !== 'failed' && currentStep.status !== 'done') {
          currentStep.status = 'done';
        }
        currentStep.completedAt = new Date().toISOString();
        lastResult = stepResult;

        mission.auditTrail.push(
          this._auditEntry(mission.id, currentStep.actionType, {
            stepId: currentStep.id,
            result: stepResult
          })
        );

        // If the step failed or mission needs user input, stop the loop
        if (currentStep.status === 'failed' || mission.status !== 'executing') {
          break;
        }
      } catch (e) {
        console.error('Step execution failed:', e);
        currentStep.status = 'failed';
        currentStep.error = e.message;
        lastError = e;
        mission.status = 'waiting_on_user';

        // Log the failure in audit trail
        mission.auditTrail.push(
          this._auditEntry(mission.id, `${currentStep.actionType}_failed`, {
            stepId: currentStep.id,
            error: e.message
          })
        );
        break;
      }

      // Check for next step
      currentStep = mission.steps.find(s => s.status === 'pending');
    }

    if (!currentStep && mission.status === 'executing') {
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

    mission.nudgeCount++;
    mission.lastNudgeAt = new Date().toISOString();

    const nudgeStep = {
      id: `step_nudge_${uuidv4()}`,
      order: mission.steps.length + 1,
      actionType: 'draft_reply',
      label: `Follow-up #${mission.nudgeCount}`,
      description: `Following up on: ${mission.goal}`,
      status: 'pending'
    };
    mission.steps.push(nudgeStep);

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
