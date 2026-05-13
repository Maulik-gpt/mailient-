'use client';

/**
 * PlanArtifactCard — 4-State Machine
 *
 * States: detected → plan_built → executing → completed
 *
 * This component is the primary surface for Arcus reactive plans.
 * It uses the liquid glass design system from arcus-tokens.css.
 * All four states share the same outer glass shell — only the interior changes.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import '../arcus-tokens.css';

// ─── Types ──────────────────────────────────────────────────────────────────

export type PlanStatus = 'detected' | 'plan_built' | 'executing' | 'completed' | 'failed' | 'dismissed';

export type StepStatus = 'pending' | 'executing' | 'completed' | 'failed';

export type PlanStep = {
  id: string;
  app: 'gcal' | 'slack' | 'notion' | 'calcom';
  action: string;
  params: Record<string, unknown>;
  humanReadable: string;
  irreversible: boolean;
  status: StepStatus;
  error?: string;
  position: number;
};

export type PlanOption = {
  label: string;
  effort: 'low' | 'medium' | 'high';
  tradeoff: string;
  irreversible: boolean;
  steps: Array<{
    app: string;
    action: string;
    params: Record<string, unknown>;
    humanReadable: string;
  }>;
};

export type Finding = {
  id: string;
  headline: string;
  impact: string;
  options: PlanOption[];
  recommended: number;
};

export type PlanArtifact = {
  planId: string;
  status: PlanStatus;
  severity: 'low' | 'medium' | 'high';
  findings: Finding[];
  steps: PlanStep[];
  sources: string[];       // e.g. ['gcal', 'slack']
  createdAt: string;
  completedAt?: string;
  selectedOption?: number;
  // Legacy compat fields (used by existing ChatInterface)
  title: string;
  objective: string;
  assumptions: string[];
  questionsAnswered: string[];
  acceptanceCriteria: string[];
  version: number;
  locked: boolean;
  complexity: 'simple' | 'complex';
  intent: string;
  canvasType: string;
  todos: any[];
  approvedAt?: string;
  runId?: string;
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface PlanArtifactCardProps {
  plan: PlanArtifact;
  onApprove: (planId: string) => Promise<void>;
  onReject?: (planId: string) => void;
  onBuildPlan?: (planId: string, optionIndex: number) => Promise<void>;
  onExecute?: (planId: string) => Promise<void>;
  onStepUpdate?: (planId: string, stepId: string, status: StepStatus) => void;
  isProcessing?: boolean;
  compact?: boolean;
  isNew?: boolean;  // triggers entrance animation
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  low:    { label: 'Low Priority',    className: 'arcus-badge-low' },
  medium: { label: 'Needs Attention', className: 'arcus-badge-medium' },
  high:   { label: 'Action Required', className: 'arcus-badge-high' },
};

const EFFORT_LABELS: Record<string, string> = {
  low: 'Low effort',
  medium: 'Medium effort',
  high: 'High effort',
};

const APP_ICONS: Record<string, string> = {
  gcal: '📅',
  slack: '💬',
  notion: '📝',
  calcom: '🗓️',
};

const DEEP_LINKS: Record<string, string> = {
  gcal: 'https://calendar.google.com',
  slack: 'https://app.slack.com',
  notion: 'https://notion.so',
  calcom: 'https://app.cal.com',
};

function useRelativeTime(dateStr: string) {
  const [relative, setRelative] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) setRelative('Just now');
      else if (mins < 60) setRelative(`${mins} min ago`);
      else if (mins < 1440) setRelative(`${Math.floor(mins / 60)}h ago`);
      else setRelative(`${Math.floor(mins / 1440)}d ago`);
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [dateStr]);
  return relative;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PlanArtifactCard({
  plan,
  onApprove,
  onReject,
  onBuildPlan,
  onExecute,
  isProcessing,
  compact,
  isNew,
}: PlanArtifactCardProps) {
  const relativeTime = useRelativeTime(plan.createdAt);
  const [selectedOption, setSelectedOption] = useState(
    plan.findings?.[0]?.recommended ?? 0
  );
  const [isBuilding, setIsBuilding] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const finding = plan.findings?.[0];
  const severity = SEVERITY_CONFIG[plan.severity] || SEVERITY_CONFIG.low;
  const isCompleted = plan.status === 'completed';

  // ─── State: completed — collapsed row ───
  if (isCompleted) {
    return (
      <div
        className="arcus-glass"
        style={{
          padding: '16px 24px',
          opacity: 0.6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 56,
        }}
      >
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-on-dark-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '60%',
        }}>
          {finding?.headline || plan.title || 'Plan completed'}
        </span>
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-on-dark-tertiary)',
        }}>
          Completed · {plan.completedAt
            ? new Date(plan.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : relativeTime}
        </span>
      </div>
    );
  }

  // ─── Outer glass shell (all non-completed states) ───
  return (
    <div
      className={cn('arcus-glass', isNew && 'arcus-card-enter')}
      style={{ padding: 'var(--space-6)' }}
    >
      {/* ─── Header: severity + timestamp ─── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-4)',
      }}>
        <span className={cn('arcus-badge', severity.className)}>
          {severity.label}
        </span>
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-on-dark-tertiary)',
        }}>
          {relativeTime}
        </span>
      </div>

      {/* ─── State: detected ─── */}
      {plan.status === 'detected' && finding && (
        <StateDetected
          finding={finding}
          sources={plan.sources}
          selectedOption={selectedOption}
          onSelectOption={setSelectedOption}
          isBuilding={isBuilding}
          onBuildPlan={async () => {
            setIsBuilding(true);
            try {
              if (onBuildPlan) {
                await onBuildPlan(plan.planId, selectedOption);
              } else {
                // Fallback: approve = build plan
                await onApprove(plan.planId);
              }
            } finally {
              setIsBuilding(false);
            }
          }}
        />
      )}

      {/* ─── State: plan_built ─── */}
      {plan.status === 'plan_built' && (
        <StatePlanBuilt
          finding={finding}
          steps={plan.steps}
          isExecuting={isExecuting}
          onExecute={async () => {
            setIsExecuting(true);
            try {
              if (onExecute) await onExecute(plan.planId);
              else await onApprove(plan.planId);
            } finally {
              setIsExecuting(false);
            }
          }}
          onDismiss={() => onReject?.(plan.planId)}
        />
      )}

      {/* ─── State: executing ─── */}
      {plan.status === 'executing' && (
        <StateExecuting
          finding={finding}
          steps={plan.steps}
        />
      )}

      {/* ─── State: failed ─── */}
      {plan.status === 'failed' && (
        <StateExecuting
          finding={finding}
          steps={plan.steps}
        />
      )}
    </div>
  );
}

// ─── State: Detected ────────────────────────────────────────────────────────

function StateDetected({
  finding,
  sources,
  selectedOption,
  onSelectOption,
  isBuilding,
  onBuildPlan,
}: {
  finding: Finding;
  sources: string[];
  selectedOption: number;
  onSelectOption: (i: number) => void;
  isBuilding: boolean;
  onBuildPlan: () => void;
}) {
  return (
    <>
      {/* Headline — Fraunces serif */}
      <h3 style={{
        fontFamily: 'var(--font-content)',
        fontSize: 'var(--text-md)',
        fontWeight: 'var(--weight-medium)' as any,
        color: 'var(--text-on-dark-primary)',
        lineHeight: 'var(--leading-tight)' as any,
        margin: '0 0 var(--space-2) 0',
      }}>
        {finding.headline}
      </h3>

      {/* Impact */}
      <p style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--text-sm)',
        color: 'var(--text-on-dark-secondary)',
        lineHeight: 'var(--leading-normal)' as any,
        margin: '0 0 var(--space-3) 0',
      }}>
        {finding.impact}
      </p>

      {/* Source attribution */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: 'var(--space-4)',
      }}>
        {sources.map(s => (
          <span key={s} style={{ fontSize: '14px' }}>{APP_ICONS[s] || '📎'}</span>
        ))}
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-on-dark-tertiary)',
        }}>
          Detected from {sources.map(s =>
            s === 'gcal' ? 'Google Calendar' : s.charAt(0).toUpperCase() + s.slice(1)
          ).join(' + ')}
        </span>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {finding.options.map((opt, idx) => {
          const isSelected = idx === selectedOption;
          return (
            <button
              key={idx}
              onClick={() => onSelectOption(idx)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                background: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: isSelected ? '0.5px solid rgba(255,255,255,0.20)' : '0.5px solid transparent',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background var(--duration-fast) var(--ease-out)',
                width: '100%',
              }}
            >
              {/* Radio dot */}
              <div style={{
                width: 16, height: 16,
                borderRadius: '50%',
                border: `2px solid ${isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.25)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 2,
              }}>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                    style={{
                      width: 8, height: 8,
                      borderRadius: '50%',
                      background: '#FFFFFF',
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--weight-medium)' as any,
                    color: 'var(--text-on-dark-primary)',
                  }}>
                    {opt.label}
                  </span>
                  <span className={cn(
                    'arcus-badge',
                    opt.effort === 'low' ? 'arcus-badge-low' :
                    opt.effort === 'medium' ? 'arcus-badge-medium' : 'arcus-badge-high'
                  )} style={{ fontSize: 10 }}>
                    {EFFORT_LABELS[opt.effort]}
                  </span>
                </div>
                <span style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 'var(--text-xs)',
                  color: opt.irreversible ? 'var(--color-warning)' : 'var(--text-on-dark-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 4,
                }}>
                  {opt.irreversible && <span>⚠️</span>}
                  {opt.tradeoff}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Build Plan button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="arcus-btn-primary"
          onClick={onBuildPlan}
          disabled={isBuilding}
        >
          {isBuilding ? (
            <span className="arcus-loading-dots"><span /><span /><span /></span>
          ) : 'Build Plan'}
        </button>
      </div>
    </>
  );
}

// ─── State: Plan Built ──────────────────────────────────────────────────────

function StatePlanBuilt({
  finding,
  steps,
  isExecuting,
  onExecute,
  onDismiss,
}: {
  finding?: Finding;
  steps: PlanStep[];
  isExecuting: boolean;
  onExecute: () => void;
  onDismiss?: () => void;
}) {
  return (
    <>
      {finding && (
        <h3 style={{
          fontFamily: 'var(--font-content)',
          fontSize: 'var(--text-md)',
          fontWeight: 'var(--weight-medium)' as any,
          color: 'var(--text-on-dark-primary)',
          lineHeight: 'var(--leading-tight)' as any,
          margin: '0 0 var(--space-4) 0',
        }}>
          {finding.headline}
        </h3>
      )}

      {/* Step checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
        {steps.map((step, idx) => (
          <div
            key={step.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-2) var(--space-3)',
              background: step.irreversible ? 'var(--color-warning-bg)' : 'transparent',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {/* Step number circle */}
            <div style={{
              width: 20, height: 20,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-medium)' as any,
                color: 'var(--text-on-dark-secondary)',
              }}>
                {idx + 1}
              </span>
            </div>

            {/* Step text */}
            <span style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-on-dark-primary)',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              {step.irreversible && <span style={{ fontSize: 12 }}>⚠️</span>}
              {step.humanReadable}
            </span>

            {/* App chip */}
            <span style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--text-xs)',
              background: 'rgba(255,255,255,0.08)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 8px',
              color: 'var(--text-on-dark-tertiary)',
            }}>
              {step.app}
            </span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
        {onDismiss && (
          <button className="arcus-btn-ghost" onClick={onDismiss}>
            Dismiss
          </button>
        )}
        <button
          className="arcus-btn-primary"
          onClick={onExecute}
          disabled={isExecuting}
          style={{ minWidth: 100 }}
        >
          {isExecuting ? <div className="arcus-spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : 'Execute'}
        </button>
      </div>
    </>
  );
}

// ─── State: Executing ───────────────────────────────────────────────────────

function StateExecuting({
  finding,
  steps,
}: {
  finding?: Finding;
  steps: PlanStep[];
}) {
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const failedStep = steps.find(s => s.status === 'failed');

  return (
    <>
      {finding && (
        <h3 style={{
          fontFamily: 'var(--font-content)',
          fontSize: 'var(--text-md)',
          fontWeight: 'var(--weight-medium)' as any,
          color: 'var(--text-on-dark-primary)',
          lineHeight: 'var(--leading-tight)' as any,
          margin: '0 0 var(--space-4) 0',
        }}>
          {finding.headline}
        </h3>
      )}

      {/* Step list with live status */}
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
        aria-live="polite"
      >
        {steps.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </div>

      {/* Summary */}
      {failedStep ? (
        <div style={{
          marginTop: 'var(--space-4)',
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-on-dark-tertiary)',
        }}>
          {completedCount > 0 && `Steps 1–${completedCount} completed. `}
          Step {steps.indexOf(failedStep) + 1} failed.
          {steps.indexOf(failedStep) < steps.length - 1 &&
            ` Steps ${steps.indexOf(failedStep) + 2}–${steps.length} were not attempted.`}
        </div>
      ) : (
        <div style={{
          marginTop: 'var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-on-dark-secondary)',
        }}>
          <div className="arcus-spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
          Running...
        </div>
      )}
    </>
  );
}

// ─── Step Row ───────────────────────────────────────────────────────────────

function StepRow({ step }: { step: PlanStep }) {
  const [justCompleted, setJustCompleted] = useState(false);
  const prevStatus = useRef(step.status);

  useEffect(() => {
    if (prevStatus.current === 'executing' && step.status === 'completed') {
      setJustCompleted(true);
      const t = setTimeout(() => setJustCompleted(false), 600);
      return () => clearTimeout(t);
    }
    prevStatus.current = step.status;
  }, [step.status]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 'var(--radius-md)',
    }}
    className={justCompleted ? 'arcus-step-flash' : undefined}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-2) var(--space-3)',
      }}>
        {/* Status indicator */}
        <div style={{
          width: 20, height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {step.status === 'pending' && (
            <div style={{
              width: 20, height: 20,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
            }} />
          )}
          {step.status === 'executing' && (
            <div className="arcus-spinner" style={{ width: 18, height: 18, borderWidth: 1.5 }} />
          )}
          {step.status === 'completed' && (
            <motion.div
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
              style={{
                width: 20, height: 20,
                borderRadius: '50%',
                background: 'var(--color-success-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4.5 7.5L8 3" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
          )}
          {step.status === 'failed' && (
            <div style={{
              width: 20, height: 20,
              borderRadius: '50%',
              background: 'var(--color-danger-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-danger)',
              fontSize: 12,
              fontWeight: 600,
            }}>×</div>
          )}
        </div>

        {/* Step text */}
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-sm)',
          color: step.status === 'completed' ? 'var(--text-on-dark-secondary)' : 'var(--text-on-dark-primary)',
          flex: 1,
        }}>
          {step.humanReadable}
        </span>

        {/* App chip */}
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-xs)',
          background: 'rgba(255,255,255,0.08)',
          border: '0.5px solid rgba(255,255,255,0.15)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px 8px',
          color: 'var(--text-on-dark-tertiary)',
        }}>
          {step.app}
        </span>
      </div>

      {/* Error expansion for failed steps */}
      <AnimatePresence>
        {step.status === 'failed' && step.error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden', paddingLeft: 44 }}
          >
            <div style={{
              padding: 'var(--space-2) var(--space-3)',
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-danger)',
              marginBottom: 'var(--space-1)',
            }}>
              {step.error}
            </div>
            <a
              href={DEEP_LINKS[step.app] || '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: 'var(--space-1) var(--space-3)',
                fontFamily: 'var(--font-ui)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-medium)' as any,
                color: 'var(--text-on-dark-primary)',
                textDecoration: 'none',
              }}
            >
              Fix manually →
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Default export for existing import compatibility ────────────────────────

export default PlanArtifactCard;
