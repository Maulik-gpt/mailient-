'use client';
/**
 * Arcus V3 — Plan Mode Brief View
 * Full-page editorial morning briefing.
 */
import React, { useState } from 'react';

interface BriefData {
  generatedAt: string;
  criticalPath: Array<{ item: string; reason: string }>;
  risks: Array<{ risk: string; severity: string; suggestion: string }>;
  suggestedFocusBlocks: Array<{ day: string; timeRange: string; reason: string }>;
  oneThingToDropOrDelegate: { item: string; reasoning: string };
}

interface PlanModeBriefProps {
  brief: BriefData | null;
  onGenerate: () => void;
  loading: boolean;
}

export default function PlanModeBrief({ brief, onGenerate, loading }: PlanModeBriefProps) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div>
      {/* Header */}
      <div className="arcus-brief-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="arcus-brief-date">{today}</h1>
          <p className="arcus-brief-subtitle">Your Arcus brief</p>
        </div>
        <button
          className="arcus-btn arcus-btn-ghost"
          onClick={onGenerate}
          disabled={loading}
        >
          {loading ? <span className="arcus-spinner arcus-spinner-small" /> : 'Generate New Brief'}
        </button>
      </div>

      <div className="arcus-brief-separator" />

      {/* No brief yet */}
      {!brief && !loading && (
        <div className="arcus-empty">
          <h2 className="arcus-empty-headline">No brief yet.</h2>
          <p className="arcus-empty-subline">
            Arcus generates your morning brief at 7AM, or you can run it now.
          </p>
          <button className="arcus-btn arcus-btn-primary" onClick={onGenerate}>
            Generate brief
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="glass-surface arcus-brief-container">
          <div className="arcus-brief-loading">
            <span className="arcus-brief-loading-text">
              Arcus is thinking about your week…
            </span>
          </div>
        </div>
      )}

      {/* Brief content */}
      {brief && !loading && (
        <div className="glass-surface arcus-brief-container">
          {/* Critical Path */}
          <div className="arcus-brief-section">
            <div className="arcus-brief-section-label">Critical Path</div>
            {brief.criticalPath.map((item, idx) => (
              <div className="arcus-brief-item" key={idx}>
                <span className="arcus-brief-item-number">{idx + 1}</span>
                <div>
                  <div className="arcus-brief-item-text">{item.item}</div>
                  <div className="arcus-brief-item-reason">{item.reason}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Risks */}
          <div className="arcus-brief-section">
            <div className="arcus-brief-section-label">Risks</div>
            {brief.risks.map((risk, idx) => (
              <div className="arcus-brief-item" key={idx} style={{ alignItems: 'center' }}>
                <span className={`arcus-badge arcus-badge-${risk.severity}`} style={{ flexShrink: 0 }}>
                  {risk.severity}
                </span>
                <div style={{ flex: 1 }}>
                  <div className="arcus-brief-item-text" style={{ fontWeight: 400 }}>
                    {risk.risk}
                  </div>
                  <div className="arcus-brief-item-reason">{risk.suggestion}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Focus Blocks */}
          <div className="arcus-brief-section">
            <div className="arcus-brief-section-label">Suggested Focus Blocks</div>
            {brief.suggestedFocusBlocks.map((block, idx) => (
              <div className="arcus-brief-item" key={idx}>
                <div>
                  <div className="arcus-brief-item-text">
                    {block.day} · {block.timeRange}
                  </div>
                  <div className="arcus-brief-item-reason">{block.reason}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Drop or Delegate */}
          <div className="arcus-brief-section">
            <div className="arcus-brief-section-label">One Thing to Drop or Delegate</div>
            <div className="arcus-brief-item">
              <div>
                <div className="arcus-brief-item-text">
                  {brief.oneThingToDropOrDelegate.item}
                </div>
                <div className="arcus-brief-item-reason">
                  {brief.oneThingToDropOrDelegate.reasoning}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
