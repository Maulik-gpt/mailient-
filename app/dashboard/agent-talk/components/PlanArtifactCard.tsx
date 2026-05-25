'use client';
/**
 * Arcus V3 — Plan Artifact Card
 * 
 * State machine component with exactly 4 states:
 * detected → plan_built → executing → completed
 * 
 * Shared glass shell, editorial typography (Fraunces), 
 * and liquid interaction language.
 */
import React, { useState, useCallback } from 'react';
import { useRelativeTime } from '../hooks/useRelativeTime';
import { usePlanSSE, type SSEEvent } from '../hooks/usePlanSSE';
import '../arcus-tokens.css';

export type PlanStatus = 'detected' | 'plan_built' | 'executing' | 'completed' | 'failed' | 'dismissed' | 'proposed' | 'approved' | 'draft' | 'cancelled';

export interface PlanOption {
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
}

export interface Finding {
  id: string;
  headline: string;
  impact: string;
  options: PlanOption[];
  recommended: number;
}

export interface PlanStep {
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

export interface PlanData {
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

export interface PlanArtifact {
  planId: string;
  status: PlanStatus;
  severity: string;
  findings: Finding[];
  steps: PlanStep[];
  sources: string[];
  createdAt: string;
  completedAt?: string;
  selectedOption?: number;
  title: string;
  objective: string;
  assumptions: any[];
  questionsAnswered: any[];
  acceptanceCriteria: any[];
  version: number;
  locked: boolean;
  complexity: string;
  intent: string;
  canvasType: string;
  todos: any[];
}

interface PlanArtifactCardProps {
  plan: any; // Using any for compatibility with legacy data structures
  isNew?: boolean;
  onUpdate?: () => void;
}

const SEVERITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: 'Low Priority', color: 'blue' },
  medium: { label: 'Needs Attention', color: 'amber' },
  high: { label: 'Action Required', color: 'red' },
};

export default function PlanArtifactCard({ plan, isNew, onUpdate }: PlanArtifactCardProps) {
  // Normalize plan data for internal use
  const normalizedPlan: PlanData = {
    id: plan.planId || plan.id,
    mode: plan.mode || 'agentic',
    status: plan.status,
    severity: plan.severity || 'low',
    headline: plan.headline || plan.title,
    impact: plan.impact || plan.objective,
    findings: plan.findings || [],
    steps: plan.steps || [],
    created_at: plan.createdAt || plan.created_at,
    completed_at: plan.completedAt || plan.completed_at,
    source: plan.source || (plan.sources ? plan.sources.join(', ') : null),
  };

  const [status, setStatus] = useState(normalizedPlan.status);
  const [steps, setSteps] = useState<PlanStep[]>(normalizedPlan.steps);
  const [selectedOption, setSelectedOption] = useState(
    normalizedPlan.findings?.[0]?.recommended ?? 0
  );
  const [loading, setLoading] = useState(false);
  const relativeTime = useRelativeTime(normalizedPlan.created_at);

  // SSE for real-time execution feedback
  usePlanSSE({
    planId: normalizedPlan.id,
    enabled: status === 'executing' || status === 'approved',
    onEvent: useCallback((event: SSEEvent) => {
      if (event.type === 'step:start' && event.stepId) {
        setSteps(prev => prev.map(s => s.id === event.stepId ? { ...s, status: 'executing' } : s));
      }
      if (event.type === 'step:done' && event.stepId) {
        setSteps(prev => prev.map(s => s.id === event.stepId ? { ...s, status: 'completed' } : s));
      }
      if (event.type === 'step:failed' && event.stepId) {
        setSteps(prev => prev.map(s => s.id === event.stepId ? { ...s, status: 'failed', error: event.error || 'Execution failed' } : s));
        setStatus('failed');
      }
      if (event.type === 'plan:completed') {
        setStatus('completed');
      }
    }, [])
  });

  // ─── Actions ──────────────────────────────────────────────────────────────

  async function handleBuildPlan() {
    setLoading(true);
    try {
      const res = await fetch(`/api/arcus/v3/plans/${normalizedPlan.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedOption }),
      });
      if (res.ok) {
        const planRes = await fetch(`/api/arcus/v3/plans/${normalizedPlan.id}`);
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
      const res = await fetch(`/api/arcus/v3/plans/${normalizedPlan.id}/execute`, { method: 'POST' });
      if (res.ok) setStatus('executing');
    } catch (err) {
      console.error('Execution trigger failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDismiss() {
    try {
      await fetch(`/api/arcus/v3/plans/${normalizedPlan.id}/dismiss`, { method: 'POST' });
      setStatus('dismissed');
      onUpdate?.();
    } catch (err) {
      console.error('Dismiss failed:', err);
    }
  }

  // ─── Rendering ──────────────────────────────────────────────────────────────

  if (status === 'dismissed') return null;

  // State: Completed (Collapsed)
  if (status === 'completed') {
    return (
      <div className="glass-surface" style={{ padding: 'var(--space-4) var(--space-6)', opacity: 0.6, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-on-dark-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%', fontFamily: 'var(--font-ui)' }}>
          {normalizedPlan.findings?.[0]?.headline || normalizedPlan.headline}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-on-dark-tertiary)', fontFamily: 'var(--font-ui)' }}>
          Completed · {useRelativeTime(normalizedPlan.completed_at)}
        </span>
      </div>
    );
  }

  const severity = SEVERITY_MAP[normalizedPlan.severity || 'low'];
  const finding = normalizedPlan.findings?.[0];

  return (
    <div className={`glass-surface ${isNew ? 'arcus-card-enter' : ''}`} style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <span className={`arcus-badge arcus-badge-${normalizedPlan.severity || 'low'}`}>
          {severity.label}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-on-dark-tertiary)', fontFamily: 'var(--font-ui)' }}>
          {relativeTime}
        </span>
      </div>

      {/* Headline & Impact */}
      <h3 style={{ fontFamily: 'var(--font-content)', fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--text-on-dark-primary)', lineHeight: 1.3, marginBottom: 'var(--space-2)' }}>
        {finding?.headline || normalizedPlan.headline}
      </h3>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-on-dark-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-3)', fontFamily: 'var(--font-ui)' }}>
        {finding?.impact || normalizedPlan.impact}
      </p>

      {/* Detected State */}
      {(status === 'proposed' || status === 'detected') && finding && (
        <>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-on-dark-tertiary)', marginBottom: 'var(--space-4)', fontFamily: 'var(--font-ui)' }}>
            Detected from {normalizedPlan.source || 'connected apps'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            {finding.options.map((option, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedOption(idx)}
                style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: selectedOption === idx ? '0.5px solid rgba(255,255,255,0.20)' : '0.5px solid transparent',
                  background: selectedOption === idx ? 'rgba(255,255,255,0.06)' : 'transparent',
                }}
              >
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${selectedOption === idx ? '#FFF' : 'rgba(255,255,255,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  {selectedOption === idx && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFF' }} className="arcus-option-pop" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-on-dark-primary)', fontFamily: 'var(--font-ui)' }}>{option.label}</span>
                    <span className="arcus-effort-badge">{option.effort}</span>
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: option.irreversible ? 'var(--color-warning)' : 'var(--text-on-dark-tertiary)', fontFamily: 'var(--font-ui)' }}>
                    {option.irreversible && '⚠ '}
                    {option.tradeoff}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="arcus-btn-primary" onClick={handleBuildPlan} disabled={loading}>
              {loading ? <span className="arcus-spinner arcus-spinner-small" /> : 'Build Plan'}
            </button>
          </div>
        </>
      )}

      {/* Plan Built / Executing States */}
      {(status === 'approved' || status === 'executing' || status === 'failed') && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            {steps.map((step, idx) => (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', background: step.status === 'completed' ? 'rgba(52,211,153,0.08)' : 'transparent' }} className={step.status === 'completed' ? 'arcus-step-flash' : ''}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: step.status === 'completed' ? 'var(--color-success-bg)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 'var(--text-xs)', color: 'var(--text-on-dark-secondary)', fontFamily: 'var(--font-ui)' }}>
                  {step.status === 'pending' && (idx + 1)}
                  {step.status === 'executing' && <span className="arcus-spinner arcus-spinner-small" />}
                  {step.status === 'completed' && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  {step.status === 'failed' && <span style={{ color: 'var(--color-danger)' }}>×</span>}
                </div>
                <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-on-dark-primary)', fontFamily: 'var(--font-ui)' }}>{step.human_readable}</span>
                <span className="arcus-step-app-chip">{step.app}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            {status === 'approved' && (
              <>
                <button className="arcus-btn-ghost" onClick={handleDismiss}>Dismiss</button>
                <button className="arcus-btn-primary" onClick={handleExecute} disabled={loading}>
                  {loading ? <span className="arcus-spinner arcus-spinner-small" /> : 'Execute'}
                </button>
              </>
            )}
            {status === 'executing' && <button className="arcus-btn-ghost" disabled style={{ opacity: 0.8, cursor: 'default' }}>Running…</button>}
            {status === 'failed' && <button className="arcus-btn arcus-btn-destructive" onClick={() => setStatus('approved')}>Retry</button>}
          </div>
        </>
      )}
    </div>
  );
}
