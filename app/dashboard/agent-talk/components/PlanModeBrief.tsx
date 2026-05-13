'use client';
/**
 * PlanModeBrief — Editorial Morning Briefing
 * 
 * Styled as a premium document with Fraunces typography.
 * Summarizes the daily critical path for the user.
 */
import React from 'react';
import '../arcus-tokens.css';

interface BriefItem {
  id: string;
  text: string;
  reason: string;
}

interface Brief {
  date: string;
  critical_path: BriefItem[];
  high_priority: BriefItem[];
  low_priority: BriefItem[];
}

interface PlanModeBriefProps {
  brief: Brief | null;
  onGenerate: () => void;
  loading: boolean;
}

export function PlanModeBrief({ brief, onGenerate, loading }: PlanModeBriefProps) {
  if (loading) {
    return (
      <div className="arcus-brief-loading">
        <div className="arcus-brief-loading-text">Architecting your morning briefing...</div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="arcus-empty">
        <h2 className="arcus-empty-headline">Start your day with a deep-reasoning pass.</h2>
        <p className="arcus-empty-subline">
          Arcus will analyze your calendar, Slack, and documents to build your critical path.
        </p>
        <button className="arcus-btn-primary" onClick={onGenerate}>
          Generate Morning Brief
        </button>
      </div>
    );
  }

  return (
    <div className="arcus-brief-container">
      <header className="arcus-brief-header">
        <h1 className="arcus-brief-date">{brief.date}</h1>
        <div className="arcus-brief-subtitle">Daily Critical Path Analysis</div>
      </header>

      <div className="arcus-brief-separator" />

      {/* Critical Path */}
      {brief.critical_path?.length > 0 && (
        <section className="arcus-brief-section">
          <div className="arcus-brief-section-label">Critical Path</div>
          {brief.critical_path.map((item, idx) => (
            <div key={item.id || idx} className="arcus-brief-item">
              <div className="arcus-brief-item-number">{idx + 1}</div>
              <div className="arcus-brief-item-content">
                <div className="arcus-brief-item-text">{item.text}</div>
                <div className="arcus-brief-item-reason">{item.reason}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* High Priority */}
      {brief.high_priority?.length > 0 && (
        <section className="arcus-brief-section">
          <div className="arcus-brief-section-label">High Priority</div>
          {brief.high_priority.map((item, idx) => (
            <div key={item.id || idx} className="arcus-brief-item">
              <div className="arcus-brief-item-number" style={{ color: 'var(--text-on-dark-disabled)' }}>{idx + 1}</div>
              <div className="arcus-brief-item-content">
                <div className="arcus-brief-item-text" style={{ fontSize: 'var(--text-sm)' }}>{item.text}</div>
                <div className="arcus-brief-item-reason" style={{ fontSize: 'var(--text-xs)' }}>{item.reason}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-12)' }}>
        <button className="arcus-btn-ghost" onClick={onGenerate}>
          Refresh Analysis
        </button>
      </div>
    </div>
  );
}

export default PlanModeBrief;
