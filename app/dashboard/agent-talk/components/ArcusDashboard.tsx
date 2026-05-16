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

  // Children - for prompt box
  children?: React.ReactNode;
}

// ============================================================================
// QUICK ACTION CONFIGS
// ============================================================================

const QUICK_ACTIONS = [
  {
    label: 'Catch up',
    icon: Sparkles,
    text: "Please provide me with a comprehensive summary of my recent email correspondence from the last 24 hours. I am particularly interested in any urgent matters, action items directed at me, or important status updates that require my immediate attention.",
    description: 'Summarize what happened overnight',
  },
  {
    label: 'Draft replies',
    icon: PenTool,
    text: "I would like some assistance in drafting professional responses to all my unanswered emails. Please ensure each reply is articulate, maintains a collaborative tone, and clearly addresses all the questions or points raised by each sender.",
    description: 'Auto-draft to unanswered emails',
  },
  {
    label: 'Schedule',
    icon: Calendar,
    text: "I need to facilitate meetings based on my recent email threads. Could you please review any pending scheduling requests and compare them with my calendar to suggest the most optimal windows?",
    description: 'Handle meeting requests',
  },
  {
    label: 'Analytics',
    icon: BarChart3,
    text: "Please perform an audit of my email engagement and activity over the past seven days. I am looking for a detailed overview of my top communication partners, peak activity times, and any trends in my response frequency or inbox growth.",
    description: 'Email activity insights',
  },
];

const CONVERSATIONAL_STARTERS = [
  "Reply to all unanswered emails from this week",
  "Which clients haven't heard from me in over 2 weeks?",
  "Find every email from Rohan and summarize what we discussed",
  "Draft a follow-up to everyone I met at the conference last month",
  "Triage my inbox and archive all newsletters",
  "What's my most urgent email right now?",
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function QuickActionButton({
  action,
  onClick,
  delay = 0,
}: {
  action: typeof QUICK_ACTIONS[0];
  onClick: () => void;
  delay?: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-5 py-3 rounded-2xl",
        "bg-white/[0.02] border border-white/[0.06]",
        "hover:border-white/[0.12] hover:bg-white/[0.04]",
        "transition-all group/action active:scale-[0.98]",
        "text-left"
      )}
    >
      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover/action:bg-white/10 group-hover/action:border-white/20 transition-all">
        <action.icon className="w-4 h-4 text-white/50 group-hover/action:text-white/80 transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-semibold text-white/80 group-hover/action:text-white transition-colors block">
          {action.label}
        </span>
        <span className="text-[11px] text-white/25 group-hover/action:text-white/40 transition-colors block truncate">
          {action.description}
        </span>
      </div>
      <ChevronRight className="w-4 h-4 text-white/10 group-hover/action:text-white/30 transition-colors flex-shrink-0" />
    </motion.button>
  );
}

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
  children,
}: ArcusDashboardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'agents'>('home');
  const [starters] = useState(() =>
    [...CONVERSATIONAL_STARTERS].sort(() => Math.random() - 0.5).slice(0, 4)
  );

  const hasBriefingData = emailStats && emailStats.total > 0;

  const handleQuickAction = (text: string) => {
    if (onSuggestionClick) {
      onSuggestionClick(text);
    } else {
      onSendMessage(text);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Tab Switcher — Home / Agents */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-full mb-10"
      >
        <button
          onClick={() => setActiveTab('home')}
          className={cn(
            "px-5 py-2 rounded-full text-[12px] font-bold transition-all flex items-center gap-2",
            activeTab === 'home'
              ? "bg-white/[0.08] text-white border border-white/[0.12]"
              : "text-white/40 hover:text-white/60 border border-transparent"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Home
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={cn(
            "px-5 py-2 rounded-full text-[12px] font-bold transition-all flex items-center gap-2",
            activeTab === 'agents'
              ? "bg-white/[0.08] text-white border border-white/[0.12]"
              : "text-white/40 hover:text-white/60 border border-transparent"
          )}
        >
          <Bot className="w-3.5 h-3.5" />
          Agents
          {agents && agents.filter(a => a.status === 'running').length > 0 && (
            <motion.div
              className="w-1.5 h-1.5 bg-green-400 rounded-full"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          )}
        </button>
      </motion.div>

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
            {/* Morning Briefing (if data available) */}
            {hasBriefingData ? (
              <div className="mb-12">
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
            ) : (
              /* Default greeting when no briefing data */
              <div className="text-center mb-12">
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
                  {userName ? `Hey ${userName}` : 'Ask anything about your emails'}
                </h1>
                <p className="text-[15px] text-white/35 max-w-lg mx-auto leading-relaxed">
                  Arcus reads your inbox, drafts replies in your tone, books meetings, and manages everything — so you don't have to.
                </p>
              </div>
            )}

            {/* Prompt Box Fixed Bottom */}
            <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-8 pt-12 bg-gradient-to-t from-black via-[#0a0a0a] to-transparent">
              <div className="w-full max-w-2xl mx-auto px-4 pointer-events-auto">
                {children}
              </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 mb-32">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {QUICK_ACTIONS.map((action, i) => (
                  <QuickActionButton
                    key={action.label}
                    action={action}
                    onClick={() => handleQuickAction(action.text)}
                    delay={0.1 + i * 0.05}
                  />
                ))}
              </div>
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
