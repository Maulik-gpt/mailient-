'use client';

/**
 * ArcusDashboard — The Arcus Opening Screen
 * Combines MorningBriefing, quick actions, and agents panel toggle
 * This replaces the simple "Ask anything" initial mode
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  FileText,
  PenTool,
  Calendar,
  BarChart3,
  Bot,
  Mail,
  Zap,
  ArrowRight,
  Clock,
  Users,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MorningBriefing } from './MorningBriefing';
import { AgentsPanel } from './AgentsPanel';

// ============================================================================
// TYPES
// ============================================================================

interface ArcusDashboardProps {
  userName?: string;
  onSendMessage: (message: string) => void;
  onSuggestionClick?: (text: string) => void;

  // Morning Briefing data
  emailStats?: {
    total: number;
    drafted: number;
    archived: number;
    flagged: number;
  };
  meetings?: Array<{
    id: string;
    title: string;
    time: string;
    attendees: string[];
    type: 'discovery' | 'check-in' | 'demo' | 'internal' | 'other';
  }>;
  actionItems?: Array<{
    id: string;
    subject: string;
    from: string;
    urgency: 'high' | 'medium' | 'low';
    type: 'reply' | 'review' | 'approve' | 'follow-up';
    snippet: string;
  }>;

  // State
  isLoading?: boolean;

  // Tab Control
  activeTab?: 'home' | 'agents' | 'marketplace';
  onTabChange?: (tab: 'home' | 'agents' | 'marketplace') => void;

  // Children - for prompt box
  children?: React.ReactNode;
}

// ============================================================================
// TEMPLATES
// ============================================================================

const TEMPLATES = [
  { name: 'Morning Inbox Sweep', description: 'Every morning at 7am, scans inbox for unanswered client emails, drafts replies in your tone, emails you a summary.', cron_schedule: '0 7 * * *', cronLabel: 'Daily at 07:00 AM', output_channel: 'gmail', task_description: 'Every morning at 7am, search my inbox for any unanswered client emails, study my recent sent emails to learn my writing tone and voice, draft a personalized reply for each unanswered email matching my style exactly, and email me a clear summary with the subject line, sender, and a link to each draft in Gmail.' },
  { name: 'Meeting Autopilot', description: 'Every morning at 9am, finds meeting requests, checks calendar availability, books them with Meet links.', cron_schedule: '0 9 * * *', cronLabel: 'Daily at 09:00 AM', output_channel: 'both', task_description: 'Every morning at 9am, search my Gmail inbox for any meeting requests or scheduling emails, check my Google Calendar for availability in the proposed time slots, book confirmed meetings with Google Meet links, and send me a Slack message listing everything that was scheduled today.' },
  { name: 'Weekly Opportunity Digest', description: 'Every Sunday at 6pm, scans all emails from the week, identifies revenue opportunities and leads.', cron_schedule: '0 18 * * 0', cronLabel: 'Sundays at 06:00 PM', output_channel: 'gmail', task_description: 'Every Sunday at 6pm, search through all emails I received this week, identify any revenue opportunities, potential partnerships, warm leads, or high-priority follow-ups, and write a comprehensive weekly digest email.' },
  { name: 'Client Pulse', description: 'Every hour, checks if email arrived from your top contacts. Sends an immediate Slack ping.', cron_schedule: '0 */1 * * *', cronLabel: 'Every hour', output_channel: 'slack', task_description: 'Every hour, check if any new email arrived from my most important contacts. If so, immediately send me a Slack message with the sender name, subject line, and first two sentences.' },
  { name: 'Notion + Inbox Sync', description: 'Every morning at 8am, cross-references your Notion tasks with Gmail, sends a project briefing.', cron_schedule: '0 8 * * *', cronLabel: 'Daily at 08:00 AM', output_channel: 'gmail', task_description: 'Every morning at 8am, read my current Notion task list, search my Gmail inbox for emails related to each active project, find which projects have unread messages, and email me a concise project briefing.' },
  { name: 'Lead Harvest', description: 'Every morning at 5am, runs the full lead qualification flow across inbox and web, pushes to Notion.', cron_schedule: '0 5 * * *', cronLabel: 'Daily at 05:00 AM', output_channel: 'gmail', task_description: 'Every morning at 5am, search my inbox for any new inbound leads, partnership inquiries, or business development emails, use web search to research and qualify each lead, save qualified leads to my Notion database, and email me a harvest report.' },
];

// ============================================================================
// QUICK ACTION CONFIGS
// ============================================================================

const DYNAMIC_GREETINGS = [
  "Back at it!",
  "Ready as you are.",
  "What are we conquering today, {user}?",
  "Let's make some progress.",
  "Welcome back, {user}.",
  "Good to see you, {user}.",
  "Let's clear the queue.",
  "Inbox zen awaits, {user}.",
  "Ready to automate.",
  "Standing by.",
  "Let's crush some tasks, {user}.",
  "At your command.",
  "Let's streamline your day.",
  "Where should we start, {user}?",
  "Your inbox co-pilot is ready.",
  "Let's build something great, {user}.",
  "Ready to run.",
  "Always at your service.",
  "Here we go!",
  "Let's keep the momentum, {user}!"
];

function ConversationalStarter({
  text,
  onClick,
  delay = 0,
}: {
  text: string;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-4 py-2.5 rounded-xl",
        "bg-white/[0.02] border border-white/[0.05]",
        "hover:border-white/[0.12] hover:bg-white/[0.04]",
        "transition-all group/starter active:scale-[0.98]",
        "text-left w-full"
      )}
    >
      <MessageCircle className="w-3.5 h-3.5 text-white/15 group-hover/starter:text-white/40 transition-colors flex-shrink-0" />
      <span className="text-[12px] text-white/40 group-hover/starter:text-white/70 transition-colors truncate">
        {text}
      </span>
      <ArrowRight className="w-3.5 h-3.5 text-white/0 group-hover/starter:text-white/30 transition-all flex-shrink-0 ml-auto" />
    </motion.button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ArcusDashboard({
  userName,
  onSendMessage,
  onSuggestionClick,
  emailStats,
  meetings,
  actionItems,
  isLoading = false,
  activeTab: activeTabProp,
  onTabChange: onTabChangeProp,
  children,
}: ArcusDashboardProps) {
  const [localTab, setLocalTab] = useState<'home' | 'agents' | 'marketplace'>('home');
  const activeTab = activeTabProp !== undefined ? activeTabProp : localTab;
  const setActiveTab = onTabChangeProp !== undefined ? onTabChangeProp : setLocalTab;

  const [greetingText, setGreetingText] = useState('');

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * DYNAMIC_GREETINGS.length);
    const selectedTemplate = DYNAMIC_GREETINGS[randomIndex];
    let resolvedGreeting = selectedTemplate;
    if (userName) {
      resolvedGreeting = selectedTemplate.replace('{user}', userName.trim());
    } else {
      resolvedGreeting = selectedTemplate.replace(/,?\s*\{user\}/g, '');
    }
    setGreetingText(resolvedGreeting);
  }, [userName]);

  const hasBriefingData = emailStats && emailStats.total > 0;

  const handleQuickAction = (text: string) => {
    if (onSuggestionClick) {
      onSuggestionClick(text);
    } else {
      onSendMessage(text);
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-0">
      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'home' ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-3xl mx-auto"
          >
            {hasBriefingData ? (
              <div className="flex flex-col justify-center min-h-[65vh] py-4">
                <div className="flex-1 flex flex-col justify-center">
                  <MorningBriefing
                    userName={userName}
                    emailStats={emailStats}
                    meetings={meetings}
                    actionItems={actionItems}
                    isLoading={isLoading}
                    onTriageInbox={() => handleQuickAction("Triage my inbox now and categorize all unread emails by urgency")}
                    onDraftReplies={() => handleQuickAction("Draft replies to all emails that need a response")}
                    onViewMeetings={() => handleQuickAction("Show me all my meetings for today with details")}
                    onViewAction={(id) => handleQuickAction(`Show me the email flagged for my attention (ID: ${id})`)}
                    onRefresh={() => handleQuickAction("Refresh my inbox briefing with the latest data")}
                  />
                </div>
                
                {/* Center prompt box */}
                <div className="w-full max-w-2xl mx-auto px-4 mt-8 mb-4">
                  {children}
                </div>
              </div>
            ) : (
              /* Default greeting when no briefing data - Shifted to upper half, prompt box centered below */
              <div className="flex flex-col justify-center min-h-[65vh] py-4">
                <div className="flex-1 flex flex-col justify-center text-center">
                  <div className="flex justify-center mb-8">
                    <img
                      src="/arcus-ai-icon.jpg"
                      className="w-16 h-16 object-cover rounded-[24px] shadow-2xl grayscale brightness-110"
                      alt="Arcus AI"
                    />
                  </div>
                  <h1
                    className="text-4xl md:text-6xl font-medium text-white tracking-tighter mb-4"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {greetingText || (userName ? `Hey ${userName.trim()}` : 'Ask anything about your emails')}
                  </h1>
                  <p className="text-[15px] text-white/35 max-w-lg mx-auto leading-relaxed">
                    Arcus reads your inbox, drafts replies in your tone, books meetings, and manages everything — so you don't have to.
                  </p>
                </div>
                
                {/* Center prompt box */}
                <div className="w-full max-w-2xl mx-auto px-4 mt-8 mb-4">
                  {children}
                </div>
              </div>
            )}
          </motion.div>
        ) : activeTab === 'marketplace' ? (
          <motion.div
            key="marketplace"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-3xl mx-auto px-4 py-8 overflow-y-auto max-h-[75vh] custom-scroll"
          >
            <style dangerouslySetInnerHTML={{ __html: `
              .custom-scroll::-webkit-scrollbar {
                width: 6px;
                height: 6px;
              }
              .custom-scroll::-webkit-scrollbar-track {
                background: transparent;
              }
              .custom-scroll::-webkit-scrollbar-thumb {
                background: rgba(63, 63, 70, 0.4);
                border-radius: 9999px;
              }
              .custom-scroll::-webkit-scrollbar-thumb:hover {
                background: rgba(82, 82, 91, 0.6);
              }
            `}} />
            <h3 className="text-[20px] font-extrabold text-zinc-100 tracking-tight mb-2 font-sans">Templates</h3>
            <p className="text-[14px] text-zinc-500 mb-8">
              Get started with a pre-built agent — activate in one click, customize anytime.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES.map((t, i) => (
                <div
                  key={i}
                  className="bg-[#0c0c0d] border border-zinc-900 rounded-2xl p-5 flex flex-col hover:border-zinc-850 hover:bg-zinc-900/40 transition-all group shadow-sm justify-between min-h-[220px]"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-800 transition-colors">
                        <Clock className="w-4.5 h-4.5 text-zinc-500" />
                      </div>
                      <h4 className="text-[14px] font-bold text-zinc-200 leading-tight group-hover:text-white transition-colors">{t.name}</h4>
                    </div>
                    <p className="text-[12px] text-zinc-500 leading-relaxed mb-4">{t.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[11px] text-zinc-650 font-bold uppercase tracking-wider">{t.cronLabel}</span>
                    <button
                      onClick={() => handleQuickAction(t.task_description)}
                      className="px-4 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 text-[12px] font-bold hover:bg-white active:scale-95 transition-all animate-none"
                    >
                      Activate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="agents"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-3xl mx-auto"
          >
            <AgentsPanel
              onSendMessage={onSendMessage}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ArcusDashboard;
