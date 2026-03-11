const MUTATING_ACTIONS = new Set([
  'send_email',
  'schedule_meeting',
  'execute_plan',
  'delete_email',
  'delete_note'
]);

const SAFE_AUTO_EXEC_ACTIONS = new Set([
  'save_draft',
  'refresh_analytics',
  'export_analytics',
  'apply_changes'
]);

const CANVAS_TO_TASK = {
  email_draft: 'email_reply',
  summary: 'summary',
  research: 'research',
  action_plan: 'action_plan',
  meeting_schedule: 'meeting_schedule',
  analytics_report: 'analytics_report',
  notes: 'notes',
  none: 'generic_workflow'
};

const TASK_REGISTRY = {
  email_reply: {
    taskType: 'email_reply',
    canvasType: 'email_draft',
    title: 'Email Reply',
    schema: {
      fields: [
        { id: 'threadId', label: 'Thread ID', type: 'text', placeholder: 'thread_xxx (auto)' },
        { id: 'threadContext', label: 'Thread Context', type: 'textarea', placeholder: 'Key context from the thread' },
        { id: 'from', label: 'From', type: 'text', placeholder: 'your@email.com' },
        { id: 'to', label: 'To', type: 'text', placeholder: 'recipient@email.com' },
        { id: 'cc', label: 'Cc', type: 'text', placeholder: 'cc@email.com' },
        { id: 'bcc', label: 'Bcc', type: 'text', placeholder: 'bcc@email.com' },
        { id: 'subject', label: 'Subject', type: 'text', placeholder: 'Email subject' },
        { id: 'salutation', label: 'Salutation', type: 'text', placeholder: 'Hi John,' },
        { id: 'body', label: 'Body', type: 'textarea', placeholder: 'Draft email body' },
        { id: 'signature', label: 'Signature', type: 'text', placeholder: 'Best regards, Name' },
        { id: 'attachments', label: 'Attachments', type: 'textarea', placeholder: 'file1.pdf, file2.png' }
      ]
    },
    actions: [
      { actionType: 'save_draft', label: 'Save Draft', requiresApproval: false, autoExecute: true },
      { actionType: 'send_email', label: 'Send Email', requiresApproval: true, autoExecute: false }
    ]
  },
  email_send: {
    taskType: 'email_send',
    canvasType: 'email_draft',
    title: 'Email Send',
    schema: {
      fields: [
        { id: 'threadId', label: 'Thread ID', type: 'text', placeholder: 'thread_xxx (auto)' },
        { id: 'threadContext', label: 'Thread Context', type: 'textarea', placeholder: 'Key context from the thread' },
        { id: 'from', label: 'From', type: 'text', placeholder: 'your@email.com' },
        { id: 'to', label: 'To', type: 'text', placeholder: 'recipient@email.com' },
        { id: 'cc', label: 'Cc', type: 'text', placeholder: 'cc@email.com' },
        { id: 'bcc', label: 'Bcc', type: 'text', placeholder: 'bcc@email.com' },
        { id: 'subject', label: 'Subject', type: 'text', placeholder: 'Email subject' },
        { id: 'salutation', label: 'Salutation', type: 'text', placeholder: 'Hi John,' },
        { id: 'body', label: 'Body', type: 'textarea', placeholder: 'Draft email body' },
        { id: 'signature', label: 'Signature', type: 'text', placeholder: 'Best regards, Name' },
        { id: 'attachments', label: 'Attachments', type: 'textarea', placeholder: 'file1.pdf, file2.png' }
      ]
    },
    actions: [
      { actionType: 'send_email', label: 'Send Email', requiresApproval: true, autoExecute: false }
    ]
  },
  meeting_schedule: {
    taskType: 'meeting_schedule',
    canvasType: 'meeting_schedule',
    title: 'Meeting Schedule',
    schema: {
      fields: [
        {
          id: 'provider',
          label: 'Provider',
          type: 'select',
          options: [
            { value: 'google_meet', label: 'Google Meet' },
            { value: 'cal.com', label: 'Cal.com' }
          ]
        },
        { id: 'attendees', label: 'Attendees', type: 'textarea', placeholder: 'alice@org.com, bob@org.com' },
        { id: 'day', label: 'Day', type: 'text', placeholder: 'Monday' },
        { id: 'date', label: 'Date', type: 'date' },
        { id: 'time', label: 'Time', type: 'time' },
        { id: 'timezone', label: 'Timezone', type: 'text', placeholder: 'Asia/Calcutta' },
        { id: 'duration', label: 'Duration (minutes)', type: 'number', placeholder: '30' },
        { id: 'summary', label: 'Title', type: 'text', placeholder: 'Project sync' },
        { id: 'agenda', label: 'Agenda', type: 'textarea', placeholder: 'Meeting agenda and outcomes' },
        { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes' }
      ]
    },
    actions: [
      { actionType: 'schedule_meeting', label: 'Schedule Meeting', requiresApproval: true, autoExecute: false }
    ]
  },
  analytics_report: {
    taskType: 'analytics_report',
    canvasType: 'analytics_report',
    title: 'Analytics Report',
    schema: {
      fields: [
        { id: 'metrics', label: 'Metrics', type: 'textarea', placeholder: 'response_time, reply_rate, volume' },
        { id: 'dateRange', label: 'Date Range', type: 'text', placeholder: 'last_30_days' },
        { id: 'chartBlocks', label: 'Chart Blocks', type: 'textarea', placeholder: 'line:response_time\nbar:volume' },
        { id: 'narrativeInsights', label: 'Narrative Insights', type: 'textarea', placeholder: 'What should this report emphasize?' },
        { id: 'exportFormat', label: 'Export Format', type: 'select', options: [
          { value: 'json', label: 'JSON' },
          { value: 'csv', label: 'CSV' },
          { value: 'pdf', label: 'PDF' }
        ] }
      ]
    },
    actions: [
      { actionType: 'refresh_analytics', label: 'Refresh Report', requiresApproval: false, autoExecute: true },
      { actionType: 'export_analytics', label: 'Export', requiresApproval: false, autoExecute: true }
    ]
  },
  summary: {
    taskType: 'summary',
    canvasType: 'summary',
    title: 'Summary',
    schema: { fields: [] },
    actions: [{ actionType: 'apply_changes', label: 'Apply Changes', requiresApproval: false, autoExecute: true }]
  },
  research: {
    taskType: 'research',
    canvasType: 'research',
    title: 'Research',
    schema: { fields: [] },
    actions: [{ actionType: 'apply_changes', label: 'Apply Changes', requiresApproval: false, autoExecute: true }]
  },
  action_plan: {
    taskType: 'action_plan',
    canvasType: 'action_plan',
    title: 'Action Plan',
    schema: { fields: [] },
    actions: [{ actionType: 'execute_plan', label: 'Execute Plan', requiresApproval: true, autoExecute: false }]
  },
  notes: {
    taskType: 'notes',
    canvasType: 'notes',
    title: 'Notes',
    schema: { fields: [] },
    actions: [{ actionType: 'apply_changes', label: 'Apply Changes', requiresApproval: false, autoExecute: true }]
  },
  generic_workflow: {
    taskType: 'generic_workflow',
    canvasType: 'none',
    title: 'Workflow',
    schema: {
      fields: [
        { id: 'objective', label: 'Objective', type: 'text', placeholder: 'Describe what to execute' },
        { id: 'inputs', label: 'Inputs', type: 'textarea', placeholder: 'List key inputs and constraints' },
        { id: 'steps', label: 'Steps', type: 'textarea', placeholder: 'One step per line' }
      ]
    },
    actions: [{ actionType: 'execute_plan', label: 'Execute Task', requiresApproval: true, autoExecute: false }]
  }
};

export function getTaskRegistry() {
  return TASK_REGISTRY;
}

export function getTaskDefinition(taskType = 'generic_workflow') {
  return TASK_REGISTRY[taskType] || TASK_REGISTRY.generic_workflow;
}

export function mapCanvasTypeToTaskType(canvasType = 'none') {
  return CANVAS_TO_TASK[canvasType] || 'generic_workflow';
}

export function inferTaskType({ taskType = null, canvasType = 'none', intent = '', message = '' } = {}) {
  if (taskType && TASK_REGISTRY[taskType]) return taskType;
  if (canvasType && CANVAS_TO_TASK[canvasType]) return CANVAS_TO_TASK[canvasType];

  const lower = String(message || '').toLowerCase();
  if (/(meeting|schedule|calendar|invite|slot|availability)/.test(lower) || intent === 'schedule') return 'meeting_schedule';
  if (/(analytics|report|chart|graph|sla|insight|metric)/.test(lower) || intent === 'analyze') return 'analytics_report';
  if (/(email|reply|draft|send)/.test(lower) || intent === 'reply_email' || intent === 'draft_email') return 'email_reply';
  if (intent === 'summarize') return 'summary';
  return 'generic_workflow';
}

export function getTaskExecutionActions(taskType = 'generic_workflow', { requiresApproval = false } = {}) {
  const definition = getTaskDefinition(taskType);
  const actions = (definition.actions || []).map((action) => ({
    ...action,
    requiresApproval: Boolean(
      action.requiresApproval ||
      requiresApproval ||
      MUTATING_ACTIONS.has(action.actionType)
    ),
    autoExecute: Boolean(action.autoExecute && SAFE_AUTO_EXEC_ACTIONS.has(action.actionType) && !action.requiresApproval && !requiresApproval)
  }));

  return actions;
}

export function isCriticalAction(actionType = '') {
  return MUTATING_ACTIONS.has(actionType);
}

export function requiresApprovalForAction(actionType = '', executionPolicy = null) {
  const fromPolicy = executionPolicy?.actions?.find((a) => a.actionType === actionType);
  if (fromPolicy) return Boolean(fromPolicy.requiresApproval);
  return isCriticalAction(actionType);
}






