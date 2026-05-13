'use client';
/**
 * Arcus V3 — Main Page
 * 
 * The complete Arcus experience: sidebar + feed + plan mode.
 * Three-zone layout with glass surfaces on a light canvas.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  created_at: string;
}

export default function ArcusPage() {
  const [view, setView] = useState<View>('feed');
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [briefLoading, setBriefLoading] = useState(false);
  const [brief, setBrief] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditCursor, setAuditCursor] = useState<string | null>(null);

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/arcus/v3/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
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
      console.error('Failed to fetch integrations:', err);
    }
  }, []);

  // Fetch latest brief
  const fetchBrief = useCallback(async () => {
    try {
      const res = await fetch('/api/arcus/v3/plans?mode=plan_mode&limit=1');
      if (res.ok) {
        const data = await res.json();
        const latestBrief = data.plans?.[0];
        if (latestBrief?.id) {
          const detailRes = await fetch(`/api/arcus/v3/plans/${latestBrief.id}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            setBrief(detail.brief);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch brief:', err);
    }
  }, []);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async (cursor?: string) => {
    setAuditLoading(true);
    try {
      const url = cursor 
        ? `/api/arcus/v3/audit?cursor=${cursor}` 
        : '/api/arcus/v3/audit';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (cursor) {
          setAuditLogs(prev => [...prev, ...data.logs]);
        } else {
          setAuditLogs(data.logs || []);
        }
        setAuditCursor(data.nextCursor);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  // Generate new brief
  async function handleGenerateBrief() {
    setBriefLoading(true);
    try {
      await fetch('/api/arcus/v3/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'plan_mode' }),
      });
      // Poll for completion
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        await fetchBrief();
        if (brief || attempts > 30) {
          clearInterval(poll);
          setBriefLoading(false);
        }
      }, 3000);
    } catch (err) {
      console.error('Failed to trigger brief:', err);
      setBriefLoading(false);
    }
  }

  useEffect(() => {
    fetchPlans();
    fetchIntegrations();
    fetchBrief();

    // Check for post-OAuth redirect params
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    if (connected === 'gcal') {
      setToast('Google Calendar connected successfully');
      setView('feed');
      window.history.replaceState({}, '', '/arcus-v3');
    } else if (connected === 'slack') {
      setToast('Slack connected successfully');
      setView('feed');
      window.history.replaceState({}, '', '/arcus-v3');
    } else if (connected === 'notion') {
      setToast('Notion connected successfully');
      setView('feed');
      window.history.replaceState({}, '', '/arcus-v3');
    }
    const error = params.get('error');
    if (error) {
      setToast(`Connection error: ${error}`);
      window.history.replaceState({}, '', '/arcus-v3');
    }

    if (view === 'settings') {
      fetchAuditLogs();
    }
  }, [fetchPlans, fetchIntegrations, fetchBrief, fetchAuditLogs, view]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Disconnect an integration
  async function handleDisconnect(provider: string) {
    if (!confirm(`Disconnect ${provider === 'gcal' ? 'Google Calendar' : 'Slack'}? Arcus will stop monitoring this app.`)) return;
    setDisconnecting(provider);
    try {
      await fetch(`/api/arcus/v3/integrations?provider=${provider}`, { method: 'DELETE' });
      await fetchIntegrations();
      setToast(`${provider === 'gcal' ? 'Google Calendar' : 'Slack'} disconnected`);
    } catch {
      setToast('Failed to disconnect');
    } finally {
      setDisconnecting(null);
    }
  }

  // Update preferences
  async function handleUpdatePreference(key: string, value: any) {
    try {
      const newPrefs = { ...(plans[0] as any)?.user?.preferences, [key]: value }; // Simplified lookup
      await fetch('/api/arcus/v3/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: newPrefs }),
      });
      setToast('Preference updated');
    } catch {
      setToast('Failed to update preference');
    }
  }

  // Connect Cal.com (API Key)
  async function handleConnectCalcom() {
    const apiKey = prompt('Enter your Cal.com API Key:');
    if (!apiKey) return;
    try {
      const res = await fetch('/api/arcus/v3/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'calcom', accessToken: apiKey }),
      });
      if (res.ok) {
        await fetchIntegrations();
        setToast('Cal.com connected');
      } else {
        setToast('Failed to connect Cal.com');
      }
    } catch {
      setToast('Error connecting Cal.com');
    }
  }

  // Separate active plans and completed plans
  const activeStatuses = ['proposed', 'approved', 'executing'];
  const activePlans = plans.filter(p => activeStatuses.includes(p.status) && p.mode === 'agentic');
  const completedPlans = plans.filter(p => p.status === 'completed' && p.mode === 'agentic');

  const isGCalConnected = integrations.some(i => i.provider === 'gcal');
  const isSlackConnected = integrations.some(i => i.provider === 'slack');
  const isNotionConnected = integrations.some(i => i.provider === 'notion');
  const isCalcomConnected = integrations.some(i => i.provider === 'calcom');
  const hasIntegrations = isGCalConnected || isSlackConnected || isNotionConnected || isCalcomConnected;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Sidebar */}
      <aside className="arcus-sidebar glass-sidebar">
        <div className="arcus-sidebar-logo">Arcus</div>

        <nav className="arcus-nav">
          <button
            className={`arcus-nav-item ${view === 'feed' ? 'active' : ''}`}
            onClick={() => setView('feed')}
          >
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9h12M3 4.5h12M3 13.5h8" strokeLinecap="round"/>
            </svg>
            Feed
          </button>

          <button
            className={`arcus-nav-item ${view === 'plan' ? 'active' : ''}`}
            onClick={() => setView('plan')}
          >
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="12" height="12" rx="2"/>
              <path d="M3 7h12" strokeLinecap="round"/>
            </svg>
            Plan Mode
          </button>

          <button
            className={`arcus-nav-item ${view === 'history' ? 'active' : ''}`}
            onClick={() => setView('history')}
          >
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="9" r="6"/>
              <path d="M9 6v3l2 2" strokeLinecap="round"/>
            </svg>
            History
          </button>

          <button
            className={`arcus-nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
          >
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="9" r="2.5"/>
              <path d="M9 2v2.5M9 13.5V16M2 9h2.5M13.5 9H16M4.1 4.1l1.8 1.8M12.1 12.1l1.8 1.8M4.1 13.9l1.8-1.8M12.1 5.9l1.8-1.8" strokeLinecap="round"/>
            </svg>
            Settings
          </button>
        </nav>

        {/* Integration Status */}
        <div className="arcus-integrations-status">
          <div className="arcus-integration-row">
            <div className={`arcus-integration-dot ${isGCalConnected ? 'connected' : 'disconnected'}`} />
            <span>Google Calendar</span>
          </div>
          <div className="arcus-integration-row">
            <div className={`arcus-integration-dot ${isSlackConnected ? 'connected' : 'disconnected'}`} />
            <span>Slack</span>
          </div>
          <div className="arcus-integration-row">
            <div className={`arcus-integration-dot ${isNotionConnected ? 'connected' : 'disconnected'}`} />
            <span>Notion</span>
          </div>
          <div className="arcus-integration-row">
            <div className={`arcus-integration-dot ${isCalcomConnected ? 'connected' : 'disconnected'}`} />
            <span>Cal.com</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="arcus-main">
        <div className="arcus-content">

          {/* Feed View */}
          {view === 'feed' && (
            <div className="arcus-feed">
              {loading && (
                <>
                  {[64, 96, 80].map((h, i) => (
                    <div
                      key={i}
                      className="glass-surface arcus-skeleton-card"
                      style={{ height: h }}
                    >
                      <div className="arcus-skeleton arcus-skeleton-line" style={{ width: '40%' }} />
                      <div className="arcus-skeleton arcus-skeleton-line" style={{ width: '80%' }} />
                      <div className="arcus-skeleton arcus-skeleton-line" style={{ width: '60%' }} />
                    </div>
                  ))}
                </>
              )}

              {!loading && !hasIntegrations && (
                <div className="arcus-empty">
                  <h2 className="arcus-empty-headline">Nothing to watch yet.</h2>
                  <p className="arcus-empty-subline">
                    Connect Google Calendar or Slack to let Arcus start listening.
                  </p>
                  <button
                    className="arcus-btn arcus-btn-primary"
                    onClick={() => setView('settings')}
                  >
                    Connect an app
                  </button>
                </div>
              )}

              {!loading && hasIntegrations && activePlans.length === 0 && (
                <div className="arcus-empty">
                  <h2 className="arcus-empty-headline">Arcus is listening.</h2>
                  <p className="arcus-empty-subline">
                    You&apos;ll see insights here when something needs your attention.
                  </p>
                </div>
              )}

              {!loading && activePlans.length > 0 && (
                <>
                  <div className="arcus-date-divider">
                    <div className="arcus-date-divider-line" />
                    <span className="arcus-date-divider-label">Today</span>
                    <div className="arcus-date-divider-line" />
                  </div>

                  {activePlans.map(plan => (
                    <PlanArtifactCard
                      key={plan.id}
                      plan={plan}
                      onUpdate={fetchPlans}
                    />
                  ))}
                </>
              )}

              {!loading && completedPlans.length > 0 && (
                <>
                  <div className="arcus-date-divider">
                    <div className="arcus-date-divider-line" />
                    <span className="arcus-date-divider-label">Completed</span>
                    <div className="arcus-date-divider-line" />
                  </div>
                  {completedPlans.slice(0, 10).map(plan => (
                    <PlanArtifactCard key={plan.id} plan={plan} />
                  ))}
                </>
              )}
            </div>
          )}

          {/* Plan Mode View */}
          {view === 'plan' && (
            <PlanModeBrief
              brief={brief}
              onGenerate={handleGenerateBrief}
              loading={briefLoading}
            />
          )}

          {/* History View */}
          {view === 'history' && (
            <div className="arcus-feed">
              {plans
                .filter(p => ['completed', 'failed', 'dismissed'].includes(p.status))
                .map(plan => (
                  <PlanArtifactCard key={plan.id} plan={plan} />
                ))}
              {plans.filter(p => ['completed', 'failed', 'dismissed'].includes(p.status)).length === 0 && (
                <div className="arcus-empty">
                  <h2 className="arcus-empty-headline">No history yet.</h2>
                  <p className="arcus-empty-subline">
                    Completed and dismissed plans will appear here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Settings View */}
          {view === 'settings' && (
            <div>
              <h2 style={{
                fontFamily: 'var(--font-content)',
                fontSize: 'var(--text-xl)',
                color: 'var(--text-on-light-primary)',
                marginBottom: 'var(--space-6)',
              }}>
                Integrations
              </h2>
              
              {/* Preferences Section */}
              <div className="glass-surface" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
                <h3 style={{ color: 'var(--text-on-dark-primary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>Preferences</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-on-dark-secondary)', fontSize: 'var(--text-xs)' }}>
                    <input type="checkbox" onChange={(e) => handleUpdatePreference('preferAsync', e.target.checked)} />
                    Prefer async communication (Slack over Meetings)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-on-dark-secondary)', fontSize: 'var(--text-xs)' }}>
                    <input type="checkbox" defaultChecked onChange={(e) => handleUpdatePreference('planModeEnabled', e.target.checked)} />
                    Enable Daily Brief (Plan Mode)
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {/* Google Calendar */}
                <div className="glass-surface" style={{ padding: 'var(--space-5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: 'var(--text-on-dark-primary)', fontWeight: 500, fontSize: 'var(--text-base)' }}>
                        Google Calendar
                      </div>
                      <div style={{ color: 'var(--text-on-dark-tertiary)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
                        {isGCalConnected ? 'Connected — receiving webhook events' : 'Not connected'}
                      </div>
                    </div>
                    {isGCalConnected ? (
                      <button
                        className="arcus-btn arcus-btn-destructive"
                        onClick={() => handleDisconnect('gcal')}
                        disabled={disconnecting === 'gcal'}
                      >
                        {disconnecting === 'gcal' ? <span className="arcus-spinner arcus-spinner-small" /> : 'Disconnect'}
                      </button>
                    ) : (
                      <a href="/api/arcus/v3/oauth/gcal" className="arcus-btn arcus-btn-primary" style={{ textDecoration: 'none' }}>
                        Connect
                      </a>
                    )}
                  </div>
                </div>

                {/* Slack */}
                <div className="glass-surface" style={{ padding: 'var(--space-5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: 'var(--text-on-dark-primary)', fontWeight: 500, fontSize: 'var(--text-base)' }}>
                        Slack
                      </div>
                      <div style={{ color: 'var(--text-on-dark-tertiary)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
                        {isSlackConnected ? 'Connected — monitoring messages' : 'Not connected'}
                      </div>
                    </div>
                    {isSlackConnected ? (
                      <button
                        className="arcus-btn arcus-btn-destructive"
                        onClick={() => handleDisconnect('slack')}
                        disabled={disconnecting === 'slack'}
                      >
                        {disconnecting === 'slack' ? <span className="arcus-spinner arcus-spinner-small" /> : 'Disconnect'}
                      </button>
                    ) : (
                      <a href="/api/arcus/v3/oauth/slack" className="arcus-btn arcus-btn-primary" style={{ textDecoration: 'none' }}>
                        Connect
                      </a>
                    )}
                  </div>
                </div>

                {/* Notion */}
                <div className="glass-surface" style={{ padding: 'var(--space-5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: 'var(--text-on-dark-primary)', fontWeight: 500, fontSize: 'var(--text-base)' }}>
                        Notion
                      </div>
                      <div style={{ color: 'var(--text-on-dark-tertiary)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
                        {isNotionConnected ? 'Connected — polling for document changes' : 'Not connected'}
                      </div>
                    </div>
                    {isNotionConnected ? (
                      <button
                        className="arcus-btn arcus-btn-destructive"
                        onClick={() => handleDisconnect('notion')}
                        disabled={disconnecting === 'notion'}
                      >
                        {disconnecting === 'notion' ? <span className="arcus-spinner arcus-spinner-small" /> : 'Disconnect'}
                      </button>
                    ) : (
                      <a href="/api/arcus/v3/oauth/notion" className="arcus-btn arcus-btn-primary" style={{ textDecoration: 'none' }}>
                        Connect
                      </a>
                    )}
                  </div>
                </div>

                {/* Cal.com */}
                <div className="glass-surface" style={{ padding: 'var(--space-5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: 'var(--text-on-dark-primary)', fontWeight: 500, fontSize: 'var(--text-base)' }}>
                        Cal.com
                      </div>
                      <div style={{ color: 'var(--text-on-dark-tertiary)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
                        {isCalcomConnected ? 'Connected — managing bookings' : 'Not connected'}
                      </div>
                    </div>
                    {isCalcomConnected ? (
                      <button
                        className="arcus-btn arcus-btn-destructive"
                        onClick={() => handleDisconnect('calcom')}
                        disabled={disconnecting === 'calcom'}
                      >
                        {disconnecting === 'calcom' ? <span className="arcus-spinner arcus-spinner-small" /> : 'Disconnect'}
                      </button>
                    ) : (
                      <button className="arcus-btn arcus-btn-primary" onClick={handleConnectCalcom}>
                        Connect
                      </button>
                    )}
                  </div>
                </div>

                {/* Activity Log */}
                <div style={{ marginTop: 'var(--space-8)' }}>
                  <h3 style={{
                    fontFamily: 'var(--font-content)',
                    fontSize: 'var(--text-lg)',
                    color: 'var(--text-on-light-primary)',
                    marginBottom: 'var(--space-4)',
                  }}>
                    Activity Log
                  </h3>
                  <div className="glass-surface" style={{ overflow: 'hidden' }}>
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                            <th style={{ padding: 'var(--space-3)', color: 'var(--text-on-dark-tertiary)' }}>Time</th>
                            <th style={{ padding: 'var(--space-3)', color: 'var(--text-on-dark-tertiary)' }}>Action</th>
                            <th style={{ padding: 'var(--space-3)', color: 'var(--text-on-dark-tertiary)' }}>Metadata</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogs.map((log, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: 'var(--space-3)', color: 'var(--text-on-dark-secondary)', whiteSpace: 'nowrap' }}>
                                {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td style={{ padding: 'var(--space-3)', color: 'var(--text-on-dark-primary)' }}>
                                {log.action}
                              </td>
                              <td style={{ padding: 'var(--space-3)', color: 'var(--text-on-dark-tertiary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {JSON.stringify(log.metadata)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {auditLogs.length === 0 && !auditLoading && (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-on-dark-tertiary)' }}>
                          No activity recorded yet.
                        </div>
                      )}
                    </div>
                    {auditCursor && (
                      <button 
                        className="arcus-btn arcus-btn-ghost" 
                        style={{ width: '100%', borderRadius: 0, borderTop: '1px solid rgba(255,255,255,0.1)' }}
                        onClick={() => fetchAuditLogs(auditCursor)}
                        disabled={auditLoading}
                      >
                        {auditLoading ? 'Loading...' : 'Load more'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <div className="arcus-bottom-tab-bar">
        {[
          { v: 'feed' as View, label: 'Feed', d: 'M3 9h12M3 4.5h12M3 13.5h8' },
          { v: 'plan' as View, label: 'Plan', d: 'M3 3h12v12H3z' },
          { v: 'history' as View, label: 'History', d: 'M9 3a6 6 0 100 12 6 6 0 000-12z' },
          { v: 'settings' as View, label: 'Settings', d: 'M9 6.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z' },
        ].map(tab => (
          <svg
            key={tab.v}
            className={`arcus-tab-icon ${view === tab.v ? 'active' : ''}`}
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            onClick={() => setView(tab.v)}
          >
            <path d={tab.d} strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="arcus-toast-container">
          <div className="glass-toast" style={{
            padding: '10px 20px',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-on-dark-primary)',
          }}>
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
