/**
 * Arcus Agent Executor
 * 
 * Runs multi-step tasks sequentially with real API calls.
 * Each step produces verifiable output — no hallucination.
 * 
 * Step types:
 *  - think         → AI reasoning (no side effects)
 *  - clarify       → Block execution, ask user a question
 *  - search_email  → Call read_gmail API
 *  - read_email    → Call read_gmail API with thread_id
 *  - create_draft  → Generate draft text (no send)
 *  - send_email    → POST to send-reply API
 *  - book_meeting  → Cal.com booking link or instant booking
 *  - done          → Final summary
 */

import { calService } from './cal-service';

export type StepType =
    | 'think'
    | 'clarify'
    | 'search_email'
    | 'read_email'
    | 'create_draft'
    | 'send_email'
    | 'book_meeting'
    | 'done';

export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'waiting';

export interface AgentStep {
    id: string;
    type: StepType;
    label: string;          // Human-readable label shown in UI
    detail?: string;        // Expandable detail (AI thinking text, JSON, etc.)
    status: StepStatus;
    result?: any;           // Actual API result stored here
    error?: string;
    started_at?: string;
    completed_at?: string;
}

export interface AgentPlan {
    goal: string;
    steps: AgentStep[];
    questions?: string[];   // Clarification questions for the user
    needs_clarification: boolean;
}

export interface ExecutorContext {
    userEmail: string;
    userName: string;
    sessionToken?: string;  // For authenticated API calls
    gmailAccessToken?: string;
    gmailRefreshToken?: string;
    conversationHistory?: Array<{ role: string; content: string }>;
    currentTime: string;    // ISO string passed in — never trust AI time
}

export interface StepUpdate {
    stepId: string;
    status: StepStatus;
    detail?: string;
    result?: any;
    error?: string;
}

/**
 * Run a single executor step with real API calls.
 * Returns the updated step with result or error.
 */
export async function executeStep(
    step: AgentStep,
    context: ExecutorContext,
    previousResults: Record<string, any>
): Promise<AgentStep> {
    const start = new Date().toISOString();
    const updated: AgentStep = {
        ...step,
        status: 'running',
        started_at: start,
    };

    try {
        switch (step.type) {
            case 'think': {
                // Thinking steps have no side effects — their detail is the reasoning
                updated.status = 'done';
                updated.completed_at = new Date().toISOString();
                break;
            }

            case 'search_email': {
                const query = step.result?.query || 'newer_than:7d';
                const maxResults = step.result?.maxResults || 5;

                const res = await fetch('/api/agent-talk/read_gmail', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-email': context.userEmail,
                        ...(context.gmailAccessToken ? { 'x-gmail-access-token': context.gmailAccessToken } : {}),
                        ...(context.gmailRefreshToken ? { 'x-gmail-refresh-token': context.gmailRefreshToken } : {}),
                    },
                    body: JSON.stringify({ query, max_results: maxResults, include_body: false }),
                });

                if (!res.ok) throw new Error(`Email search failed: ${res.status}`);
                const data = await res.json();
                updated.result = data;
                updated.detail = `Found ${data.count || 0} emails matching "${query}"`;
                updated.status = 'done';
                updated.completed_at = new Date().toISOString();
                break;
            }

            case 'read_email': {
                const threadId = step.result?.threadId || previousResults?.search_email?.emails?.[0]?.thread_id;
                if (!threadId) {
                    updated.status = 'failed';
                    updated.error = 'No email thread found to read.';
                    break;
                }

                const res = await fetch('/api/agent-talk/read_gmail', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-email': context.userEmail,
                        ...(context.gmailAccessToken ? { 'x-gmail-access-token': context.gmailAccessToken } : {}),
                        ...(context.gmailRefreshToken ? { 'x-gmail-refresh-token': context.gmailRefreshToken } : {}),
                    },
                    body: JSON.stringify({ thread_id: threadId, include_body: true }),
                });

                if (!res.ok) throw new Error(`Email read failed: ${res.status}`);
                const data = await res.json();
                updated.result = data;
                updated.detail = `Read ${data.count || 0} messages in thread`;
                updated.status = 'done';
                updated.completed_at = new Date().toISOString();
                break;
            }

            case 'create_draft': {
                // Draft creation is handled by the caller (arcus-ai generateDraftReply)
                // The result should already be set by the AI layer before calling executeStep
                if (!step.result?.draftContent) {
                    updated.status = 'failed';
                    updated.error = 'Draft content not generated.';
                } else {
                    updated.status = 'done';
                    updated.detail = `Draft ready for ${step.result.recipientName || step.result.recipientEmail || 'recipient'}`;
                    updated.completed_at = new Date().toISOString();
                }
                break;
            }

            case 'send_email': {
                const { to, subject, content, replyToMessageId, threadId: tid } = step.result || {};
                if (!to || !content) {
                    updated.status = 'failed';
                    updated.error = 'Missing recipient or content — cannot send.';
                    break;
                }

                const res = await fetch('/api/agent-talk/send-reply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ to, subject, content, replyToMessageId, threadId: tid }),
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || `Send failed: ${res.status}`);
                }

                const data = await res.json();
                updated.result = { ...step.result, messageId: data.messageId, threadId: data.threadId };
                updated.detail = `Email sent to ${to}`;
                updated.status = 'done';
                updated.completed_at = new Date().toISOString();
                break;
            }

            case 'book_meeting': {
                const { durationMinutes = 30, title, attendeeEmail, attendeeName, startTime } = step.result || {};

                if (startTime && attendeeEmail) {
                    // We have enough info — try to create an instant booking
                    const eventType = await calService.getBestEventType(durationMinutes);
                    if (eventType) {
                        const booking = await calService.createBooking({
                            eventTypeId: eventType.id,
                            start: startTime,
                            attendee: {
                                name: attendeeName || attendeeEmail,
                                email: attendeeEmail,
                                timeZone: 'UTC',
                            },
                            metadata: { source: 'mailient-arcus' },
                        });

                        if (booking) {
                            updated.result = {
                                ...step.result,
                                bookingId: booking.id,
                                bookingUid: booking.uid,
                                meetingUrl: booking.meetingUrl,
                                startTime: booking.startTime,
                                endTime: booking.endTime,
                                status: booking.status,
                                type: 'instant_booking',
                            };
                            updated.detail = `Meeting booked for ${booking.startTime}`;
                            updated.status = 'done';
                            updated.completed_at = new Date().toISOString();
                            break;
                        }
                    }
                }

                // Fallback: generate a scheduling link
                const link = await calService.getBookingLink(durationMinutes, title);
                updated.result = {
                    ...step.result,
                    bookingUrl: link?.bookingUrl,
                    durationMinutes: link?.durationMinutes || durationMinutes,
                    type: 'scheduling_link',
                };
                updated.detail = `Scheduling link created (${durationMinutes}min)`;
                updated.status = 'done';
                updated.completed_at = new Date().toISOString();
                break;
            }

            case 'done': {
                updated.status = 'done';
                updated.completed_at = new Date().toISOString();
                break;
            }

            default:
                updated.status = 'done';
                updated.completed_at = new Date().toISOString();
        }
    } catch (err: any) {
        updated.status = 'failed';
        updated.error = err?.message || 'Unknown error';
        updated.completed_at = new Date().toISOString();
    }

    return updated;
}

/**
 * Generate a unique step ID
 */
export function makeStepId(type: StepType, index: number): string {
    return `step_${type}_${index}_${Date.now()}`;
}

/**
 * Format execution results into a clean human-readable summary
 */
export function buildExecutionSummary(steps: AgentStep[]): string {
    const completed = steps.filter(s => s.status === 'done' && s.type !== 'think');
    const failed = steps.filter(s => s.status === 'failed');

    if (failed.length > 0 && completed.length === 0) {
        return `Could not complete: ${failed[0].error || 'something went wrong.'}`;
    }

    const parts: string[] = [];

    for (const step of completed) {
        switch (step.type) {
            case 'search_email':
                if (step.result?.count) parts.push(`Found ${step.result.count} email${step.result.count !== 1 ? 's' : ''}`);
                break;
            case 'create_draft':
                parts.push(`Draft ready for ${step.result?.recipientName || step.result?.recipientEmail || 'recipient'}`);
                break;
            case 'send_email':
                parts.push(`Email sent to ${step.result?.to}`);
                break;
            case 'book_meeting':
                if (step.result?.type === 'instant_booking') {
                    parts.push(`Meeting booked for ${new Date(step.result.startTime).toLocaleString()}`);
                } else if (step.result?.bookingUrl) {
                    parts.push(`Scheduling link: ${step.result.bookingUrl}`);
                }
                break;
        }
    }

    if (parts.length === 0) return 'Done.';
    return parts.join('. ') + '.';
}
