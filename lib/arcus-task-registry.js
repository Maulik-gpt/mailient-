/**
 * Arcus Task Registry
 * Central schema-driven definition of all agentic domains and actions.
 */

export const ARCUS_DOMAINS = {
    EMAIL: 'email',
    MEETING: 'meeting',
    ANALYTICS: 'analytics',
    PLAN: 'plan',
    NOTE: 'note',
    GENERIC: 'generic'
};

export const ARCUS_ACTIONS = {
    // Email Domain
    SEND_EMAIL: 'send_email',
    SEND_INTRO: 'arcus_outreach',
    SAVE_DRAFT: 'save_draft',
    READ_THREAD: 'read_thread',
    SEARCH_EMAIL: 'search_email',
    READ_INBOX: 'arcus_inbox_review',
    AUTO_REPLY: 'arcus_auto_pilot',

    // Meeting Domain
    SCHEDULE_MEETING: 'schedule_meeting',
    GET_AVAILABILITY: 'get_availability',

    // Analytics Domain
    GENERATE_ANALYTICS: 'generate_analytics',
    REFRESH_ANALYTICS: 'refresh_analytics',

    // Note Domain
    CREATE_NOTE: 'create_note',
    FIND_NOTE: 'find_note',

    // Plan Domain
    EXECUTE_PLAN: 'execute_plan',
    
    // Generic
    GENERIC_TASK: 'generic_task'
};

export const TASK_REGISTRY = {
    [ARCUS_ACTIONS.SEND_EMAIL]: {
        id: ARCUS_ACTIONS.SEND_EMAIL,
        domain: ARCUS_DOMAINS.EMAIL,
        label: 'Protocol_Send',
        mutating: true,
        requiredInputs: ['to', 'subject', 'body'],
        inputSchema: {
            to: { type: 'string', label: 'Recipient' },
            subject: { type: 'string', label: 'Subject' },
            body: { type: 'string', label: 'Body', multiline: true },
            cc: { type: 'array', label: 'CC', optional: true }
        }
    },
    [ARCUS_ACTIONS.SAVE_DRAFT]: {
        id: ARCUS_ACTIONS.SAVE_DRAFT,
        domain: ARCUS_DOMAINS.EMAIL,
        label: 'Draft_Protocol',
        mutating: false, // Generally safe to just save a draft
        requiredInputs: ['body'],
        inputSchema: {
            to: { type: 'string', label: 'Recipient', optional: true },
            subject: { type: 'string', label: 'Subject', optional: true },
            body: { type: 'string', label: 'Body', multiline: true }
        }
    },
    [ARCUS_ACTIONS.SEND_INTRO]: {
        id: ARCUS_ACTIONS.SEND_INTRO,
        domain: ARCUS_DOMAINS.EMAIL,
        label: 'Outreach_Protocol',
        mutating: true,
        requiredInputs: ['to', 'subject', 'body'],
        inputSchema: {
            to: { type: 'string', label: 'Recipient' },
            subject: { type: 'string', label: 'Subject' },
            body: { type: 'string', label: 'Body', multiline: true }
        }
    },
    [ARCUS_ACTIONS.READ_INBOX]: {
        id: ARCUS_ACTIONS.READ_INBOX,
        domain: ARCUS_DOMAINS.EMAIL,
        label: 'Inbox_Review',
        mutating: false,
        requiredInputs: [],
        inputSchema: {
            limit: { type: 'number', label: 'Limit', defaultValue: 10 }
        }
    },
    [ARCUS_ACTIONS.AUTO_REPLY]: {
        id: ARCUS_ACTIONS.AUTO_REPLY,
        domain: ARCUS_DOMAINS.EMAIL,
        label: 'Response_Auto_Pilot',
        mutating: true,
        requiredInputs: ['body'],
        inputSchema: {
            messageId: { type: 'string', label: 'Message ID', optional: true },
            body: { type: 'string', label: 'Reply Body', multiline: true },
            replyAll: { type: 'boolean', label: 'Reply All', defaultValue: false }
        }
    },
    [ARCUS_ACTIONS.SCHEDULE_MEETING]: {
        id: ARCUS_ACTIONS.SCHEDULE_MEETING,
        domain: ARCUS_DOMAINS.MEETING,
        label: 'Coordinate_Event',
        mutating: true,
        requiredInputs: ['provider', 'attendees', 'date', 'time'],
        inputSchema: {
            provider: { type: 'enum', options: ['google', 'cal'], label: 'Provider' },
            attendees: { type: 'array', label: 'Attendees' },
            date: { type: 'string', label: 'Date' },
            time: { type: 'string', label: 'Time' },
            duration: { type: 'number', label: 'Duration (min)', defaultValue: 30 },
            agenda: { type: 'string', label: 'Agenda', optional: true }
        }
    },
    [ARCUS_ACTIONS.GENERATE_ANALYTICS]: {
        id: ARCUS_ACTIONS.GENERATE_ANALYTICS,
        domain: ARCUS_DOMAINS.ANALYTICS,
        label: 'Insight_Generation',
        mutating: false,
        requiredInputs: ['metricType'],
        inputSchema: {
            metricType: { type: 'string', label: 'Metric Category' },
            dateRange: { type: 'string', label: 'Time Horizon' },
            grouping: { type: 'string', label: 'Data Grouping', optional: true }
        }
    },
    [ARCUS_ACTIONS.CREATE_NOTE]: {
        id: ARCUS_ACTIONS.CREATE_NOTE,
        domain: ARCUS_DOMAINS.NOTE,
        label: 'Thought_Commit',
        mutating: true,
        requiredInputs: ['content'],
        inputSchema: {
            title: { type: 'string', label: 'Note Title', optional: true },
            content: { type: 'string', label: 'Body', multiline: true },
            tags: { type: 'array', label: 'Tags', optional: true }
        }
    },
    [ARCUS_ACTIONS.EXECUTE_PLAN]: {
        id: ARCUS_ACTIONS.EXECUTE_PLAN,
        domain: ARCUS_DOMAINS.PLAN,
        label: 'Strategic_Execution',
        mutating: true,
        requiredInputs: ['steps'],
        inputSchema: {
            objective: { type: 'string', label: 'Mission Objective' },
            steps: { type: 'array', label: 'Action Sequence' }
        }
    },
    [ARCUS_ACTIONS.GENERIC_TASK]: {
        id: ARCUS_ACTIONS.GENERIC_TASK,
        domain: ARCUS_DOMAINS.GENERIC,
        label: 'Workflow_Trigger',
        mutating: true,
        requiredInputs: ['taskName', 'params'],
        inputSchema: {
            taskName: { type: 'string', label: 'Task Name' },
            params: { type: 'object', label: 'Parameters' },
            reasoning: { type: 'string', label: 'Logic' }
        }
    }
};

export const getActionSpec = (actionType) => TASK_REGISTRY[actionType] || null;

export const validateActionInputs = (actionType, inputs) => {
    const spec = getActionSpec(actionType);
    if (!spec) return { valid: false, missing: [] };
    
    const missing = spec.requiredInputs.filter(key => {
        const val = inputs[key];
        if (val === undefined || val === null || val === '') return true;
        if (Array.isArray(val) && val.length === 0) return true;
        return false;
    });
    
    return {
        valid: missing.length === 0,
        missing
    };
};
