'use client';

import React, { useState, useEffect } from 'react';
import { ToggleSwitch } from './toggle-switch';
import { signIn, useSession } from 'next-auth/react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';
import { Lock } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  logo: React.ReactNode;
  enabled: boolean;
  disabled?: boolean;
}

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntegrationsModal({ isOpen, onClose }: IntegrationsModalProps) {
  const { data: session } = useSession();
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'gmail',
      name: 'Gmail',
      logo: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d='M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636C.732 21.002 0 20.27 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h.273L12 10.728 21.091 3.821h.273c.904 0 1.636.732 1.636 1.636z' />
        </svg>
      ),
      enabled: true,
      disabled: true
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      logo: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
        </svg>
      ),
      enabled: false
    },
    {
      id: 'google-meet',
      name: 'Google Meet',
      logo: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z" />
        </svg>
      ),
      enabled: false
    },
    {
      id: 'todoist',
      name: 'Todoist',
      logo: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-3.5-3.5 1.41-1.41L11 14.17l4.09-4.09 1.41 1.41L12 17z" />
        </svg>
      ),
      enabled: false,
      disabled: true
    },
    {
      id: 'asana',
      name: 'Asana',
      logo: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      ),
      enabled: false,
      disabled: true
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      logo: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14.97 5.92L12.41 8.48c-.53.53-.53 1.39 0 1.92.53.53 1.39.53 1.92 0l2.56-2.56c1.85-1.85 4.85-1.85 6.7 0s1.85 4.85 0 6.7L20.41 17.7c-.53.53-.53 1.39 0 1.92.53.53 1.39.53 1.92 0l3.18-3.18c1.85-1.85 1.85-4.85 0-6.7s-4.85-1.85-6.7 0z" />
          <path d="M9.03 18.08L11.59 15.52c.53-.53.53-1.39 0-1.92-.53-.53-1.39-.53-1.92 0L7.11 16.16c-1.85 1.85-1.85 4.85 0 6.7s4.85 1.85 6.7 0l3.18-3.18c.53-.53.53-1.39 0-1.92-.53-.53-1.39-.53-1.92 0L12.41 20.7c-1.85 1.85-4.85 1.85-6.7 0s-1.85-4.85 0-6.7z" />
          <path d="M7.05 16.87c-.53-.53-1.39-.53-1.92 0L1.95 20.05c-1.85 1.85-1.85 4.85 0 6.7s4.85 1.85 6.7 0l3.18-3.18c.53-.53.53-1.39 0-1.92-.53-.53-1.39-.53-1.92 0L7.05 23.59c-1.85 1.85-4.85 1.85-6.7 0s-1.85-4.85 0-6.7l3.18-3.18c.53-.53 1.39-.53 1.92 0z" />
        </svg>
      ),
      enabled: false,
      disabled: true
    }
  ]);


  const fetchIntegrationStatus = async () => {
    try {
      const response = await fetch('/api/integrations/status');
      if (response.ok) {
        const data = await response.json();
        setIntegrations(prev =>
          prev.map(integration => ({
            ...integration,
            enabled: data.integrations[integration.id] || integration.enabled
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching integration status:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchIntegrationStatus();
    }
  }, [isOpen]);

  const handleToggle = async (id: string) => {
    if (id === 'google-calendar' || id === 'google-meet') {
      const currentEnabled = integrations.find(i => i.id === id)?.enabled;
      const integrationName = id === 'google-calendar' ? 'Google Calendar' : 'Google Meet';
      if (!currentEnabled) {
        // Toggle on: check if user is authenticated
        if (session) {
          // User is authenticated, prompt for additional Calendar consent
          const confirmed = window.confirm(`Do you want to enable ${integrationName} integration? This will require additional permission from Google.`);
          if (confirmed) {
            signIn('google', {
              scope: 'openid email profile https://www.googleapis.com/auth/gmail.send',
              prompt: 'consent',
              redirectTo: window.location.pathname + window.location.search
            });
            // Update API
            fetch('/api/integrations/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ integrationId: id, enabled: true })
            }).catch(error => console.error('Error enabling integration:', error));
            setIntegrations(prev =>
              prev.map(integration =>
                integration.id === id ? { ...integration, enabled: true } : integration
              )
            );
          }
        } else {
          // User not authenticated, trigger sign in with all scopes including Calendar
          signIn('google', {
            scope: 'openid email profile https://www.googleapis.com/auth/gmail.send',
            prompt: 'consent',
            redirectTo: window.location.pathname + window.location.search
          });
          // Update API
          fetch('/api/integrations/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ integrationId: id, enabled: true })
          }).catch(error => console.error('Error enabling integration:', error));
          setIntegrations(prev =>
            prev.map(integration =>
              integration.id === id ? { ...integration, enabled: true } : integration
            )
          );
        }
      } else {
        // Toggle off: update state and API
        try {
          await fetch('/api/integrations/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ integrationId: id, enabled: false })
          });
          setIntegrations(prev =>
            prev.map(integration =>
              integration.id === id && !integration.disabled
                ? { ...integration, enabled: !integration.enabled }
                : integration
            )
          );
        } catch (error) {
          console.error('Error disabling integration:', error);
        }
      }
    } else {
      setIntegrations(prev =>
        prev.map(integration =>
          integration.id === id && !integration.disabled
            ? { ...integration, enabled: !integration.enabled }
            : integration
        )
      );
    }
  };

  const handleRemove = (id: string) => {
    const integration = integrations.find(i => i.id === id);
    if (integration && !integration.disabled) {
      const confirmed = window.confirm(`Are you sure you want to remove ${integration.name} integration?`);
      if (confirmed) {
        setIntegrations(prev => prev.filter(integration => integration.id !== id));
        // Optionally, update API to disable it
        fetch('/api/integrations/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ integrationId: id, enabled: false })
        }).catch(error => console.error('Error disabling integration:', error));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <TooltipProvider>
      <div className="fixed inset-0 z-[90] flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative p-6 w-80 max-h-[80vh] overflow-y-auto scrollbar-hide shadow-2xl bg-[#3b3b3b] rounded-[2rem]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-white">Integrations</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Integration Items */}
          <div className="space-y-1 relative min-h-[300px]">
            {integrations.map((integration) => {
              const comingSoonIntegrations = ['todoist', 'asana', 'google-drive'];
              const isComingSoon = comingSoonIntegrations.includes(integration.id);

              return (
                <div
                  key={integration.id}
                  className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-white/5 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <button
                      disabled={integration.disabled}
                      className={`w-6 h-6 flex items-center justify-center text-white/80 ${integration.disabled ? '' : 'cursor-pointer'}`}
                    >
                      {integration.logo}
                    </button>
                    <span className="text-white text-sm font-medium">{integration.name}</span>
                  </div>
                  <ToggleSwitch
                    checked={integration.enabled}
                    onChange={() => { }}
                    disabled={true}
                  />
                </div>
              );
            })}

            {/* Premium Coming Soon Overlay */}
            <div className="absolute inset-x-[-1.5rem] bottom-[-1.5rem] top-[-1rem] bg-black/40 backdrop-blur-md z-10 flex flex-col items-center justify-center text-center p-6 border-t border-white/10 overflow-hidden rounded-b-[2rem]">
              <div className="mb-4 p-3 bg-white/10 rounded-2xl border border-white/20 shadow-2xl animate-bounce">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2 tracking-tight">Hold up!</h3>
              <p className="text-white/60 text-sm font-medium leading-relaxed">
                Expanded integrations are<br />
                <span className="text-blue-400 font-bold uppercase tracking-widest text-[10px]">Coming Soon</span>
              </p>

              {/* Decorative Elements */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/20 blur-[50px] rounded-full" />
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-500/20 blur-[50px] rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
