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
  const [activeTab, setActiveTab] = useState('Apps');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<typeof SUPPORTED_APPS[0] | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Fetch integration statuses
  const fetchStatuses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/integrations/status');
      if (res.ok) {
        const data = await res.json();
        setStatuses(data.integrations || {});
      }
    } catch (err) {
      console.error('Failed to fetch integration statuses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatuses();
    }
  }, [isOpen]);

  const handleConnectAction = async (appId: string) => {
    if (onConnect) {
      onConnect(appId);
    } else {
      // Default behavior: redirect to auth endpoint
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

  // Filter apps based on search
  const filteredApps = SUPPORTED_APPS.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-hidden">
        {/* Backdrop Blur Over Everything */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-all"
        />

        {/* Main Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            filter: selectedApp ? 'blur(10px) brightness(0.5)' : 'none'
          }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className={cn(
            "relative w-full max-w-4xl h-[700px] bg-[#0d0d0d] rounded-[32px] border border-white/10 shadow-2xl flex flex-col overflow-hidden pointer-events-auto",
            selectedApp && "pointer-events-none"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-8 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Connectors</h2>
              <p className="text-white/40 text-sm mt-1">Empower Arcus with your favorite tools</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation & Search */}
          <div className="px-8 mt-2 flex items-center justify-between border-b border-white/[0.05]">
            <div className="flex items-center gap-8">
              {['Apps', 'Custom API', 'Custom MCP'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "pb-4 text-[15px] font-bold transition-all relative",
                    activeTab === tab ? "text-white" : "text-white/20 hover:text-white/40"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="tab-underline" 
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" 
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/[0.03] border border-white/10 rounded-2xl pl-10 pr-6 py-2 text-sm text-white w-64 focus:outline-none focus:border-white/20 transition-all placeholder:text-white/10"
              />
            </div>
          </div>

          {/* Apps Grid */}
          <div className="flex-1 overflow-y-auto p-8 arcus-scrollbar">
            <h3 className="text-[11px] font-bold text-white/20 uppercase tracking-[0.2em] mb-6">Available integrations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredApps.map((app) => {
                // Handle different ID formats
                const statusKey = app.id === 'google_calendar' ? 'google-calendar' : 
                                 app.id === 'google_tasks' ? 'google-tasks' : 
                                 app.id === 'cal_com' ? 'cal-com' : app.id;
                const isConnected = statuses[statusKey] || false;

                return (
                  <button
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className="flex items-center gap-5 p-5 rounded-[24px] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10 transition-all text-left group relative overflow-hidden"
                  >
                    <div 
                      className="w-14 h-14 rounded-[18px] flex items-center justify-center border border-black/20 shadow-xl shrink-0"
                      style={{ backgroundColor: app.id === 'notion' ? '#111' : app.id === 'cal_com' ? '#222' : `${app.color}15` }}
                    >
                      <app.icon className="w-7 h-7" style={{ color: app.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[17px] font-bold text-white/90 tracking-tight">{app.name}</span>
                        {isConnected && (
                          <div className="w-5 h-5 bg-emerald-500/10 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-emerald-500" />
                          </div>
                        )}
                      </div>
                      <p className="text-[13px] text-white/30 line-clamp-2 leading-relaxed group-hover:text-white/50 transition-colors">
                        {app.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* Empty State */}
            {filteredApps.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-20">
                <Search className="w-10 h-10 mb-4" />
                <p className="text-lg font-medium">No connectors found</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Sub Modal (App Specific) - Appears ON TOP */}
        <AnimatePresence>
          {selectedApp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="absolute z-[210] w-full max-w-[420px] bg-[#161616] rounded-[40px] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] p-10 flex flex-col items-center text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedApp(null)}
                className="absolute top-8 right-8 p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div 
                className="w-24 h-24 rounded-[30px] flex items-center justify-center border border-white/5 shadow-2xl mb-8 mt-2 transition-transform hover:scale-105 duration-500"
                style={{ backgroundColor: selectedApp.id === 'notion' ? '#000' : selectedApp.id === 'cal_com' ? '#222' : `${selectedApp.color}10` }}
              >
                <selectedApp.icon className="w-12 h-12" style={{ color: selectedApp.color }} />
              </div>

              <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">{selectedApp.name}</h3>
              
              <p className="text-[15px] text-white/40 leading-relaxed mb-10 px-2">
                {selectedApp.description}
              </p>

              <button
                onClick={() => handleConnectAction(selectedApp.id)}
                className="w-full flex items-center justify-center gap-2.5 py-4.5 bg-white text-black rounded-2xl font-black text-[16px] hover:bg-neutral-200 transition-all shadow-xl shadow-white/5 active:scale-95 duration-200"
              >
                <Plus className="w-5 h-5 stroke-[3px]" />
                Connect
              </button>

              <div className="mt-8 w-full">
                <button 
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center justify-center gap-2 w-full text-[14px] font-bold text-white/20 hover:text-white/40 transition-colors"
                >
                  Show Details
                  <motion.div animate={{ rotate: showDetails ? 180 : 0 }}>
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-6 text-[13px] text-white/30 text-left leading-relaxed border-t border-white/5 mt-6 px-1">
                        {selectedApp.details}
                        <div className="mt-6 flex flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                            <Shield className="w-3.5 h-3.5 text-emerald-500/60" />
                            <span className="text-[11px] font-bold text-white/40">Secure OAuth 2.0</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                            <Zap className="w-3.5 h-3.5 text-amber-500/60" />
                            <span className="text-[11px] font-bold text-white/40">Real-time sync</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}

export default ConnectorsModal;
