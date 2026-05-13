'use client';
/**
 * Arcus V3 — Main Page
 * 
 * Lateral layout: Sidebar (240px) + Main Content.
 * High-contrast editorial style: Dark sidebar / Light content.
 */
import React, { useState, useEffect, useCallback } from 'react';
import PlanArtifactCard from './components/PlanArtifactCard';
import PlanModeBrief from './components/PlanModeBrief';

type View = 'feed' | 'plan' | 'history' | 'settings';

interface PlanData {
  id: string;
  mode: string;
  status: string;
  severity: string | null;
  headline: string | null;
  impact: string | null;
  findings: any[];
  steps: any[];
  created_at: string;
  completed_at: string | null;
  source: string | null;
}

interface Integration {
  id: string;
  provider: string;
}

export default function ArcusPage() {
  const [view, setView] = useState<View>('feed');
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [briefLoading, setBriefLoading] = useState(false);
  const [brief, setBrief] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/arcus/v3/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error('Fetch plans failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch integrations
  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/arcus/v3/integrations');
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch (err) {
      console.error('Fetch integrations failed:', err);
    }
  }, []);

  // Fetch latest brief
  const fetchBrief = useCallback(async () => {
    try {
      const res = await fetch('/api/arcus/v3/plans?mode=plan_mode&limit=1');
      if (res.ok) {
        const data = await res.json();
        const latest = data.plans?.[0];
        if (latest?.id) {
          const detailRes = await fetch(`/api/arcus/v3/plans/${latest.id}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            setBrief(detail.brief);
          }
        }
      }
    } catch (err) {
      console.error('Fetch brief failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    fetchIntegrations();
    fetchBrief();

    // Check URL params for success toasts
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected')) {
      setToast(`${params.get('connected')} connected successfully`);
      window.history.replaceState({}, '', '/arcus-v3');
    }
  }, [fetchPlans, fetchIntegrations, fetchBrief]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Trigger Plan Mode
  async function handleGenerateBrief() {
    setBriefLoading(true);
    try {
      await fetch('/api/arcus/v3/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'plan_mode' }),
      });
      // Simple polling
      let count = 0;
      const poll = setInterval(async () => {
        count++;
        await fetchBrief();
        if (brief || count > 20) {
          clearInterval(poll);
          setBriefLoading(false);
        }
      }, 3000);
    } catch {
      setBriefLoading(false);
    }
  }

  const isConnected = (p: string) => integrations.some(i => i.provider === p);
  const activePlans = plans.filter(p => ['proposed', 'approved', 'executing', 'failed'].includes(p.status) && p.mode === 'agentic');
  const completedPlans = plans.filter(p => p.status === 'completed' && p.mode === 'agentic');

  return (
    <>
      {/* Sidebar */}
      <aside className="arcus-sidebar">
        <div className="arcus-sidebar-logo">Arcus</div>

        <nav className="arcus-nav">
          <button className={`arcus-nav-item ${view === 'feed' ? 'active' : ''}`} onClick={() => setView('feed')}>
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9h12M3 4.5h12M3 13.5h8" strokeLinecap="round"/>
            </svg>
            Feed
          </button>
          <button className={`arcus-nav-item ${view === 'plan' ? 'active' : ''}`} onClick={() => setView('plan')}>
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="12" height="12" rx="2"/><path d="M3 7h12" strokeLinecap="round"/>
            </svg>
            Plan Mode
          </button>
          <button className={`arcus-nav-item ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="9" r="6"/><path d="M9 6v3l2 2" strokeLinecap="round"/>
            </svg>
            History
          </button>
          <button className={`arcus-nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="9" r="2.5"/><path d="M9 2v2.5M9 13.5V16M2 9h2.5M13.5 9H16" strokeLinecap="round"/>
            </svg>
            Settings
          </button>
        </nav>

        <div className="arcus-integrations-status">
          {['gcal', 'slack', 'notion', 'calcom'].map(p => (
            <div key={p} className="arcus-integration-row">
              <div className={`arcus-integration-dot ${isConnected(p) ? 'connected' : 'disconnected'}`} />
              <span style={{ textTransform: 'capitalize' }}>{p === 'gcal' ? 'Google Calendar' : p}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="arcus-main">
        <div className="arcus-content">
          
          {/* Feed View */}
          {view === 'feed' && (
            <div className="arcus-feed">
              {activePlans.length === 0 && !loading && (
                <div className="arcus-empty">
                  <h2 className="arcus-empty-headline">Arcus is listening.</h2>
                  <p className="arcus-empty-subline">You&apos;ll see insights here when something needs your attention.</p>
                </div>
              )}

              {activePlans.length > 0 && (
                <>
                  <div className="arcus-date-divider">
                    <div className="arcus-date-divider-line" />
                    <span className="arcus-date-divider-label">Today</span>
                    <div className="arcus-date-divider-line" />
                  </div>
                  {activePlans.map(plan => (
                    <PlanArtifactCard key={plan.id} plan={plan} onUpdate={fetchPlans} isNew />
                  ))}
                </>
              )}

              {completedPlans.length > 0 && (
                <>
                  <div className="arcus-date-divider">
                    <div className="arcus-date-divider-line" />
                    <span className="arcus-date-divider-label">Completed</span>
                    <div className="arcus-date-divider-line" />
                  </div>
                  {completedPlans.slice(0, 5).map(plan => (
                    <PlanArtifactCard key={plan.id} plan={plan} />
                  ))}
                </>
              )}
            </div>
          )}

          {/* Plan Mode View */}
          {view === 'plan' && (
            <PlanModeBrief brief={brief} onGenerate={handleGenerateBrief} loading={briefLoading} />
          )}

          {/* History View */}
          {view === 'history' && (
            <div className="arcus-feed">
              {plans.filter(p => ['completed', 'failed', 'dismissed'].includes(p.status)).map(plan => (
                <PlanArtifactCard key={plan.id} plan={plan} />
              ))}
            </div>
          )}

          {/* Settings View */}
          {view === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
              <section>
                <h2 style={{ fontFamily: 'var(--font-content)', fontSize: 'var(--text-xl)', color: 'var(--text-on-light-primary)', marginBottom: 'var(--space-6)' }}>Integrations</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {['Google Calendar', 'Slack', 'Notion', 'Cal.com'].map(app => (
                     <div key={app} className="glass-surface" style={{ padding: 'var(--space-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: 'var(--text-on-dark-primary)', fontWeight: 500 }}>{app}</div>
                          <div style={{ color: 'var(--text-on-dark-tertiary)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
                            {isConnected(app.toLowerCase().replace(' ', '')) ? 'Connected' : 'Not connected'}
                          </div>
                        </div>
                        <button className="arcus-btn arcus-btn-primary">
                          {isConnected(app.toLowerCase().replace(' ', '')) ? 'Settings' : 'Connect'}
                        </button>
                     </div>
                  ))}
                </div>
              </section>
            </div>
          )}

        </div>
      </main>

      {/* Mobile Tab Bar */}
      <div className="arcus-bottom-tab-bar">
        {['feed', 'plan', 'history', 'settings'].map(v => (
          <div key={v} className={`arcus-tab-icon ${view === v ? 'active' : ''}`} onClick={() => setView(v as View)}>
            {v === 'feed' && <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9h12M3 4.5h12M3 13.5h8" strokeLinecap="round"/></svg>}
            {v === 'plan' && <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="12" height="12" rx="2"/><path d="M3 7h12" strokeLinecap="round"/></svg>}
            {v === 'history' && <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="9" r="6"/><path d="M9 6v3l2 2" strokeLinecap="round"/></svg>}
            {v === 'settings' && <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="9" r="2.5"/><path d="M9 2v2.5M9 13.5V16M2 9h2.5M13.5 9H16" strokeLinecap="round"/></svg>}
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="arcus-toast-container">
          <div className="glass-surface" style={{ padding: '10px 20px', fontSize: 'var(--text-sm)', color: '#FFF' }}>
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
