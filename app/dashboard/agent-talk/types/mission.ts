// ============================================================
// Arcus Mission System Types
// Chat-to-Mission "Goal Inbox" — Agentic Email + Scheduling
// ============================================================

/** Mission status state machine */
export type MissionStatus =
    | 'draft'
    | 'waiting_on_user'
    | 'waiting_on_other'
    | 'done'
    | 'archived';

/** Risk flags for safety gating */
export type RiskFlag =
    | 'new_recipient'
    | 'external_domain'
    | 'mentions_money'
    | 'mentions_legal'
    | 'mentions_medical'
    | 'attachment_forwarding'
    | 'large_recipient_list';

/** Action types Arcus can perform */
export type ActionType =
    | 'search_email'
    | 'read_thread'
    | 'draft_reply'
    | 'send_email'
    | 'get_availability'
    | 'create_meeting'
    | 'schedule_check'
    | 'clarify';

/** Step status */
export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

/** A single step in a Mission plan */
export interface MissionStep {
    id: string;
    order: number;
    actionType: ActionType;
    label: string;            // Human-readable: "Search for Sarah's email"
    description?: string;     // Details
    status: StepStatus;
    result?: any;             // Output of the step
    error?: string;           // Error message if failed
    startedAt?: string;
    completedAt?: string;
}

/** A Plan Card shown to the user for approval */
export interface PlanCard {
    id: string;
    missionId: string;
    actionType: ActionType;
    recipients?: string[];
    cc?: string[];
    subject?: string;
    body?: string;
    meetingDetails?: {
        title: string;
        attendees: string[];
        slot: string;
        duration: number;
        location: string;
        notes?: string;
    };
    confidence: number;       // 0–1
    assumptions: string[];
    questionsForUser: string[];
    safetyFlags: RiskFlag[];
    status: 'pending' | 'approved' | 'edited' | 'rejected';
    createdAt: string;
}

/** Audit log entry */
export interface AuditEntry {
    id: string;
    missionId: string;
    timestamp: string;
    actionType: ActionType | 'mission_created' | 'status_change' | 'user_approval' | 'user_edit';
    targetThreadId?: string;
    targetEventId?: string;
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
    approvedBy: 'user' | 'autopilot';
}

/** A Mission: trackable outcome tied to email threads */
export interface Mission {
    id: string;
    goal: string;             // User-editable, plain language
    status: MissionStatus;
    linkedThreadIds: string[];
    steps: MissionStep[];
    planCards: PlanCard[];
    auditTrail: AuditEntry[];
    createdAt: string;
    updatedAt: string;
    conversationId: string;
    maxNudges?: number;
    nudgeCount?: number;
}

// ============================================================
// AI Agent Thinking/Process UI Types
// ============================================================

/** Thinking phase */
export type ThinkingPhase = 'thinking' | 'planning' | 'executing' | 'done';

/** A single thought during the thinking phase */
export interface ThoughtEntry {
    id: string;
    text: string;
    timestamp: string;
    phase: ThinkingPhase;
}

/** Agent process state — drives the expandable UI */
export interface AgentProcess {
    id: string;
    phase: ThinkingPhase;
    label: string;            // "Working on it..." / "Setting up..." / "Running..."
    thoughts: ThoughtEntry[];
    steps: MissionStep[];
    isExpanded: boolean;
    startedAt: string;
    completedAt?: string;
}

// ============================================================
// Enhanced Message Types (extends existing)
// ============================================================

export interface AgentMessageMeta {
    actionType?: string;
    notesResult?: any;
    emailResult?: any;
    mission?: Mission;
    planCard?: PlanCard;
    agentProcess?: AgentProcess;
    searchResults?: SearchCandidate[];
    clarificationNeeded?: boolean;
    clarificationOptions?: ClarificationOption[];
}

export interface SearchCandidate {
    id: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    threadId?: string;
    participants?: string[];
}

export interface ClarificationOption {
    id: string;
    label: string;
    description?: string;
    value: any;
}

// ============================================================
// API Response Types
// ============================================================

export interface ArcusAgentResponse {
    message: string;
    nextAction?: ActionType;
    draftSubject?: string;
    draftBody?: string;
    confidence?: number;
    assumptions?: string[];
    questionsForUser?: string[];
    sendTo?: string[];
    cc?: string[];
    safetyFlags?: RiskFlag[];
    mission?: Mission;
    planCard?: PlanCard;
    agentProcess?: AgentProcess;
    searchResults?: SearchCandidate[];
}
