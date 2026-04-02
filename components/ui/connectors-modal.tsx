'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Video,
  CalendarDays,
  Mail,
  X,
  Check,
  Search,
  Plus,
  ChevronDown,
  Database,
  ListTodo,
  Clock,
  ExternalLink,
  Shield,
  Zap,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Definitive list of supported connectors (Phase 4 canonical)
const SUPPORTED_APPS = [
  { 
    id: 'google_calendar', 
    name: 'Google Calendar', 
    icon: Calendar, 
    color: '#4285F4',
    description: 'Understand your schedule, manage events, and optimize your time effectively',
    details: 'Sync your Google Calendar to let Arcus schedule meetings, find availability, and manage your daily agenda autonomously.'
  },
  { 
    id: 'google_meet', 
    name: 'Google Meet', 
    icon: Video, 
    color: '#00897B',
    description: 'Automate video conferencing links and manage collaborative calls',
    details: 'Link Google Meet to auto-generate meeting rooms, manage call recordings, and integrate video links into your calendar events.'
  },
  { 
    id: 'notion', 
    name: 'Notion', 
    icon: Database, 
    color: '#000000',
    description: 'Create pages, update databases, and organize content straight from Arcus',
    details: 'Link your Notion workspace to enable Arcus to create meeting notes, update project trackers, and append data to your pages.'
  },
  { 
    id: 'notion_calendar', 
    name: 'Notion Calendar', 
    icon: CalendarDays, 
    color: '#000000',
    description: 'Unified time management across Notion pages and external timelines',
    details: 'Integrate Notion Calendar to bridge your project timelines with your personal schedule for comprehensive mission planning.'
  },
  { 
    id: 'google_tasks', 
    name: 'Google Tasks', 
    icon: ListTodo, 
    color: '#4285F4',
    description: 'Manage tasks, create to-do lists, and track execution across your projects',
    details: 'Connect Google Tasks to let Arcus manage your to-do lists, create tasks from emails, and track your execution progress.'
  },
  { 
    id: 'cal_com', 
    name: 'Cal.com', 
    icon: Clock, 
    color: '#ffffff',
    description: 'Professional scheduling with automated link generation and booking',
    details: 'Integrate Cal.com to let Arcus share your booking links and automatically handle appointment scheduling with external partners.'
  }
];

interface ConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect?: (id: string) => void;
  onDisconnect?: (id: string) => void;
}

export function ConnectorsModal({ 
  isOpen, 
  onClose,
  onConnect,
  onDisconnect
}: ConnectorsModalProps) {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const [selectedApp, setSelectedApp] = useState<typeof SUPPORTED_APPS[0] | null>(null);

  // Fetch integration statuses
  useEffect(() => {
    if (isOpen) {
      const fetchStatus = async () => {
        try {
          const res = await fetch('/api/integrations/status');
          if (res.ok) {
            const data = await res.json();
            setStatuses(data.integrations || {});
          }
        } catch (err) {
          console.error('Failed to fetch status:', err);
        }
      };
      fetchStatus();
    }
  }, [isOpen]);

  const handleConnectAction = async (appId: string) => {
    if (onConnect) {
      onConnect(appId);
    } else {
      try {
        const res = await fetch(`/api/integrations/${appId}/auth`);
        if (res.ok) {
          const { url } = await res.json();
          window.location.href = url;
        }
      } catch (err) {
        console.error('Failed to get auth URL:', err);
      }
    }
    setSelectedApp(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-3xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            filter: selectedApp ? 'blur(10px) brightness(0.6)' : 'none'
          }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative w-full max-w-[900px] h-[640px] bg-[#0d0d0d] rounded-[32px] border border-white/[0.08] shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6">
            <h2 className="text-[20px] font-bold text-white tracking-tight">Connectors</h2>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/5 rounded-lg text-white/30 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation - Apps Only */}
          <div className="px-8 flex items-center gap-8 border-b border-white/[0.03]">
            <button className="pb-4 text-[14px] font-bold text-white relative">
              Apps
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />
            </button>
            <button className="pb-4 text-[14px] font-bold text-white/20 cursor-not-allowed">Custom API</button>
            <button className="pb-4 text-[14px] font-bold text-white/20 cursor-not-allowed">Custom MCP</button>
          </div>

          {/* Grid Area */}
          <div className="flex-1 overflow-y-auto p-6 arcus-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {SUPPORTED_APPS.map((app) => {
                const statusKey = app.id === 'google_calendar' ? 'google-calendar' : 
                                 app.id === 'google_tasks' ? 'google-tasks' : 
                                 app.id === 'cal_com' ? 'cal-com' : app.id;
                const isConnected = statuses[statusKey] || false;

                return (
                  <button
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className="flex items-start gap-4 p-4 rounded-[24px] bg-[#1a1a1a]/40 border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all text-left group"
                  >
                    <div 
                      className="w-12 h-12 rounded-[16px] flex items-center justify-center bg-black/40 border border-white/[0.05] shrink-0 shadow-lg group-hover:scale-105 transition-transform"
                    >
                      <app.icon className="w-5 h-5" style={{ color: app.color }} />
                    </div>
                    <div className="flex-1 pr-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[15px] font-bold text-white/90 tracking-tight">{app.name}</span>
                        {isConnected && (
                          <div className="w-4 h-4 rounded-full bg-transparent flex items-center justify-center">
                            <Check className="w-3 h-3 text-emerald-500/80" />
                          </div>
                        )}
                      </div>
                      <p className="text-[12px] text-white/30 leading-relaxed line-clamp-2">
                        {app.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Sub Modal (Selection) */}
        <AnimatePresence>
          {selectedApp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="absolute z-[210] w-full max-w-[380px] bg-[#161616] rounded-[40px] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.6)] p-10 flex flex-col items-center text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedApp(null)}
                className="absolute top-8 right-8 p-1.5 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div 
                className="w-20 h-20 rounded-[28px] flex items-center justify-center border border-white/5 shadow-2xl mb-8 mt-2 transition-transform hover:scale-105 bg-black/40"
              >
                <selectedApp.icon className="w-10 h-10" style={{ color: selectedApp.color }} />
              </div>

              <h3 className="text-2xl font-bold text-white mb-3 tracking-tighter">{selectedApp.name}</h3>
              <p className="text-[14px] text-white/40 leading-relaxed mb-10 px-4 font-medium">
                {selectedApp.description}
              </p>

              <button
                onClick={() => handleConnectAction(selectedApp.id)}
                className="w-full py-4 bg-white text-black rounded-2xl font-bold text-[15px] hover:bg-white/90 active:scale-95 transition-all shadow-xl shadow-white/[0.05]"
              >
                Connect to {selectedApp.name}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}

export default ConnectorsModal;
