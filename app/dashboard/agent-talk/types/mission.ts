// ── Mission Domain Model ──
// Based on the Arcus Spec: Chat-to-Mission "Goal Inbox"

export type MissionStatus = 'active' | 'waiting_on_other' | 'needs_user' | 'done' | 'archived';
export type MissionPriority = 'high' | 'normal' | 'low';
export type NextAction =
    | 'draft_reply'
    | 'draft_follow_up'
    | 'ask_clarifying_question'
    | 'schedule_times'
    | 'send_attachment_again'
    | 'close_as_done';

export type IntentType =
    | 'create_mission'
    | 'update_mission'
    | 'ask_question'
    | 'execute_action'
    | 'multi_step_plan';

export type RiskFlag =
    | 'new_recipient'
    | 'external_domain'
    | 'money_legal'
    | 'attachment_forwarding'
    | 'large_recipient_list';

export type ToolType =
    | 'email_search'
    | 'email_read'
    | 'send_email'
    | 'create_draft'
    | 'calendar_availability'
    | 'create_meeting'
    | 'schedule_check';

// ── Thread Snapshot (privacy-minimal) ──
export interface ThreadMessage {
    message_id: string;
    from: string;
    to: string[];
    cc: string[];
    date: string;
    subject: string;
    has_attachments: boolean;
    body_excerpt: string;
}

export interface ThreadSnapshot {
    thread_id: string;
    message_ids: string[];
    messages: ThreadMessage[];
    latest_message_id: string;
    latest_date: string;
}

// ── Execution Step ──
export interface ExecutionStep {
    id: string;
    description: string;
    tool: ToolType;
    status: 'pending' | 'running' | 'done' | 'failed';
    result?: string;
    error?: string;
    started_at?: string;
    completed_at?: string;
}

// ── Audit Log Entry ──
export interface AuditLogEntry {
    timestamp: string;
    action_type: string;
    target_thread?: string;
    target_event?: string;
    tool_inputs?: Record<string, any>;
    tool_outputs?: Record<string, any>;
    approved_by: 'user' | 'autopilot';
}

// ── Plan Card (required for every action) ──
export interface PlanCard {
    id: string;
    goal: string;
    steps: string[]; // "What I will do" (2–5 bullets)
    tools: ToolType[];
    draft_preview?: {
        to: string[];
        cc: string[];
        subject: string;
        body: string;
    };
    invite_preview?: {
        title: string;
        attendees: string[];
        slot: string;
        duration: string;
        location: string;
        meet_link?: string;
    };
    risk_flags: RiskFlag[];
    status: 'pending' | 'approved' | 'rejected' | 'executing' | 'done' | 'failed';
    confidence: number; // 0-1
    assumptions: string[];
    questions_for_user: string[];
    created_at: string;
}

// ── Mission ──
export interface Mission {
    mission_id: string;
    title: string;
    goal: string;
    status: MissionStatus;
    priority: MissionPriority;
    due_at: string | null;
    created_at: string;
    updated_at: string;
    linked_threads: ThreadSnapshot[];
    participants: { email: string; display_name: string }[];
    last_activity_at: string;
    next_action: NextAction;
    next_action_reason: string;
    followup_plan?: string;
    execution_steps: ExecutionStep[];
    artifacts: { type: string; id: string; url?: string }[];
    audit_log: AuditLogEntry[];
    plan_card?: PlanCard;
}

// ── Structured intent from AI parsing ──
export interface StructuredIntent {
    intent_type: IntentType;
    mission_proposal?: {
        title: string;
        goal: string;
        linked_threads_candidates: { thread_id: string; reason: string }[];
        participants_candidates: string[];
        due_at?: string;
        next_action?: NextAction;
    };
    required_clarifications: string[];
    proposed_actions: string[];
    plan_card?: PlanCard;
}

// ── Execution Result (after running) ──
export interface ExecutionResult {
    success: boolean;
    changes: string[]; // "What changed" bullets
    artifacts: { type: string; id: string; label: string; url?: string }[];
    next_monitoring?: {
        description: string;
        check_at: string;
    };
    error?: string;
}
