"use client";

import { Send, Mail, Upload, User, User2, MessageCircle, DoorOpen, Bell, Mail as EmailIcon, MoreHorizontal, LogOut, Settings, ChevronRight, ChevronDown, CheckCircle2, Circle, Edit, History, LayoutGrid, Zap, Volume2, Sparkles, FileText, Calendar, BarChart3, PenTool, BrainCircuit, Search, Check, X, PanelLeft, Menu, Compass, Terminal, Share2, Bot, Globe, MessageSquare } from 'lucide-react';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { AddSquareIcon, Cancel01Icon, WorkHistoryIcon } from '@hugeicons/core-free-icons';
import { ChatHistoryModal } from './components/ChatHistoryModal';
import { ThinkingLayer, ResultCard, type ThinkingStep, type ThinkingBlock, type SearchSession } from './components/ThinkingLayer';
import { ConnectorRequiredPanel, type ConnectorRequiredEntry } from './components/ThinkingLayerV2';
import { AgentExecutionTimeline, type AgentStep, type AgentNarrative } from './components/AgentExecutionTimeline';
import { TaskProgressCard, type TaskList } from './components/TaskProgressCard';
import { LiveTaskWidget } from './components/LiveTaskWidget';
import { DraftReplyBox } from './components/DraftReplyBox';
import { ChatPlanCard, type PlanCardData } from './components/ChatPlanCard';
import { CanvasPanel, type CanvasData } from './components/CanvasPanel';
import { ArtifactsGalleryPanel } from './components/ArtifactsGalleryPanel';
import PlanArtifactCard from './components/PlanArtifactCard';
import { PlanModeBrief } from './components/PlanModeBrief';
import { PlanCanvas } from './components/PlanCanvas';
import { SearchExecutionPanel } from './components/SearchExecutionPanel';
import { ConnectorBar } from './components/ConnectorBar';
import { StatusBar } from './components/StatusBar';
import { ArcusDashboard } from './components/ArcusDashboard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PromptInputBox } from '@/components/ui/ai-prompt-box';
import { ConnectorsModal } from '@/components/ui/connectors-modal';
import { EmailSelectionModal } from '@/components/ui/email-selection-modal';
import { PersonalitySettingsModal } from '@/components/ui/personality-settings-modal';
import { GradientButton } from '@/components/ui/gradient-button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { HomeFeedSidebar } from "@/components/ui/home-feed-sidebar";
import { TextShimmer } from '@/components/ui/text-shimmer';
import WordBlurStream from '../../../src/WordBlurStream';

import { UsageLimitModal } from '@/components/ui/usage-limit-modal';
import { SettingsCard } from '@/components/ui/settings-card';
import { HelpCard } from '@/components/ui/help-card';
import { RewardsCard } from '@/components/ui/rewards-card';
import { ShiningText } from '@/components/ui/shining-text';

import { Button as Button1 } from '@/components/ui/button-1';
import { MorphingSquare } from '@/components/ui/morphing-square';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { audioRuntime } from '@/lib/audio-runtime';
import { NotificationService } from '@/lib/notification-service';
import { GradientWave } from '@/components/ui/gradient-wave';
import { useArcusAgentStream } from './hooks/useArcusAgentStream';
import { useArcusV3Feed } from './hooks/useArcusV3Feed';
import { usePlanModeBrief } from './hooks/usePlanModeBrief';

const GRA_DEFORM = { incline: 0.3, noiseAmp: 150, noiseFlow: 2 };

const THINKING_MESSAGES = ["Clarifying Intent", "Reasoning Context", "Architecting Plan", "Executing Tools", "Securing Action", "Delivering Value", "Iterating Results"];

const DEEP_THINKING_MESSAGES = ["Deep Clarification", "Strategic Reasoning", "Workflow Planning", "Complex Execution", "Safety Verification", "Intelligence Synthesis", "Outcome Optimization"];

function RollingThinkingStatus({ onToggle, isOpen, isDeepThinking }: { onToggle: () => void, isOpen: boolean, isDeepThinking?: boolean }) {
  const [index, setIndex] = useState(0);
  const messages = isDeepThinking ? DEEP_THINKING_MESSAGES : THINKING_MESSAGES;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, index === 0 ? (isDeepThinking ? 8000 : 5000) : (isDeepThinking ? 4000 : 2500));
    return () => clearTimeout(timer);
  }, [index, isDeepThinking, messages.length]);

  return (
    <div className="flex items-center gap-2 group/status cursor-pointer select-none py-1.5" onClick={onToggle}>
      <div className="relative">
        <motion.span
          className="text-[14px] font-bold tracking-tight bg-[linear-gradient(110deg,#666,35%,#fff,50%,#666,75%,#666)] bg-[length:250%_100%] bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
          initial={{ backgroundPosition: "200% 0" }}
          animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
        >
          {messages[index]}
        </motion.span>
        {/* Subtle Liquid Wave Overlay */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent w-[200%] pointer-events-none"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        />
      </div>
      <ChevronDown className={cn("w-3.5 h-3.5 text-black/20 dark:text-white/20 transition-all duration-700 group-hover/status:text-white/40", isOpen ? "rotate-180" : "")} />
    </div>
  );
}


// Detect and wrap URLs in plain text with premium styling for actions
const linkify = (text: string, isUser: boolean = false): string => {
  if (!text) return '';
  const urlRegex = /(https?:\/\/[^\s<]+[^.,;?!)\]\s<])/g;

  return text.replace(urlRegex, (url) => {
    const lowerUrl = url.toLowerCase();
    const isAction = lowerUrl.includes('verify') ||
      lowerUrl.includes('confirm') ||
      lowerUrl.includes('activate') ||
      lowerUrl.includes('reset') ||
      lowerUrl.includes('token=') ||
      lowerUrl.includes('password');

    if (isAction && url.length > 50) {
      // Simplified Security Action
      return `<div class="my-4 p-5 bg-white/[0.03] border border-neutral-200 dark:border-white/10 rounded-2xl relative group overflow-hidden">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 bg-black/5 dark:bg-white/5 rounded-xl flex items-center justify-center border border-neutral-200 dark:border-white/10">
            <svg class="w-5 h-5 text-black dark:text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="flex-1 text-left">
            <h4 class="text-black dark:text-white font-bold text-[11px] tracking-tight uppercase">Security required</h4>
            <p class="text-black dark:text-white/30 text-[9px] tracking-tight uppercase">Verify link to proceed</p>
          </div>
          <a href="${url}" target="_blank" rel="noopener noreferrer" class="px-5 py-2 bg-white hover:bg-neutral-200 text-black font-bold text-[10px] tracking-tight uppercase rounded-lg transition-all no-underline">Verify</a>
        </div>
        <div class="mt-4 text-[9px] text-black dark:text-white/10 break-all opacity-40 select-all cursor-text py-2 px-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-lg border border-white/[0.05]">${url}</div>
      </div>`;
    }

    const displayUrl = url.length > 55 ? url.substring(0, 52) + '...' : url;
    const linkColorClass = isUser ? "text-blue-600 hover:text-blue-800" : "text-black dark:text-white/60 hover:text-black dark:text-white";
    const decorationClass = isUser ? "decoration-blue-200 hover:decoration-blue-600" : "decoration-white/20 hover:decoration-white/100";

    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="${linkColorClass} underline underline-offset-4 ${decorationClass} transition-all text-[13px] tracking-tight break-all" title="${url}">${displayUrl}</a>`;
  });
};

const MarkdownComponents: any = {
  h1: ({ children }: any) => <h1 className="text-2xl font-bold text-white mb-4 mt-6 first:mt-0 tracking-tight border-b border-white/10 pb-2">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-xl font-bold text-white mb-3 mt-5 tracking-tight flex items-center gap-2">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-lg font-bold text-white mb-2 mt-4 tracking-tight">{children}</h3>,
  h4: ({ children }: any) => <h4 className="text-base font-bold text-white mb-2 mt-3">{children}</h4>,
  h5: ({ children }: any) => <h5 className="text-sm font-bold text-white mb-1 mt-2">{children}</h5>,
  h6: ({ children }: any) => <h6 className="text-xs font-bold text-white mb-1 mt-2 uppercase tracking-widest">{children}</h6>,
  p: ({ children }: any) => <p className="mb-4 last:mb-0 leading-relaxed text-[16px] text-white">{children}</p>,
  ul: ({ children }: any) => <ul className="list-none pl-0 mb-4 space-y-2 text-white">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-6 mb-4 space-y-1.5 text-white">{children}</ol>,
  li: ({ children }: any) => {
    // Check if this is a main bullet (starts with ◆) or sub bullet (starts with •)
    const text = typeof children === 'string' ? children : '';
    const isMainBullet = text.toString().startsWith('◆');
    const isActionItem = text.toString().includes('⚠️') || text.toString().includes('✅') || text.toString().includes('❌');
    return (
      <li className={cn(
        "flex items-start gap-2",
        isMainBullet && "font-medium text-white",
        isActionItem && "bg-white/[0.03] rounded-lg px-3 py-2 -mx-3"
      )}>
        <span className={cn(
          "mt-1.5 flex-shrink-0",
          isMainBullet ? "w-1.5 h-1.5 bg-white rounded-full" : "w-1.5 h-1.5 bg-white/40 rounded-full"
        )} />
        <span className="flex-1">{children}</span>
      </li>
    );
  },
  table: ({ children }: any) => (
    <div className="my-6 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm">
      <table className="w-full border-collapse text-sm text-left">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-white/[0.06] border-b border-white/[0.1]">{children}</thead>,
  th: ({ children }: any) => <th className="px-4 py-3 font-bold text-white uppercase tracking-wider text-[11px]">{children}</th>,
  td: ({ children }: any) => {
    // Highlight status symbols in table cells
    const text = typeof children === 'string' ? children : '';
    const hasStatus = /[✅❌⚠️⏳💰🚀🔥⚡📊📈]/.test(text.toString());
    return (
      <td className={cn(
        "px-4 py-2.5 text-white border-b border-white/[0.03] last:border-0",
        hasStatus && "font-medium"
      )}>{children}</td>
    );
  },
  tr: ({ children }: any) => <tr className="hover:bg-white/[0.02] transition-colors">{children}</tr>,
  hr: () => <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-2 border-white/30 pl-4 py-2 my-4 bg-white/[0.02] rounded-r-lg">
      <p className="text-white italic text-sm">{children}</p>
    </blockquote>
  ),
  code: ({ node, inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const lang = match ? match[1] : '';
    return (
      <code className={cn(
        "font-mono text-sm",
        inline
          ? "px-1.5 py-0.5 rounded bg-white/[0.08] text-white"
          : "block p-4 bg-[#0a0a0a] border border-white/[0.08] rounded-lg text-white my-4 overflow-x-auto",
        className
      )} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }: any) => (
    <pre className="block my-4 bg-[#0a0a0a] border border-white/[0.08] rounded-lg overflow-hidden">
      {children}
    </pre>
  ),
  a: ({ node, ...props }: any) => (
    <a
      className="text-white underline underline-offset-4 decoration-white/30 hover:decoration-white/70 transition-all font-medium hover:text-white"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  strong: ({ children }: any) => <strong className="font-bold text-white">{children}</strong>,
  em: ({ children }: any) => <em className="italic text-white">{children}</em>
};

const TypewriterMarkdown = ({ content, speed = 4, hideLinks }: { content: string, speed?: number, hideLinks?: boolean }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isDone, setIsDone] = useState(false);
  const words = content.split(/(\s+)/); // Preserve spaces
  const indexRef = useRef(0);

  useEffect(() => {
    // If content is short or we already started, reset if content changed significantly
    // But usually we just want to run it once for the final response
    let currentText = "";
    indexRef.current = 0;
    setDisplayedText("");
    setIsDone(false);

    const interval = setInterval(() => {
      if (indexRef.current >= words.length) {
        setIsDone(true);
        clearInterval(interval);
        return;
      }

      // Add 2-3 words at a time for "fast" word-by-word feel
      const batchSize = 3;
      for (let i = 0; i < batchSize && indexRef.current < words.length; i++) {
        currentText += words[indexRef.current];
        indexRef.current++;
      }

      setDisplayedText(currentText);
    }, speed);

    return () => clearInterval(interval);
  }, [content, speed]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        ...MarkdownComponents,
        ...(hideLinks ? { a: ({ node, ...props }) => <span className="text-inherit underline underline-offset-2 opacity-50 cursor-default">{props.children}</span> } : {})
      }}
    >
      {isDone ? content : displayedText}
    </ReactMarkdown>
  );
};


const MessageContent = ({ content, isUser, isTyping, isNewResponse, hideLinks }: { content: any, isUser?: boolean, isTyping?: boolean, isNewResponse?: boolean, hideLinks?: boolean }) => {
  const textColorClass = isUser ? "text-white" : "text-white/90";
  let textContent = typeof content === 'string' ? content : (content.text || '');

  const shouldAnimate = (isTyping || isNewResponse) && !isUser;

  const markdownComponents = useMemo(() => {
    const base = {
      ...MarkdownComponents,
      ...(hideLinks ? { a: ({ node, ...props }: any) => <span className="text-inherit underline underline-offset-2 opacity-50 cursor-default">{props.children}</span> } : {})
    };

    if (shouldAnimate) {
      return {
        ...base,
        text: ({ children }: { children: string }) => {
          if (typeof children === 'string') {
            return <WordBlurStream text={children} loop={false} />;
          }
          return children;
        }
      };
    }

    return base;
  }, [shouldAnimate, hideLinks]);

  return (
    <div className={cn(
      "w-full",
      textColorClass,
      !isUser && "max-w-none prose prose-invert prose-headings:mb-4 prose-p:mb-4 prose-li:mb-1 prose-table:my-6"
    )}>
      {isTyping && !textContent && (
        <div className="flex flex-col gap-3 py-2 opacity-60">
          <motion.div 
            className="h-3 w-full bg-white/20 rounded-full relative overflow-hidden"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent w-[200%]"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            />
          </motion.div>
          <motion.div 
            className="h-3 w-[90%] bg-white/20 rounded-full relative overflow-hidden"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent w-[200%]"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: 0.2 }}
            />
          </motion.div>
        </div>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {textContent}
      </ReactMarkdown>
      {isTyping && textContent && (
        <motion.span
          className="inline-block w-1.5 h-4 ml-1 bg-white/40 rounded-sm align-middle"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
        />
      )}
    </div>
  );
};

const MissionStatusHeader = ({ mission }: { mission: any }) => {
  if (!mission) return null;

  const statusLabels: any = {
    draft: 'Draft ready',
    waiting_on_user: 'Input required',
    waiting_on_other: 'In progress',
    done: 'Completed',
    archived: 'Archived'
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[#111111] border border-neutral-200 dark:border-white/5 rounded-xl w-fit mb-8 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse shrink-0" />
        <span className="text-black dark:text-white/95 text-[13px] font-bold tracking-tight">{mission.goal}</span>
      </div>
      <div className="h-3 w-[1px] bg-black/10 dark:bg-white/10" />
      <span className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white/20">
        {statusLabels[mission.status] || mission.status}
      </span>
    </div>
  );
};

function isNotesRelatedQuery(message: string): boolean {
  const notesKeywords = [
    'note', 'notes', 'my notes', 'find note', 'search note', 'look for note',
    'remember', 'reminder', 'todo', 'task', 'list', 'ideas', 'thoughts',
    'journal', 'diary', 'memo', 'record', 'write down', 'saved note',
    'created note', 'made note', 'stored note', 'keep note'
  ];
  const lowerMessage = message.toLowerCase();
  return notesKeywords.some((keyword) => lowerMessage.includes(keyword));
}

function isEmailRelatedQuery(message: string): boolean {
  const emailKeywords = [
    'email', 'emails', 'inbox', 'gmail', 'message', 'messages',
    'unread', 'read', 'urgent', 'important', 'starred',
    'today', 'yesterday', 'this week', 'recent', 'latest',
    'from', 'subject', 'attachment', 'search', 'find', 'check'
  ];
  const lowerMessage = message.toLowerCase();
  return emailKeywords.some((keyword) => lowerMessage.includes(keyword));
}

function extractSearchTerm(message: string): string {
  const patterns = [
    /find\s+(?:my\s+)?notes?(?:\s+|\s*about|\s*on|\s*regarding)\s+(.+)/i,
    /search\s+(?:for\s+)?notes?(?:\s+|\s*about|\s*on|\s*regarding)\s+(.+)/i,
    /look\s+for\s+(?:my\s+)?notes?(?:\s+|\s*about|\s*on|\s*regarding)\s+(.+)/i,
    /show\s+me\s+(?:my\s+)?notes?(?:\s+|\s*about|\s*on|\s*regarding)\s+(.+)/i,
    /what\s+notes?(?:\s+do\s+i\s+have)?(?:\s*about|\s*on|\s*regarding)\s+(.+)/i,
    /remember\s+(?:anything\s+about\s+)?(.+)/i,
    /my\s+notes\s+on\s+(.+)/i,
    /notes\s+about\s+(.+)/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return message.trim();
}

// All XML-like tags that free models (Llama, Gemini, Qwen) emit internally.
const MODEL_INTERNAL_TAGS = [
  'thinking', 'thought', 'tool', 'tool_call', 'tool_use', 'tool_result',
  'result', 'output', 'answer', 'reasoning', 'reflection', 'scratchpad',
  'system', 'context', 'instruction', 'plan', 'step',
];

function extractThinking(message: string): { thinking: string; cleanText: string } {
  if (typeof message !== 'string') return { thinking: '', cleanText: '' };

  let thinking = '';
  let cleanText = message;

  // 1. Extract content inside <thinking> for display in the thinking layer
  const thinkMatch = cleanText.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  if (thinkMatch) thinking = thinkMatch[1].trim();

  // 2. Remove all closed blocks for every known internal tag
  for (const tag of MODEL_INTERNAL_TAGS) {
    cleanText = cleanText.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
  }

  // 3. Remove any streaming-open tags (no closing tag yet) — truncate from there
  for (const tag of MODEL_INTERNAL_TAGS) {
    const idx = cleanText.search(new RegExp(`<${tag}[\\s>]`, 'i'));
    if (idx !== -1) cleanText = cleanText.slice(0, idx);
  }

  // 4. Remove any stray opening/closing tags of the internal list
  for (const tag of MODEL_INTERNAL_TAGS) {
    cleanText = cleanText.replace(new RegExp(`<\\/?${tag}[^>]*>`, 'gi'), '');
  }

  // 5. Remove any partial malformed tag artifacts at start of lines (e.g. "<th<tool", "<th>")
  cleanText = cleanText.replace(/^<[^>\n]{0,40}$/gm, '');

  // 6. Collapse excess blank lines
  cleanText = cleanText.replace(/\n{3,}/g, '\n\n').trim();

  return { thinking, cleanText };
}

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

interface AgentMessage {
  id: number;
  type: 'agent';
  role: 'assistant';
  notes?: any[];
  content: {
    text: string;
    list: string[];
    footer: string;
  } | string;
  time: string;
  meta?: {
    actionType?: 'notes' | 'email' | 'general' | string;
    notesResult?: any;
    emailResult?: any;
    mission?: any;
    agentProcess?: any;
    completedSteps?: string[];
    thinkingBlocks?: ThinkingBlock[];
    internalThought?: string;
    isStreaming?: boolean;
    actionHistory?: any[];
    taskList?: TaskList;
    agentSteps?: AgentStep[];
    agentNarratives?: AgentNarrative[];
    agentRunId?: string;
    agentDurationMs?: number;
    result?: {
      type: string;
      title: string;
      canvasData: any;
    };
    limitReached?: boolean;
    usageData?: any;
    canvasApproval?: {
      status: 'pending' | 'accepted' | 'declined';
      title?: string;
      description?: string;
      canvasData?: any;
      canvasType?: string;
    };
    searchSessions?: SearchSession[];
    planArtifact?: any; // Phase 2: Plan artifact for execution
    executionResult?: any; // Phase 1: Execution gateway result
    error?: any; // Phase 1: Error with recovery hints
    recoveryHint?: any; // Phase 1: Error recovery guidance
    externalRefs?: any; // Phase 1: External references from execution
    requiresRetry?: boolean; // Phase 1: Whether retry is required
    liveThinking?: string;
    thinkingComplete?: boolean;
    draftReply?: {
      content: string;
      recipientEmail: string;
      recipientName: string;
      senderName: string;
      subject: string;
      threadId?: string;
    };
    planCard?: PlanCardData;
    planIntro?: string;
    hasError?: boolean;
    errorMessage?: string;
    searchExecution?: {
      mainQuery: string;
      subQueries: Array<{
        id: string;
        query: string;
        status: 'pending' | 'running' | 'completed' | 'error';
        results?: number;
      }>;
      sources: Array<{
        id: string;
        title: string;
        url?: string;
        icon?: string;
        snippet?: string;
        type: 'web' | 'email' | 'document' | 'calendar' | 'database';
        connectorId?: string;
      }>;
      answer?: string;
      isSearching: boolean;
    };
    suggestions?: string[];
    canvasExpansion?: boolean; // Phase 2: Whether to show canvas expansion prompt
    continueClicked?: boolean; // Whether the 'Continue' button after credit replenishment was clicked
    connectorRequired?: {
      connectors: ConnectorRequiredEntry[];
      waitingForUser?: boolean;
      dismissed?: boolean;
    };
  };
}

interface UserMessage {
  id: number;
  type: 'user';
  role: 'user';
  notes?: any[];
  content: string;
  time: string;
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
}

type Message = AgentMessage | UserMessage;



interface ChatInterfaceProps {
  initialConversationId?: string | null;
  onConversationSelect?: (conversationId: string) => void;
  onNewChat?: () => void;
  onConversationDelete?: (conversationId: string) => void;
  isEmbedded?: boolean;
}

// Global styles for custom scrollbar and typography
const NoScrollbarStyles = () => (
  <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
    
    body {
      font-family: 'Montserrat', sans-serif !important;
    }

    .arcus-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .arcus-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .arcus-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }
    .arcus-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .arcus-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
    }
    .no-scrollbar::-webkit-scrollbar {
      display: none !important;
    }
    .no-scrollbar {
      -ms-overflow-style: none !important; /* IE and Edge */
      scrollbar-width: none !important; /* Firefox */
    }
  `}</style>
);


function AgentThinkingSection({ content, isComplete }: { content: string, isComplete?: boolean }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!content) return null;

  return (
    <div className="flex flex-col gap-3 mt-4 mb-2 relative">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          {!isComplete ? (
            /* Minimal glowing orb — single dot + single pulse ring */
            <div className="relative flex-shrink-0 w-4 h-4 flex items-center justify-center">
              {/* Pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-full border border-white/25"
                animate={{ scale: [1, 1.7, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
              />
              {/* Soft ambient glow */}
              <motion.div
                className="absolute inset-[-3px] rounded-full bg-white/8 blur-sm"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              />
              {/* Core dot */}
              <motion.div
                className="w-2 h-2 rounded-full bg-white z-10"
                animate={{ opacity: [0.7, 1, 0.7], scale: [0.9, 1.05, 0.9] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              />
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
            </motion.div>
          )}

          <div className="flex items-center gap-1.5 ml-0.5">
            {!isComplete ? (
              <motion.span
                animate={{ opacity: [0.5, 0.9, 0.5] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="text-[11px] font-medium text-white/60 tracking-widest select-none uppercase"
              >
                Thinking
              </motion.span>
            ) : (
              <motion.span
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[11px] font-medium text-white/20 tracking-widest select-none uppercase"
              >
                Thought
              </motion.span>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white/10 hover:text-white/30 transition-colors"
            >
              <motion.div animate={{ rotate: isOpen ? 90 : 0 }}>
                <ChevronRight className="w-3.5 h-3.5" />
              </motion.div>
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "pl-6 border-l border-white/[0.05] py-0.5 transition-all",
                isComplete ? "opacity-70" : "opacity-100"
              )}
            >
              {content === 'SKELETON' ? (
                <div className="py-2" />
              ) : (
                <div className={cn(
                  "text-[13px] leading-relaxed italic font-normal tracking-tight markdown-thought",
                  isComplete ? "text-white/50" : "text-white/70"
                )}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      ...MarkdownComponents,
                      // Override some components for a more subtle "thought" look
                      h1: ({ children }: any) => <h1 className="text-base font-bold text-white/60 mb-2 mt-4 first:mt-0 uppercase tracking-widest">{children}</h1>,
                      h2: ({ children }: any) => <h2 className="text-sm font-bold text-white/50 mb-1.5 mt-3">{children}</h2>,
                      h3: ({ children }: any) => <h3 className="text-xs font-bold text-white/40 mb-1 mt-2">{children}</h3>,
                      p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                      ul: ({ children }: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-white/40">{children}</ul>,
                      ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-white/40">{children}</ol>,
                      hr: () => <hr className="my-4 border-0 h-px bg-white/[0.05]" />,
                      table: ({ children }: any) => (
                        <div className="my-4 w-full overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.01]">
                          <table className="w-full border-collapse text-[12px] text-left">
                            {children}
                          </table>
                        </div>
                      ),
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


function AgentTaskPill({ step }: { step: AgentStep }) {
  const getIcon = () => {
    switch (step.tool) {
      case 'search_gmail':
      case 'search_inbox':
        return <Search className="w-3.5 h-3.5" />;
      case 'read_email':
      case 'read_browser_page':
        return <Compass className="w-3.5 h-3.5" />;
      case 'get_sent_emails':
      case 'save_draft':
      case 'draft_reply':
        return <Mail className="w-3.5 h-3.5" />;
      case 'send_email':
        return <Send className="w-3.5 h-3.5" />;
      case 'schedule_meeting':
      case 'get_calendar_events':
        return <Calendar className="w-3.5 h-3.5" />;
      case 'web_search':
      case 'search_web':
        return <Globe className="w-3.5 h-3.5" />;
      case 'search_notion':
        return <FileText className="w-3.5 h-3.5" />;
      case 'open_canvas':
        return <Zap className="w-3.5 h-3.5" />;
      case 'send_slack_message':
        return <MessageSquare className="w-3.5 h-3.5" />;
      default:
        return <Terminal className="w-3.5 h-3.5" />;
    }
  };

  const contextLine = step.context || step.params?.query || step.params?.subject || step.params?.title || '';

  return (
    <div className={cn(
      "flex flex-col gap-0.5 px-3 py-1.5 rounded-2xl w-fit mt-2 group/pill transition-all border",
      step.status === 'active'
        ? "bg-white/[0.06] border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.05)] overflow-hidden relative"
        : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/12"
    )}>
      {step.status === 'active' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent w-[200%]"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        />
      )}
      <div className="flex items-center gap-2.5 z-10 relative">
        <div className={cn(
          "flex items-center justify-center w-5 h-5 rounded-full border transition-all relative overflow-hidden flex-shrink-0",
          step.status === 'active'
            ? "bg-white/20 border-white/30 text-white shadow-[0_0_12px_rgba(255,255,255,0.4)]"
            : "bg-white/5 border-white/10 text-white/40 group-hover/pill:text-white group-hover/pill:border-white/20"
        )}>
          {step.status === 'active' && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-[200%]"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
          )}
          {getIcon()}
        </div>
        <div>
          {step.status === 'active' ? (
            <TextShimmer className="text-[13px] text-white/80 tracking-tight font-medium" duration={2}>
              {step.label}
            </TextShimmer>
          ) : (
            <span className="text-[13px] text-white/50 group-hover/pill:text-white/80 transition-colors tracking-tight font-medium">
              {step.label}
            </span>
          )}
        </div>
        {step.status === 'active' && (
          <div className="flex items-center gap-1 ml-1">
            <motion.div className="w-1 h-1 rounded-full bg-white/40" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, times: [0, 0.5, 1] }} />
            <motion.div className="w-1 h-1 rounded-full bg-white/40" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.3, times: [0, 0.5, 1] }} />
            <motion.div className="w-1 h-1 rounded-full bg-white/40" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.6, times: [0, 0.5, 1] }} />
          </div>
        )}
        {step.status === 'completed' && (
          <Check className="w-3 h-3 text-green-400/50 ml-1" />
        )}
      </div>
      {/* Context line — query/subject being searched */}
      {contextLine && (
        <p className={cn(
          "text-[11px] pl-7 leading-tight truncate max-w-[280px]",
          step.status === 'active' ? "text-white/35 italic" : "text-white/20"
        )}>
          {contextLine}
        </p>
      )}
      {/* Result snippet — shown when completed */}
      {step.status === 'completed' && step.summary && (
        <p className="text-[11px] pl-7 text-white/25 leading-tight line-clamp-2 max-w-[280px]">
          {step.summary}
        </p>
      )}
    </div>
  );
}

// ─── Collapsible Execution Steps wrapper ─────────────────────────────────────
function CollapsibleSteps({
  steps,
  narratives,
  isActive,
  runId,
  totalDurationMs,
}: {
  steps: AgentStep[];
  narratives?: AgentNarrative[];
  isActive: boolean;
  runId?: string;
  totalDurationMs?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (!steps || steps.length === 0) return null;

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const totalCount = steps.length;

  return (
    <div className="mb-2">
      {/* Toggle row */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center gap-1.5 text-white/25 hover:text-white/50 transition-colors mb-2 group/toggle"
      >
        <ChevronDown
          className={cn(
            'w-3 h-3 transition-transform duration-200',
            collapsed ? '-rotate-90' : 'rotate-0',
          )}
        />
        <span className="text-[11px] font-mono tracking-wide">
          {collapsed
            ? `${totalCount} step${totalCount !== 1 ? 's' : ''}`
            : isActive
            ? `${completedCount} / ${totalCount} steps`
            : `${totalCount} step${totalCount !== 1 ? 's' : ''} completed`}
        </span>
        {isActive && (
          <motion.span
            className="inline-block w-1 h-1 rounded-full bg-white/35"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          />
        )}
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <AgentExecutionTimeline
              steps={steps}
              narratives={narratives}
              isActive={isActive}
              runId={runId}
              totalDurationMs={totalDurationMs}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Arcus Error Card ──────────────────────────────────────────────────────────
function ArcusErrorCard({ errorMessage, onRetry }: { errorMessage?: string; onRetry: () => void }) {
  const [retrying, setRetrying] = useState(false);

  // Auto-retry once after a short delay when models are rate-limited
  const isExhausted = errorMessage?.toLowerCase().includes('exhausted') || errorMessage?.toLowerCase().includes('timed out');
  useEffect(() => {
    if (isExhausted && !retrying) {
      const t = setTimeout(() => {
        setRetrying(true);
        onRetry();
      }, 3000);
      return () => clearTimeout(t);
    }
  }, []);

  const handleRetry = () => {
    setRetrying(true);
    onRetry();
  };

  const subtitle = isExhausted
    ? 'AI models are under heavy load. Retrying automatically…'
    : errorMessage && errorMessage.length < 120
      ? errorMessage
      : 'Something went wrong. Please refresh or try again.';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 24, stiffness: 280 }}
      className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-2xl bg-[#1a1a1a] border border-white/[0.08] w-full max-w-md mt-1"
    >
      <div className="flex items-start gap-3">
        {/* Warning icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center mt-0.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white/80 leading-tight">Arcus was unable to reply.</p>
          <p className="text-[12px] text-white/35 mt-0.5 leading-snug">{subtitle}</p>
        </div>
      </div>

      {/* Retry button */}
      <button
        onClick={handleRetry}
        disabled={retrying}
        className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        {retrying ? (
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        )}
        Retry
      </button>
    </motion.div>
  );
}

// --- Premium Components for Action Buttons ---
const UserMessageCopyButton = ({ msg }: { msg: Message }) => {
  const [isCopied, setIsCopied] = useState(false);
  const handleCopy = () => {
    const text = typeof msg.content === 'string' ? msg.content : msg.content.text;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success("Message copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 opacity-0 group-hover/msg:opacity-100 transition-all shadow-lg backdrop-blur-md"
      title="Copy message"
    >
      <AnimatePresence mode="wait">
        {isCopied ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="check">
            <Check className="w-3.5 h-3.5 text-green-400" />
          </motion.div>
        ) : (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="copy">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};


const MessageActionButtons = ({ msg, onFeedback, onRegenerate, isLoading, onShare }: { msg: Message, onFeedback: (type: 'like' | 'dislike', id: string | number) => void, onRegenerate: (id: number) => void, isLoading: boolean, onShare?: () => Promise<string | null> }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleCopy = () => {
    const text = typeof msg.content === 'string' ? msg.content : msg.content.text;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success("Content copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!onShare) return;
    setIsShared(true);
    try {
      const shareUrl = await onShare();
      if (shareUrl) {
        navigator.clipboard.writeText(shareUrl);
        toast.success(
          <div className="flex flex-col gap-0.5">
            <p className="font-bold text-[13px]">Copied link to clipboard.</p>
            <p className="text-white/40 text-[11px]">Shared links can be viewed by anyone with the link.</p>
          </div>,
          { duration: 4000 }
        );
      } else {
        toast.error("Failed to generate share link.");
        setIsShared(false);
        return;
      }
    } catch {
      toast.error("Failed to generate share link.");
      setIsShared(false);
      return;
    }
    setTimeout(() => setIsShared(false), 3000);
  };

  const handleLike = () => {
    setIsLiked(true);
    onFeedback('like', msg.id.toString());
    setTimeout(() => setIsLiked(false), 1500);
  };

  const handleDislike = () => {
    setIsDisliked(true);
    onFeedback('dislike', msg.id.toString());
    setTimeout(() => setIsDisliked(false), 1500);
  };

  // Regenerate spin animation is driven by onRegenerate triggering the modal

  return (
    <div className={cn("mt-5 flex items-center gap-2 transition-opacity", isLoading ? "opacity-30 pointer-events-none" : "group-hover/msg:opacity-100")}>
      <div className="flex items-center gap-1.5 p-1.5 bg-white/[0.02] border border-white/[0.05] rounded-full backdrop-blur-md">
        {/* Copy Button */}
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              onClick={handleCopy}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-all text-white/40 hover:text-white relative"
            >
              <AnimatePresence mode="wait">
                {isCopied ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="check">
                    <Check className="w-4 h-4 text-green-400" />
                  </motion.div>
                ) : (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="copy">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-[#1a1a1a] border-white/10 text-white rounded-xl px-3 py-2 shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold">Copy text</span>
              <span className="text-white/20 text-[10px] font-mono">⌘C</span>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Share Button */}
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              onClick={handleShare}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-full transition-all relative",
                isShared ? "bg-white/10 text-white" : "hover:bg-white/10 text-white/40 hover:text-white"
              )}
            >
              <AnimatePresence mode="wait">
                {isShared ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="check-share">
                    <Check className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key="share">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-[#1a1a1a] border-white/10 text-white rounded-xl px-3 py-2 shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold">Share link</span>
              <span className="text-white/20 text-[10px] font-mono">⌘L</span>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Like Button */}
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              onClick={handleLike}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-all text-white/40 hover:text-white"
            >
              <motion.div
                animate={isLiked ? { scale: [1, 1.3, 1], color: '#4ade80' } : {}}
                transition={{ duration: 0.4 }}
              >
                <svg className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
              </motion.div>
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-[#1a1a1a] border-white/10 text-white rounded-xl px-3 py-2 shadow-2xl">
            <span className="text-[11px] font-bold">Helpful</span>
          </TooltipContent>
        </Tooltip>

        {/* Dislike Button */}
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              onClick={handleDislike}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-all text-white/40 hover:text-white"
            >
              <motion.div
                animate={isDisliked ? { scale: [1, 1.3, 1], color: '#f87171' } : {}}
                transition={{ duration: 0.4 }}
              >
                <svg className="w-4 h-4" fill={isDisliked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" /></svg>
              </motion.div>
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-[#1a1a1a] border-white/10 text-white rounded-xl px-3 py-2 shadow-2xl">
            <span className="text-[11px] font-bold">Not helpful</span>
          </TooltipContent>
        </Tooltip>

        {/* Regenerate Button */}
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onRegenerate(msg.id as number)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-all text-white/40 hover:text-white"
            >
              <motion.div
                animate={isRegenerating ? { rotate: 360 } : {}}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </motion.div>
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-[#1a1a1a] border-white/10 text-white rounded-xl px-3 py-2 shadow-2xl">
            <span className="text-[11px] font-bold">Regenerate</span>
          </TooltipContent>
        </Tooltip>
      </div>

      {(msg as any).meta?.durationMs && (
        <span className="text-[10px] font-mono text-white/20 ml-2">
          {(((msg as any).meta.durationMs) / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
};

export default function ChatInterface({
  initialConversationId = null,
  onConversationSelect,
  onNewChat,
  onConversationDelete,
  isEmbedded = false
}: ChatInterfaceProps) {
  type LiveThinkingStep = {
    id: string;
    label: string;
    status: 'pending' | 'active' | 'completed' | 'error';
    type: 'think' | 'search' | 'read' | 'analyze' | 'draft' | 'execute';
  };

  const router = useRouter();
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [newMessageIds, setNewMessageIds] = useState<Set<number>>(new Set());
  const [regenerateModal, setRegenerateModal] = useState<{ isOpen: boolean, msgId: number | null }>({ isOpen: false, msgId: null });
  const [isInitialMode, setIsInitialMode] = useState<boolean>(!initialConversationId);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState<number>(0);
  const [isUsageLimitModalOpen, setIsUsageLimitModalOpen] = useState(false);
  const [usageLimitModalData, setUsageLimitModalData] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(initialConversationId || null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [conversations, setConversations] = useState<{ [key: string]: Message[] }>({});
  const [isNewConversation, setIsNewConversation] = useState<boolean>(!initialConversationId);
  const [selectedEmails, setSelectedEmails] = useState<Email[]>([]);
  const [chatTitle, setChatTitle] = useState<string>('');
  const [suggestionInput, setSuggestionInput] = useState<{ text: string; id: number } | undefined>(undefined);
  const [isTitleMenuOpen, setIsTitleMenuOpen] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const titleMenuRef = useRef<HTMLDivElement>(null);

  // Close title menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (titleMenuRef.current && !titleMenuRef.current.contains(event.target as Node)) {
        setIsTitleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState<boolean>(false);

  // Auto-open the connectors modal when we land back from an OAuth redirect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'connected') {
      setIsIntegrationsModalOpen(true);
      // Strip the query params so a refresh doesn't re-trigger the modal
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  const [isEmailSelectionModalOpen, setIsEmailSelectionModalOpen] = useState<boolean>(false);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState<boolean>(false);
  const [isPersonalityModalOpen, setIsPersonalityModalOpen] = useState(false);
  const [savedPersonality, setSavedPersonality] = useState<string>('');
  const [gmailAccessToken, setGmailAccessToken] = useState<string | null>(null);
  const [gmailTokenSource, setGmailTokenSource] = useState<string | null>(null);
  const [isNotesQuery, setIsNotesQuery] = useState<boolean>(false);
  const [notesSearchQuery, setNotesSearchQuery] = useState<string>('');
  const [showNotesFetching, setShowNotesFetching] = useState<boolean>(false);
  const [notesResults, setNotesResults] = useState<any[]>([]);

  // Arcus V2 State
  const [activeMission, setActiveMission] = useState<any>(null);
  const [liveThinkingBlocks, setLiveThinkingBlocks] = useState<ThinkingBlock[]>([]);
  const [currentThought, setCurrentThought] = useState<string | undefined>(undefined);
  const [pendingReplyProposal, setPendingReplyProposal] = useState<any>(null);

  // Arcus view mode: 'feed' (default) or 'plan_mode' (daily brief)
  const [arcusView, setArcusView] = useState<'feed' | 'plan_mode'>('feed');
  const [dashboardTab, setDashboardTab] = useState<'home' | 'agents'>('home');

  // Arcus V3 Plan Mode Brief
  const {
    brief: planModeBrief,
    briefDate: planModeBriefDate,
    isLoading: isPlanModeLoading,
    generateNew: generateNewBrief,
  } = usePlanModeBrief();

  // Arcus V3 Reactive Feed — surfaces webhook-driven plans in the chat
  const {
    activePlans: v3ActivePlans,
    completedPlans: v3CompletedPlans,
    buildPlan: v3BuildPlan,
    executePlan: v3ExecutePlan,
    dismissPlan: v3DismissPlan,
    refresh: v3Refresh,
  } = useArcusV3Feed({
    enabled: true,
    pollInterval: 30000,
    onNewPlan: (plan) => {
      toast.info(`Arcus detected: ${plan.title}`, {
        description: plan.objective?.substring(0, 80),
        duration: 5000,
      });
    },
  });

  // Live thinking state (AI-generated, shown during loading)
  const [searchSessions, setSearchSessions] = useState<SearchSession[]>([]);

  // ... (inside the component)

  const normalizeIntentPlanBlock = (plan: any[], initialResponse?: string): ThinkingBlock => {
    return {
      id: 'main-work',
      title: plan[0]?.description || 'Executing requested task',
      status: 'active',
      initialContext: initialResponse,
      steps: plan.map((step: any, index: number) => ({
        id: `live-${step.step || index}`,
        label: step.action || step.description || `Working on step ${index + 1}`,
        status: 'pending' as const,
        type: (step.type || 'think') as any
      }))
    };
  };
  const [isThinkingStepsOpen, setIsThinkingStepsOpen] = useState<boolean>(false);

  // Canvas Panel state
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [showArtifactsPanel, setShowArtifactsPanel] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean, type: 'like' | 'dislike', msgId: string | number | null }>({ isOpen: false, type: 'like', msgId: null });
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [isCanvasExecuting, setIsCanvasExecuting] = useState(false);
  const [activeRun, setActiveRun] = useState<{ runId: string; status?: string; phase?: string } | null>(null);
  const [isProcessingPlan, setIsProcessingPlan] = useState(false);
  const [isDeepThinkingState, setIsDeepThinkingState] = useState<boolean>(false);
  const [isSearchingState, setIsSearchingState] = useState<boolean>(false);

  // Agent Loop execution timeline state (Phase 2)
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [isAgentLoopActive, setIsAgentLoopActive] = useState(false);
  const [liveTaskList, setLiveTaskList] = useState<TaskList | null>(null);
  const [agentRunMeta, setAgentRunMeta] = useState<{ runId?: string; totalDurationMs?: number } | null>(null);
  const [liveActivityLine, setLiveActivityLine] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [userName, setUserName] = useState<string>('User');
  const [emailStats, setEmailStats] = useState({
    total: 0,
    drafted: 0,
    archived: 0,
    flagged: 0,
  });

  const [meetings, setMeetings] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [scheduledAgents, setScheduledAgents] = useState<any[]>([]);
  const [isDashboardDataLoading, setIsDashboardDataLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const res = await fetch('/api/agent-talk/dashboard');
        if (res.ok) {
          const data = await res.json();
          if (data.userName) setUserName(data.userName.trim());
          setEmailStats(data.emailStats || emailStats);
          setMeetings(data.meetings || []);
          setActionItems(data.actionItems || []);
          setScheduledAgents(data.agents || []);
        }
      } catch (e) {
        console.error('Failed to fetch dashboard data', e);
      } finally {
        setIsDashboardDataLoading(false);
      }
    }
    fetchDashboardData();
  }, []);



  // Subscription state - to hide upgrade button for Pro users
  const [currentPlan, setCurrentPlan] = useState<'free' | 'starter' | 'pro' | 'none' | null>(null);
  const [isSharingGlobal, setIsSharingGlobal] = useState(false);
  // Audio & Notification State
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sync notification state and request permission
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedNotify = localStorage.getItem('arcus_notifications_enabled') === 'true';
      const savedSound = localStorage.getItem('arcus_sound_enabled') !== 'false';

      setNotificationsEnabled(savedNotify && NotificationService.permission === 'granted');
      setSoundEnabled(savedSound);
      audioRuntime.setEnabled(savedSound);
    }
  }, []);

  const toggleNotifications = async () => {
    const isGranted = await NotificationService.requestPermission();
    if (isGranted) {
      setNotificationsEnabled(true);
      localStorage.setItem('arcus_notifications_enabled', 'true');
    }
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    audioRuntime.setEnabled(newState);
    localStorage.setItem('arcus_sound_enabled', String(newState));
  };

  // Global Click Sound Listener
  const isMountedRef = useRef(false);
  useEffect(() => {
    // Small delay to prevent sounds on initial mount/auto-navigation
    const timer = setTimeout(() => {
      isMountedRef.current = true;
    }, 500);

    const handleGlobalClick = (e: MouseEvent) => {
      if (!isMountedRef.current) return;

      const target = e.target as HTMLElement;
      // Play sound if clicking a button, link, or role="button"
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.getAttribute('role') === 'button' ||
        target.closest('.interactive-card')
      ) {
        audioRuntime.playClick();
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [soundEnabled]);

  const [arcusCredits, setArcusCredits] = useState<{
    usage: number;
    limit: number;
    remaining: number;
    period: 'daily' | 'monthly';
    isUnlimited?: boolean;
  } | null>(null);

  const canvasResolversRef = useRef<Record<number, (approved: boolean) => void>>({});

  const handleAcceptCanvas = useCallback((msgId: number) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.type === 'agent') {
        const agentMsg = m as AgentMessage;
        if (agentMsg.meta?.canvasApproval) {
          const approval = agentMsg.meta.canvasApproval;
          if (approval.canvasData) {
            setCanvasData(approval.canvasData);
            setIsCanvasOpen(true);
          }
          return {
            ...agentMsg,
            meta: {
              ...agentMsg.meta,
              canvasApproval: { ...approval, status: 'accepted' as const }
            }
          } as AgentMessage;
        }
      }
      return m;
    }));

    if (canvasResolversRef.current[msgId]) {
      canvasResolversRef.current[msgId](true);
      delete canvasResolversRef.current[msgId];
    }

    toast.success('Mission accepted', { description: 'Opening Arcus Workspace...' });
    
    // Resume agent loop with approval
    setTimeout(() => {
      processAgentLoopMessage("I approve opening the canvas. Please proceed with the task in the canvas.", currentConversationId as string, false);
    }, 500);
  }, [currentConversationId]);

  const handleDeclineCanvas = useCallback((msgId: number) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.type === 'agent') {
        const agentMsg = m as AgentMessage;
        if (agentMsg.meta?.canvasApproval) {
          return {
            ...agentMsg,
            meta: {
              ...agentMsg.meta,
              canvasApproval: { ...agentMsg.meta.canvasApproval, status: 'declined' as const }
            }
          } as AgentMessage;
        }
      }
      return m;
    }));

    if (canvasResolversRef.current[msgId]) {
      canvasResolversRef.current[msgId](false);
      delete canvasResolversRef.current[msgId];
    }

    toast.info('Mission declined', { description: 'Continuing in chat mode.' });

    // Resume agent loop with denial
    setTimeout(() => {
      processAgentLoopMessage("I decline opening the canvas. Please proceed with the task in plain chat.", currentConversationId as string, false);
    }, 500);
  }, [currentConversationId]);

  const handleContinueWithCredits = useCallback((msgId: number) => {
    // 1. Mark this message as continued to avoid double-clicks
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.type === 'agent') {
        return { ...m, meta: { ...(m as AgentMessage).meta, continueClicked: true } };
      }
      return m;
    }));

    // 2. Add the "Continue" message to the UI
    const continueMsg: UserMessage = {
      id: Date.now(),
      type: 'user',
      role: 'user',
      content: "Continue",
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    };
    setMessages(prev => [...prev, continueMsg]);

    // 3. Trigger the AI
    if (currentConversationId) {
      processAIMessage("Continue", currentConversationId, false);
    }
  }, [currentConversationId]);

  const handleRegenerateClick = (msgId: number) => {
    setRegenerateModal({ isOpen: true, msgId });
  };

  const handleConfirmRegenerate = () => {
    const msgId = regenerateModal.msgId;
    if (msgId === null) return;

    // 1. Find the assistant message
    const assistantMsgIndex = messages.findIndex(m => m.id === msgId);
    if (assistantMsgIndex === -1) return;

    // 2. Find preceding user message
    const userMsgIndex = assistantMsgIndex - 1;
    if (userMsgIndex < 0 || messages[userMsgIndex].role !== 'user') {
      toast.error("Could not find original request to regenerate.");
      setRegenerateModal({ isOpen: false, msgId: null });
      return;
    }

    const userMsg = messages[userMsgIndex] as UserMessage;
    const messageText = userMsg.content;
    const attachments = userMsg.attachments;

    // 3. Remove assistant message
    const newMessages = messages.slice(0, assistantMsgIndex);
    setMessages(newMessages);

    // 4. Update localStorage
    if (currentConversationId) {
      const existingConversationRaw = localStorage.getItem(`conversation_${currentConversationId}`);
      if (existingConversationRaw) {
        try {
          const existingData = JSON.parse(existingConversationRaw);
          existingData.messages = newMessages;
          localStorage.setItem(`conversation_${currentConversationId}`, JSON.stringify(existingData));
        } catch (e) {
          console.error('Error updating storage for regeneration:', e);
        }
      }
    }

    // 5. Close modal and trigger AI
    setRegenerateModal({ isOpen: false, msgId: null });
    processAIMessage(messageText, currentConversationId as string, false, attachments);
  };

  const refreshArcusCredits = useCallback(async (showToast = false) => {
    try {
      const res = await fetch('/api/subscription/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureType: 'arcus_ai', increment: false })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) return;

      const period: 'daily' | 'monthly' = data.period === 'monthly' ? 'monthly' : 'daily';
      const next: {
        usage: number;
        limit: number;
        remaining: number;
        period: 'daily' | 'monthly';
        isUnlimited?: boolean;
      } = {
        usage: Number(data.usage) || 0,
        limit: Number(data.limit) || 0,
        remaining: Number(data.remaining) || 0,
        period,
        isUnlimited: !!data.isUnlimited
      };

      setArcusCredits(next);

      if (showToast && !next.isUnlimited && next.limit > 0) {
        toast.success('Credits Updated', {
          description: `Arcus AI: ${next.usage}/${next.limit} used (${next.remaining} left ${next.period === 'daily' ? 'today' : 'this month'})`
        });
      }
    } catch {
      // ignore
    }
  }, []);


  // Fetch subscription status on mount and activate pending plans
  useEffect(() => {
    const fetchAndActivateSubscription = async () => {
      try {
        // First, check if there's a pending plan that needs activation (user returned from Whop)
        const pendingPlan = localStorage.getItem('pending_plan');
        const pendingTimestamp = localStorage.getItem('pending_plan_timestamp');

        // If there's a pending plan from less than 1 hour ago, activate it
        if (pendingPlan && pendingTimestamp) {
          const timestamp = parseInt(pendingTimestamp);
          const oneHourAgo = Date.now() - (60 * 60 * 1000);

          if (timestamp > oneHourAgo) {
            console.log('🔄 Found pending plan, activating:', pendingPlan);

            // Activate the subscription
            const activateResponse = await fetch('/api/subscription/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ planType: pendingPlan })
            });

            if (activateResponse.ok) {
              console.log('✅ Subscription activated successfully!');
              // Clear pending plan after successful activation
              localStorage.removeItem('pending_plan');
              localStorage.removeItem('pending_plan_timestamp');
            }
          } else {
            // Pending plan is too old, clear it
            localStorage.removeItem('pending_plan');
            localStorage.removeItem('pending_plan_timestamp');
          }
        }

        // Now fetch current subscription status
        const response = await fetch('/api/subscription/status');
        if (response.ok) {
          const data = await response.json();
          if (data.subscription?.hasActiveSubscription || data.subscription?.planType === 'free') {
            setCurrentPlan(data.subscription.planType as 'free' | 'starter' | 'pro');
          } else {
            setCurrentPlan('none');
          }
        }

        await refreshArcusCredits(false);
      } catch (error) {
        console.error('Error in subscription flow:', error);
        setCurrentPlan('none');
      }
    };
    fetchAndActivateSubscription();
  }, []);

  const [showDraftBox, setShowDraftBox] = useState<boolean>(false);

  // Integration status
  const [integrations, setIntegrations] = useState<{
    gmail: boolean;
    'google-calendar': boolean;
    'google-meet': boolean;
  }>({
    gmail: false,
    'google-calendar': false,
    'google-meet': false
  });

  // --- Helper Functions (Hoisted up for usage in useEffect) ---

  const generateConversationId = () => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    return `conv_${timestamp}_${randomStr}`;
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:*/ *;base64, prefix for the raw base64 if needed, 
        // but for OpenRouter it's usually better to keep the data URL or just the base64.
        // Let's keep the full data URL for now.
        resolve(result);
      };
      reader.onerror = error => reject(error);
    });
  };

  const saveConversationToStorage = (conversationId: string, messages: Message[], title: string) => {
    const accurateMessageCount = messages.length;
    const conversationData = {
      id: conversationId,
      title: title,
      messages: messages,
      lastUpdated: new Date().toISOString(),
      messageCount: accurateMessageCount
    };
    localStorage.setItem(`conversation_${conversationId}`, JSON.stringify(conversationData));
    localStorage.setItem(`conv_${conversationId}_title`, title);
  };

  // Generate AI-powered chat title based on user's first message
  const generateChatTitle = async (userMessage: string): Promise<string> => {
    try {
      const response = await fetch('/api/agent-talk/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.title && data.title.length > 0) {
          console.log('🏷️ AI-generated chat title:', data.title);
          setChatTitle(data.title);
          return data.title;
        }
      }
    } catch (error) {
      console.error('Error generating chat title:', error);
    }

    // Fallback: Use first words of message
    const fallbackTitle = userMessage.trim().split(' ').slice(0, 5).join(' ');
    return fallbackTitle.length > 40 ? fallbackTitle.substring(0, 40) + '...' : fallbackTitle;
  };

  const handleGlobalShare = async () => {
    if (messages.length === 0) {
      toast.error("Nothing to share yet. Start a conversation first!");
      return;
    }

    setIsSharingGlobal(true);
    try {
      const response = await fetch('/api/agent-talk/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConversationId,
          messages: messages,
          title: chatTitle
        })
      });

      if (!response.ok) throw new Error("Failed to generate share link");

      const data = await response.json();
      const shareUrl = data.shareUrl;

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      
      toast.success("Share link copied!", {
        description: "Anyone with this link can view this conversation."
      });
    } catch (error) {
      console.error('Share error:', error);
      toast.error("Could not generate share link. Please try again.");
    } finally {
      setIsSharingGlobal(false);
    }
  };

  const buildFallbackThinkingBlocks = (messageText: string): ThinkingBlock[] => {
    const emailRelated = isEmailRelatedQuery(messageText);
    const notesRelated = isNotesRelatedQuery(messageText);

    return [{
      id: 'fallback-block',
      title: 'Planning and initialization',
      status: 'active',
      initialContext: 'Identifying the most efficient roadmap to fulfill your objective...',
      steps: [
        { id: 'fb-1', label: 'Analyzing intent', status: 'active', type: 'think' },
        { id: 'fb-2', label: notesRelated ? 'Retrieving notes' : emailRelated ? 'Searching Gmail' : 'Checking context', status: 'pending', type: emailRelated ? 'search' : 'read' }
      ]
    }];
  };

  const normalizeIntentPlanSteps = (plan: any[]): LiveThinkingStep[] =>
    plan.map((step: any, index: number) => ({
      id: `live-${step.step || index}`,
      label: step.description || step.action || `Working on step ${index + 1}`,
      status: index === 0 ? 'active' : 'pending',
      type: (step.type || 'think') as LiveThinkingStep['type']
    }));


  const formatStepEvidence = (evidence: any): string => {
    if (!evidence) return '';
    const items = Array.isArray(evidence) ? evidence : (Array.isArray(evidence.items) ? evidence.items : []);
    if (!items.length) return '';
    return items.slice(0, 4).map((item: any) => {
      const sender = item.sender || 'Unknown';
      const subject = item.subject || '';
      const thread = item.threadId ? ('Thread: ' + item.threadId) : '';
      return [sender, subject, thread].filter(Boolean).join(' | ');
    }).join('\\n');
  };

  const getStepLabel = (tool: string, params: any, status: 'active' | 'completed' | 'error') => {
    const isActive = status === 'active';
    switch (tool) {
      // Legacy tool names
      case 'search_inbox': return isActive ? `Searching emails${params?.query ? ` for "${params.query}"` : '...'}` : `Searched emails${params?.query ? ` for "${params.query}"` : ''}`;
      case 'search_web': return isActive ? `Researching web${params?.query ? ` for "${params.query}"` : '...'}` : `Researched web${params?.query ? ` for "${params.query}"` : ''}`;
      case 'read_browser_page': return isActive ? `Visiting ${params?.url || 'page'}...` : `Visited ${params?.url || 'page'}`;
      case 'save_draft': return isActive ? 'Drafting response...' : 'Drafted response';
      case 'create_note': return isActive ? 'Creating note...' : 'Created note';
      case 'search_notes': return isActive ? 'Searching notes...' : 'Searched notes';
      // New Arcus rebuild tool names
      case 'search_gmail': return isActive ? `Searching inbox${params?.query ? ` for "${params.query}"` : '...'}` : `Searched inbox${params?.query ? ` for "${params.query}"` : ''}`;
      case 'read_email': return isActive ? 'Reading email thread...' : 'Read email thread';
      case 'get_sent_emails': return isActive ? 'Analyzing your writing style...' : 'Analyzed writing style';
      case 'draft_reply': return isActive ? `Drafting reply${params?.subject ? ` to "${params.subject}"` : '...'}` : `Drafted reply${params?.subject ? ` to "${params.subject}"` : ''}`;
      case 'send_email': return isActive ? 'Sending email...' : 'Sent email';
      case 'schedule_meeting': return isActive ? `Scheduling meeting${params?.title ? ` "${params.title}"` : '...'}` : `Scheduled meeting${params?.title ? ` "${params.title}"` : ''}`;
      case 'get_calendar_events': return isActive ? 'Reading your calendar...' : 'Read calendar';
      case 'search_notion': return isActive ? `Searching Notion${params?.query ? ` for "${params.query}"` : '...'}` : `Searched Notion${params?.query ? ` for "${params.query}"` : ''}`;
      case 'open_canvas': return isActive ? `Opening canvas${params?.title ? ` "${params.title}"` : '...'}` : `Opened canvas${params?.title ? ` "${params.title}"` : ''}`;
      case 'web_search': return isActive ? `Searching web${params?.query ? ` for "${params.query}"` : '...'}` : `Searched web${params?.query ? ` for "${params.query}"` : ''}`;
      case 'send_slack_message': return isActive ? `Sending Slack message${params?.channel ? ` to ${params.channel}` : '...'}` : `Sent Slack message${params?.channel ? ` to ${params.channel}` : ''}`;
      default: return isActive ? `Running ${tool.replace(/_/g, ' ')}...` : `Completed ${tool.replace(/_/g, ' ')}`;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // AGENT LOOP — SSE-based agentic processing (Phase 1)
  // ═══════════════════════════════════════════════════════════════════════════
  const processAgentLoopMessage = async (messageText: string, conversationIdToUse: string, isNew: boolean, options: any = {}) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const assistantMsgId = Date.now() + 1;

    setIsLoading(true);
    setIsAgentLoopActive(true);
    setLiveActivityLine('');
    setAgentSteps([]);          // start empty — only tool_call events populate the timeline
    setLiveThinkingBlocks([]);
    setLiveTaskList(null);

    // Add placeholder assistant message
    const placeholderMsg: AgentMessage = {
      id: assistantMsgId,
      type: 'agent',
      role: 'assistant',
      content: { text: '', list: [], footer: '' },
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      meta: { actionType: 'agent_loop', isStreaming: true, liveThinking: 'Thinking...', agentSteps: [] }
    };
    setMessages(prev => [...prev, placeholderMsg]);

    // Build conversation history from current messages to give Arcus memory
    const history = messages
      .filter(m => m.id !== assistantMsgId && (m.role === 'user' || m.role === 'assistant'))
      .slice(-20)
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.role === 'user'
          ? ((m as UserMessage).content || '')
          : ((m as AgentMessage).content as any)?.text || '',
      }))
      .filter(h => h.content);

    try {
      const response = await fetch('/api/arcus/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversationId: conversationIdToUse,
          history,
          isPlanMode: options.isPlanMode || false,
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (errData?.error === 'limit_reached') {
          setUsageLimitModalData({ featureName: 'Ask AI', currentUsage: errData.usage || 0, limit: errData.limit || 0, period: errData.period || 'daily', currentPlan: errData.planType || 'starter' });
          setIsUsageLimitModalOpen(true);
        }
        throw new Error(errData.message || `Request failed (${response.status})`);
      }

      if (!response.body) throw new Error('No stream body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEventType = '';
      let finalContent = '';
      let finalProcessedText = '';
      let rawOutput = '';
      let stepIndex = 0;
      let streamFinishedNormally = false;
      let currentAgentSteps: AgentStep[] = [];       // populated only by tool_call events
      let currentAgentNarratives: AgentNarrative[] = []; // populated by narrative events
      let currentTaskList: TaskList | null = null;    // populated by task_list event

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
            continue;
          }
          if (!line.startsWith('data: ') || !currentEventType) continue;

          let data: any;
          try { data = JSON.parse(line.slice(6).trim()); } catch { continue; }

          switch (currentEventType) {
            case 'run_start':
              // No step added — just update the thinking label
              setMessages(msgs => msgs.map(m => {
                if (m.id !== assistantMsgId || m.type !== 'agent') return m;
                return { ...m, meta: { ...(m.meta || {}), liveThinking: 'Thinking...' } };
              }));
              break;

            case 'task_list': {
              if (Array.isArray(data.tasks) && data.tasks.length > 0) {
                currentTaskList = { tasks: data.tasks, completedCount: 0 };
                setLiveTaskList(currentTaskList);
                setMessages(msgs => msgs.map(m => {
                  if (m.id !== assistantMsgId || m.type !== 'agent') return m;
                  return { ...m, meta: { ...(m.meta || {}), taskList: currentTaskList! } };
                }));
              }
              break;
            }

            case 'task_progress': {
              const completed = typeof data.completedCount === 'number' ? data.completedCount : 0;
              if (currentTaskList) {
                currentTaskList = { tasks: currentTaskList.tasks, completedCount: completed };
                setLiveTaskList({ ...currentTaskList });
              }
              setMessages(msgs => msgs.map(m => {
                if (m.id !== assistantMsgId || m.type !== 'agent') return m;
                const existing = (m as AgentMessage).meta?.taskList;
                if (!existing) return m;
                return { ...m, meta: { ...(m.meta || {}), taskList: { ...existing, completedCount: completed } } };
              }));
              break;
            }

            case 'thinking': {
              // Only update the thinking text shown in AgentThinkingSection.
              // Never push thinking events into currentAgentSteps — they show in the timeline.
              const thinkStatus = data.status || data.step || 'Thinking...';
              setMessages(msgs => msgs.map(m => {
                if (m.id !== assistantMsgId || m.type !== 'agent') return m;
                return { ...m, meta: { ...(m.meta || {}), liveThinking: thinkStatus } };
              }));
              break;
            }

            case 'canvas': {
              // Tool produced canvas content — open the panel immediately
              const cv = data;
              if (cv?.title && cv?.markdown) {
                const canvasContent = cv.type === 'email_draft' && cv.draftMeta
                  ? cv.draftMeta
                  : cv.markdown;
                setCanvasData({ type: cv.type || 'notes', title: cv.title, content: canvasContent, raw: cv.markdown });
                setIsCanvasOpen(true);

                // Persist the canvas content + draft reply data on the active message meta
                setMessages(msgs => msgs.map(m => {
                  if (m.id !== assistantMsgId || m.type !== 'agent') return m;
                  const draftReply = cv.type === 'email_draft' && cv.draftMeta
                    ? {
                        content: cv.draftMeta.body || '',
                        recipientEmail: cv.draftMeta.to || '',
                        recipientName: cv.draftMeta.recipientName || cv.draftMeta.to?.split('@')[0] || 'Recipient',
                        senderName: userName,
                        subject: cv.draftMeta.subject || cv.title || '',
                        threadId: cv.draftMeta.threadId,
                      }
                    : undefined;
                  return {
                    ...m,
                    meta: {
                      ...(m.meta || {}),
                      ...(draftReply ? { draftReply } : {}),
                      result: {
                        type: cv.type || 'notes',
                        title: cv.title || 'Action Results Summary',
                        canvasData: {
                          type: cv.type || 'notes',
                          title: cv.title || 'Action Results Summary',
                          content: canvasContent,
                          raw: cv.markdown
                        }
                      }
                    }
                  };
                }));
              }
              break;
            }

            case 'tool_call': {
              stepIndex++;
              const activeLabel = getStepLabel(data.tool, data.params, 'active');
              const nextToolCallSteps = currentAgentSteps.map(s =>
                s.status === 'active' ? { ...s, status: 'completed' as const, completedAt: Date.now(), label: getStepLabel(s.tool || '', s.params || {}, 'completed') } : s
              );
              nextToolCallSteps.push({
                id: `al-tool-${stepIndex}`,
                type: 'tool_call',
                tool: data.tool,
                label: activeLabel,
                context: data.params?.query || data.params?.message || data.params?.summary || data.params?.subject || '',
                status: 'active',
                startedAt: Date.now(),
                iteration: data.iteration,
                params: data.params
              });
              currentAgentSteps = nextToolCallSteps;
              setAgentSteps(nextToolCallSteps);
              setLiveActivityLine(activeLabel);
              setMessages(msgs => msgs.map(m => {
                if (m.id !== assistantMsgId || m.type !== 'agent') return m;
                return { ...m, meta: { ...(m.meta || {}), thinkingComplete: true, agentSteps: nextToolCallSteps } };
              }));
              break;
            }

            case 'tool_result': {
              const nextResultSteps = currentAgentSteps.map(s =>
                s.status === 'active'
                  ? { ...s, status: 'completed' as const, completedAt: Date.now(), summary: data.summary || `${data.tool} done`, label: getStepLabel(s.tool || '', s.params || {}, 'completed') }
                  : s
              );
              currentAgentSteps = nextResultSteps;
              setAgentSteps(nextResultSteps);
              setLiveActivityLine('');
              setMessages(msgs => msgs.map(m => {
                if (m.id !== assistantMsgId || m.type !== 'agent') return m;
                return { ...m, meta: { ...(m.meta || {}), agentSteps: nextResultSteps } };
              }));
              break;
            }

            case 'narrative': {
              // Intermediate narrative text emitted between tool call groups
              if (data.text?.trim()) {
                const narrative: AgentNarrative = { iteration: data.iteration ?? 0, text: data.text.trim() };
                currentAgentNarratives = [...currentAgentNarratives, narrative];
                setMessages(msgs => msgs.map(m => {
                  if (m.id !== assistantMsgId || m.type !== 'agent') return m;
                  // Also feed narrative into liveThinking so AgentThinkingSection shows real AI reasoning
                  return { ...m, meta: { ...(m.meta || {}), agentNarratives: currentAgentNarratives, liveThinking: data.text.trim() } };
                }));
              }
              break;
            }

            case 'tool_error':
              const nextErrorSteps = currentAgentSteps.map(s =>
                s.status === 'active'
                  ? { ...s, status: 'error' as const, completedAt: Date.now(), summary: `Error: ${data.error}`, label: `Error: ${data.error}` }
                  : s
              );
              currentAgentSteps = nextErrorSteps;
              setAgentSteps(nextErrorSteps);
              setMessages(msgs => msgs.map(m => {
                if (m.id !== assistantMsgId || m.type !== 'agent') return m;
                return { ...m, meta: { ...(m.meta || {}), agentSteps: nextErrorSteps } };
              }));
              break;

            case 'approval_required':
              setMessages(prev => prev.map(m => {
                if (m.id !== assistantMsgId || m.type !== 'agent') return m;
                return {
                  ...m,
                  meta: {
                    ...(m.meta || {}),
                    isStreaming: false,
                    canvasApproval: {
                      status: 'pending',
                      title: `Approve ${data.tool}?`,
                      description: data.description || 'This action requires your approval to proceed.',
                      canvasData: {
                        content: data.params || {},
                        type: 'workflow'
                      }
                    },
                    actionType: data.tool,
                    actionPayload: data.params,
                    agentSteps: currentAgentSteps
                  }
                };
              }));
              break;

            case 'message':
              rawOutput += (data.content || '');
              const { thinking: liveThinkingText, cleanText: roadmapText } = extractThinking(rawOutput);
              finalContent = roadmapText;

              // Open canvas panel if the agent produced canvas content
              if (data.canvasContent) {
                const cv = data.canvasContent;
                // email_draft needs structured content; everything else gets raw markdown string
                const canvasContent = cv.type === 'email_draft' && cv.meta
                  ? cv.meta
                  : cv.markdown;
                setCanvasData({
                  type: cv.type || 'notes',
                  title: cv.title,
                  content: canvasContent,
                  raw: cv.markdown,
                });
                setIsCanvasOpen(true);
              }

              setMessages(prev => prev.map(m => {
                if (m.id !== assistantMsgId || m.type !== 'agent') return m;
                
                // If this step produced canvas content, persist it under the message result metadata
                let extraMeta = {};
                if (data.canvasContent) {
                  const cv = data.canvasContent;
                  const canvasContent = cv.type === 'email_draft' && cv.meta ? cv.meta : cv.markdown;
                  extraMeta = {
                    result: {
                      type: cv.type || 'notes',
                      title: cv.title || 'Action Results Summary',
                      canvasData: {
                        type: cv.type || 'notes',
                        title: cv.title || 'Action Results Summary',
                        content: canvasContent,
                        raw: cv.markdown
                      }
                    }
                  };
                }

                return {
                  ...m,
                  content: { text: finalContent.trim(), list: [], footer: '' },
                  meta: {
                    ...(m.meta || {}),
                    liveThinking: liveThinkingText || (m.meta as any)?.liveThinking,
                    thinkingComplete: finalContent.trim().length > 0 ? true : (m.meta as any)?.thinkingComplete,
                    agentSteps: currentAgentSteps,
                    agentNarratives: currentAgentNarratives,
                    ...extraMeta
                  }
                };
              }));
              break;

            case 'error':
              setMessages(prev => prev.map(m => {
                if (m.id !== assistantMsgId || m.type !== 'agent') return m;
                return {
                  ...m,
                  content: { text: '', list: [], footer: '' },
                  meta: {
                    ...(m.meta || {}),
                    isStreaming: false,
                    hasError: true,
                    errorMessage: data.message || 'Something went wrong, please try again.',
                    agentSteps: currentAgentSteps,
                  },
                };
              }));
              break;

            case 'plan': {
              // Plan mode — store the plan card on the message meta
              const planCard: PlanCardData = {
                title: data.title || 'Plan',
                markdown: data.markdown || '',
                status: 'proposed',
                createdAt: new Date().toISOString(),
              };
              // One-sentence intro shown above the plan card
              const planIntro = `I've put together a plan titled "${planCard.title}". Review it below — click Execute to run it step by step, or Cancel to start over.`;
              finalProcessedText = ''; // plan card replaces the text message
              streamFinishedNormally = true;
              setMessages(msgs => msgs.map(m => {
                if (m.id !== assistantMsgId || m.type !== 'agent') return m;
                return {
                  ...m,
                  content: { text: '', list: [], footer: '' },
                  meta: {
                    ...(m.meta || {}),
                    isStreaming: false,
                    planCard,
                    planIntro,
                    // _planForDocs: used only by ArtifactsGalleryPanel — does NOT trigger PlanCanvas
                    _planForDocs: {
                      title: planCard.title,
                      markdown: planCard.markdown,
                    },
                  },
                };
              }));
              break;
            }

            case 'done':
              streamFinishedNormally = true;
              finalProcessedText = finalContent.trim();
              if (!finalProcessedText && stepIndex > 0) {
                const completedSteps = currentAgentSteps.filter(s => s.status === 'completed');
                if (completedSteps.length > 0) {
                  finalProcessedText = `I've finished executing the plan. Successfully completed ${completedSteps.length} action(s).`;
                } else {
                  finalProcessedText = "I've completed the initialization, but haven't found a reason to provide a detailed text response yet.";
                }
              }

              const finalSteps = currentAgentSteps.map(s =>
                s.status === 'active' ? { ...s, status: 'completed' as const, completedAt: Date.now() } : s
              );
              
              setMessages(msgs => msgs.map(m => {
                if (m.id !== assistantMsgId || m.role !== 'assistant') return m;
                return {
                  ...m,
                  content: { text: finalProcessedText, list: [], footer: '' },
                  meta: {
                    ...(m.meta || {}),
                    isStreaming: false,
                    agentSteps: finalSteps,
                    agentRunId: data?.runId,
                    agentDurationMs: data?.durationMs,
                    liveThinking: ''
                  }
                };
              }));
              
              setAgentSteps(finalSteps);
              setIsAgentLoopActive(false);
              setLiveTaskList(null);
              setLiveActivityLine('');
              setAgentRunMeta({ runId: data.runId, totalDurationMs: data.durationMs });
              break;
          }
          currentEventType = '';
        }
      }

      // Check if the stream closed without a 'done' event (e.g. timeout or sudden disconnect)
      if (!streamFinishedNormally) {
        console.warn('⚠️ Stream finished unexpectedly without DONE event. Finalizing state.');
        
        const autoCompletedSteps = currentAgentSteps.map(s =>
          s.status === 'active' ? { ...s, status: 'completed' as const, completedAt: Date.now() } : s
        );

        setMessages(msgs => msgs.map(m => {
          if (m.id !== assistantMsgId || m.type !== 'agent') return m;
          return {
            ...m,
            meta: {
              ...(m.meta || {}),
              isStreaming: false,
              agentSteps: autoCompletedSteps,
              liveThinking: ''
            }
          };
        }));
        setAgentSteps(autoCompletedSteps);
        setLiveActivityLine('');
      }

      setNewMessageIds(prev => new Set(prev).add(assistantMsgId));

      if (conversationIdToUse) {
        const existingRaw = localStorage.getItem(`conversation_${conversationIdToUse}`);
        const existing = existingRaw ? JSON.parse(existingRaw) : { id: conversationIdToUse, messages: [], title: messageText.split(' ').slice(0, 5).join(' '), lastUpdated: '', messageCount: 0 };
        
        // Check if the user message from handleSubmit is already present in existing messages
        const hasUserMsg = (existing.messages || []).some((m: any) => m.role === 'user' && m.content === messageText);
        let allMsgs = existing.messages || [];
        if (!hasUserMsg) {
          const userMsg: UserMessage = { id: Date.now(), type: 'user', role: 'user', content: messageText, time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) };
          allMsgs = [...allMsgs, userMsg];
        }

        // Use synthesized content if available, fallback to finalContent
        const finalPersistedText = finalProcessedText || finalContent;
        const agentMsg: AgentMessage = { 
          id: assistantMsgId, 
          type: 'agent', 
          role: 'assistant', 
          content: { text: finalPersistedText, list: [], footer: '' }, 
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          meta: {
            agentSteps: currentAgentSteps,
            agentNarratives: currentAgentNarratives,
            ...(currentTaskList ? { taskList: currentTaskList } : {}),
          }
        };

        allMsgs = [...allMsgs, agentMsg];
        const unique = allMsgs.filter((msg: any, idx: number, self: any[]) => idx === self.findIndex(t => t.id === msg.id));
        const convTitle = existing.title || chatTitle || messageText.slice(0, 60);
        localStorage.setItem(`conversation_${conversationIdToUse}`, JSON.stringify({ ...existing, messages: unique, lastUpdated: new Date().toISOString(), messageCount: unique.length }));

        // Persist to Supabase (fire-and-forget — localStorage is the read cache)
        fetch('/api/arcus/conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: conversationIdToUse, messages: unique, title: convTitle }),
        }).catch(() => { /* non-critical */ });

        if (isNew) {
          generateChatTitle(messageText).then(title => {
            localStorage.setItem(`conv_${conversationIdToUse}_title`, title);
            setChatTitle(title);
            fetch('/api/arcus/conversation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversationId: conversationIdToUse, messages: unique, title }),
            }).catch(() => { });
          }).catch(() => { });
        }
      }

      if (finalContent && (notificationsEnabled || soundEnabled)) {
        NotificationService.notify('Arcus Response', finalContent.substring(0, 100), { soundType: 'notify', silent: !notificationsEnabled });
      }

    } catch (err: any) {
      if (err.name === 'AbortError') { setMessages(prev => prev.filter(m => m.id !== assistantMsgId)); return; }
      console.error('[AgentLoop] Error:', err);

      const isLimitError = err.message?.toLowerCase().includes('limit') ||
        err.message?.toLowerCase().includes('credits') ||
        err.message?.toLowerCase().includes('quota') ||
        err.message?.toLowerCase().includes('403');

      setMessages(prev => prev.map(m => {
        if (m.id !== assistantMsgId || m.role !== 'assistant') return m;
        const errMsg = err.message || 'The connection was lost during processing.';
        return {
          ...m,
          content: { text: '', list: [], footer: '' },
          meta: {
            ...(m.meta || {}),
            isStreaming: false,
            limitReached: isLimitError,
            hasError: !isLimitError,
            errorMessage: errMsg,
            liveThinking: '',
          },
        };
      }));

      // Save error message to localStorage so it persists on reload
      if (conversationIdToUse) {
        const existingRaw = localStorage.getItem(`conversation_${conversationIdToUse}`);
        const existing = existingRaw ? JSON.parse(existingRaw) : { id: conversationIdToUse, messages: [], title: messageText.split(' ').slice(0, 5).join(' '), lastUpdated: '', messageCount: 0 };
        
        // Check if the user message from handleSubmit is already present in existing messages
        const hasUserMsg = (existing.messages || []).some((m: any) => m.role === 'user' && m.content === messageText);
        let allMsgs = existing.messages || [];
        if (!hasUserMsg) {
          const userMsg: UserMessage = { id: Date.now(), type: 'user', role: 'user', content: messageText, time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) };
          allMsgs = [...allMsgs, userMsg];
        }

        const errorContentText = `${err.message || 'The connection was lost during processing.'}. Please try again.`;
        const agentMsg: AgentMessage = {
          id: assistantMsgId,
          type: 'agent',
          role: 'assistant',
          content: { text: errorContentText, list: [], footer: '' },
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          meta: { limitReached: isLimitError }
        };
        
        allMsgs = [...allMsgs, agentMsg];
        const unique = allMsgs.filter((msg: any, idx: number, self: any[]) => idx === self.findIndex(t => t.id === msg.id));
        localStorage.setItem(`conversation_${conversationIdToUse}`, JSON.stringify({ ...existing, messages: unique, lastUpdated: new Date().toISOString(), messageCount: unique.length }));

        if (isNew) {
          generateChatTitle(messageText).then(title => {
            localStorage.setItem(`conv_${conversationIdToUse}_title`, title);
            setChatTitle(title);
          }).catch(() => { });
        }
      }
    } finally {
      setIsLoading(false);
      setIsAgentLoopActive(false);
      setLiveTaskList(null);
      setLiveThinkingBlocks([]);
      setTimeout(() => scrollToBottom(true), 100);
    }
  };

  async function processAIMessage(messageText: string, conversationIdToUse: string, isNew: boolean, attachments?: any[], options: any = {}) {
    // ── Agent Loop routing: Use the new autonomous SSE loop for ALL queries ──────
    // The AI will now autonomously decide to use search, canvas, or plan tools.
    return processAgentLoopMessage(messageText, conversationIdToUse, isNew, options);

  };

  // Canvas execution handler - Phase 1: Integrated with Execution Gateway
  const handleCanvasExecute = async (action: string, data: any) => {
    setIsCanvasExecuting(true);
    try {
      const requestId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const approvalToken = canvasData?.approvalTokens?.[action];

      const response = await fetch('/api/agent-talk/chat-arcus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Execute: ${action}`,
          runId: activeRun?.runId || null,
          conversationId: currentConversationId,
          isNewConversation: false,
          actionType: action,
          actionPayload: data,
          approvalToken,
          actionRequestId: requestId,
          executeCanvasAction: action,
          canvasActionData: data
        })
      });

      const result = await response.json();

      // Phase 1: Handle all execution statuses from the gateway
      const executionStatus = result.resultStatus || result.executionResult?.status;
      const isSuccess = result.executionResult?.success || executionStatus === 'completed' || executionStatus === 'already_completed';

      if (isSuccess) {
        // Handle already_completed (idempotency) differently
        if (executionStatus === 'already_completed') {
          toast.info(result.message || 'This action was already completed', {
            description: 'No duplicate action was performed.'
          });
        } else {
          toast.success(result.message || 'Action completed successfully');
        }

        setIsCanvasOpen(false);
      } else {
        // Phase 1: Handle categorized errors with recovery hints
        const errorCategory = result.error?.category || result.executionResult?.error?.category;
        const recoveryHint = result.recoveryHint || result.executionResult?.error?.recoveryHint;

        let errorMessage = result.message || 'Action failed';
        let actionDescription = '';

        if (recoveryHint) {
          errorMessage = recoveryHint.userMessage || errorMessage;

          // Add actionable guidance based on recovery action
          if (recoveryHint.requiresUserAction) {
            switch (recoveryHint.recoveryAction) {
              case 'reconnect_integration':
                actionDescription = 'Please reconnect your Gmail account in Integrations settings.';
                break;
              case 'check_permissions':
                actionDescription = 'Check your account permissions and try again.';
                break;
              case 'revise_input':
                actionDescription = 'Please review your input and try again.';
                break;
              case 'request_approval':
                actionDescription = 'This action requires your approval to proceed.';
                break;
            }
          } else if (recoveryHint.autoRetry) {
            actionDescription = 'We\'ll automatically retry this action.';
          }
        }

        toast.error(errorMessage, {
          description: actionDescription,
          duration: 6000
        });

        // Add error message to chat with recovery guidance
        const errorAgentMessage: AgentMessage = {
          id: Date.now() + 1,
          type: 'agent',
          role: 'assistant',
          notes: [],
          content: {
            text: errorMessage,
            list: actionDescription ? [actionDescription] : [],
            footer: errorCategory ? `Error: ${errorCategory}` : ''
          },
          meta: {
            error: result.error || result.executionResult?.error,
            recoveryHint: recoveryHint,
            requiresRetry: recoveryHint?.autoRetry || false
          },
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        };
        setMessages(prev => [...prev, errorAgentMessage]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute action';
      toast.error('Execution failed', {
        description: errorMessage
      });
      console.error('Canvas execution error:', error);

      // Add error to chat
      const errorAgentMessage: AgentMessage = {
        id: Date.now() + 1,
        type: 'agent',
        role: 'assistant',
        notes: [],
        content: {
          text: 'Sorry, something went wrong while executing that action.',
          list: [errorMessage],
          footer: 'Please try again or contact support if the issue persists.'
        },
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      };
      setMessages(prev => [...prev, errorAgentMessage]);
    } finally {
      setIsCanvasExecuting(false);
    }
  };

  // Plan approval handlers (Phase 2)
  // Plan approval is handled by handlePlanApprove (L1823) which also updates message state

  const handleDeclinePlan = async (plan: any) => {
    try {
      await fetch('/api/agent-talk/chat-arcus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Decline plan: ${plan.planId}`,
          runId: activeRun?.runId || null,
          conversationId: currentConversationId,
          isNewConversation: false,
          actionType: 'decline_plan',
          actionPayload: { planId: plan.planId },
          executeCanvasAction: 'decline_plan',
          canvasActionData: { planId: plan.planId }
        })
      });

      toast.info('Plan declined');
    } catch (error) {
      console.error('Error declining plan:', error);
      toast.error('Error declining plan');
    }
  };

  // Plan approval handler (Phase 2)
  const handlePlanApprove = async (planId: string, messageId: number) => {
    setIsProcessingPlan(true);
    try {
      const response = await fetch('/api/agent-talk/chat-arcus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Approve and execute plan: ${planId}`,
          runId: activeRun?.runId || null,
          conversationId: currentConversationId,
          isNewConversation: false,
          actionType: 'approve_plan',
          actionPayload: { planId },
          executeCanvasAction: 'approve_plan',
          canvasActionData: { planId }
        })
      });

      const result = await response.json();

      if (result.executionResult?.success || result.success) {
        toast.success(result.message || 'Plan approved and execution started');

        // Update the message to show the plan is now executing
        setMessages(prev => prev.map(m => {
          if (m.id === messageId && m.type === 'agent') {
            const agentMsg = m as AgentMessage;
            const currentPlan = agentMsg.meta?.planArtifact;
            if (!currentPlan) return m;

            return {
              ...agentMsg,
              meta: {
                ...agentMsg.meta,
                planArtifact: {
                  ...currentPlan,
                  status: 'executing' as const
                }
              }
            };
          }
          return m;
        }));

        // Poll for execution updates
        if (result.run?.runId) {
          setActiveRun({
            runId: result.run.runId,
            status: 'executing',
            phase: 'execution'
          });
        }
      } else {
        toast.error(result.message || 'Plan approval failed');
      }
    } catch (error) {
      toast.error('Failed to approve plan');
      console.error('Plan approval error:', error);
    } finally {
      setIsProcessingPlan(false);
    }
  };

  const loadConversation = (conversationId: string) => {
    console.log('DEBUG: loadConversation called with:', conversationId);
    const savedConversation = localStorage.getItem(`conversation_${conversationId}`);
    if (savedConversation) {
      try {
        const conversationData = JSON.parse(savedConversation);
        const loadedMessages = conversationData.messages || [];

        setMessages(loadedMessages);
        setConversations(prev => ({ ...prev, [conversationId]: loadedMessages }));
        setCurrentConversationId(conversationId);
        setIsInitialMode(false);
        setIsNewConversation(false);
        setShowHistory(false);
        setSelectedConversationId(conversationId);
        setChatTitle(conversationData.title || '');

        console.log('DEBUG: Loaded', loadedMessages.length, 'messages for conversation:', conversationId);

        // Navigate to the conversation URL
        router.push(`/dashboard/agent-talk/${conversationId}`);
        if (onConversationSelect && conversationId !== initialConversationId) {
          onConversationSelect(conversationId);
        }

        // Scroll to bottom after messages are loaded
        setTimeout(() => scrollToBottom(true), 150);

        // Check for pending AI trigger
        const pendingId = localStorage.getItem('pending_arcus_id');
        if (pendingId === conversationId) {
          const pendingMsg = localStorage.getItem('pending_arcus_message');
          const pendingOptionsRaw = localStorage.getItem('pending_arcus_options');

          try {
            if (pendingMsg) {
              console.log('Resuming pending AI call for new conversation:', conversationId);
              let options = {};
              try {
                if (pendingOptionsRaw) options = JSON.parse(pendingOptionsRaw);
              } catch (e) {
                console.error('Error parsing pending options:', e);
              }
              processAIMessage(pendingMsg, conversationId, true, [], options);
            }
          } finally {
            // Explicitly clear pending state to prevent cross-contamination
            localStorage.removeItem('pending_arcus_id');
            localStorage.removeItem('pending_arcus_message');
            localStorage.removeItem('pending_arcus_options');
          }
        }
      } catch (error) {
        console.error('Error loading conversation from localStorage:', error);
      }
    } else {
      // If not in localStorage, fetch from API
      fetch(`/api/arcus/conversation/${conversationId}`)
        .then(response => response.json())
        .then(data => {
          if (data && data.messages && Array.isArray(data.messages)) {
            const formattedMessages = data.messages.map((msg: any) => {
              if (msg.type === 'agent' && typeof msg.content === 'string') {
                return { ...msg, content: { text: msg.content, list: [], footer: '' } };
              }
              return msg;
            });
            setMessages(formattedMessages);
            setConversations(prev => ({ ...prev, [conversationId]: formattedMessages }));
            
            // Give it a tiny bit of transition time
            setTimeout(() => {
              router.push(`/dashboard/agent-talk/${conversationId}`);
            }, 50);

            setCurrentConversationId(conversationId);
            setIsInitialMode(false);
            setIsNewConversation(false);
            setShowHistory(false);
            setSelectedConversationId(conversationId);
            setChatTitle(data.title || '');

            // Navigate to the conversation URL
            router.push(`/dashboard/agent-talk/${conversationId}`);
            if (onConversationSelect) {
              onConversationSelect(conversationId);
            }

            // Scroll to bottom after messages are loaded
            setTimeout(() => scrollToBottom(true), 150);
          }
        }).catch(err => console.error('Error fetching conversation:', err));
    }
  };

  const handleLogout = async () => {
    setIsMoreOptionsOpen(false);
    await signOut({ redirect: false });
    router.push("/");
  };

  const loadPersonalityPreferences = async () => {
    try {
      const response = await fetch('/api/agent-talk/personality');
      if (response.ok) {
        const data = await response.json();
        setSavedPersonality(data.personality || '');
      }
    } catch (error) {
      console.error('Error loading personality preferences:', error);
    }
  };

  const handleSavePersonality = async (personality: string) => {
    try {
      const response = await fetch('/api/agent-talk/personality', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personality }),
      });
      if (response.ok) {
        setSavedPersonality(personality);
      }
    } catch (error) {
      console.error('Error saving personality preferences:', error);
    }
  };

  // Pull a fresh Gmail access token so we can pass it to ElevenLabs sessions/tools
  useEffect(() => {
    const fetchGmailToken = async () => {
      try {
        const res = await fetch('/api/agent-talk/gmail-token');
        if (!res.ok) {
          console.warn('Gmail token not available for agent');
          setGmailAccessToken(null);
          setGmailTokenSource(null);
          return;
        }

        const data = await res.json();
        setGmailAccessToken(data.accessToken || null);
        setGmailTokenSource(data.source || null);
      } catch (error) {
        console.error('Failed to load Gmail token for agent:', error);
        setGmailAccessToken(null);
        setGmailTokenSource(null);
      }
    };

    fetchGmailToken();
  }, []);

  // Fetch integration status
  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const res = await fetch('/api/integrations/status');
        if (res.ok) {
          const data = await res.json();
          setIntegrations({
            gmail: data.integrations?.gmail || false,
            'google-calendar': data.integrations?.['google-calendar'] || false,
            'google-meet': data.integrations?.['google-meet'] || false
          });
          console.log('Integrations loaded:', data.integrations);
        }
      } catch (error) {
        console.error('Failed to load integration status:', error);
      }
    };

    fetchIntegrations();
  }, []);

  // Debug modal state changes
  useEffect(() => {
    console.log('ChatInterface: Email modal state changed:', isEmailSelectionModalOpen);
    console.log('ChatInterface: Email modal should be rendering:', isEmailSelectionModalOpen ? 'YES' : 'NO');
  }, [isEmailSelectionModalOpen]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isActuallyAtBottom, setIsActuallyAtBottom] = useState(true);
  const loadedConversationIdRef = useRef<string | null>(null);

  // Load initial conversation if provided via URL
  useEffect(() => {
    if (initialConversationId && loadedConversationIdRef.current !== initialConversationId) {
      console.log('Loading conversation from URL:', initialConversationId);
      loadedConversationIdRef.current = initialConversationId;
      loadConversation(initialConversationId);
    } else if (!initialConversationId && !isNewConversation) {
      console.log('No conversation ID provided - starting fresh chat');
      // Ensure we're in initial mode for new chats
      setIsInitialMode(true);
      setCurrentConversationId(null);
      setMessages([]);
    }
  }, [initialConversationId, currentConversationId, isNewConversation]);

  // Save current conversation ID to localStorage whenever it changes (but not for new chats)
  useEffect(() => {
    if (currentConversationId && !isInitialMode) {
      localStorage.setItem('lastActiveConversation', currentConversationId);
      console.log('Saved active conversation:', currentConversationId);
    }
  }, [currentConversationId ?? null, isInitialMode]);

  // Automatic scroll to latest content (messages or thinking steps)
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isLoading, isThinkingStepsOpen, liveThinkingBlocks]);

  // Initial Load: Restore conversation from URL or handle manual re-sync
  useEffect(() => {
    if (initialConversationId && isInitialMode) {
      console.log('🔄 Initial conversion ID detected, hydrating workspace:', initialConversationId);
      loadConversation(initialConversationId);
    }
  }, [initialConversationId, isInitialMode]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;

      setShowScrollButton(!isNearBottom);
      setIsActuallyAtBottom(isAtBottom);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToBottom = (instant = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: instant ? "auto" : "smooth",
        block: "end"
      });
    }
  };

  // Scroll to bottom when messages or thinking state changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isThinkingStepsOpen, isLoading]);

  // Handle thinking expansion scroll
  useEffect(() => {
    if (isThinkingStepsOpen) {
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 300); // Allow animation to finish or start well
      return () => clearTimeout(timeoutId);
    }
  }, [isThinkingStepsOpen]);

  // Remove new message IDs after animation
  useEffect(() => {
    newMessageIds.forEach(id => {
      setTimeout(() => {
        setNewMessageIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }, 300); // Match animation duration
    });
  }, [newMessageIds]);

  const loadConversationsFromStorage = () => {
    const conversations: { [key: string]: any } = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('conversation_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.id && data.title) {
            conversations[data.id] = data;
          }
        } catch (error) {
          console.error('Error loading conversation:', error);
        }
      }
    }

    return conversations;
  };

  const handleSend = async (forcedMessage?: string, files?: File[], options: { isDeepThinking?: boolean; isCanvas?: boolean; isSearch?: boolean; isPlanMode?: boolean; modelId?: string } = {}) => {
    const messageText = (forcedMessage || message).trim();
    if (!messageText && (!files || files.length === 0)) return;

    const isDeepThinking = options?.isDeepThinking || false;
    const isCanvas = options?.isCanvas || false;
    const isSearch = options?.isSearch || false;
    const isPlanMode = options?.isPlanMode || false;

    // Determine if this is a new conversation or continuation
    const shouldCreateNewConversation = !currentConversationId;

    // Process files if any
    const attachments = files && files.length > 0
      ? await Promise.all(files.map(async file => ({
        name: file.name,
        url: URL.createObjectURL(file), // Local URL for preview
        type: file.type,
        size: file.size,
        base64: await fileToBase64(file)
      })))
      : [];

    // Include selected emails as attachments
    if (selectedEmails.length > 0) {
      selectedEmails.forEach(email => {
        const emailContent = `From: ${email.from}\nSubject: ${email.subject}\nDate: ${email.date}\n\nSnippet: ${email.snippet}`;
        attachments.push({
          name: `Attached Email: ${email.subject}`,
          url: '',
          type: 'text/email',
          size: emailContent.length,
          base64: btoa(encodeURIComponent(emailContent).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16)))),
          isEmail: true
        } as any);
      });
      // Clear selected emails after processing
      setSelectedEmails([]);
    }

    // Generate conversation ID if this is a new conversation
    let conversationIdToUse = currentConversationId;
    if (shouldCreateNewConversation) {
      conversationIdToUse = generateConversationId();
      setCurrentConversationId(conversationIdToUse);
      setIsNewConversation(true);

      // Save to localStorage for persistence IMMEDIATELY
      localStorage.setItem(`conv_${conversationIdToUse}_title`, messageText || (attachments ? attachments[0].name : 'New Chat'));
      console.log('Generated new conversation ID:', conversationIdToUse);

      // Close sidebar if it was open during "New Chat" state
      setShowHistory(false);
    } else {
      setIsNewConversation(false);
      console.log('Continuing existing conversation ID:', currentConversationId);
    }

    // Start loading state immediately
    setIsLoading(true);

    // Exit initial mode after first message
    if (isInitialMode) {
      setIsInitialMode(false);
    }

    const newMessage: UserMessage = {
      id: Date.now(),
      type: 'user',
      role: 'user',
      notes: [],
      content: messageText,
      attachments,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
    };

    // Optimistically add user message and clear input
    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    // Update conversations state
    setConversations(prev => ({
      ...prev,
      [conversationIdToUse as string]: [...(prev[conversationIdToUse as string] || []), newMessage]
    }));

    // Pre-save to localStorage so it survives potential refreshes
    const existingRawForPreSave = localStorage.getItem(`conversation_${conversationIdToUse}`);
    let historyMessages = messages;
    if (existingRawForPreSave) {
      try {
        const existingData = JSON.parse(existingRawForPreSave);
        if (existingData.messages && existingData.messages.length > historyMessages.length) {
          historyMessages = existingData.messages;
        }
      } catch (e) {
        console.error('Error parsing existing conversation for pre-save:', e);
      }
    }

    const conversationData = {
      id: conversationIdToUse as string,
      messages: [...historyMessages, newMessage],
      title: chatTitle || messageText.trim().split(' ').slice(0, 5).join(' '),
      lastUpdated: new Date().toISOString(),
      messageCount: historyMessages.length + 1
    };
    localStorage.setItem(`conversation_${conversationIdToUse}`, JSON.stringify(conversationData));

    // Navigate to the conversation URL if this is a new conversation
    if (shouldCreateNewConversation && onConversationSelect && conversationIdToUse) {
      localStorage.setItem('pending_arcus_id', conversationIdToUse);
      localStorage.setItem('pending_arcus_message', messageText);
      localStorage.setItem('pending_arcus_options', JSON.stringify(options || {}));
      onConversationSelect(conversationIdToUse);
      return;
    }

    // Process the AI message directly - don't rely on navigation/loadConversation
    processAIMessage(messageText, conversationIdToUse as string, shouldCreateNewConversation, attachments, { isDeepThinking, isCanvas, isSearch, isPlanMode, modelId: options?.modelId });
  };



  const startNewChat = () => {
    // Save current conversation asynchronously in the background before starting new one
    if (messages.length > 0 && currentConversationId) {
      saveConversation().catch(console.error);
    }

    // Immediately route to the base Arcus page on a single click
    router.push('/dashboard/agent-talk');
    onNewChat?.();

    // Clear all conversation state for new chat instantly
    setMessages([]);
    setIsInitialMode(true);
    setIsNewConversation(true);
    setSelectedConversationId(null);
    setCurrentConversationId(null);
    setChatTitle('');
    setConversations({});
    setShowHistory(false);

    // Clear any stored conversation ID from localStorage
    localStorage.removeItem('lastActiveConversation');

    console.log('Started new chat - all conversation state cleared');
  };

  const handleTryOut = (prompt: string) => {
    setSuggestionInput({ text: prompt, id: Date.now() });
    setIsIntegrationsModalOpen(false);
  };



  const saveConversation = async () => {
    if (messages.length === 0 || !currentConversationId) return;

    try {
      await fetch('/api/arcus/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConversationId,
          messages,
          title: chatTitle || messages[0]?.content?.toString?.()?.slice(0, 60) || 'Conversation',
        }),
      });
    } catch (error) {
      console.error('Error saving conversation to DB:', error);
    }
  };

  const handleSendReply = async (draftData: any) => {
    if (!currentConversationId || !activeMission) return;

    try {
      setIsLoading(true);
      const res = await fetch('/api/agent-talk/chat-arcus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `APPROVED: Send this reply to ${draftData.recipientEmail}`, // This triggers the next step
          conversationId: currentConversationId,
          activeMission,
          runId: activeRun?.runId || null,
          approvalPayload: draftData // Pass the edited content back
        })
      });

      if (!res.ok) throw new Error('Failed to send reply');

      const data = await res.json();

      // Update state with result
      if (data.activeMission) setActiveMission(data.activeMission);

      // Clear proposal
      setPendingReplyProposal(null);

      const agentMessage: AgentMessage = {
        id: Date.now() + 1,
        type: 'agent',
        role: 'assistant',
        notes: [],
        content: data.message,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        meta: {
          actionType: data.actionType,
          emailResult: data.emailResult
        }
      };

      setMessages(prev => [...prev, agentMessage]);
      setNewMessageIds(prev => new Set(prev).add(agentMessage.id));

    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollToBottom(true), 100);
    }
  };

  const handleConversationDelete = async (deletedConversationId: string) => {
    console.log('Conversation deleted:', deletedConversationId);
    console.log('Current conversation ID:', currentConversationId);

    // Check if the deleted conversation is the currently displayed one
    if (currentConversationId === deletedConversationId) {
      console.log('Current conversation was deleted - clearing state and navigating');

      // Clear current conversation state
      setMessages([]);
      setCurrentConversationId(null);
      setSelectedConversationId(null);
      setIsInitialMode(true);
      setIsNewConversation(true);

      // Clear from localStorage
      localStorage.removeItem(`conversation_${deletedConversationId}`);
      localStorage.removeItem(`conv_${deletedConversationId}_title`);
      localStorage.removeItem('lastActiveConversation');

      // Notify parent to navigate back to /agent-talk
      if (onConversationDelete) {
        onConversationDelete(deletedConversationId);
      }
    }
  };

  // Auto-save conversation periodically
  useEffect(() => {
    if (messages.length > 0) {
      const interval = setInterval(saveConversation, 30000); // Save every 30 seconds
      return () => clearInterval(interval);
    }
  }, [messages]);

  // Save conversation when component unmounts or when starting new chat
  useEffect(() => {
    return () => {
      if (messages.length > 0) {
        saveConversation();
      }
    };
  }, []);

  // Poll operator run state for long-running or queued workflows
  useEffect(() => {
    if (!activeRun?.runId) return;
    if (!isLoading && !isCanvasExecuting && activeRun.status === 'completed') return;

    let cancelled = false;
    const pollRun = async () => {
      try {
        const res = await fetch(`/api/agent-talk/chat-arcus/run/${activeRun.runId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        if (Array.isArray(data.steps) && data.steps.length > 0) {
          const activeStep = data.steps.find((s: any) => s.status === 'active' || s.status === 'blocked_approval');
          if (activeStep?.label) {
            setCurrentThought(activeStep.label);
          } else if (data.run?.status === 'complete') {
            setCurrentThought('Objective successfully fulfilled.');
          }

          setLiveThinkingBlocks([{
            id: 'running-mission',
            title: data.run?.phase === 'research' ? 'Deep information retrieval' : data.run?.phase === 'execution' ? 'Executing strategic actions' : 'Processing mission data',
            status: 'active',
            initialContext: data.run?.status === 'complete' ? 'Mission finalized and insights synthesized.' : 'Interpreting live telemetry and orchestrating agentic steps...',
            steps: data.steps.map((s: any) => ({
              id: s.id || `step-${s.order}`,
              label: s.label || `Step ${s.order}`,
              status: (s.status === 'blocked_approval' ? 'active' : (s.status || 'pending')) as 'pending' | 'active' | 'completed' | 'error',
              type: (s.kind || 'think') as 'pending' | 'active' | 'completed' | 'error' | 'think' | 'search' | 'read' | 'binary' | 'script' | 'brain' | 'draft' | 'execute' | 'spark' | 'mail' | 'calendar' | 'chart',
              expandedContent: [s.detail || '', formatStepEvidence(s.evidence)].filter(Boolean).join('\n\n')
            }))
          }]);
        }

        if (data.run?.runId) {
          setActiveRun({
            runId: data.run.runId,
            status: data.run.status,
            phase: data.run.phase
          });
        }
      } catch (error) {
        console.error('Run polling failed:', error);
      }
    };

    pollRun();
    const interval = setInterval(pollRun, 2200);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeRun?.runId, activeRun?.status, isLoading, isCanvasExecuting]);

  return (
    <TooltipProvider>
      <>
        <UsageLimitModal
          isOpen={isUsageLimitModalOpen}
          onClose={() => setIsUsageLimitModalOpen(false)}
          featureName={usageLimitModalData?.featureName || 'Ask AI'}
          currentUsage={usageLimitModalData?.currentUsage || 0}
          limit={usageLimitModalData?.limit || 0}
          period={usageLimitModalData?.period || 'daily'}
          currentPlan={usageLimitModalData?.currentPlan || 'starter'}
        />

        <div className="flex h-full w-full text-black dark:text-graphite-text bg-white dark:bg-black selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black overflow-hidden relative tracking-tight" style={{ height: '100vh', overflow: 'hidden' }}>
          {/* Apple-style Premium Grain Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[100] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />

          {/* Subtle Ambient Glows for Depth */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <GradientWave
              colors={isDark ? ["#000000", "#111111", "#080808", "#111111"] : ["#F9FAFB", "#F3F4F6", "#E5E7EB", "#F9FAFB"]}
              className={isDark ? "opacity-100" : "opacity-40"}
              deform={GRA_DEFORM}
              isPlaying={false}
            />
            <div className={cn(
              "absolute -top-[10%] -right-[10%] w-[60%] h-[60%] rounded-full blur-[140px]",
              isDark ? "bg-graphite-surface-2/40" : "bg-neutral-200/50"
            )} />
            <div className={cn(
              "absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px]",
              isDark ? "bg-graphite-surface/30" : "bg-neutral-100/40"
            )} />
          </div>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ x: '110%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '110%', opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed right-4 top-4 bottom-4 w-80 bg-[#111111] border border-white/[0.08] flex flex-col z-[100] shadow-2xl rounded-[32px] overflow-hidden"
              >
                <div className="absolute top-6 right-6 z-[110]">
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 hover:bg-black/5 dark:bg-white/5 rounded-full transition-all text-black hover:text-black dark:text-white/60"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ChatHistoryModal
                    key={`history-${historyRefreshKey}`}
                    isOpen={showHistory}
                    onClose={() => setShowHistory(false)}
                    onConversationSelect={loadConversation}
                    onConversationDelete={handleConversationDelete}
                    onNewMission={startNewChat}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isEmbedded && (
            <HomeFeedSidebar
              className="z-50"
              onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenHelp={() => setIsHelpOpen(true)}
              onOpenRewards={() => setIsRewardsOpen(true)}
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
            />
          )}

          <LayoutGroup>
            {/* Main Layout Wrapper - Absolute positioned to fill screen strictly */}
            <div
              className={cn(
                "absolute inset-0 bg-white dark:bg-black overflow-hidden flex flex-col md:flex-row",
                !isEmbedded ? (isSidebarCollapsed ? "md:left-20" : "md:left-64") : "left-0",
                "left-0"
              )}
              style={{ height: isEmbedded ? '100%' : '100vh', maxHeight: isEmbedded ? '100%' : '100vh' }}
            >
              {/* Chat Column (Order 1 - LEFT) - Premium Refinement */}
              <div
                className="flex-1 flex flex-col relative h-full min-w-0 order-1 bg-black backdrop-blur-3xl border-x border-t border-white/[0.05] rounded-t-[40px] shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.5)] overflow-hidden"
                style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%' }}
              >
                {/* Header - Glassmorphic fixed height */}
                <div className="shrink-0 z-40 bg-black/[0.02] dark:bg-black/40 backdrop-blur-md border-b border-neutral-200 dark:border-white/[0.03]" style={{ flexShrink: 0 }}>
                  <div className="relative px-8 py-4">
                    {/* Centered Agent/Home Toggle */}
                    {isInitialMode && arcusView === 'feed' && (
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-auto">
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                          className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-full shadow-lg"
                        >
                          <button
                            onClick={() => setDashboardTab('home')}
                            className={cn(
                              "px-5 py-2 rounded-full text-[12px] font-bold transition-all flex items-center gap-2",
                              dashboardTab === 'home'
                                ? "bg-white/[0.08] text-white border border-white/[0.12]"
                                : "text-white/40 hover:text-white/60 border border-transparent"
                            )}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Home
                          </button>
                          <button
                            onClick={() => setDashboardTab('agents')}
                            className={cn(
                              "px-5 py-2 rounded-full text-[12px] font-bold transition-all flex items-center gap-2",
                              dashboardTab === 'agents'
                                ? "bg-white/[0.08] text-white border border-white/[0.12]"
                                : "text-white/40 hover:text-white/60 border border-transparent"
                            )}
                          >
                            <Bot className="w-3.5 h-3.5" />
                            Agent
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[8px] font-extrabold tracking-wider uppercase border border-amber-500/20 ml-0.5">
                              Beta
                            </span>
                            {scheduledAgents && scheduledAgents.filter(a => a.status === 'running').length > 0 && (
                              <motion.div
                                className="w-1.5 h-1.5 bg-green-400 rounded-full"
                                animate={{ opacity: [1, 0.4, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                              />
                            )}
                          </button>
                        </motion.div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Mobile Menu Button */}
                        {!isEmbedded && (
                          <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-neutral-600 dark:text-neutral-400"
                          >
                            <PanelLeft className="w-5 h-5" />
                          </button>
                        )}

                        {/* Leftmost: Title and Dropdown with refined Zinc styling */}
                        {!isInitialMode && (
                          <div className="relative" ref={titleMenuRef}>
                            <div className="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden shadow-xl transition-all hover:border-white/15 group">
                              <button
                                onClick={() => setIsTitleMenuOpen(!isTitleMenuOpen)}
                                className="pl-4 pr-3 py-2 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors flex items-center gap-2.5 max-w-[280px]"
                              >
                                <span className="text-[13px] font-bold text-black dark:text-white/90 truncate tracking-tight lowercase">
                                  {chatTitle || 'new conversation'}
                                </span>
                              </button>
                              <div className="w-[1px] h-4 bg-white/[0.12]" />
                              <button
                                onClick={() => setIsTitleMenuOpen(!isTitleMenuOpen)}
                                className="px-3 py-2 hover:bg-black/[0.05] dark:bg-white/[0.05] transition-colors"
                              >
                                <ChevronDown className={`w-3.5 h-3.5 text-black dark:text-white/40 group-hover:text-black dark:group-hover:text-white/80 transition-transform duration-300 ease-out ${isTitleMenuOpen ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Dropdown Menu */}
                        {isTitleMenuOpen && (
                          <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-[#1a1a1a] border border-white/[0.08] rounded-xl shadow-2xl py-1.5 z-[100] animate-in fade-in zoom-in-95 duration-200">
                            <button
                              onClick={() => {
                                setIsStarred(!isStarred);
                                setIsTitleMenuOpen(false);
                                toast.success(isStarred ? 'Removed from favorites' : 'Added to favorites');
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-black hover:text-black dark:text-white hover:bg-black/[0.05] dark:bg-white/[0.05] transition-colors flex items-center gap-2.5"
                            >
                              <Sparkles className={`w-4 h-4 ${isStarred ? 'text-yellow-400 fill-yellow-400' : ''}`} />
                              <span>{isStarred ? 'Unstar' : 'Star'}</span>
                            </button>
                            <button
                              onClick={() => {
                                const newTitle = prompt('Rename conversation:', chatTitle);
                                if (newTitle && newTitle !== chatTitle) {
                                  setChatTitle(newTitle);
                                  if (currentConversationId) {
                                    localStorage.setItem(`conv_${currentConversationId}_title`, newTitle);
                                    const raw = localStorage.getItem(`conversation_${currentConversationId}`);
                                    if (raw) {
                                      const data = JSON.parse(raw);
                                      data.title = newTitle;
                                      localStorage.setItem(`conversation_${currentConversationId}`, JSON.stringify(data));
                                    }
                                  }
                                }
                                setIsTitleMenuOpen(false);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-black hover:text-black dark:text-white hover:bg-black/[0.05] dark:bg-white/[0.05] transition-colors flex items-center gap-2.5"
                            >
                              <PenTool className="w-4 h-4" />
                              <span>Rename</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsTitleMenuOpen(false);
                                toast.info('Projects integration coming soon');
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-black hover:text-black dark:text-white hover:bg-black/[0.05] dark:bg-white/[0.05] transition-colors flex items-center gap-2.5"
                            >
                              <LayoutGrid className="w-4 h-4" />
                              <span>Add to project</span>
                            </button>
                            <div className="h-[1px] bg-black/[0.05] dark:bg-white/[0.05] my-1" />
                            <button
                              onClick={() => {
                                if (currentConversationId && confirm('Delete this conversation?')) {
                                  handleConversationDelete(currentConversationId);
                                }
                                setIsTitleMenuOpen(false);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2.5"
                            >
                              <HugeiconsIcon icon={Cancel01Icon} size={16} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}

                        {/* Settings Icon (replaced New Chat/Edit) */}
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setIsPersonalityModalOpen(true)}
                              className="p-2 hover:bg-black/5 dark:bg-white/5 rounded-lg transition-all text-black hover:text-black dark:text-white/60 focus:outline-none"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <span className="text-[10px]">Settings</span>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Right Side: StatusBar + New Chat and History */}
                      <div className="flex items-center gap-3">
                        {/* Status Bar — live metrics */}
                        <StatusBar
                          emailsTriaged={0}
                          draftsWaiting={0}
                          meetingsBooked={0}
                          agentsRunning={0}
                          onMetricClick={(id) => {
                            if (id === 'agents') {
                              // Could navigate to agents tab
                            }
                          }}
                        />



                        <div className="flex items-center gap-1">
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startNewChat();
                                }}
                                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-all text-black dark:text-white/60 focus:outline-none focus:ring-0"
                              >
                                <HugeiconsIcon icon={AddSquareIcon} size={20} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <span className="text-[10px]">New Chat</span>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowHistory(!showHistory);
                                }}
                                className={`p-2 rounded-lg transition-all focus:outline-none focus:ring-0 ${showHistory ? 'bg-black/10 dark:bg-white/10 text-black dark:text-white' : 'hover:bg-black/5 dark:bg-white/5 text-black dark:text-white/60'}`}
                              >
                                <HugeiconsIcon icon={WorkHistoryIcon} size={20} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <span className="text-[10px]">History</span>
                            </TooltipContent>
                          </Tooltip>

                          {/* Documents/Artifacts Gallery Button instead of Plan Mode */}
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (showArtifactsPanel) {
                                    setShowArtifactsPanel(false);
                                  } else {
                                    setShowArtifactsPanel(true);
                                    setIsCanvasOpen(false);
                                  }
                                }}
                                className={`p-2 rounded-lg transition-all focus:outline-none focus:ring-0 ${showArtifactsPanel ? 'bg-black/10 dark:bg-white/10 text-black dark:text-white' : 'hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white/60'}`}
                              >
                                <FileText className="w-5 h-5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <span className="text-[10px]">{showArtifactsPanel ? 'Close Library' : 'Library'}</span>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGlobalShare();
                                }}
                                disabled={isSharingGlobal}
                                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-all text-black dark:text-white/60 focus:outline-none focus:ring-0 disabled:opacity-50"
                              >
                                {isSharingGlobal ? (
                                  <div className="w-5 h-5 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin" />
                                ) : (
                                  <Share2 className="w-5 h-5" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <span className="text-[10px]">Share Chat</span>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat Body - Absolute Layout Rebuild to avoid displacement */}
                <div
                  className="flex-1 relative z-20 min-h-0 min-w-0"
                  style={{ flex: '1 1 0%', minHeight: 0, overflow: 'hidden' }}
                >
                  <div
                    ref={scrollContainerRef}
                    className="absolute inset-0 overflow-y-auto px-6 py-4 scroll-smooth arcus-scrollbar"
                    style={{ paddingBottom: isInitialMode ? undefined : '140px' }}
                  >
                    <div className="max-w-3xl mx-auto w-full">
                      {/* Plan Mode View */}
                      {arcusView === 'plan_mode' ? (
                        <div className="py-6">
                          <PlanModeBrief
                            brief={planModeBrief}
                            loading={isPlanModeLoading}
                            onGenerate={generateNewBrief}
                          />
                        </div>
                      ) : (
                        <>
                      {/* Arcus V3 Reactive Plan Cards */}
                      {v3ActivePlans.length > 0 && (
                        <div className="mb-6 space-y-4">
                          {v3ActivePlans.map((plan) => (
                            <PlanArtifactCard
                              key={plan.planId}
                              plan={plan}
                              isNew={true}
                              onUpdate={() => v3Refresh()}
                            />
                          ))}
                        </div>
                      )}
                      {/* Arcus V3 Completed Plans (collapsed) */}
                      {v3CompletedPlans.length > 0 && messages.length === 0 && (
                        <div className="mb-6 space-y-2 opacity-80">
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '0 4px',
                            marginBottom: 8,
                          }}>
                            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.10)' }} />
                            <span style={{
                              fontFamily: 'var(--font-ui, Inter, sans-serif)',
                              fontSize: 11,
                              color: 'var(--text-on-light-tertiary, #8A8D96)',
                            }}>Completed</span>
                            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.10)' }} />
                          </div>
                          {v3CompletedPlans.slice(0, 5).map((plan) => (
                            <PlanArtifactCard
                              key={plan.planId}
                              plan={plan}
                            />
                          ))}
                        </div>
                      )}
                        </>
                      )}
                      {isInitialMode && arcusView === 'feed' ? (
                        <div className="flex flex-col items-center justify-center min-h-[50vh] py-8 animate-fade-in relative">
                          <ArcusDashboard
                            userName={userName}
                            onSendMessage={(msg) => handleSend(msg)}
                            onSuggestionClick={(text) => setSuggestionInput({ text, id: Date.now() })}
                            isLoading={isLoading}
                            emailStats={emailStats}
                            meetings={meetings}
                            actionItems={actionItems}
                            activeTab={dashboardTab}
                            onTabChange={setDashboardTab}
                          >
                            {/* Prompt box passed as children */}
                            <PromptInputBox
                              onSend={(msg, files, opts) => handleSend(msg, files, opts)}
                              onStop={() => abortControllerRef.current?.abort()}
                              isLoading={isLoading}
                              placeholder="Tell Arcus what to do..."
                              onSearchClick={() => { }}
                              onAttachEmailClick={() => setIsEmailSelectionModalOpen(true)}
                              onPersonalityClick={() => setIsPersonalityModalOpen(true)}
                              selectedEmailsCount={selectedEmails.length}
                              suggestionInput={suggestionInput}
                              showConnectBanner={false}
                              onConnectClick={() => setIsIntegrationsModalOpen(true)}
                              currentPlan={currentPlan || 'free'}
                              onUpgradeClick={() => {
                                setUsageLimitModalData({
                                  featureName: 'Premium Models',
                                  currentUsage: 0,
                                  limit: 0,
                                  period: 'monthly',
                                  currentPlan: currentPlan || 'starter'
                                });
                                setIsUsageLimitModalOpen(true);
                              }}
                            />
                          </ArcusDashboard>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-4">
                          {activeMission && <MissionStatusHeader mission={activeMission} />}
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                            >
                              <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} max-w-full items-start`}>
                                {msg.role === 'user' && (
                                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border overflow-hidden bg-[#2b2b2b] border-white/10">
                                    <User2 className="w-4 h-4 text-white/50" />
                                  </div>
                                )}
                                <div className="flex flex-col max-w-[95%] group/msg">
                                  <div className={`transition-all relative overflow-hidden ${msg.role === 'user' ? 'px-5 py-3 rounded-[24px] bg-[#111]/95 backdrop-blur-2xl border border-white/[0.12] text-white shadow-2xl ring-1 ring-white/5' : 'text-white px-0 py-1'}`}>
                                    {msg.role === 'user' && isLoading && msg.id === messages.filter(m => m.role === 'user').pop()?.id && (
                                      <motion.div 
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent w-[200%] pointer-events-none"
                                        animate={{ x: ['-100%', '100%'] }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                      />
                                    )}
                                    {msg.role === 'user' && (
                                      <motion.div 
                                        className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.06] via-transparent to-transparent pointer-events-none"
                                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                      />
                                    )}
                                    {msg.role === 'user' && <UserMessageCopyButton msg={msg} />}
                                    {msg.role === 'assistant' && msg.meta?.limitReached && (
                                      <div className="flex items-center gap-2 mb-3 opacity-60">
                                        <img src="/arcus-ai-icon.jpg" className="w-4 h-4 rounded-md grayscale" />
                                        <span className="text-[12px] text-black dark:text-white/90 font-medium tracking-tight">Arcus AI</span>
                                        <span className="px-1.5 py-0.5 bg-black/10 dark:bg-white/10 text-black dark:text-white/40 text-[9px] font-bold rounded uppercase tracking-widest leading-none">Lite</span>
                                      </div>
                                    )}

                                    {msg.role === 'assistant' && (msg as AgentMessage).meta?.liveThinking && (
                                       <AgentThinkingSection 
                                         content={(msg as AgentMessage).meta!.liveThinking!} 
                                         isComplete={(msg as AgentMessage).meta?.thinkingComplete}
                                       />
                                     )}

                                     {/* Execution steps — above message text, collapsible */}
                                     {msg.role === 'assistant' && (msg as AgentMessage).meta?.agentSteps && !(msg as AgentMessage).meta?.limitReached && ((msg as AgentMessage).meta!.agentSteps!).length > 0 && (
                                       <CollapsibleSteps
                                         steps={(msg as AgentMessage).meta!.agentSteps!}
                                         narratives={(msg as AgentMessage).meta?.agentNarratives}
                                         isActive={(msg as AgentMessage).meta?.isStreaming !== false}
                                         runId={(msg as AgentMessage).meta?.agentRunId}
                                         totalDurationMs={(msg as AgentMessage).meta?.agentDurationMs}
                                       />
                                     )}

                                     {!((msg as AgentMessage).meta?.hasError) && ((msg as AgentMessage).meta?.isStreaming !== true || (typeof msg.content === 'string' ? msg.content : msg.content.text).length > 0 || isAgentLoopActive) && (
                                       <MessageContent
                                         content={msg.content}
                                         isUser={msg.role === 'user'}
                                         isTyping={isLoading && msg.role === 'assistant' && msg.id === messages[messages.length - 1].id}
                                         isNewResponse={msg.role === 'assistant' && msg.id === messages[messages.length - 1].id && !isLoading}
                                         hideLinks={msg.role === 'assistant' && (msg as AgentMessage).meta?.limitReached}
                                       />
                                     )}

                                    {msg.role === 'user' && (msg as UserMessage).attachments && (msg as UserMessage).attachments!.length > 0 && (
                                      <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-neutral-200 dark:border-white/10">
                                        {(msg as UserMessage).attachments!.map((file, idx) => (
                                          <div key={idx} className="flex items-center gap-2 p-2 bg-black/5 dark:bg-white/5 rounded-lg border border-neutral-200 dark:border-white/10 max-w-[200px]">
                                            {file.type.startsWith('image/') ? (
                                              <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0">
                                                <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                              </div>
                                            ) : (
                                              <div className="w-8 h-8 rounded-md bg-black/5 flex items-center justify-center flex-shrink-0">
                                                <HugeiconsIcon icon={WorkHistoryIcon} size={16} className="text-black/40" />
                                              </div>
                                            )}
                                            <div className="flex flex-col overflow-hidden">
                                              <span className="text-[11px] font-medium truncate">{file.name}</span>
                                              <span className="text-[9px] opacity-40">{(file.size / 1024).toFixed(0)} KB</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {msg.role === 'assistant' && msg.notes && msg.notes.length > 0 && (
                                      <div className="mt-4 space-y-3 pt-4 border-t border-graphite-border/50">
                                        <div className="grid grid-cols-1 gap-3">
                                          {msg.notes.map((note: any, idx: number) => (
                                            <div key={note.id || idx} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
                                              <div className="text-graphite-text font-medium leading-snug mb-1">{note.subject || '(No Subject)'}</div>
                                              {note.content && <div className="text-graphite-muted text-sm line-clamp-2">{note.content}</div>}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {msg.role === 'assistant' && msg.meta?.internalThought && (
                                      <details className="mt-4 border-t border-neutral-200 dark:border-white/5 pt-3 group/thought">
                                        <summary className="flex items-center gap-2 cursor-pointer text-black hover:text-black dark:text-white/60 transition-colors list-none">
                                          <BrainCircuit className="w-3.5 h-3.5" />
                                          <span className="text-[11px] font-bold tracking-wide uppercase">Internal Reasoning</span>
                                          <ChevronDown className="w-3 h-3 transition-transform group-open/thought:rotate-180" />
                                        </summary>
                                        <div className="mt-2 pl-4 border-l border-neutral-200 dark:border-white/10 py-2">
                                          <p className="text-black dark:text-white/40 text-[12px] leading-relaxed whitespace-pre-wrap italic">
                                            {msg.meta.internalThought}
                                          </p>
                                        </div>
                                      </details>
                                    )}



                                    {/* Plan Canvas (Inline + Full-Screen Modal) */}
                                    {msg.role === 'assistant' && (msg as AgentMessage).meta?.planArtifact && (
                                      <div className="mt-4">
                                        <PlanCanvas
                                          plan={(msg as AgentMessage).meta!.planArtifact!}
                                          onExecute={async (planId) => {
                                            await handlePlanApprove(planId, msg.id as number);
                                          }}
                                          onDecline={async (planId) => {
                                            await handleDeclinePlan((msg as AgentMessage).meta!.planArtifact!);
                                          }}
                                          isProcessing={isProcessingPlan}
                                        />
                                      </div>
                                    )}

                                    {/* Plan intro paragraph */}
                                    {msg.role === 'assistant' && (msg as AgentMessage).meta?.planIntro && (
                                      <p className="text-[13px] text-white/55 leading-[1.7] mb-1 mt-1">
                                        {(msg as AgentMessage).meta!.planIntro}
                                      </p>
                                    )}

                                    {/* Chat Plan Card — rendered when plan mode generates a plan */}
                                    {msg.role === 'assistant' && (msg as AgentMessage).meta?.planCard && (
                                      <ChatPlanCard
                                        plan={(msg as AgentMessage).meta!.planCard!}
                                        onExecute={(plan) => {
                                          // Update card status to executing
                                          setMessages(prev => prev.map(m =>
                                            m.id === msg.id && m.type === 'agent'
                                              ? { ...m, meta: { ...(m as AgentMessage).meta, planCard: { ...plan, status: 'executing' as const } } }
                                              : m
                                          ));
                                          // Run the plan step by step via the agent loop
                                          const execMessage = `Execute this plan step by step, using available tools for each action item:\n\n${plan.markdown}`;
                                          if (currentConversationId) {
                                            processAIMessage(execMessage, currentConversationId, false, [], { isPlanMode: false });
                                          }
                                          // Mark as completed after agent loop finishes (optimistic)
                                          setTimeout(() => {
                                            setMessages(prev => prev.map(m =>
                                              m.id === msg.id && m.type === 'agent'
                                                ? { ...m, meta: { ...(m as AgentMessage).meta, planCard: { ...plan, status: 'completed' as const } } }
                                                : m
                                            ));
                                          }, 500);
                                        }}
                                        onCancel={(plan) => {
                                          // Mark as cancelled
                                          setMessages(prev => prev.map(m =>
                                            m.id === msg.id && m.type === 'agent'
                                              ? { ...m, meta: { ...(m as AgentMessage).meta, planCard: { ...plan, status: 'cancelled' as const } } }
                                              : m
                                          ));
                                          // AI acknowledges cancellation
                                          if (currentConversationId) {
                                            processAIMessage('The user cancelled the plan. Ask them what else you can help with.', currentConversationId, false, [], { isPlanMode: false });
                                          }
                                        }}
                                      />
                                    )}

                                    {/* Phase 2: Canvas Expansion Prompt */}
                                    {msg.role === 'assistant' && (msg as AgentMessage).meta?.canvasExpansion && (
                                      <div
                                        className="mt-4 p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] backdrop-blur-sm"
                                      >
                                        <p className="text-[13px] text-black/50 dark:text-white/50 mb-3">
                                          This content is quite rich. Would you like to expand it on the canvas for a better view?
                                        </p>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => setIsCanvasOpen(true)}
                                            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-[12px] font-bold rounded-xl hover:bg-black/80 dark:hover:bg-neutral-200 transition-all"
                                          >
                                            Yes, open canvas
                                          </button>
                                          <button
                                            onClick={() => {
                                              // Remove the expansion prompt from this message
                                              setMessages(prev => prev.map(m => {
                                                if (m.id === msg.id && m.type === 'agent') {
                                                  return { ...m, meta: { ...(m as AgentMessage).meta, canvasExpansion: undefined } };
                                                }
                                                return m;
                                              }));
                                            }}
                                            className="px-4 py-2 text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 text-[12px] font-bold rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-all"
                                          >
                                            No, keep it here
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                    {/* Search Execution Panel (Phase 4) */}
                                    {msg.role === 'assistant' && (msg as AgentMessage).meta?.searchExecution && (
                                      <div className="mt-4">
                                        <SearchExecutionPanel
                                          mainQuery={(msg as AgentMessage).meta!.searchExecution!.mainQuery}
                                          subQueries={(msg as AgentMessage).meta!.searchExecution!.subQueries}
                                          isSearching={(msg as AgentMessage).meta!.searchExecution!.isSearching}
                                          sources={(msg as AgentMessage).meta!.searchExecution!.sources}
                                          answer={(msg as AgentMessage).meta!.searchExecution!.answer}
                                          onSourceClick={(source) => {
                                            if (source.url) {
                                              window.open(source.url, '_blank');
                                            }
                                          }}
                                        />
                                      </div>
                                    )}



                                    {msg.role === 'assistant' && msg.meta?.limitReached && (
                                      <div className="flex flex-col gap-3 mt-4">
                                        <div className="flex flex-col gap-1 px-1">
                                          <p className="text-white/80 text-[14px] font-medium tracking-tight">
                                            You don't have enough credits. Please upgrade via the below link to continue.
                                          </p>
                                          <a
                                            href="/pricing"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-white/40 text-[13px] hover:text-white/60 underline underline-offset-4 transition-colors w-fit break-all"
                                          >
                                            https://mailient.xyz/pricing
                                          </a>
                                        </div>

                                        <div className="group relative flex items-center justify-between gap-4 px-6 py-4 w-full max-w-[700px] bg-[#0a0a0a] border border-white/[0.08] rounded-2xl transition-all duration-500 hover:border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden mt-4">
                                          {/* Premium Sweep Animation */}
                                          <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/[0.05] to-transparent w-[200%]"
                                            animate={{ x: ['-100%', '100%'] }}
                                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                          />
                                          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                                          <div className="flex items-center gap-3.5 z-10">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 relative overflow-hidden">
                                              <motion.div
                                                className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent"
                                                animate={{ opacity: [0.3, 0.6, 0.3] }}
                                                transition={{ repeat: Infinity, duration: 2 }}
                                              />
                                              <Sparkles className="w-5 h-5 text-blue-400 z-10" />
                                            </div>
                                            <p className="text-white/90 text-[13.5px] font-medium tracking-tight">
                                              {arcusCredits && (arcusCredits.remaining > 0 || arcusCredits.isUnlimited)
                                                ? "Your credits have been updated. You can have Arcus continue working on this task."
                                                : "Your credits have been used up. Please upgrade your plan for more credits."}
                                            </p>
                                          </div>

                                          {arcusCredits && (arcusCredits.remaining > 0 || arcusCredits.isUnlimited) ? (
                                            <button
                                              disabled={msg.meta.continueClicked}
                                              onClick={() => handleContinueWithCredits(msg.id as number)}
                                              className="relative z-10 px-6 py-2 bg-white hover:bg-neutral-200 text-black font-bold text-[13px] tracking-tight rounded-full transition-all active:scale-95 shadow-lg shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                                            >
                                              {msg.meta.continueClicked ? 'Continued' : 'Continue'}
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() => window.open('/pricing', '_blank')}
                                              className="relative z-10 px-6 py-2 bg-white hover:bg-neutral-200 text-black font-bold text-[13px] tracking-tight rounded-full transition-all active:scale-95 shadow-lg shrink-0"
                                            >
                                              Upgrade
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {msg.role === 'assistant' && (msg as AgentMessage).meta?.canvasApproval && (
                                      <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <div className={cn(
                                          "relative group overflow-hidden bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-white/5 rounded-2xl p-5 shadow-2xl transition-all",
                                          (msg as AgentMessage).meta!.canvasApproval!.status !== 'pending' && "opacity-60"
                                        )}>
                                          <div className="flex items-start gap-3.5 relative z-10">
                                            <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 border border-neutral-200 dark:border-white/10 flex items-center justify-center shrink-0">
                                              <Sparkles className={cn("w-5 h-5", (msg as AgentMessage).meta!.canvasApproval!.status === 'accepted' ? "text-blue-400" : "text-black dark:text-white/40")} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <h4 className="text-black dark:text-white font-bold text-[14px] tracking-tight mb-1">
                                                {(msg as AgentMessage).meta!.canvasApproval!.title || 'Launch Arcus Mission?'}
                                              </h4>
                                              <p className="text-black dark:text-white/40 text-[12px] leading-relaxed line-clamp-2">
                                                {(msg as AgentMessage).meta!.canvasApproval!.description || 'This request would be best handled in the specialized Arcus Workspace. Would you like to open it?'}
                                              </p>
                                            </div>
                                          </div>

                                          {(msg as AgentMessage).meta!.canvasApproval!.status === 'pending' ? (
                                            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/[0.03]">
                                              <button
                                                onClick={() => handleAcceptCanvas(msg.id as number)}
                                                className="px-5 py-2 bg-white hover:bg-neutral-200 text-black font-bold text-[12px] rounded-full transition-all flex items-center gap-2 active:scale-95"
                                              >
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>Yes, open Canvas</span>
                                              </button>
                                              <button
                                                onClick={() => handleDeclineCanvas(msg.id as number)}
                                                className="px-5 py-2 bg-black/5 hover:bg-black/10 dark:bg-white/10 text-black dark:text-white/60 font-medium text-[12px] rounded-full transition-all active:scale-95"
                                              >
                                                <span>No, stay here</span>
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/[0.03]">
                                              <div className="flex items-center gap-2 px-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-full border border-neutral-200 dark:border-white/5">
                                                {(msg as AgentMessage).meta!.canvasApproval!.status === 'accepted' ? (
                                                  <div className="flex items-center gap-2 text-blue-400 text-[12px] font-bold">
                                                    <Check className="w-4 h-4" />
                                                    <span>Mission Accepted</span>
                                                  </div>
                                                ) : (
                                                  <div className="flex items-center gap-2 text-black dark:text-white/30 text-[12px] font-bold">
                                                    <X className="w-4 h-4" />
                                                    <span>Stayed in chat</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {msg.role === 'assistant' && (msg as AgentMessage).meta?.result && !(msg as AgentMessage).meta?.canvasApproval && (
                                      <ResultCard
                                        type={(msg as AgentMessage).meta!.result!.type}
                                        title={(msg as AgentMessage).meta!.result!.title}
                                        rawContent={(msg as AgentMessage).meta!.result!.canvasData?.raw || (typeof (msg as AgentMessage).meta!.result!.canvasData?.content === 'string' ? (msg as AgentMessage).meta!.result!.canvasData?.content : undefined)}
                                        onView={() => {
                                          if ((msg as AgentMessage).meta?.result) {
                                            setCanvasData((msg as AgentMessage).meta!.result!.canvasData);
                                            setIsCanvasOpen(true);
                                          }
                                        }}
                                      />
                                    )}

                                    {/* Error card — replaces message when AI fails */}
                                    {msg.role === 'assistant' && (msg as AgentMessage).meta?.hasError && (
                                      <ArcusErrorCard
                                        errorMessage={(msg as AgentMessage).meta?.errorMessage}
                                        onRetry={() => {
                                          // Find the last user message before this one
                                          const msgIdx = messages.findIndex(m => m.id === msg.id);
                                          const prevUser = [...messages.slice(0, msgIdx)].reverse().find(m => m.role === 'user');
                                          const retryText = prevUser
                                            ? (typeof prevUser.content === 'string' ? prevUser.content : (prevUser.content as any).text || '')
                                            : '';
                                          if (retryText && currentConversationId) {
                                            // Clear the error message first
                                            setMessages(prev => prev.filter(m => m.id !== msg.id));
                                            processAIMessage(retryText, currentConversationId, false);
                                          }
                                        }}
                                      />
                                    )}

                                    {/* Draft Reply Box — appears below message when a Gmail draft is ready */}
                                    {msg.role === 'assistant' && (msg as AgentMessage).meta?.draftReply && !(msg as AgentMessage).meta?.isStreaming && (
                                      <DraftReplyBox
                                        isVisible={true}
                                        draftData={(msg as AgentMessage).meta!.draftReply!}
                                        onDismiss={() => {
                                          setMessages(prev => prev.map(m =>
                                            m.id === msg.id ? { ...m, meta: { ...(m as AgentMessage).meta, draftReply: undefined } } : m
                                          ));
                                        }}
                                        onSendReply={async ({ content, recipientEmail, subject, threadId }) => {
                                          const res = await fetch('/api/agent-talk/send-email', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ to: recipientEmail, subject, body: content, threadId }),
                                          });
                                          if (!res.ok) throw new Error('Failed to send email');

                                          // Dismiss the draft box
                                          setMessages(prev => prev.map(m =>
                                            m.id === msg.id ? { ...m, meta: { ...(m as AgentMessage).meta, draftReply: undefined } } : m
                                          ));

                                          // Inject a confirmation message from Arcus
                                          const recipientName = (msg as AgentMessage).meta?.draftReply?.recipientName || recipientEmail.split('@')[0];
                                          const confirmId = Date.now() + 2;
                                          setMessages(prev => [...prev, {
                                            id: confirmId,
                                            role: 'assistant' as const,
                                            type: 'agent' as const,
                                            content: { text: `✅ Email sent to **${recipientName}**. They'll receive the message — including the meeting details and Google Meet link — in their inbox.`, list: [], footer: '' },
                                            time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                                            meta: {},
                                          } as any]);
                                        }}
                                      />
                                    )}

                                    {/* Connector Required Panel — shown when execution needs an integration */}
                                    {msg.role === 'assistant' && (msg as AgentMessage).meta?.connectorRequired && !(msg as AgentMessage).meta?.connectorRequired?.dismissed && (
                                      <ConnectorRequiredPanel
                                        connectors={(msg as AgentMessage).meta!.connectorRequired!.connectors}
                                        waitingForUser={(msg as AgentMessage).meta!.connectorRequired!.waitingForUser ?? true}
                                        onConnect={(id) => {
                                          setIsIntegrationsModalOpen(true);
                                        }}
                                        onSkip={() => {
                                          setMessages(prev => prev.map(m =>
                                            m.id === msg.id
                                              ? { ...m, meta: { ...(m as AgentMessage).meta, connectorRequired: { ...(m as AgentMessage).meta!.connectorRequired!, dismissed: true } } }
                                              : m
                                          ));
                                        }}
                                        onApply={() => {
                                          setMessages(prev => prev.map(m =>
                                            m.id === msg.id
                                              ? { ...m, meta: { ...(m as AgentMessage).meta, connectorRequired: { ...(m as AgentMessage).meta!.connectorRequired!, dismissed: true, waitingForUser: false } } }
                                              : m
                                          ));
                                        }}
                                        onViewAll={() => setIsIntegrationsModalOpen(true)}
                                      />
                                    )}

                                    {/* Action buttons — AFTER all cards */}
                                    {msg.role === 'assistant' && !(msg as AgentMessage).meta?.limitReached && !(msg as AgentMessage).meta?.isStreaming && !(msg as AgentMessage).meta?.hasError && (
                                      <MessageActionButtons
                                        msg={msg}
                                        isLoading={isLoading}
                                        onFeedback={(type, id) => setFeedbackModal({ isOpen: true, type, msgId: id })}
                                        onRegenerate={handleRegenerateClick}
                                        onShare={async () => {
                                          if (!currentConversationId || messages.length === 0) return null;
                                          try {
                                            const res = await fetch('/api/agent-talk/share', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                conversationId: currentConversationId,
                                                messages,
                                                title: chatTitle || messages[0]?.content?.toString?.()?.slice(0, 60) || 'Conversation',
                                              }),
                                            });
                                            const data = await res.json();
                                            return data.shareUrl || null;
                                          } catch { return null; }
                                        }}
                                      />
                                    )}
                                  </div>
                                  <div className={`mt-2 px-1 text-[10px] tracking-tight text-graphite-muted-2 opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                    {msg.time}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {/* All processing animations removed per request */}
                          <div ref={messagesEndRef} className="h-8" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scroll to Bottom Button */}
                  <AnimatePresence>
                    {showScrollButton && !isInitialMode && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute bottom-[110px] right-12 z-50"
                      >
                        <button
                          onClick={() => scrollToBottom(false)}
                          className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(255,255,255,0.2)] hover:scale-110 active:scale-95 transition-all group"
                        >
                          <ChevronDown className="w-6 h-6 group-hover:translate-y-0.5 transition-transform" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Fixed Prompt Box for Conversation Mode */}
                  {!isInitialMode && (
                    <div
                      className="absolute bottom-0 left-0 right-0 z-50 bg-black"
                      style={{ backgroundColor: '#000000' }}
                    >
                      {/* Shadow gradient to hide content as it scrolls under prompt box */}
                      <div className="absolute bottom-full left-0 right-0 h-12 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none" />

                      <div className="max-w-3xl mx-auto w-full px-6 py-6 relative">
                        {/* Task progress — collapsed by default, expands upward above prompt */}
                        {liveTaskList && (
                          <TaskProgressCard
                            taskList={liveTaskList}
                            isActive={isAgentLoopActive}
                          />
                        )}
                        {/* Live task widget — shows active/done tool steps above prompt */}
                        <LiveTaskWidget steps={agentSteps} isActive={isAgentLoopActive} />
                        <PromptInputBox
                          onSend={(msg, files, opts) => handleSend(msg, files, opts)}
                          onStop={() => abortControllerRef.current?.abort()}
                          isLoading={isLoading}
                          placeholder="Ask follow-up..."
                          onSearchClick={() => { }}
                          onAttachEmailClick={() => setIsEmailSelectionModalOpen(true)}
                          onPersonalityClick={() => setIsPersonalityModalOpen(true)}
                          selectedEmailsCount={selectedEmails.length}
                          suggestionInput={suggestionInput}
                          onConnectClick={() => setIsIntegrationsModalOpen(true)}
                          currentPlan={currentPlan || 'free'}
                          hideShadow={isActuallyAtBottom}
                          onUpgradeClick={() => {
                            setUsageLimitModalData({
                              featureName: 'Premium Models',
                              currentUsage: 0,
                              limit: 0,
                              period: 'monthly',
                              currentPlan: currentPlan || 'starter'
                            });
                            setIsUsageLimitModalOpen(true);
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Canvas Sidebar or Artifacts Gallery Sidebar (Order 2 - RIGHT) */}
              <AnimatePresence mode="wait">
                {isCanvasOpen && canvasData ? (
                  <motion.div
                    key="canvas-panel"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="h-full flex-shrink-0 bg-[#161616] border border-neutral-200 dark:border-white/5 rounded-[32px] z-50 overflow-hidden order-2 relative shadow-2xl"
                  >
                    <CanvasPanel
                      isOpen={isCanvasOpen}
                      onClose={() => setIsCanvasOpen(false)}
                      canvasData={canvasData}
                      onExecute={handleCanvasExecute}
                      isExecuting={isCanvasExecuting}
                      isSidebarCollapsed={isSidebarCollapsed}
                    />
                  </motion.div>
                ) : showArtifactsPanel ? (
                  <motion.div
                    key="artifacts-gallery"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="h-full flex-shrink-0 bg-[#161616] border border-neutral-200 dark:border-white/5 rounded-[32px] z-50 overflow-hidden order-2 relative shadow-2xl"
                  >
                    <ArtifactsGalleryPanel
                      isOpen={showArtifactsPanel}
                      onClose={() => setShowArtifactsPanel(false)}
                      onSelectArtifact={(data) => {
                        setCanvasData(data);
                        setIsCanvasOpen(true);
                        setShowArtifactsPanel(false);
                      }}
                      isSidebarCollapsed={isSidebarCollapsed}
                      messages={messages}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </LayoutGroup>
        </div>
        <NoScrollbarStyles />
        <ConnectorsModal isOpen={isIntegrationsModalOpen} onClose={() => setIsIntegrationsModalOpen(false)} onTryOut={handleTryOut} />
        <EmailSelectionModal
          isOpen={isEmailSelectionModalOpen}
          onClose={() => setIsEmailSelectionModalOpen(false)}
          onSelectEmails={(emails: Email[]) => {
            setSelectedEmails(prev => [...prev, ...emails]);
            setIsEmailSelectionModalOpen(false);
          }}
        />
        <PersonalitySettingsModal isOpen={isPersonalityModalOpen} onClose={() => setIsPersonalityModalOpen(false)} onSave={handleSavePersonality} initialPersonality={savedPersonality} />

        {/* Global Modals for Sidebar Actions */}
        <AnimatePresence>
          {isSettingsOpen && <SettingsCard onClose={() => setIsSettingsOpen(false)} />}
          {isHelpOpen && <HelpCard onClose={() => setIsHelpOpen(false)} />}
          {isRewardsOpen && (
            <RewardsCard
              onClose={() => setIsRewardsOpen(false)}
              usageData={{
                planType: (arcusCredits?.isUnlimited ? 'pro' : 'starter'),
                features: {
                  arcus_ai: {
                    usage: arcusCredits?.usage ?? 0,
                    limit: arcusCredits?.limit ?? 10,
                    remaining: arcusCredits?.remaining ?? 10,
                    period: arcusCredits?.period ?? 'daily',
                    isUnlimited: !!arcusCredits?.isUnlimited
                  },
                  sift_ai: { usage: 0, limit: 5, remaining: 5, isUnlimited: false, period: 'daily' }
                }
              }}
            />
          )}
        </AnimatePresence>

        {/* Feedback Modal for Like/Dislike */}
        <AnimatePresence>
          {feedbackModal.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
              >
                <div className="p-6">
                  <h3 className="text-white text-lg font-bold mb-2 tracking-tight">
                    {feedbackModal.type === 'like' ? 'What did you like about this?' : 'How can we improve this?'}
                  </h3>
                  <p className="text-white/50 text-[13px] mb-4">
                    {feedbackModal.type === 'like' ? 'Your feedback helps Arcus learn your preferences and tailor future responses.' : 'Your feedback helps Arcus avoid mistakes and improve reasoning accuracy.'}
                  </p>
                  <textarea
                    className="w-full h-32 bg-black border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 resize-none text-[13px]"
                    placeholder={feedbackModal.type === 'like' ? 'I liked how...' : 'It would be better if...'}
                    autoFocus
                  />
                </div>
                <div className="px-6 py-4 bg-[#0a0a0a] border-t border-white/5 flex items-center justify-end gap-3">
                  <button onClick={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 text-white/50 hover:text-white text-[13px] font-medium transition-colors">Cancel</button>
                  <button onClick={() => {
                    toast.success('Feedback submitted', { description: 'Thank you for helping improve Arcus AI.' });
                    setFeedbackModal(prev => ({ ...prev, isOpen: false }));
                  }} className="px-5 py-2 bg-white text-black text-[13px] font-bold rounded-full hover:bg-neutral-200 transition-colors">Submit</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Regenerate Confirmation Modal */}
        <AnimatePresence>
          {regenerateModal.isOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setRegenerateModal({ isOpen: false, msgId: null })}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
              >
                <div className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <svg className="w-6 h-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <h3 className="text-white text-lg font-bold mb-2 tracking-tight">Regenerate reply?</h3>
                  <p className="text-white/40 text-[13px] leading-relaxed">
                    This will remove the current response and Arcus will attempt to generate a new one based on your request.
                  </p>
                </div>
                <div className="px-6 py-4 bg-[#0a0a0a] border-t border-white/5 flex items-center gap-3">
                  <button onClick={() => setRegenerateModal({ isOpen: false, msgId: null })} className="flex-1 px-4 py-2.5 text-white/50 hover:text-white text-[13px] font-bold transition-colors bg-white/5 hover:bg-white/10 rounded-xl">Cancel</button>
                  <button onClick={handleConfirmRegenerate} className="flex-1 px-4 py-2.5 bg-white text-black text-[13px] font-bold rounded-xl hover:bg-neutral-200 transition-colors">Regenerate</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    </TooltipProvider>
  );
}
