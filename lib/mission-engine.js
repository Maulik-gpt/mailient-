/**
 * Mission Engine Service
 * Core agentic loop for Mailient Mission Control
 * 
 * Each mission runs through: Understand -> Plan -> Act -> Monitor -> Close
 */

import { DatabaseService } from './supabase.js';
import { ArcusAIService } from './arcus-ai.js';
import { decrypt } from './crypto.js';

export class MissionEngine {
    constructor() {
        this.db = new DatabaseService();
        this.arcus = new ArcusAIService();
    }

    // ─── CRUD ──────────────────────────────────────────────

    async createMission(userId, { title, successCondition, linkedThreadIds = [], linkedEmailIds = [], deadline = null, escalationRules = {} }) {
        const supabase = this.db.supabase;
        const { data, error } = await supabase
            .from('missions')
            .insert({
                user_id: userId,
                title,
                status: 'active',
                success_condition: successCondition,
                next_step: null,
                deadline,
                escalation_rules: escalationRules,
                linked_thread_ids: linkedThreadIds,
                linked_email_ids: linkedEmailIds,
                auto_detected: false,
                agent_actions_log: [],
                follow_up_count: 0
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create mission: ${error.message}`);
        return data;
    }

    async getMission(userId, missionId) {
        const supabase = this.db.supabase;
        const { data, error } = await supabase
            .from('missions')
            .select('*')
            .eq('id', missionId)
            .eq('user_id', userId)
            .single();

        if (error) return null;
        return data;
    }

    async getUserMissions(userId, filters = {}) {
        const supabase = this.db.supabase;
        let query = supabase
            .from('missions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.dueToday) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            query = query.gte('deadline', todayStart.toISOString()).lte('deadline', todayEnd.toISOString());
        }

        if (filters.atRisk) {
            // Missions that are active or waiting but stuck for > 3 days
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
            query = query.in('status', ['active', 'waiting']).lt('last_activity_at', threeDaysAgo);
        }

        const { data, error } = await query;
        if (error) throw new Error(`Failed to fetch missions: ${error.message}`);
        return data || [];
    }

    async updateMission(userId, missionId, updates) {
        const supabase = this.db.supabase;
        const { data, error } = await supabase
            .from('missions')
            .update({ ...updates, last_activity_at: new Date().toISOString() })
            .eq('id', missionId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw new Error(`Failed to update mission: ${error.message}`);
        return data;
    }

    async deleteMission(userId, missionId) {
        const supabase = this.db.supabase;
        const { error } = await supabase
            .from('missions')
            .delete()
            .eq('id', missionId)
            .eq('user_id', userId);

        if (error) throw new Error(`Failed to delete mission: ${error.message}`);
        return true;
    }

    // ─── AGENT LOOP ────────────────────────────────────────

    /**
     * Run one full iteration of the agent loop for a mission
     * Returns a structured result with what happened at each stage
     */
    async runAgentLoop(userId, missionId, session = null) {
        const mission = await this.getMission(userId, missionId);
        if (!mission) throw new Error('Mission not found');
        if (mission.status === 'completed' || mission.status === 'failed') {
            return { stage: 'skip', message: 'Mission already closed.', mission };
        }

        // Check autopilot rules
        const rules = await this.getAutopilotRules(userId);

        // 1. UNDERSTAND: summarize linked threads
        const understanding = await this.understand(mission, userId, session);

        // 2. PLAN: decide the next best move
        const plan = await this.plan(mission, understanding, rules);

        // 3. ACT: draft or queue the action
        const action = await this.act(mission, plan, userId, session, rules);

        // 4. MONITOR: check if we should escalate
        const monitorResult = this.monitor(mission, rules);

        // Log agent action
        const actionEntry = {
            timestamp: new Date().toISOString(),
            stage: 'agent_loop',
            understanding: understanding.summary,
            plan: plan.nextAction,
            action: action.description,
            monitor: monitorResult
        };

        const updatedLog = [...(mission.agent_actions_log || []), actionEntry];

        // Update mission
        const updates = {
            next_step: plan.nextAction,
            agent_actions_log: updatedLog,
            last_activity_at: new Date().toISOString()
        };

        if (monitorResult.shouldEscalate) {
            updates.status = 'at_risk';
        }

        if (plan.isComplete) {
            updates.status = 'completed';
            updates.outcome_log = plan.outcomeLog || 'Mission completed successfully.';
        }

        if (plan.isWaiting) {
            updates.status = 'waiting';
        }

        const updatedMission = await this.updateMission(userId, missionId, updates);

        return {
            stage: 'complete',
            understanding,
            plan,
            action,
            monitor: monitorResult,
            mission: updatedMission
        };
    }

    /**
     * Step 1: UNDERSTAND - Summarize the current state of the mission
     */
    async understand(mission, userId, session) {
        let emailContext = '';

        // Fetch linked email content if we have thread IDs
        if (mission.linked_thread_ids?.length > 0 || mission.linked_email_ids?.length > 0) {
            try {
                const emailThreads = await this.fetchLinkedEmails(userId, mission, session);
                emailContext = emailThreads;
            } catch (err) {
                console.warn('Could not fetch linked emails:', err.message);
                emailContext = '(Could not fetch linked email threads)';
            }
        }

        const prompt = `You are analyzing a mission to determine its current state.

Mission: "${mission.title}"
Success condition: "${mission.success_condition || 'Not specified'}"
Current status: ${mission.status}
Follow-ups sent so far: ${mission.follow_up_count}
Created: ${mission.created_at}
Last activity: ${mission.last_activity_at}

${emailContext ? `Linked email threads:\n${emailContext}` : 'No linked email threads.'}

${mission.agent_actions_log?.length > 0 ? `Previous agent actions:\n${JSON.stringify(mission.agent_actions_log.slice(-3), null, 2)}` : ''}

Provide a brief summary (2-3 sentences) of where this mission stands right now. What's been done? What's still needed? Is anyone blocking progress?`;

        const summary = await this.arcus.generateResponse(prompt, {
            userEmail: userId,
            userName: 'Mission Agent'
        });

        return { summary, emailContext };
    }

    /**
     * Step 2: PLAN - Decide the best next action
     */
    async plan(mission, understanding, rules) {
        const prompt = `Based on this mission analysis, decide the ONE best next action.

Mission: "${mission.title}"
Success condition: "${mission.success_condition || 'Not specified'}"
Current state: ${understanding.summary}

Autopilot rules in effect:
${rules.map(r => `- ${r.rule_type}: ${JSON.stringify(r.rule_config)}`).join('\n') || 'No autopilot rules set.'}

Follow-ups already sent: ${mission.follow_up_count}
Deadline: ${mission.deadline || 'None'}

Respond in this exact JSON format (no markdown, no code blocks, just raw JSON):
{
  "nextAction": "Brief description of what to do next",
  "actionType": "draft_followup|draft_new|nudge|escalate|wait|close",
  "draftContent": "If actionType involves drafting, write the email here. Otherwise leave empty.",
  "draftTo": "recipient email if known, otherwise empty",
  "draftSubject": "email subject if drafting, otherwise empty",
  "isComplete": false,
  "isWaiting": false,
  "outcomeLog": "",
  "reasoning": "Why this is the best move right now"
}`;

        const response = await this.arcus.generateResponse(prompt, {
            userEmail: mission.user_id,
            userName: 'Mission Agent'
        });

        try {
            // Try to parse JSON from the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn('Could not parse plan JSON:', e.message);
        }

        // Fallback plan
        return {
            nextAction: 'Review mission manually - agent could not determine next step.',
            actionType: 'wait',
            draftContent: '',
            draftTo: '',
            draftSubject: '',
            isComplete: false,
            isWaiting: true,
            outcomeLog: '',
            reasoning: 'Could not parse AI response into a structured plan.'
        };
    }

    /**
     * Step 3: ACT - Execute the planned action
     */
    async act(mission, plan, userId, session, rules) {
        // Check if autopilot rules allow this action
        const canAutoAct = await this.canAutoAct(rules, plan, mission);

        if (plan.actionType === 'close') {
            return { description: 'Mission marked as complete.', autoSent: false, requiresApproval: false };
        }

        if (plan.actionType === 'wait') {
            return { description: 'Waiting for response. No action taken.', autoSent: false, requiresApproval: false };
        }

        if (plan.draftContent) {
            if (canAutoAct && plan.actionType === 'draft_followup') {
                // Auto-send is allowed by autopilot rules
                try {
                    await this.sendEmail(userId, session, {
                        to: plan.draftTo,
                        subject: plan.draftSubject,
                        content: plan.draftContent
                    });

                    // Increment follow-up count
                    await this.updateMission(userId, mission.id, {
                        follow_up_count: (mission.follow_up_count || 0) + 1
                    });

                    return {
                        description: `Auto-sent follow-up to ${plan.draftTo}: "${plan.draftSubject}"`,
                        autoSent: true,
                        requiresApproval: false,
                        draftContent: plan.draftContent
                    };
                } catch (err) {
                    return {
                        description: `Tried to auto-send but failed: ${err.message}. Draft ready for manual review.`,
                        autoSent: false,
                        requiresApproval: true,
                        draftContent: plan.draftContent
                    };
                }
            }

            // Draft only, requires user approval
            return {
                description: `Drafted ${plan.actionType}: "${plan.draftSubject}" to ${plan.draftTo}`,
                autoSent: false,
                requiresApproval: true,
                draftContent: plan.draftContent,
                draftTo: plan.draftTo,
                draftSubject: plan.draftSubject
            };
        }

        return { description: plan.nextAction, autoSent: false, requiresApproval: false };
    }

    /**
     * Step 4: MONITOR - Check if mission needs escalation
     */
    monitor(mission, rules) {
        const now = new Date();
        const lastActivity = new Date(mission.last_activity_at);
        const daysSinceActivity = (now - lastActivity) / (1000 * 60 * 60 * 24);

        // Check deadline
        let deadlineWarning = null;
        if (mission.deadline) {
            const deadline = new Date(mission.deadline);
            const daysUntilDeadline = (deadline - now) / (1000 * 60 * 60 * 24);
            if (daysUntilDeadline < 0) {
                deadlineWarning = 'OVERDUE';
            } else if (daysUntilDeadline < 1) {
                deadlineWarning = 'Due today';
            } else if (daysUntilDeadline < 2) {
                deadlineWarning = 'Due tomorrow';
            }
        }

        // Check follow-up limits from rules
        const followUpRule = rules.find(r => r.rule_type === 'follow_up_limit' && r.enabled);
        const maxFollowUps = followUpRule?.rule_config?.max_follow_ups ?? 3;
        const followUpLimitReached = (mission.follow_up_count || 0) >= maxFollowUps;

        const shouldEscalate = daysSinceActivity > 3 && !followUpLimitReached;

        return {
            daysSinceActivity: Math.round(daysSinceActivity * 10) / 10,
            deadlineWarning,
            followUpLimitReached,
            shouldEscalate,
            reason: shouldEscalate
                ? `No activity for ${Math.round(daysSinceActivity)} days`
                : deadlineWarning ? deadlineWarning : null
        };
    }

    /**
     * Step 5: CLOSE - Mark mission done and log outcome
     */
    async closeMission(userId, missionId, outcome = 'Completed') {
        return this.updateMission(userId, missionId, {
            status: 'completed',
            outcome_log: outcome
        });
    }

    // ─── AUTOPILOT RULES ──────────────────────────────────

    async getAutopilotRules(userId) {
        const supabase = this.db.supabase;
        const { data, error } = await supabase
            .from('autopilot_rules')
            .select('*')
            .eq('user_id', userId)
            .eq('enabled', true);

        if (error) {
            console.warn('Error fetching autopilot rules:', error.message);
            return [];
        }
        return data || [];
    }

    async setAutopilotRule(userId, ruleType, ruleConfig, enabled = true) {
        const supabase = this.db.supabase;

        // Upsert: update if same rule_type exists, otherwise insert
        const { data: existing } = await supabase
            .from('autopilot_rules')
            .select('id')
            .eq('user_id', userId)
            .eq('rule_type', ruleType)
            .single();

        if (existing) {
            const { data, error } = await supabase
                .from('autopilot_rules')
                .update({ rule_config: ruleConfig, enabled })
                .eq('id', existing.id)
                .select()
                .single();
            if (error) throw new Error(`Failed to update rule: ${error.message}`);
            return data;
        } else {
            const { data, error } = await supabase
                .from('autopilot_rules')
                .insert({ user_id: userId, rule_type: ruleType, rule_config: ruleConfig, enabled })
                .select()
                .single();
            if (error) throw new Error(`Failed to create rule: ${error.message}`);
            return data;
        }
    }

    async getAllAutopilotRules(userId) {
        const supabase = this.db.supabase;
        const { data, error } = await supabase
            .from('autopilot_rules')
            .select('*')
            .eq('user_id', userId);

        if (error) return [];
        return data || [];
    }

    // ─── AUTO-DETECT MISSIONS ─────────────────────────────

    async autoDetectMissions(userId, session) {
        try {
            // Fetch recent emails
            const userTokens = await this.db.getUserTokens(userId);
            if (!userTokens?.encrypted_access_token) return [];

            const accessToken = decrypt(userTokens.encrypted_access_token);
            const refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';

            const { GmailService } = await import('./gmail.ts');
            const gmailService = new GmailService(accessToken, refreshToken);

            // Get recent threads that might need action
            const emailsResponse = await gmailService.getEmails(15, 'is:inbox newer_than:7d', null, 'internalDate desc');
            const messages = emailsResponse?.messages || [];

            if (messages.length === 0) return [];

            // Fetch details for each email
            const emailSummaries = [];
            for (const msg of messages.slice(0, 10)) {
                try {
                    const details = await gmailService.getEmailDetails(msg.id);
                    const parsed = gmailService.parseEmailData(details);
                    emailSummaries.push({
                        id: msg.id,
                        threadId: parsed.threadId,
                        from: parsed.from,
                        subject: parsed.subject,
                        snippet: parsed.snippet,
                        date: parsed.date
                    });
                } catch (e) {
                    // skip
                }
            }

            if (emailSummaries.length === 0) return [];

            // Ask AI to detect potential missions
            const prompt = `Analyze these recent emails and suggest potential Missions (goal-oriented tasks the user should track).

Emails:
${emailSummaries.map((e, i) => `${i + 1}. From: ${e.from} | Subject: ${e.subject} | Preview: ${e.snippet} | Date: ${e.date}`).join('\n')}

For each detected mission, respond in this JSON array format (no markdown, no code blocks):
[
  {
    "title": "Short mission title like 'Get meeting with Alex'",
    "successCondition": "What done looks like",
    "linkedThreadIds": ["threadId if available"],
    "linkedEmailIds": ["emailId"],
    "reasoning": "Why this should be a mission"
  }
]

Only suggest missions for emails that clearly need follow-up, a decision, or action. Skip newsletters, notifications, and marketing emails. Return an empty array [] if nothing qualifies.`;

            const response = await this.arcus.generateResponse(prompt, {
                userEmail: userId,
                userName: 'Mission Agent'
            });

            try {
                const jsonMatch = response.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                console.warn('Could not parse auto-detect JSON:', e.message);
            }

            return [];
        } catch (err) {
            console.error('Auto-detect missions error:', err);
            return [];
        }
    }

    // ─── HELPERS ───────────────────────────────────────────

    async canAutoAct(rules, plan, mission) {
        // Check all autopilot rules to see if this action is allowed automatically
        const autoSendRule = rules.find(r => r.rule_type === 'auto_send' && r.enabled);
        if (!autoSendRule) return false; // No auto-send rule = always require approval

        // Check follow-up limit
        const followUpRule = rules.find(r => r.rule_type === 'follow_up_limit' && r.enabled);
        if (followUpRule) {
            const max = followUpRule.rule_config.max_follow_ups || 2;
            if ((mission.follow_up_count || 0) >= max) return false;
        }

        // Check new contact approval
        const newContactRule = rules.find(r => r.rule_type === 'new_contact_approval' && r.enabled);
        if (newContactRule && newContactRule.rule_config.require_approval) {
            // For new contacts, always require approval (we'd need contact history to check)
            // For now, always require approval for new contacts
            return false;
        }

        // Check time window
        const timeRule = rules.find(r => r.rule_type === 'time_window' && r.enabled);
        if (timeRule) {
            const now = new Date();
            const hour = now.getHours();
            const startHour = timeRule.rule_config.start_hour ?? 9;
            const endHour = timeRule.rule_config.end_hour ?? 18;
            if (hour < startHour || hour >= endHour) return false;
        }

        // Check pricing approval
        const pricingRule = rules.find(r => r.rule_type === 'pricing_approval' && r.enabled);
        if (pricingRule && pricingRule.rule_config.require_approval) {
            // Check if draft mentions pricing keywords
            const pricingKeywords = ['price', 'pricing', 'cost', 'rate', 'quote', 'invoice', 'payment', 'budget'];
            const draftLower = (plan.draftContent || '').toLowerCase();
            if (pricingKeywords.some(k => draftLower.includes(k))) return false;
        }

        return true;
    }

    async fetchLinkedEmails(userId, mission, session) {
        try {
            const userTokens = await this.db.getUserTokens(userId);
            if (!userTokens?.encrypted_access_token) return '';

            const accessToken = decrypt(userTokens.encrypted_access_token);
            const refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';

            const { GmailService } = await import('./gmail.ts');
            const gmailService = new GmailService(accessToken, refreshToken);

            let context = '';

            // Fetch by thread IDs
            for (const threadId of (mission.linked_thread_ids || []).slice(0, 3)) {
                try {
                    const thread = await gmailService.getThreadDetails(threadId);
                    if (thread?.messages) {
                        context += `\n--- Thread: ${threadId} ---\n`;
                        for (const msg of thread.messages.slice(-5)) {
                            const parsed = gmailService.parseEmailData(msg);
                            context += `From: ${parsed.from}\nSubject: ${parsed.subject}\nDate: ${parsed.date}\n${parsed.snippet}\n\n`;
                        }
                    }
                } catch (e) {
                    // skip
                }
            }

            // Fetch by email IDs
            for (const emailId of (mission.linked_email_ids || []).slice(0, 5)) {
                try {
                    const details = await gmailService.getEmailDetails(emailId);
                    const parsed = gmailService.parseEmailData(details);
                    context += `\nFrom: ${parsed.from}\nSubject: ${parsed.subject}\nDate: ${parsed.date}\nBody: ${(parsed.body || parsed.snippet || '').substring(0, 1000)}\n`;
                } catch (e) {
                    // skip
                }
            }

            return context || '(No email content available)';
        } catch (err) {
            console.error('fetchLinkedEmails error:', err);
            return '';
        }
    }

    async sendEmail(userId, session, { to, subject, content }) {
        const userTokens = await this.db.getUserTokens(userId);
        if (!userTokens?.encrypted_access_token) throw new Error('Gmail not connected');

        const accessToken = decrypt(userTokens.encrypted_access_token);
        const refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';

        const { GmailService } = await import('./gmail.ts');
        const gmailService = new GmailService(accessToken, refreshToken);

        return gmailService.sendEmail({ to, subject, body: content, isHtml: false });
    }

    // ─── DASHBOARD QUERIES ─────────────────────────────────

    async getMissionsDashboard(userId) {
        const allMissions = await this.getUserMissions(userId);
        const now = new Date();

        const dueToday = allMissions.filter(m => {
            if (!m.deadline || m.status === 'completed' || m.status === 'failed') return false;
            const deadline = new Date(m.deadline);
            return deadline.toDateString() === now.toDateString();
        });

        const waiting = allMissions.filter(m => m.status === 'waiting');

        const atRisk = allMissions.filter(m => {
            if (m.status === 'completed' || m.status === 'failed') return false;
            if (m.status === 'at_risk') return true;
            const lastActivity = new Date(m.last_activity_at);
            const daysSince = (now - lastActivity) / (1000 * 60 * 60 * 24);
            return daysSince > 3;
        });

        const active = allMissions.filter(m => m.status === 'active');
        const completed = allMissions.filter(m => m.status === 'completed');

        return {
            dueToday,
            waiting,
            atRisk,
            active,
            completed,
            total: allMissions.length,
            stats: {
                active: active.length,
                waiting: waiting.length,
                atRisk: atRisk.length,
                completed: completed.length,
                dueToday: dueToday.length
            }
        };
    }
}

export const missionEngine = new MissionEngine();
