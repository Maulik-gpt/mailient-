'use client';
/**
 * Arcus V3 — Plan Artifact Card
 * 
 * State machine component with exactly 4 states:
 * detected → plan_built → executing → completed
 * 
 * All four share the same glass outer shell — only interior changes.
 */
import React, { useState, useCallback } from 'react';
import { useRelativeTime } from '../hooks/useRelativeTime';
import { usePlanSSE, type SSEEvent } from '../hooks/usePlanSSE';

interface Finding {
  id: string;
  headline: string;
  impact: string;
  options: Array<{
    label: string;
    effort: string;
    tradeoff: string;
    irreversible: boolean;
    steps: Array<{
      app: string;
      action: string;
      params: Record<string, unknown>;
      humanReadable: string;
    }>;
  }>;
  recommended: number;
}

interface PlanStep {
  id: string;
  position: number;
  app: string;
  action: string;
  params: Record<string, unknown>;
  human_readable: string;
  irreversible: boolean;
  status: string;
  error: string | null;
}

interface PlanData {
  id: string;
  mode: string;
  status: string;
  severity: string | null;
  headline: string | null;
  impact: string | null;
  findings: Finding[];
  steps: PlanStep[];
  created_at: string;
  completed_at: string | null;
  source: string | null;
}

interface PlanArtifactCardProps {
  plan: PlanData;
  isNew?: boolean;
  onUpdate?: () => void;
}

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Low Priority',
  medium: 'Needs Attention',
  high: 'Action Required',
};

const DEEP_LINKS: Record<string, string> = {
  gcal: 'https://calendar.google.com',
  slack: 'https://app.slack.com',
};

export default function PlanArtifactCard({ plan, isNew, onUpdate }: PlanArtifactCardProps) {
  const [status, setStatus] = useState(plan.status);
  const [steps, setSteps] = useState<PlanStep[]>(plan.steps || []);
  const [selectedOption, setSelectedOption] = useState(
    plan.findings?.[0]?.recommended ?? 0
  );
  const [loading, setLoading] = useState(false);
  const relativeTime = useRelativeTime(plan.created_at);

  // SSE for real-time step updates during execution
  const sseActive = status === 'executing' ? plan.id : null;

  usePlanSSE(sseActive, useCallback((event: SSEEvent) => {
    if (event.type === 'step:start' && event.stepId) {
      setSteps(prev =>
        prev.map(s => s.id === event.stepId ? { ...s, status: 'executing' } : s)
      );
    }
    if (event.type === 'step:done' && event.stepId) {
      setSteps(prev =>
        prev.map(s => s.id === event.stepId ? { ...s, status: 'completed' } : s)
      );
    }
    if (event.type === 'step:failed' && event.stepId) {
      setSteps(prev =>
        prev.map(s =>
          s.id === event.stepId
            ? { ...s, status: 'failed', error: event.error || 'Unknown error' }
            : s
        )
      );
      setStatus('failed');
    }
    if (event.type === 'plan:completed') {
      setStatus('completed');
    }
  }, []));

  // ─── API Calls ──────────────────────────────────────────────────────────────

  async function handleBuildPlan() {
    setLoading(true);
    try {
      const res = await fetch(`/api/arcus/v3/plans/${plan.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedOption }),
      });
      if (res.ok) {
        // Fetch updated plan with steps
        const planRes = await fetch(`/api/arcus/v3/plans/${plan.id}`);
        if (planRes.ok) {
          const updated = await planRes.json();
          setSteps(updated.steps || []);
          setStatus('approved');
        }
      }
    } catch (err) {
      console.error('Build plan failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExecute() {
    setLoading(true);
    try {
      const res = await fetch(`/api/arcus/v3/plans/${plan.id}/execute`, {
        method: 'POST',
      });
      if (res.ok) {
        setStatus('executing');
      }
    } catch (err) {
      console.error('Execute failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDismiss() {
    try {
      await fetch(`/api/arcus/v3/plans/${plan.id}/dismiss`, { method: 'POST' });
      setStatus('dismissed');
      onUpdate?.();
    } catch (err) {
      console.error('Dismiss failed:', err);
    }
  }

  // ─── Render by State ────────────────────────────────────────────────────────

  if (status === 'dismissed') return null;

  // Completed state — collapsed single row
  if (status === 'completed') {
    return (
      <div className={`glass-surface arcus-card-completed`}>
        <div className="arcus-card-completed-row">
          <span className="arcus-card-completed-headline">
            {(plan.headline || '').substring(0, 60)}
            {(plan.headline || '').length > 60 ? '…' : ''}
          </span>
          <span className="arcus-card-completed-time">
            Completed · {useRelativeTime(plan.completed_at)}
          </span>
        </div>
      </div>
    );
  }

  const finding = plan.findings?.[0];
  const severity = plan.severity || 'low';

  return (
    <div className={`glass-surface arcus-plan-card ${isNew ? 'arcus-card-enter' : ''}`}>
      {/* Header */}
      <div className="arcus-card-header">
        <span className={`arcus-badge arcus-badge-${severity}`}>
          {SEVERITY_LABELS[severity] || severity}
        </span>
        <span className="arcus-card-time">{relativeTime}</span>
      </div>

      {/* Headline */}
      {finding && (
        <>
          <h3 className="arcus-card-headline">{finding.headline}</h3>
          <p className="arcus-card-impact">{finding.impact}</p>
          <div className="arcus-card-source">
            <span>Detected from {plan.source === 'gcal' ? 'Google Calendar' : plan.source === 'slack' ? 'Slack' : plan.source}</span>
          </div>
        </>
      )}

      {/* State: detected/proposed — show options */}
      {status === 'proposed' && finding && (
        <>
          <div className="arcus-options">
            {finding.options.map((option, idx) => (
              <div
                key={idx}
                className={`arcus-option ${selectedOption === idx ? 'selected' : ''}`}
                onClick={() => setSelectedOption(idx)}
                role="radio"
                aria-checked={selectedOption === idx}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setSelectedOption(idx);
                  }
                }}
              >
                <div className="arcus-option-radio">
                  <div className="arcus-option-radio-dot" />
                </div>
                <div className="arcus-option-content">
                  <div className="arcus-option-label">
                    {option.label}
                    <span className="arcus-effort-badge" style={{ marginLeft: 8 }}>
                      {option.effort}
                    </span>
                  </div>
                  <div className={`arcus-option-tradeoff ${option.irreversible ? 'irreversible' : ''}`}>
                    {option.irreversible && '⚠ '}
                    {option.tradeoff}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="arcus-card-actions">
            <button
              className="arcus-btn arcus-btn-primary"
              onClick={handleBuildPlan}
              disabled={loading}
            >
              {loading ? <span className="arcus-spinner arcus-spinner-small" /> : 'Build Plan'}
            </button>
          </div>
        </>
      )}

      {/* State: plan_built/approved — show steps */}
      {status === 'approved' && (
        <>
          {loading && steps.length === 0 ? (
            <div className="arcus-dots">
              <div className="arcus-dot" />
              <div className="arcus-dot" />
              <div className="arcus-dot" />
            </div>
          ) : (
            <div className="arcus-steps">
              {steps.map((step, idx) => (
                <div
                  key={step.id}
                  className={`arcus-step ${step.irreversible ? 'irreversible' : ''}`}
                >
                  <div className="arcus-step-indicator">
                    {idx + 1}
                  </div>
                  <span className="arcus-step-text">{step.human_readable}</span>
                  <span className="arcus-step-app-chip">{step.app}</span>
                </div>
              ))}
            </div>
          )}

          <div className="arcus-card-actions">
            <button className="arcus-btn arcus-btn-ghost" onClick={handleDismiss}>
              Dismiss
            </button>
            <button
              className="arcus-btn arcus-btn-primary"
              onClick={handleExecute}
              disabled={loading}
            >
              {loading ? <span className="arcus-spinner arcus-spinner-small" /> : 'Execute'}
            </button>
          </div>
        </>
      )}

      {/* State: executing — live step progress */}
      {(status === 'executing' || status === 'failed') && (
        <div className="arcus-steps" aria-live="polite">
          {steps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div
                className={`arcus-step ${step.status === 'completed' ? 'arcus-step-flash' : ''} ${step.irreversible ? 'irreversible' : ''}`}
              >
                <div className={`arcus-step-indicator ${step.status}`}>
                  {step.status === 'pending' && ''}
                  {step.status === 'executing' && (
                    <span className="arcus-spinner arcus-spinner-small" />
                  )}
                  {step.status === 'completed' && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4 7L8 3" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {step.status === 'failed' && (
                    <span style={{ color: 'var(--color-danger)', fontSize: 11, fontWeight: 600 }}>×</span>
                  )}
                </div>
                <span className="arcus-step-text">{step.human_readable}</span>
                <span className="arcus-step-app-chip">{step.app}</span>
              </div>
              {step.status === 'failed' && step.error && (
                <>
                  <div className="arcus-step-error">{step.error}</div>
                  <a
                    href={DEEP_LINKS[step.app] || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="arcus-step-fix-link"
                  >
                    Fix manually →
                  </a>
                </>
              )}
            </React.Fragment>
          ))}

          {status === 'executing' && (
            <div className="arcus-card-actions">
              <button className="arcus-btn arcus-btn-ghost" disabled>
                Running…
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
