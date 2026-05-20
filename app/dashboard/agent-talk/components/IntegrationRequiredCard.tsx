"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Zap, ArrowRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduledAgentData } from './ScheduledAgentCard';

// ── Integration metadata ───────────────────────────────────────────────────────

const INTEGRATION_INFO: Record<string, { label: string; icon: string; description: string }> = {
  gmail:  { label: 'Gmail',            icon: '/connectors/gmail.svg',   description: 'Read and send emails' },
  gcal:   { label: 'Google Calendar',  icon: '/connectors/gcal.svg',    description: 'Read and create calendar events' },
  slack:  { label: 'Slack',            icon: '/connectors/slack.svg',   description: 'Send Slack messages and DMs' },
  notion: { label: 'Notion',           icon: '/connectors/notion.svg',  description: 'Read and write Notion pages' },
};

// ── Waiting indicator ─────────────────────────────────────────────────────────

function WaitingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex items-center gap-2 px-4 pb-3"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" className="flex-shrink-0">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
          <motion.circle
            key={deg}
            cx={7 + 5 * Math.cos((deg * Math.PI) / 180)}
            cy={7 + 5 * Math.sin((deg * Math.PI) / 180)}
            r="1.2"
            fill="#EAB308"
            animate={{ opacity: [1, 0.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15, ease: 'easeInOut' }}
          />
        ))}
      </svg>
      <span className="text-[11px] font-medium text-yellow-400/80">
        Waiting for you to connect and proceed
      </span>
    </motion.div>
  );
}

// ── Agent params stored so we can create after all integrations are connected ──

export interface IntegrationRequiredData {
  agentName: string;
  required: string[];
  connected: string[];
  missing: string[];
  agentParams: {
    name: string;
    task_description: string;
    cron_schedule: string;
    output_channel: string;
    slack_channel: string | null;
    skip_confirmations: boolean;
    expires_at: string | null;
  };
}

interface IntegrationRequiredCardProps {
  data: IntegrationRequiredData;
  /** Called when agent is successfully created — parent should swap this card for a ScheduledAgentCard */
  onAgentCreated: (agent: ScheduledAgentData) => void;
}

export function IntegrationRequiredCard({ data, onAgentCreated }: IntegrationRequiredCardProps) {
  const [connectedSet, setConnectedSet] = useState<Set<string>>(new Set(data.connected));
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const allConnected = data.required.every(r => connectedSet.has(r));

  // ── Re-check connected integrations ─────────────────────────────────────────
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/arcus/v3/integrations');
      if (!res.ok) return;
      const json = await res.json();
      const providers: string[] = (json.integrations || []).map((i: any) => i.provider as string);
      // Also check user_tokens (google login) via the existing status endpoint
      const statusRes = await fetch('/api/integrations/status').catch(() => null);
      if (statusRes?.ok) {
        const status = await statusRes.json();
        if (status.gmail) providers.push('gmail');
        if (status.google_calendar) providers.push('gcal');
      }
      setConnectedSet(new Set(providers));
    } catch { /* non-critical */ } finally {
      setIsRefreshing(false);
    }
  }, []);

  // ── OAuth popup ──────────────────────────────────────────────────────────────
  const connectIntegration = async (integrationId: string) => {
    setConnectingId(integrationId);
    setError(null);
    try {
      const res = await fetch('/api/connectors/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId: integrationId,
          redirectUri: `${window.location.origin}/api/connectors/callback`,
        }),
      });
      if (!res.ok) throw new Error('Failed to start OAuth');
      const { oauthUrl } = await res.json();

      const w = 500, h = 600;
      const popup = window.open(
        oauthUrl,
        'Connect Integration',
        `width=${w},height=${h},left=${window.screenX + (window.outerWidth - w) / 2},top=${window.screenY + (window.outerHeight - h) / 2}`,
      );
      if (!popup) throw new Error('Popup blocked — please allow popups and try again.');

      const poll = setInterval(() => {
        if (popup.closed) {
          clearInterval(poll);
          setConnectingId(null);
          refresh();
        }
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Connection failed');
      setConnectingId(null);
    }
  };

  // ── Create the agent once all integrations are connected ─────────────────────
  const createAgent = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/arcus/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.agentParams),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create agent');
      onAgentCreated(json.agent as ScheduledAgentData);
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
      setIsCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className="w-full max-w-[640px] mx-auto mb-3 rounded-[20px] bg-white/[0.04] backdrop-blur-xl border border-white/[0.09] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400/80" />
          <span className="text-[12px] font-bold text-arcus-fg-secondary uppercase tracking-widest">
            Required for this agent
          </span>
        </div>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg text-arcus-fg-muted hover:text-arcus-fg transition-colors disabled:opacity-40"
          title="Re-check connections"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <p className="text-[13px] text-arcus-fg-secondary leading-snug mb-3">
          <span className="text-arcus-fg font-semibold">{data.agentName}</span> needs the following
          integrations to run. Connect any missing ones, then create the agent.
        </p>

        {data.required.map(id => {
          const info = INTEGRATION_INFO[id] ?? { label: id, icon: '', description: '' };
          const isConnected = connectedSet.has(id);
          const isConnecting = connectingId === id;

          return (
            <div
              key={id}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all',
                isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/25'
                  : 'bg-white/[0.03] border-white/[0.07]',
              )}
            >
              {/* Icon */}
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 overflow-hidden">
                {info.icon
                  ? <img src={info.icon} alt={info.label} className="w-5 h-5 object-contain"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  : <span className="text-[11px] font-bold text-arcus-fg-muted">{info.label[0]}</span>
                }
              </div>

              {/* Label + description */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-arcus-fg leading-none mb-0.5">{info.label}</p>
                <p className="text-[11px] text-arcus-fg-muted truncate">{info.description}</p>
              </div>

              {/* Status / connect */}
              {isConnected ? (
                <div className="flex items-center gap-1.5 text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[11px] font-semibold">Connected</span>
                </div>
              ) : (
                <button
                  onClick={() => connectIntegration(id)}
                  disabled={isConnecting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold bg-white text-black hover:bg-white/90 transition-all shrink-0 disabled:opacity-60"
                >
                  {isConnecting ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3 h-3" />
                  )}
                  {isConnecting ? 'Connecting…' : 'Connect'}
                </button>
              )}
            </div>
          );
        })}

        {error && (
          <p className="text-[12px] text-red-400/80 mt-1 px-1">{error}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/[0.06]">
        <button
          onClick={createAgent}
          disabled={!allConnected || isCreating}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[12px] font-bold transition-all',
            allConnected && !isCreating
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
              : 'bg-white/[0.05] text-arcus-fg-muted cursor-not-allowed',
          )}
        >
          {isCreating ? (
            <><RefreshCw className="w-3 h-3 animate-spin" /> Creating…</>
          ) : (
            <><Zap className="w-3 h-3" /> Create Agent</>
          )}
        </button>
      </div>

      <WaitingIndicator />
    </motion.div>
  );
}
