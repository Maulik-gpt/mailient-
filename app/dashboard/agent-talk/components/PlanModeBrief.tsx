/**
 * PlanModeBrief — The Daily Brief Component
 *
 * Renders inside a single glass container on the #F4F5F8 canvas.
 * Shows: Critical Path (3 items), Risks, Focus Blocks, Drop/Delegate.
 *
 * Uses Fraunces for the brief title + critical path numerals,
 * Inter for everything else. All text inside the glass uses
 * --text-on-dark-* tokens.
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface CriticalPathItem {
  item: string;
  reason: string;
}

interface Risk {
  risk: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

interface FocusBlock {
  day: string;
  timeRange: string;
  reason: string;
}

interface DropOrDelegate {
  item: string;
  reasoning: string;
}

export interface BriefData {
  generatedAt: string;
  criticalPath: CriticalPathItem[];
  risks: Risk[];
  suggestedFocusBlocks: FocusBlock[];
  oneThingToDropOrDelegate: DropOrDelegate;
}

interface PlanModeBriefProps {
  brief: BriefData | null;
  briefDate?: string;
  isLoading?: boolean;
  onGenerateNew?: () => void;
}

// ─── Severity Badge ─────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, React.CSSProperties> = {
  low: {
    background: 'var(--color-info-bg, rgba(96,165,250,0.12))',
    color: 'var(--color-info, #60A5FA)',
    border: '0.5px solid var(--color-info-border, rgba(96,165,250,0.30))',
  },
  medium: {
    background: 'var(--color-warning-bg, rgba(251,191,36,0.12))',
    color: 'var(--color-warning, #FBBF24)',
    border: '0.5px solid var(--color-warning-border, rgba(251,191,36,0.30))',
  },
  high: {
    background: 'var(--color-danger-bg, rgba(248,113,113,0.12))',
    color: 'var(--color-danger, #F87171)',
    border: '0.5px solid var(--color-danger-border, rgba(248,113,113,0.30))',
  },
};

// ─── Component ──────────────────────────────────────────────────────────────────

export function PlanModeBrief({ brief, briefDate, isLoading, onGenerateNew }: PlanModeBriefProps) {
  // Format date
  const formattedDate = briefDate
    ? new Date(briefDate).toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });

  return (
    <div style={{ width: '100%', maxWidth: 720, margin: '0 auto' }}>
      {/* ─── Header — on light canvas ─── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
        padding: '0 4px',
      }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-content, 'Fraunces', serif)",
            fontSize: 'var(--text-2xl, 30px)',
            fontWeight: 'var(--weight-regular, 400)' as any,
            color: 'var(--text-on-light-primary, #0A0B0D)',
            lineHeight: 'var(--leading-tight, 1.3)',
            margin: 0,
          }}>
            {formattedDate}
          </h1>
          <p style={{
            fontFamily: "var(--font-ui, 'Inter', sans-serif)",
            fontSize: 'var(--text-sm, 13px)',
            color: 'var(--text-on-light-tertiary, #8A8D96)',
            marginTop: 4,
            marginBottom: 0,
          }}>
            Your Arcus brief
          </p>
        </div>

        {/* Generate New Brief button — ghost variant */}
        {onGenerateNew && (
          <button
            onClick={onGenerateNew}
            disabled={isLoading}
            style={{
              fontFamily: "var(--font-ui, 'Inter', sans-serif)",
              fontSize: 'var(--text-sm, 13px)',
              fontWeight: 'var(--weight-medium, 500)' as any,
              color: isLoading
                ? 'var(--text-on-dark-disabled, rgba(255,255,255,0.20))'
                : 'var(--text-on-dark-secondary, rgba(255,255,255,0.60))',
              background: 'rgba(255,255,255,0.08)',
              border: '0.5px solid rgba(255,255,255,0.16)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '8px 16px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background var(--duration-fast, 150ms) var(--ease-out)',
              opacity: isLoading ? 0.3 : 1,
            }}
            onMouseEnter={e => {
              if (!isLoading) {
                (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.14)';
                (e.target as HTMLElement).style.color = 'var(--text-on-dark-primary, #FFFFFF)';
              }
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
              (e.target as HTMLElement).style.color = 'var(--text-on-dark-secondary, rgba(255,255,255,0.60))';
            }}
          >
            {isLoading ? 'Generating…' : 'Generate New Brief'}
          </button>
        )}
      </div>

      {/* ─── Thin separator ─── */}
      <div style={{
        height: 1,
        background: 'rgba(0,0,0,0.08)',
        margin: '0 4px 24px 4px',
      }} />

      {/* ─── Glass container — the brief document ─── */}
      <AnimatePresence mode="wait">
        {isLoading && !brief ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'var(--glass-tint-card, rgba(34,35,38,0.82))',
              backdropFilter: 'var(--glass-blur-card, blur(24px))',
              WebkitBackdropFilter: 'var(--glass-blur-card, blur(24px))',
              border: 'var(--glass-card-border, 0.5px solid rgba(255,255,255,0.12))',
              boxShadow: 'var(--glass-shadow-card)',
              borderRadius: 'var(--radius-xl, 16px)',
              padding: 'var(--space-8, 32px)',
              minHeight: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                fontFamily: "var(--font-content, 'Fraunces', serif)",
                fontSize: 'var(--text-md, 17px)',
                color: 'var(--text-on-dark-tertiary, rgba(255,255,255,0.35))',
                textAlign: 'center',
              }}
            >
              Arcus is thinking about your week…
            </motion.p>
          </motion.div>
        ) : brief ? (
          <motion.div
            key="brief"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: 'var(--glass-tint-card, rgba(34,35,38,0.82))',
              backdropFilter: 'var(--glass-blur-card, blur(24px))',
              WebkitBackdropFilter: 'var(--glass-blur-card, blur(24px))',
              border: 'var(--glass-card-border, 0.5px solid rgba(255,255,255,0.12))',
              boxShadow: 'var(--glass-shadow-card)',
              borderRadius: 'var(--radius-xl, 16px)',
              padding: 'var(--space-8, 32px)',
            }}
          >
            {/* ── Section: Critical Path ── */}
            <BriefSection label="CRITICAL PATH">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {brief.criticalPath.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    {/* Serif numeral */}
                    <span style={{
                      fontFamily: "var(--font-content, 'Fraunces', serif)",
                      fontSize: 'var(--text-xl, 24px)',
                      fontWeight: 'var(--weight-regular, 400)' as any,
                      color: 'var(--text-on-dark-tertiary, rgba(255,255,255,0.35))',
                      lineHeight: 1,
                      minWidth: 28,
                      textAlign: 'right',
                    }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontFamily: "var(--font-ui, 'Inter', sans-serif)",
                        fontSize: 'var(--text-base, 15px)',
                        fontWeight: 'var(--weight-medium, 500)' as any,
                        color: 'var(--text-on-dark-primary, #FFFFFF)',
                        lineHeight: 'var(--leading-normal, 1.6)',
                        margin: 0,
                      }}>
                        {item.item}
                      </p>
                      <p style={{
                        fontFamily: "var(--font-ui, 'Inter', sans-serif)",
                        fontSize: 'var(--text-sm, 13px)',
                        color: 'var(--text-on-dark-secondary, rgba(255,255,255,0.60))',
                        lineHeight: 'var(--leading-normal, 1.6)',
                        margin: '4px 0 0',
                      }}>
                        {item.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </BriefSection>

            {/* ── Section: Risks ── */}
            {brief.risks.length > 0 && (
              <BriefSection label="RISKS">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {brief.risks.map((risk, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Severity badge */}
                        <span style={{
                          ...SEVERITY_STYLES[risk.severity],
                          fontFamily: "var(--font-ui, 'Inter', sans-serif)",
                          fontSize: 'var(--text-xs, 11px)',
                          fontWeight: 'var(--weight-medium, 500)' as any,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full, 9999px)',
                          textTransform: 'capitalize' as const,
                        }}>
                          {risk.severity}
                        </span>
                        <p style={{
                          fontFamily: "var(--font-ui, 'Inter', sans-serif)",
                          fontSize: 'var(--text-base, 15px)',
                          color: 'var(--text-on-dark-primary, #FFFFFF)',
                          lineHeight: 'var(--leading-normal, 1.6)',
                          margin: 0,
                          flex: 1,
                        }}>
                          {risk.risk}
                        </p>
                      </div>
                      <p style={{
                        fontFamily: "var(--font-ui, 'Inter', sans-serif)",
                        fontSize: 'var(--text-sm, 13px)',
                        color: 'var(--text-on-dark-secondary, rgba(255,255,255,0.60))',
                        lineHeight: 'var(--leading-normal, 1.6)',
                        margin: 0,
                        paddingLeft: 48, // aligned under text, past badge
                      }}>
                        {risk.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              </BriefSection>
            )}

            {/* ── Section: Focus Blocks ── */}
            {brief.suggestedFocusBlocks.length > 0 && (
              <BriefSection label="SUGGESTED FOCUS BLOCKS">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {brief.suggestedFocusBlocks.map((block, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '0.5px solid rgba(255,255,255,0.06)',
                    }}>
                      {/* Day chip */}
                      <span style={{
                        fontFamily: "var(--font-ui, 'Inter', sans-serif)",
                        fontSize: 'var(--text-xs, 11px)',
                        fontWeight: 'var(--weight-semibold, 600)' as any,
                        color: 'var(--color-info, #60A5FA)',
                        background: 'var(--color-info-bg, rgba(96,165,250,0.12))',
                        border: '0.5px solid var(--color-info-border, rgba(96,165,250,0.30))',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm, 4px)',
                        whiteSpace: 'nowrap' as const,
                        flexShrink: 0,
                      }}>
                        {block.day}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontFamily: "var(--font-ui, 'Inter', sans-serif)",
                          fontSize: 'var(--text-sm, 13px)',
                          fontWeight: 'var(--weight-medium, 500)' as any,
                          color: 'var(--text-on-dark-primary, #FFFFFF)',
                          margin: 0,
                        }}>
                          {block.timeRange}
                        </p>
                        <p style={{
                          fontFamily: "var(--font-ui, 'Inter', sans-serif)",
                          fontSize: 'var(--text-xs, 11px)',
                          color: 'var(--text-on-dark-tertiary, rgba(255,255,255,0.35))',
                          margin: '2px 0 0',
                        }}>
                          {block.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </BriefSection>
            )}

            {/* ── Section: One Thing to Drop ── */}
            <BriefSection label="DROP OR DELEGATE" isLast>
              <div style={{
                padding: '12px 16px',
                background: 'var(--color-warning-bg, rgba(251,191,36,0.12))',
                border: '0.5px solid var(--color-warning-border, rgba(251,191,36,0.30))',
                borderRadius: 'var(--radius-md, 8px)',
              }}>
                <p style={{
                  fontFamily: "var(--font-ui, 'Inter', sans-serif)",
                  fontSize: 'var(--text-base, 15px)',
                  fontWeight: 'var(--weight-medium, 500)' as any,
                  color: 'var(--text-on-dark-primary, #FFFFFF)',
                  lineHeight: 'var(--leading-normal, 1.6)',
                  margin: 0,
                }}>
                  {brief.oneThingToDropOrDelegate.item}
                </p>
                <p style={{
                  fontFamily: "var(--font-ui, 'Inter', sans-serif)",
                  fontSize: 'var(--text-sm, 13px)',
                  color: 'var(--text-on-dark-secondary, rgba(255,255,255,0.60))',
                  lineHeight: 'var(--leading-loose, 1.9)',
                  margin: '6px 0 0',
                }}>
                  {brief.oneThingToDropOrDelegate.reasoning}
                </p>
              </div>
            </BriefSection>

            {/* ── Generated-at footer ── */}
            {brief.generatedAt && (
              <p style={{
                fontFamily: "var(--font-ui, 'Inter', sans-serif)",
                fontSize: 'var(--text-xs, 11px)',
                color: 'var(--text-on-dark-tertiary, rgba(255,255,255,0.35))',
                textAlign: 'right' as const,
                margin: '24px 0 0',
              }}>
                Generated {new Date(brief.generatedAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </p>
            )}
          </motion.div>
        ) : (
          /* ── Empty state ── */
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ textAlign: 'center' as const, paddingTop: 80, paddingBottom: 80 }}
          >
            {/* Monochromatic illustration placeholder */}
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" style={{ margin: '0 auto 24px', display: 'block' }}>
              <rect x="24" y="20" width="72" height="80" rx="6" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" fill="none" />
              <line x1="36" y1="40" x2="84" y2="40" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
              <line x1="36" y1="52" x2="72" y2="52" stroke="rgba(0,0,0,0.10)" strokeWidth="1.5" />
              <line x1="36" y1="64" x2="78" y2="64" stroke="rgba(0,0,0,0.10)" strokeWidth="1.5" />
              <line x1="36" y1="76" x2="60" y2="76" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" />
              <circle cx="30" cy="40" r="3" fill="rgba(0,0,0,0.12)" />
              <circle cx="30" cy="52" r="3" fill="rgba(0,0,0,0.10)" />
              <circle cx="30" cy="64" r="3" fill="rgba(0,0,0,0.08)" />
            </svg>
            <h2 style={{
              fontFamily: "var(--font-content, 'Fraunces', serif)",
              fontSize: 'var(--text-lg, 20px)',
              fontWeight: 'var(--weight-medium, 500)' as any,
              color: 'var(--text-on-light-primary, #0A0B0D)',
              margin: '0 0 8px',
            }}>
              No brief yet.
            </h2>
            <p style={{
              fontFamily: "var(--font-ui, 'Inter', sans-serif)",
              fontSize: 'var(--text-sm, 13px)',
              color: 'var(--text-on-light-secondary, #4A4D55)',
              margin: '0 0 20px',
            }}>
              Arcus generates your morning brief at 7AM, or you can run it now.
            </p>
            {onGenerateNew && (
              <button
                onClick={onGenerateNew}
                disabled={isLoading}
                style={{
                  fontFamily: "var(--font-ui, 'Inter', sans-serif)",
                  fontSize: 'var(--text-sm, 13px)',
                  fontWeight: 'var(--weight-medium, 500)' as any,
                  color: 'var(--text-inverse, #222326)',
                  background: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '8px 16px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.3 : 1,
                  transition: 'filter var(--duration-fast, 150ms) var(--ease-out)',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.filter = 'brightness(0.92)'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.filter = 'none'; }}
              >
                Generate brief
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────────

function BriefSection({
  label,
  children,
  isLast = false,
}: {
  label: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div style={{
      marginBottom: isLast ? 0 : 32,
    }}>
      <h3 style={{
        fontFamily: "var(--font-ui, 'Inter', sans-serif)",
        fontSize: 'var(--text-xs, 11px)',
        fontWeight: 'var(--weight-semibold, 600)' as any,
        color: 'var(--text-on-dark-tertiary, rgba(255,255,255,0.35))',
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        margin: '0 0 14px',
      }}>
        {label}
      </h3>
      {children}
    </div>
  );
}

export default PlanModeBrief;
