import {
    APPROVAL_MODE,
    DEFAULT_RETRY_POLICY,
    RISK_ASSESSMENT
} from './arcus-execution-contract.js';

/**
 * Arcus Task Registry - Phase 1 Canonical
 * Central schema-driven definition of all agentic domains and actions.
 * 
 * Every action now includes:
 * - deterministic input schema (inputSchema, requiredInputs)
 * - approval mode (auto/manual/conditional)
 * - retry policy (maxAttempts, strategy, backoff)
 * - risk assessment (low/medium/high/critical)
 * - idempotency support
 * - auditable result structure
 */

export const ARCUS_DOMAINS = {
    EMAIL: 'email',
    MEETING: 'meeting',
    ANALYTICS: 'analytics',
    PLAN: 'plan',
    NOTE: 'note',
    NOTION: 'notion',
    TASKS: 'tasks',
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
    APPROVE_PLAN: 'approve_plan',

    // Notion Domain (NEW)
    NOTION_CREATE_PAGE: 'notion_create_page',
    NOTION_SEARCH: 'notion_search',
    NOTION_APPEND: 'notion_append',

    // Google Tasks Domain (NEW)
    TASKS_CREATE_LIST: 'tasks_create_list',
    TASKS_ADD_TASK: 'tasks_add_task',
    TASKS_ADD_TASKS: 'tasks_add_tasks',
    TASKS_COMPLETE: 'tasks_complete_task',
    TASKS_LIST: 'tasks_list',
    
    // Generic
    GENERIC_TASK: 'generic_task'
};

export const TASK_REGISTRY = {
    [ARCUS_ACTIONS.SEND_EMAIL]: {
        id: ARCUS_ACTIONS.SEND_EMAIL,
        domain: ARCUS_DOMAINS.EMAIL,
        label: 'Protocol_Send',
        description: 'Send an email to external recipients',
        mutating: true,
        idempotent: true, // Same payload = same result (message sent)
        requiredInputs: ['to', 'subject', 'body'],
        inputSchema: {
            to: { type: 'string', label: 'Recipient', format: 'email' },
            subject: { type: 'string', label: 'Subject' },
            body: { type: 'string', label: 'Body', multiline: true },
            cc: { type: 'array', label: 'CC', optional: true, itemType: 'email' },
            bcc: { type: 'array', label: 'BCC', optional: true, itemType: 'email' },
            threadId: { type: 'string', label: 'Thread ID', optional: true },
            isHtml: { type: 'boolean', label: 'HTML Format', defaultValue: false, optional: true }
        },
        // Phase 1: Execution Contract Fields
        approvalMode: APPROVAL_MODE.CONDITIONAL, // Manual for external, auto for internal
        riskAssessment: RISK_ASSESSMENT.HIGH, // External communication
        retryPolicy: {
            ...DEFAULT_RETRY_POLICY,
            maxAttempts: 3,
            strategy: 'exponential',
            retryableErrors: ['network', 'timeout', 'rate_limit', 'service_unavailable']
        },
        resultSchema: {
            messageId: { type: 'string', description: 'Gmail message ID' },
            threadId: { type: 'string', description: 'Gmail thread ID' },
            sentAt: { type: 'string', format: 'datetime' }
        },
        auditFields: ['to', 'subject', 'sentAt', 'messageId']
    },
    [ARCUS_ACTIONS.SAVE_DRAFT]: {
        id: ARCUS_ACTIONS.SAVE_DRAFT,
        domain: ARCUS_DOMAINS.EMAIL,
        label: 'Draft_Protocol',
        description: 'Save email as draft without sending',
        mutating: true,
        idempotent: false, // Each save creates a new draft
        requiredInputs: ['body'],
        inputSchema: {
            to: { type: 'string', label: 'Recipient', optional: true, format: 'email' },
            subject: { type: 'string', label: 'Subject', optional: true },
            body: { type: 'string', label: 'Body', multiline: true },
            threadId: { type: 'string', label: 'Thread ID', optional: true },
            isHtml: { type: 'boolean', label: 'HTML Format', defaultValue: false, optional: true }
        },
        // Phase 1: Execution Contract Fields
        approvalMode: APPROVAL_MODE.AUTO, // No approval needed for drafts
        riskAssessment: RISK_ASSESSMENT.LOW,
        retryPolicy: {
            ...DEFAULT_RETRY_POLICY,
            maxAttempts: 2
        },
        resultSchema: {
            draftId: { type: 'string', description: 'Gmail draft ID' },
            threadId: { type: 'string', description: 'Gmail thread ID' }
        },
        auditFields: ['draftId', 'threadId']
    },
    [ARCUS_ACTIONS.SEND_INTRO]: {
        id: ARCUS_ACTIONS.SEND_INTRO,
        domain: ARCUS_DOMAINS.EMAIL,
        label: 'Outreach_Protocol',
        description: 'Send introduction email to new contacts',
        mutating: true,
        idempotent: true,
        requiredInputs: ['to', 'subject', 'body'],
        inputSchema: {
            to: { type: 'string', label: 'Recipient', format: 'email' },
            subject: { type: 'string', label: 'Subject' },
            body: { type: 'string', label: 'Body', multiline: true },
            cc: { type: 'array', label: 'CC', optional: true, itemType: 'email' },
            template: { type: 'string', label: 'Template Name', optional: true }
        },
        // Phase 1: Execution Contract Fields
        approvalMode: APPROVAL_MODE.MANUAL, // Always manual for outreach
        riskAssessment: RISK_ASSESSMENT.HIGH, // External communication
        retryPolicy: {
            ...DEFAULT_RETRY_POLICY,
            maxAttempts: 3,
            strategy: 'exponential'
        },
        resultSchema: {
            messageId: { type: 'string', description: 'Gmail message ID' },
            threadId: { type: 'string', description: 'Gmail thread ID' }
        },
        auditFields: ['to', 'subject', 'template', 'messageId']
    },
    [ARCUS_ACTIONS.READ_INBOX]: {
        id: ARCUS_ACTIONS.READ_INBOX,
        domain: ARCUS_DOMAINS.EMAIL,
        label: 'Inbox_Review',
        description: 'Read and summarize recent inbox messages',
        mutating: false,
        idempotent: true, // Read operations are idempotent
        requiredInputs: [],
        inputSchema: {
            limit: { type: 'number', label: 'Limit', defaultValue: 10, min: 1, max: 50 },
            filter: { type: 'enum', label: 'Filter', options: ['all', 'unread', 'important', 'starred'], defaultValue: 'all', optional: true },
            searchQuery: { type: 'string', label: 'Search Query', optional: true }
        },
        // Phase 1: Execution Contract Fields
        approvalMode: APPROVAL_MODE.AUTO, // Read-only
        riskAssessment: RISK_ASSESSMENT.LOW,
        retryPolicy: {
            ...DEFAULT_RETRY_POLICY,
            maxAttempts: 2,
            strategy: 'fixed'
        },
        resultSchema: {
            emails: { type: 'array', description: 'Array of email objects' },
            count: { type: 'number', description: 'Total emails fetched' }
        },
        auditFields: ['count', 'filter']
    },
    [ARCUS_ACTIONS.AUTO_REPLY]: {
        id: ARCUS_ACTIONS.AUTO_REPLY,
        domain: ARCUS_DOMAINS.EMAIL,
        label: 'Response_Auto_Pilot',
        description: 'Send automated reply to a thread',
        mutating: true,
        idempotent: true,
        requiredInputs: ['body'],
        inputSchema: {
            messageId: { type: 'string', label: 'Message ID', optional: true },
            threadId: { type: 'string', label: 'Thread ID', optional: true },
            body: { type: 'string', label: 'Reply Body', multiline: true },
            replyAll: { type: 'boolean', label: 'Reply All', defaultValue: false },
            isHtml: { type: 'boolean', label: 'HTML Format', defaultValue: false, optional: true }
        },
        // Phase 1: Execution Contract Fields
        approvalMode: APPROVAL_MODE.MANUAL, // Always manual for replies
        riskAssessment: RISK_ASSESSMENT.HIGH, // External communication
        retryPolicy: {
            ...DEFAULT_RETRY_POLICY,
            maxAttempts: 3
        },
        resultSchema: {
            messageId: { type: 'string', description: 'Gmail message ID' },
            threadId: { type: 'string', description: 'Gmail thread ID' }
        },
        auditFields: ['messageId', 'threadId', 'replyAll']
    },
    [ARCUS_ACTIONS.SCHEDULE_MEETING]: {
        id: ARCUS_ACTIONS.SCHEDULE_MEETING,
        domain: ARCUS_DOMAINS.MEETING,
        label: 'Coordinate_Event',
        description: 'Schedule a calendar meeting with attendees',
        mutating: true,
        idempotent: false, // Each call creates a new event
        requiredInputs: ['provider', 'attendees', 'date', 'time'],
        inputSchema: {
            provider: { type: 'enum', options: ['google', 'cal'], label: 'Provider' },
            attendees: { type: 'array', label: 'Attendees', itemType: 'email' },
            date: { type: 'string', label: 'Date', format: 'date' },
            time: { type: 'string', label: 'Time', format: 'time' },
            duration: { type: 'number', label: 'Duration (min)', defaultValue: 30, min: 15, max: 480 },
            agenda: { type: 'string', label: 'Agenda', multiline: true, optional: true },
            title: { type: 'string', label: 'Meeting Title' },
            timezone: { type: 'string', label: 'Timezone', defaultValue: 'UTC', optional: true }
        },
        // Phase 1: Execution Contract Fields
        approvalMode: APPROVAL_MODE.MANUAL, // Always manual for meetings
        riskAssessment: RISK_ASSESSMENT.HIGH, // External coordination
        retryPolicy: {
            ...DEFAULT_RETRY_POLICY,
            maxAttempts: 3
        },
        resultSchema: {
            eventId: { type: 'string', description: 'Calendar event ID' },
            meetingLink: { type: 'string', description: 'Meeting link (Google Meet/Zoom)' },
            attendees: { type: 'array', description: 'Confirmed attendees' }
        },
        auditFields: ['eventId', 'title', 'attendees', 'scheduledAt']
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
    [ARCUS_ACTIONS.APPROVE_PLAN]: {
        id: ARCUS_ACTIONS.APPROVE_PLAN,
        domain: ARCUS_DOMAINS.PLAN,
        label: 'Plan_Approval',
        mutating: true,
        requiredInputs: ['planId'],
        inputSchema: {
            planId: { type: 'string', label: 'Plan ID' }
        }
    },

    // ── Notion Actions ───────────────────────────────────────
    [ARCUS_ACTIONS.NOTION_CREATE_PAGE]: {
        id: ARCUS_ACTIONS.NOTION_CREATE_PAGE,
        domain: ARCUS_DOMAINS.NOTION,
        label: 'Notion_Create_Page',
        mutating: true,
        requiredInputs: ['title'],
        inputSchema: {
            title: { type: 'string', label: 'Page Title' },
            content: { type: 'string', label: 'Page Content', multiline: true, optional: true },
            databaseId: { type: 'string', label: 'Database ID', optional: true },
            parentPageId: { type: 'string', label: 'Parent Page ID', optional: true },
            tags: { type: 'array', label: 'Tags', optional: true }
        }
    },
    [ARCUS_ACTIONS.NOTION_SEARCH]: {
        id: ARCUS_ACTIONS.NOTION_SEARCH,
        domain: ARCUS_DOMAINS.NOTION,
        label: 'Notion_Search',
        mutating: false,
        requiredInputs: ['query'],
        inputSchema: {
            query: { type: 'string', label: 'Search Query' },
            filter: { type: 'enum', options: ['page', 'database'], label: 'Filter', optional: true },
            limit: { type: 'number', label: 'Max Results', defaultValue: 10, optional: true }
        }
    },
    [ARCUS_ACTIONS.NOTION_APPEND]: {
        id: ARCUS_ACTIONS.NOTION_APPEND,
        domain: ARCUS_DOMAINS.NOTION,
        label: 'Notion_Append_Content',
        mutating: true,
        requiredInputs: ['pageId', 'content'],
        inputSchema: {
            pageId: { type: 'string', label: 'Page ID' },
            content: { type: 'string', label: 'Content to Append', multiline: true }
        }
    },

    // ── Google Tasks Actions ─────────────────────────────────
    [ARCUS_ACTIONS.TASKS_CREATE_LIST]: {
        id: ARCUS_ACTIONS.TASKS_CREATE_LIST,
        domain: ARCUS_DOMAINS.TASKS,
        label: 'Create_Task_List',
        mutating: true,
        requiredInputs: ['title'],
        inputSchema: {
            title: { type: 'string', label: 'List Title' }
        }
    },
    [ARCUS_ACTIONS.TASKS_ADD_TASK]: {
        id: ARCUS_ACTIONS.TASKS_ADD_TASK,
        domain: ARCUS_DOMAINS.TASKS,
        label: 'Add_Task',
        mutating: true,
        requiredInputs: ['title'],
        inputSchema: {
            title: { type: 'string', label: 'Task Title' },
            notes: { type: 'string', label: 'Notes', optional: true },
            due: { type: 'string', label: 'Due Date (ISO)', optional: true },
            taskListId: { type: 'string', label: 'Task List ID', optional: true }
        }
    },
    [ARCUS_ACTIONS.TASKS_ADD_TASKS]: {
        id: ARCUS_ACTIONS.TASKS_ADD_TASKS,
        domain: ARCUS_DOMAINS.TASKS,
        label: 'Add_Multiple_Tasks',
        mutating: true,
        requiredInputs: ['tasks'],
        inputSchema: {
            tasks: { type: 'array', label: 'Tasks Array (each: { title, notes?, due? })' },
            taskListId: { type: 'string', label: 'Task List ID', optional: true },
            taskListTitle: { type: 'string', label: 'Task List Title (auto-creates)', optional: true }
        }
    },
    [ARCUS_ACTIONS.TASKS_COMPLETE]: {
        id: ARCUS_ACTIONS.TASKS_COMPLETE,
        domain: ARCUS_DOMAINS.TASKS,
        label: 'Complete_Task',
        mutating: true,
        requiredInputs: ['taskListId', 'taskId'],
        inputSchema: {
            taskListId: { type: 'string', label: 'Task List ID' },
            taskId: { type: 'string', label: 'Task ID' }
        }
    },
    [ARCUS_ACTIONS.TASKS_LIST]: {
        id: ARCUS_ACTIONS.TASKS_LIST,
        domain: ARCUS_DOMAINS.TASKS,
        label: 'List_Tasks',
        mutating: false,
        requiredInputs: [],
        inputSchema: {
            taskListId: { type: 'string', label: 'Task List ID', optional: true },
            showCompleted: { type: 'boolean', label: 'Show Completed', defaultValue: false, optional: true }
        }
    },

    // ── Generic ──────────────────────────────────────────────
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

/**
 * Map canvas types to available actions (including new integrations).
 */
export const CANVAS_ACTIONS_BY_TYPE = {
    email_draft: ['save_draft', 'send_email', 'arcus_outreach', 'arcus_auto_pilot'],
    action_plan: ['execute_plan', 'approve_plan', 'notion_create_page', 'tasks_add_tasks'],
    summary: ['arcus_inbox_review', 'apply_changes', 'notion_create_page'],
    research: ['arcus_inbox_review', 'apply_changes', 'notion_create_page'],
    meeting_schedule: ['schedule_meeting'],
    analytics: ['refresh_analytics', 'generate_analytics'],
    notes: ['create_note', 'notion_create_page'],
    none: []
};
