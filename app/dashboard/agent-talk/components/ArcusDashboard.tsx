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
import { AgentsPanel, type ScheduledAgent } from './AgentsPanel';

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

  // Agents
  agents?: ScheduledAgent[];
  onCreateAgent?: (description: string, schedule: string) => void;
  onPauseAgent?: (id: string) => void;
  onResumeAgent?: (id: string) => void;
  onDeleteAgent?: (id: string) => void;
  onRunNow?: (id: string) => void;

  // State
  isLoading?: boolean;

  // Tab Control
  activeTab?: 'home' | 'agents';
  onTabChange?: (tab: 'home' | 'agents') => void;

  // Children - for prompt box
  children?: React.ReactNode;
}

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
      <ArrowRight className="w-3 h-3 text-white/0 group-hover/starter:text-white/30 transition-all flex-shrink-0 ml-auto" />
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
  agents,
  onCreateAgent,
  onPauseAgent,
  onResumeAgent,
  onDeleteAgent,
  onRunNow,
  isLoading = false,
  activeTab: activeTabProp,
  onTabChange: onTabChangeProp,
  children,
}: ArcusDashboardProps) {
  const [localTab, setLocalTab] = useState<'home' | 'agents'>('home');
  const activeTab = activeTabProp !== undefined ? activeTabProp : localTab;
  const setActiveTab = onTabChangeProp !== undefined ? onTabChangeProp : setLocalTab;

  const [greetingText, setGreetingText] = useState('');

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * DYNAMIC_GREETINGS.length);
    const selectedTemplate = DYNAMIC_GREETINGS[randomIndex];
    let resolvedGreeting = selectedTemplate;
    if (userName) {
      resolvedGreeting = selectedTemplate.replace('{user}', userName);
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
                    {greetingText || (userName ? `Hey ${userName}` : 'Ask anything about your emails')}
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
              agents={agents}
              onCreateAgent={onCreateAgent}
              onPauseAgent={onPauseAgent}
              onResumeAgent={onResumeAgent}
              onDeleteAgent={onDeleteAgent}
              onRunNow={onRunNow}
              onSendMessage={onSendMessage}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ArcusDashboard;
