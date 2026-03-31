'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, Check, ChevronRight, Plus, 
  ExternalLink, Shield, Info, AlertCircle,
  Mail, Calendar, Database, CheckSquare, Zap,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Brand SVGs
const GmailIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#EA4335" d="M24 4.5v15c0 .85-.65 1.5-1.5 1.5H21V7.39l-9 6.75-9-6.75V21H1.5C.65 21 0 20.35 0 19.5v-15c0-.41.16-.8.46-1.08.3-.28.7-.42 1.04-.42h.75L12 10.5l9.75-7.5h.75c.34 0 .74.14 1.04.42.3.28.46.67.46 1.08z" />
  </svg>
);

const GoogleCalendarIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <rect width="24" height="24" fill="#ffffff" rx="4" />
    <path fill="#4285F4" d="M19 3h-1V1h-2v2H8V1H6v3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
    <path fill="#ffffff" d="M19 19H5V8h14v11z" />
    <text x="7" y="17" fill="#4285F4" fontSize="10" fontWeight="bold">31</text>
  </svg>
);

const NotionIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="currentColor" d="M4.152 2.628s.3.064.717.1c.451.05 1.341.103 2.05.103 1.933 0 1.837-.103 2.85-.155.856-.051 1.713-.103 2.536-.103.633 0 1.761.052 1.761.052L19.53 3.66s.527.103.527.67c0 .412-.119.53-.119.53s-.461 4.544-.757 8.01c-.131 1.597-.197 2.474-.197 2.474s.69 1.134 1.611 1.803l-4.143 2.937s-.921-.722-1.763-1.443c-.808.67-2.617 1.803-3.67 2.112-1.05.31-2.13.31-3.677 0-1.545-.31-3.045-.515-4.113-.772-1.069-.258-2.007-.773-2.007-1.494 0-.412.3-.515.3-.515s1.216-.464 1.631-.773c.414-.309.43-.876.43-.876s-.657-6.233-.822-10.3c-.097-2.318-.081-3.349-.081-3.349s-.016-.464-.526-.67c-.51-.205-.51-.31-.51-.31zm9.324 2.833h-1.631V16.32c.164.205.41.36.723.36.313 0 .541-.155.908-.464V5.461zm-6.28 0H5.565v10.972c.115.31.41.412.625.412.313 0 .707-.206 1.036-.412l-.029-10.972zm2.155 0h1.493l2.81 7.237V5.461h1.564V16.32h-1.614l-2.73-7.243v7.243H9.351V5.461z" />
  </svg>
);

const GoogleTasksIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill="#4285F4" />
    <path fill="none" stroke="#ffffff" strokeWidth="2" d="M7 12l3 3 7-7" />
  </svg>
);

const CalComIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

type Connector = {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: React.ReactNode;
  brandColor: string;
  connected: boolean;
  capabilities: string[];
};

const CONNECTORS: Connector[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Draft replies, search your inbox, and summarize threads.',
    longDescription: 'Connect Arcus to your Gmail account to enable high-speed drafting, inbox searching, and automated thread summarization.',
    icon: <GmailIcon />,
    brandColor: '#EA4335',
    connected: false,
    capabilities: ['Search emails', 'Draft replies', 'Summarize threads', 'Send emails']
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Manage meetings and optimize your schedule.',
    longDescription: 'Google Calendar integration lets Arcus schedule meetings, check availability, and manage your daily timeline.',
    icon: <GoogleCalendarIcon />,
    brandColor: '#4285F4',
    connected: false,
    capabilities: ['Create events', 'Check availability', 'Manage Google Meet', 'Schedule briefings']
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Search workspace content and automate Notion tasks.',
    longDescription: 'Arcus is an official Notion partner. Connection allows for creating pages, updating databases, and searching your entire workspace.',
    icon: <NotionIcon />,
    brandColor: '#000000',
    connected: false,
    capabilities: ['Create pages', 'Add database items', 'Workspace search', 'Content updates']
  },
  {
    id: 'google_tasks',
    name: 'Google Tasks',
    description: 'Track mission steps as actionable tasks.',
    longDescription: 'Sync Arcus mission plans directly with Google Tasks to keep your execution progress visible across all your devices.',
    icon: <GoogleTasksIcon />,
    brandColor: '#4285F4',
    connected: false,
    capabilities: ['Create tasks', 'Manage task lists', 'Mark completion', 'Sync mission steps']
  },
  {
    id: 'cal_com',
    name: 'Cal.com',
    description: 'High-speed scheduling for your workflow.',
    longDescription: 'Cal.com integration enables Arcus to find optimal meeting times and book them instantly using your scheduling links.',
    icon: <CalComIcon />,
    brandColor: '#ffffff',
    connected: false,
    capabilities: ['Book meetings', 'Get scheduling links', 'Manage event types', 'Reschedule']
  }
];

interface ConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectorsModal({ isOpen, onClose }: ConnectorsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchStatuses();
    }
  }, [isOpen]);

  const fetchStatuses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/integrations/status');
      if (res.ok) {
        const data = await res.json();
        const newStatuses: Record<string, boolean> = {};
        Object.entries(data.integrations).forEach(([key, val]: [string, any]) => {
          newStatuses[key] = val.connected;
        });
        setStatuses(newStatuses);
      }
    } catch (err) {
      console.error('Failed to fetch integration statuses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredConnectors = CONNECTORS.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConnect = async (connectorId: string) => {
    // Generate OAuth URL and redirect
    try {
      const res = await fetch(`/api/integrations/${connectorId}/auth`);
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (err) {
      console.error('Failed to get auth URL:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-[#0d0d0d] border border-white/10 rounded-[28px] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[600px]"
      >
        {/* Left Side: Grid or Details */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {!selectedConnector ? (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col p-8 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Connectors</h2>
                    <p className="text-white/40 text-sm mt-1">Connect your tools to empower Arcus agent</p>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="text"
                    placeholder="Search apps..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-white/20 transition-all"
                  />
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-6 mb-8 border-b border-white/5">
                  <button className="pb-4 text-sm font-bold text-white border-b-2 border-white tracking-tight transition-all">Apps</button>
                  <button className="pb-4 text-sm font-medium text-white/30 hover:text-white/60 tracking-tight transition-all">Custom API</button>
                  <button className="pb-4 text-sm font-medium text-white/30 hover:text-white/60 tracking-tight transition-all">Custom MCP</button>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredConnectors.map((connector) => (
                      <button
                        key={connector.id}
                        onClick={() => setSelectedConnector(connector)}
                        className="group flex flex-col items-start p-5 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.06] hover:border-white/10 transition-all text-left"
                      >
                        <div className="flex items-center justify-between w-full mb-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border border-white/5",
                            connector.id === 'notion' ? 'bg-white text-black' : 'bg-[#1a1a1a] text-white'
                          )}>
                            {connector.icon}
                          </div>
                          {statuses[connector.id] && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                              <Check className="w-3 h-3 text-emerald-400" />
                            </div>
                          )}
                        </div>
                        <h4 className="text-[15px] font-bold text-white mb-1">{connector.name}</h4>
                        <p className="text-[12px] text-white/40 line-clamp-2 leading-relaxed">
                          {connector.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 flex flex-col p-10 overflow-y-auto custom-scrollbar"
              >
                <button 
                  onClick={() => setSelectedConnector(null)}
                  className="mb-8 flex items-center gap-2 text-white/40 hover:text-white transition-all text-sm font-medium group"
                >
                  <ChevronRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                  Back to all connectors
                </button>

                <div className="flex flex-col items-center text-center max-w-md mx-auto">
                  <div className={cn(
                    "w-20 h-20 rounded-3xl flex items-center justify-center border border-white/10 mb-8 shadow-2xl transition-transform hover:scale-110 duration-300",
                    selectedConnector.id === 'notion' ? 'bg-white text-black' : 'bg-[#1a1a1a] text-white'
                  )}>
                    {selectedConnector.icon}
                  </div>

                  <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">{selectedConnector.name}</h2>
                  <p className="text-white/60 text-[15px] leading-relaxed mb-8">
                    {selectedConnector.longDescription}
                  </p>

                  <button
                    onClick={() => handleConnect(selectedConnector.id)}
                    className="w-full py-4 bg-white text-black font-bold text-[15px] rounded-2xl hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5 active:scale-95 duration-200"
                  >
                    <Plus className="w-5 h-5" />
                    Connect
                  </button>

                  <button className="mt-4 text-white/30 hover:text-white transition-all text-sm font-medium flex items-center gap-1.5 focus:outline-none">
                    Show Details
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </button>
                </div>

                <div className="mt-12 w-full max-w-lg mx-auto">
                  <h5 className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-6 text-center">Capabilities</h5>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedConnector.capabilities.map((cap, i) => (
                      <div key={i} className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <Zap className="w-3 h-3 text-white/40" />
                        </div>
                        <span className="text-[13px] text-white/60 font-medium">{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Visual Context (Only on grid) */}
        {!selectedConnector && (
          <div className="hidden lg:flex w-80 bg-white/[0.02] border-l border-white/5 flex-col p-8">
            <div className="flex-1 flex flex-col justify-center gap-10">
              <div className="space-y-6">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h5 className="text-white font-bold text-lg mb-2">Private & Secure</h5>
                  <p className="text-white/40 text-sm leading-relaxed">
                    Arcus only interacts with data you explicitly permit. Connections are encrypted and scopes are restricted.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h5 className="text-white font-bold text-lg mb-2">Infinite Workflow</h5>
                  <p className="text-white/40 text-sm leading-relaxed">
                    Unified connectivity allows Arcus to perform cross-app actions like syncing Gmail drafts to Notion.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="pt-8 border-t border-white/5">
              <div className="flex items-center gap-3 text-white/30 text-[11px] font-medium tracking-tight">
                <Info className="w-3 h-3" />
                <span>All OAuth 2.0 authorized</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
