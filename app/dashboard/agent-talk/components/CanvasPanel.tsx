'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Copy, Check, Edit3, FileText, Sparkles, ChevronRight, AlertTriangle } from 'lucide-react';

export type CanvasType = 'email_draft' | 'summary' | 'research' | 'action_plan' | 'reply' | 'notes' | 'meeting_schedule' | 'analytics_report' | 'generic_workflow' | 'none';

export interface CanvasSection {
    id: string;
    title: string;
    tag?: string;
    content: string;
    expanded?: boolean;
}

export interface CanvasFieldOption {
    value: string;
    label: string;
}

export interface CanvasField {
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'date' | 'time' | 'select';
    placeholder?: string;
    options?: CanvasFieldOption[];
}

export interface CanvasAction {
    actionType: string;
    label?: string;
    requiresApproval?: boolean;
    autoExecute?: boolean;
}

export interface CanvasData {
    type: CanvasType;
    title?: string;
    content: Record<string, any>;
    sections?: CanvasSection[];
    actions?: CanvasAction[];
    approvalTokens?: Record<string, string>;
    goal?: string;
    decisionSummary?: string;
    riskFlags?: string[];
    sources?: { threadId?: string | null; messageId?: string | null; sender?: string; timestamp?: string | null; subject?: string }[];
    recommendedAction?: string | null;
    alternatives?: string[];
    actionPayload?: unknown;
    approval?: {
        required: boolean;
        token?: string | null;
        expiresAt?: string | null;
        reason?: string | null;
    };
    execution?: {
        runId?: string | null;
        taskType?: string;
        canvasType?: string;
        actions?: CanvasAction[];
        requiresApproval?: boolean;
        autoExecuteActions?: string[];
        approvalTokens?: Record<string, string>;
    };
    runId?: string | null;
    taskType?: string;
    schema?: {
        fields?: CanvasField[];
    };
    requiredInputs?: string[];
    missingInputs?: string[];
    confidence?: number;
    riskLevel?: 'low' | 'medium' | 'high' | string;
    raw?: string;
    error?: string;
}

interface CanvasPanelProps {
    isOpen: boolean;
    onClose: () => void;
    canvasData: CanvasData | null;
    onExecute: (action: string, data: unknown) => void;
    isExecuting?: boolean;
}

const typeLabels: Record<CanvasType, string> = {
    email_draft: 'Email Draft',
    summary: 'Summary',
    research: 'Research',
    action_plan: 'Action Plan',
    reply: 'Reply Draft',
    notes: 'Notes',
    meeting_schedule: 'Meeting Schedule',
    analytics_report: 'Analytics Report',
    generic_workflow: 'Workflow',
    none: 'Canvas',
};

const actionPriority: Record<string, number> = {
    send_email: 1,
    schedule_meeting: 2,
    execute_plan: 3,
    save_draft: 4,
    refresh_analytics: 5,
    export_analytics: 6,
    apply_changes: 7,
    revise: 8,
    cancel: 9
};

const actionLabel: Record<string, string> = {
    send_email: 'Send Email',
    save_draft: 'Save Draft',
    schedule_meeting: 'Schedule Meeting',
    execute_plan: 'Execute Task',
    refresh_analytics: 'Refresh Report',
    export_analytics: 'Export Report',
    apply_changes: 'Apply Changes',
    revise: 'Revise',
    cancel: 'Cancel'
};

const primaryActions = new Set(['send_email', 'schedule_meeting', 'execute_plan']);

export function CanvasPanel({ isOpen, onClose, canvasData, onExecute, isExecuting }: CanvasPanelProps) {
    const [editMode, setEditMode] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [copied, setCopied] = useState(false);
    const [formValues, setFormValues] = useState<Record<string, any>>({});
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!canvasData) return;
        const content = (canvasData.content || {}) as Record<string, any>;
        setFormValues(content);
        if (canvasData.sections) {
            setExpandedSections(new Set(canvasData.sections.map((s) => s.id)));
        }
    }, [canvasData]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !canvasData) return null;

    const sections: CanvasSection[] = canvasData.sections ? [...canvasData.sections] : [];
    const schemaFields = canvasData.schema?.fields || [];
    const title = canvasData.title || typeLabels[canvasData.type] || 'Canvas';

    const isEmailCanvas = canvasData.type === 'email_draft' || canvasData.taskType === 'email_reply' || canvasData.taskType === 'email_send';
    const isMeetingCanvas = canvasData.type === 'meeting_schedule' || canvasData.taskType === 'meeting_schedule';
    const fieldById = schemaFields.reduce<Record<string, any>>((acc, field) => {
        acc[field.id] = field;
        return acc;
    }, {});
    const emailFieldOrder = [
        'from', 'to', 'cc', 'bcc', 'subject', 'salutation', 'body', 'signature', 'threadId', 'threadContext', 'attachments'
    ];
    const meetingFieldOrder = [
        'provider', 'attendees', 'day', 'date', 'time', 'timezone', 'duration', 'summary', 'agenda', 'notes'
    ];

    const toggleSection = (id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const normalizedActions = [...(canvasData.execution?.actions || canvasData.actions || [])]
        .sort((a, b) => (actionPriority[a.actionType] || 99) - (actionPriority[b.actionType] || 99));

    if (!normalizedActions.find((a) => a.actionType === 'revise')) normalizedActions.push({ actionType: 'revise', requiresApproval: false });
    if (!normalizedActions.find((a) => a.actionType === 'cancel')) normalizedActions.push({ actionType: 'cancel', requiresApproval: false });

    const handleCopy = async () => {
        const payload = schemaFields.length > 0 ? formValues : (canvasData.content || canvasData.raw || '');
        const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    };

    const handleExecute = (action: string) => {
        if (action === 'copy') {
            void handleCopy();
            return;
        }
        if (action === 'cancel') {
            onClose();
            return;
        }
        if (action === 'revise') {
            setEditMode(true);
            return;
        }

        const payload = schemaFields.length > 0 ? { ...formValues } : (canvasData.actionPayload || canvasData.content);
        onExecute(action, payload);
    };

    const updateField = (fieldId: string, value: string) => {
        setFormValues((prev) => ({ ...prev, [fieldId]: value }));
    };

    const renderField = (field: CanvasField) => {
        const value = formValues?.[field.id] ?? '';
        const disableField = isEmailCanvas && !editMode && (field.id === 'body' || field.id === 'threadContext' || field.id === 'threadId');

        if (field.type === 'textarea') {
            return (
                <textarea
                    value={value}
                    onChange={(e) => updateField(field.id, e.target.value)}
                    placeholder={field.placeholder || ''}
                    className="w-full min-h-[90px] bg-graphite-surface-2 border border-graphite-border rounded-xl px-3 py-2 text-[13px] text-graphite-text placeholder:text-graphite-muted-2 focus:outline-none focus:border-graphite-border-strong resize-y"
                    disabled={disableField}
                />
            );
        }

        if (field.type === 'select') {
            return (
                <select
                    value={value || field.options?.[0]?.value || ''}
                    onChange={(e) => updateField(field.id, e.target.value)}
                    className="w-full h-10 bg-graphite-surface-2 border border-graphite-border rounded-xl px-3 text-[13px] text-graphite-text focus:outline-none focus:border-graphite-border-strong"
                >
                    {(field.options || []).map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            );
        }

        return (
            <input
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'}
                value={value}
                onChange={(e) => updateField(field.id, e.target.value)}
                placeholder={field.placeholder || ''}
                className="w-full h-10 bg-graphite-surface-2 border border-graphite-border rounded-xl px-3 text-[13px] text-graphite-text placeholder:text-graphite-muted-2 focus:outline-none focus:border-graphite-border-strong"
            />
        );
    };

    return (
        <>
            <div className="fixed inset-0 bg-graphite-bg/80 backdrop-blur-[6px] z-40" onClick={onClose} />

            <div
                ref={panelRef}
                className="fixed right-0 top-0 h-screen w-full sm:w-[min(100vw,780px)] bg-graphite-bg border-l border-graphite-border z-50 flex flex-col shadow-[-24px_0_60px_rgba(0,0,0,0.45)] arcus-canvas-panel"
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-graphite-border bg-gradient-to-b from-graphite-surface to-graphite-bg">
                    <div className="min-w-0">
                        <h2 className="text-graphite-text font-semibold text-[15px] tracking-tight truncate">{title}</h2>
                        <p className="text-graphite-muted-2 text-[11px]">{canvasData.taskType || canvasData.execution?.taskType || 'workflow'} {canvasData.runId || canvasData.execution?.runId ? `- ${canvasData.runId || canvasData.execution?.runId}` : ''}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-graphite-surface-2 rounded-lg transition-colors text-graphite-muted hover:text-graphite-text">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {!canvasData.error && (
                        <div className="px-5 py-4 border-b border-graphite-border bg-graphite-surface">
                            {canvasData.goal && <p className="text-graphite-muted text-xs leading-relaxed">Goal: {canvasData.goal}</p>}
                            {canvasData.decisionSummary && <p className="text-graphite-text text-sm mt-2 leading-relaxed">{canvasData.decisionSummary}</p>}
                            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                                {typeof canvasData.confidence === 'number' && <span className="px-2 py-1 rounded-md bg-graphite-surface-2 border border-graphite-border text-graphite-muted">Confidence: {Math.round(canvasData.confidence * 100)}%</span>}
                                {canvasData.riskLevel && <span className="px-2 py-1 rounded-md bg-graphite-surface-2 border border-graphite-border text-graphite-muted">Risk: {String(canvasData.riskLevel).toUpperCase()}</span>}
                            </div>
                            {Array.isArray(canvasData.missingInputs) && canvasData.missingInputs.length > 0 && (
                                <div className="mt-3 text-[12px] text-graphite-warning bg-graphite-warning-surface border border-graphite-warning-border rounded-lg px-3 py-2 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 text-graphite-warning" />
                                    <span>Missing inputs: {canvasData.missingInputs.join(', ')}</span>
                                </div>
                            )}
                            {canvasData.approval?.required && (
                                <div className="mt-3 text-[11px] text-graphite-text bg-graphite-surface-2 border border-graphite-border rounded-lg px-3 py-2">
                                    Approval required. {canvasData.approval?.reason || 'Review and confirm before execution.'}
                                </div>
                            )}
                        </div>
                    )}

                    {canvasData.error && (
                        <div className="px-6 py-6">
                            <div className="text-graphite-danger text-sm bg-graphite-danger-surface border border-graphite-danger-border rounded-xl p-4">
                                <p className="font-medium mb-1">Generation failed</p>
                                <p className="text-graphite-danger text-xs">{canvasData.error}</p>
                            </div>
                        </div>
                    )}

                    {!canvasData.error && schemaFields.length > 0 && (
                        isEmailCanvas ? (
                            <div className="px-5 py-5 space-y-4">
                                {emailFieldOrder.map((fieldId) => {
                                    const field = fieldById(fieldId);
                                    if (!field) return null;
                                    return (
                                        <div key={field.id} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                                            <label className="block text-[11px] uppercase tracking-wide text-graphite-muted-2 mb-2">{field.label}</label>
                                            {renderField(field)}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : isMeetingCanvas ? (
                            <div className="px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {meetingFieldOrder.map((fieldId) => {
                                    const field = fieldById(fieldId);
                                    if (!field) return null;
                                    return (
                                        <div key={field.id} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                                            <label className="block text-[11px] uppercase tracking-wide text-graphite-muted-2 mb-2">{field.label}</label>
                                            {renderField(field)}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {schemaFields.map((field) => (
                                    <div key={field.id} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                                        <label className="block text-[11px] uppercase tracking-wide text-graphite-muted-2 mb-2">{field.label}</label>
                                        {renderField(field)}
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {schemaFields.length === 0 && canvasData.type !== 'email_draft' && sections.length > 0 && !canvasData.error && (
                        <div className="py-2">
                            {sections.map((section) => (
                                <div key={section.id} className="border-b border-graphite-border last:border-0">
                                    <button onClick={() => toggleSection(section.id)} className="flex items-center w-full px-5 py-4 hover:bg-graphite-surface-2 transition-colors text-left gap-3">
                                        <ChevronRight className={`w-3.5 h-3.5 text-graphite-muted-2 flex-shrink-0 transition-transform duration-200 ${expandedSections.has(section.id) ? 'rotate-90' : ''}`} />
                                        <span className="text-graphite-text text-sm font-medium flex-1">{section.title}</span>
                                        {section.tag && <span className="text-graphite-muted-2 text-xs font-medium">{section.tag}</span>}
                                    </button>
                                    {expandedSections.has(section.id) && section.content && (
                                        <div className="px-5 pb-4 pl-11">
                                            <div className="text-graphite-muted text-sm leading-relaxed whitespace-pre-wrap">{section.content}</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {schemaFields.length === 0 && sections.length === 0 && canvasData.raw && !canvasData.error && (
                        <div className="px-5 py-5">
                            <div className="text-graphite-text text-sm leading-[1.8] whitespace-pre-wrap">{canvasData.raw}</div>
                        </div>
                    )}
                </div>

                {!canvasData.error && (
                    <div className="border-t border-graphite-border px-5 py-4 bg-graphite-surface">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <button onClick={() => setEditMode((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${editMode ? 'bg-graphite-surface-3 text-graphite-text' : 'text-graphite-muted hover:text-graphite-text hover:bg-graphite-surface-2'}`}>
                                    <Edit3 className="w-3 h-3" />
                                    {editMode ? 'Editing' : 'Edit'}
                                </button>
                                <button onClick={() => void handleCopy()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-graphite-muted hover:text-graphite-text hover:bg-graphite-surface-2 transition-all">
                                    {copied ? <Check className="w-3 h-3 text-graphite-text" /> : <Copy className="w-3 h-3" />} {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap justify-end">
                                {normalizedActions.map((action) => {
                                    const isPrimary = primaryActions.has(action.actionType);
                                    const label = action.label || actionLabel[action.actionType] || action.actionType;
                                    const isBusy = isExecuting && isPrimary;
                                    return (
                                        <button
                                            key={action.actionType}
                                            onClick={() => handleExecute(action.actionType)}
                                            disabled={isExecuting && action.actionType !== 'cancel' && action.actionType !== 'revise'}
                                            className={isPrimary
                                                ? 'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-graphite-highlight text-graphite-bg hover:bg-graphite-text transition-all shadow-[0_8px_24px_rgba(200,210,226,0.18)] disabled:opacity-40'
                                                : 'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-graphite-muted hover:text-graphite-text bg-graphite-surface-2 hover:bg-graphite-surface-3 border border-graphite-border transition-all disabled:opacity-40'}
                                        >
                                            {isBusy ? <span className="w-3 h-3 border-2 border-graphite-border border-t-graphite-text rounded-full animate-spin" />
                                                : action.actionType === 'save_draft' ? <FileText className="w-3 h-3" />
                                                    : action.actionType === 'schedule_meeting' ? <Sparkles className="w-3 h-3" />
                                                        : action.actionType === 'execute_plan' ? <Sparkles className="w-3 h-3" />
                                                            : action.actionType === 'send_email' ? <Send className="w-3 h-3" />
                                                                : null}
                                            {isBusy ? 'Executing...' : label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>



        </>
    );
}













