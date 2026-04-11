"use client";

import { Send, Mail, Upload, User, User2, MessageCircle, DoorOpen, Bell, Mail as EmailIcon, MoreHorizontal, LogOut, Settings, ChevronRight, ChevronDown, CheckCircle2, Circle, Edit, History, LayoutGrid, Zap, Volume2, Sparkles, FileText, Calendar, BarChart3, PenTool, BrainCircuit, Search, Check, X, PanelLeft, Menu } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { AddSquareIcon, Cancel01Icon, WorkHistoryIcon } from '@hugeicons/core-free-icons';
import { ChatHistoryModal } from './components/ChatHistoryModal';
import { ThinkingLayer, ResultCard, type ThinkingStep, type ThinkingBlock, type SearchSession } from './components/ThinkingLayer';
import { CanvasPanel, type CanvasData } from './components/CanvasPanel';
import { PlanArtifactCard, type PlanArtifact } from './components/PlanArtifactCard';
import { SearchExecutionPanel } from './components/SearchExecutionPanel';
import { ConnectorBar } from './components/ConnectorBar';

import { PromptInputBox } from '@/components/ui/ai-prompt-box';
import { ConnectorsModal } from '@/components/ui/connectors-modal';
import { EmailSelectionModal } from '@/components/ui/email-selection-modal';
import { PersonalitySettingsModal } from '@/components/ui/personality-settings-modal';
import { GradientButton } from '@/components/ui/gradient-button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { HomeFeedSidebar } from "@/components/ui/home-feed-sidebar";
import { TextShimmer } from '@/components/ui/text-shimmer';
import NotesFetchingDisplay from '@/components/ui/notes-fetching-display';
import { UsageLimitModal } from '@/components/ui/usage-limit-modal';
import { SettingsCard } from '@/components/ui/settings-card';
import { HelpCard } from '@/components/ui/help-card';
import { RewardsCard } from '@/components/ui/rewards-card';
import { ShiningText } from '@/components/ui/shining-text';
import { Note } from '@/components/ui/note';
import { Button as Button1 } from '@/components/ui/button-1';
import { MorphingSquare } from '@/components/ui/morphing-square';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { GradientWave } from "@/components/ui/gradient-wave";

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

const renderMarkdown = (text: string, isUser: boolean = false): string => {
  if (!text) return text;

  const paragraphs = text.split(/\n\n+/);

  const renderedParagraphs = paragraphs.map(para => {
    let processedPara = para.replace(/\*\*(.*?)\*\*/g, `<strong class="font-bold text-black dark:text-white tracking-tight">$1</strong>`);

    if (processedPara.includes('\n- ') || processedPara.startsWith('- ') || processedPara.includes('\n* ') || processedPara.startsWith('* ')) {
      const lines = processedPara.split('\n');
      const listItems = lines.map(line => {
        const match = line.match(/^[\s]*[-*]\s*(.*)$/);
        if (match) {
          return `<li class="ml-4 py-1">${match[1]}</li>`;
        }
        return line;
      });

      let joinedList = listItems.join('\n');
      const listBg = isUser ? 'bg-black/[0.03]' : 'bg-black/[0.02] dark:bg-white/[0.02]';
      const listBorder = isUser ? 'border-black/[0.05]' : 'border-white/[0.05]';
      joinedList = joinedList.replace(/(<li[\s\S]*?<\/li>(?:\n<li[\s\S]*?<\/li>)*)/g, `<ul class="space-y-1 my-6 list-none ${listBg} p-6 rounded-2xl border ${listBorder} relative shadow-inner overflow-hidden"><div class="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>$1</ul>`);
      return joinedList;
    }

    processedPara = linkify(processedPara, isUser);
    processedPara = processedPara.replace(/\n/g, '<br/>');

    const textColorClass = isUser ? "text-black dark:text-white" : "text-black dark:text-white/70";
    return `<p class="mb-3 last:mb-0 leading-relaxed ${textColorClass} text-[14px]">${processedPara}</p>`;
  });

  return renderedParagraphs.join('');
};

const MessageContent = ({ content, isUser }: { content: any, isUser?: boolean }) => {
  if (typeof content === 'string') {
    return <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content, isUser) }} />;
  }
  return (
    <div className="space-y-4">
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content.text, isUser) }} />
      {content.list && content.list.length > 0 && (
        <ul className="space-y-2 mt-2">
          {content.list.map((item: string, i: number) => (
            <li key={i} className="flex gap-2 items-start">
              <div className="w-1 h-1 rounded-full bg-current mt-2 opacity-50" />
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(item, isUser) }} />
            </li>
          ))}
        </ul>
      )}
      {content.footer && (
        <div className="mt-4 italic opacity-60 text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(content.footer, isUser) }} />
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

function extractThought(message: string): { thought: string; cleanText: string } {
  if (typeof message !== 'string') return { thought: '', cleanText: '' };
  const thoughtMatch = message.match(/<thought>([\s\S]*?)<\/thought>/i);
  if (thoughtMatch) {
    const thought = thoughtMatch[1].trim();
    const cleanText = message.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
    return { thought, cleanText };
  }
  return { thought: '', cleanText: message.trim() };
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
    planCard?: any;
    agentProcess?: any;
    completedSteps?: string[];
    thinkingBlocks?: ThinkingBlock[];
    internalThought?: string;
    isStreaming?: boolean;
    actionHistory?: any[];
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
    planArtifact?: PlanArtifact; // Phase 2: Plan artifact for execution
    executionResult?: any; // Phase 1: Execution gateway result
    error?: any; // Phase 1: Error with recovery hints
    recoveryHint?: any; // Phase 1: Error recovery guidance
    externalRefs?: any; // Phase 1: External references from execution
    requiresRetry?: boolean; // Phase 1: Whether retry is required
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

const THINKING_MESSAGES = ["Thinking", "Processing", "Analyzing", "Synthesizing", "Organizing", "Reviewing", "Refining", "Checking", "Polishing"];

const DEEP_THINKING_MESSAGES = ["Thinking deep", "Reasoning", "Simulating outcomes", "Analyzing layers", "Synthesizing deep context", "Architecting solution", "Deeply processing", "Refining logic"];

function RollingThinkingStatus({ onToggle, isOpen, isDeepThinking }: { onToggle: () => void, isOpen: boolean, isDeepThinking?: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const [index, setIndex] = useState(0);
  const messages = isDeepThinking ? DEEP_THINKING_MESSAGES : THINKING_MESSAGES;

  useEffect(() => {
    let timer: any;
    if (!isOpen) {
      timer = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, index === 0 ? (isDeepThinking ? 8000 : 5000) : (isDeepThinking ? 4000 : 2500));
    return () => clearTimeout(timer);
  }, [index, isDeepThinking, messages.length]);

  return (
    <div className="flex items-center justify-between w-full group/status cursor-pointer select-none" onClick={onToggle}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-1">
          <TextShimmer className="text-[14px] font-medium tracking-tight text-black dark:text-white/90" duration={1.5}>
            {`Thinking for ${elapsed}s`}
          </TextShimmer>
        </div>
      </div>

      <div className={`p-1 rounded-md transition-all duration-300 ${isOpen ? 'bg-black/10 dark:bg-white/10 text-black dark:text-white' : 'text-black dark:text-white/20 group-hover/status:text-black dark:group-hover/status:text-white/50'}`}>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isOpen ? 'rotate-180' : ''}`} />
      </div>
    </div>
  );
}

interface ChatInterfaceProps {
  initialConversationId?: string | null;
  onConversationSelect?: (conversationId: string) => void;
  onNewChat?: () => void;
  onConversationDelete?: (conversationId: string) => void;
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

export default function ChatInterface({
  initialConversationId = null,
  onConversationSelect,
  onNewChat,
  onConversationDelete
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
  const [isEmailSelectionModalOpen, setIsEmailSelectionModalOpen] = useState<boolean>(false);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState<boolean>(false);
  const [isPersonalityModalOpen, setIsPersonalityModalOpen] = useState<boolean>(false);
  const [savedPersonality, setSavedPersonality] = useState<string>('');
  const [gmailAccessToken, setGmailAccessToken] = useState<string | null>(null);
  const [gmailTokenSource, setGmailTokenSource] = useState<string | null>(null);
  const [isNotesQuery, setIsNotesQuery] = useState<boolean>(false);
  const [notesSearchQuery, setNotesSearchQuery] = useState<string>('');
  const [showNotesFetching, setShowNotesFetching] = useState<boolean>(false);
  const [notesResults, setNotesResults] = useState<any[]>([]);

  // Arcus V2 State
  const [activeMission, setActiveMission] = useState<any>(null);
  const [pendingReplyProposal, setPendingReplyProposal] = useState<any>(null);

  // Live thinking state (AI-generated, shown during loading)
  const [liveThinkingBlocks, setLiveThinkingBlocks] = useState<ThinkingBlock[]>([]);
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
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [isCanvasExecuting, setIsCanvasExecuting] = useState(false);
  const [activeRun, setActiveRun] = useState<{ runId: string; status?: string; phase?: string } | null>(null);
  const [isProcessingPlan, setIsProcessingPlan] = useState(false);
  const [isDeepThinkingState, setIsDeepThinkingState] = useState<boolean>(false);
  const [isSearchingState, setIsSearchingState] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);



  // Subscription state - to hide upgrade button for Pro users
  const [currentPlan, setCurrentPlan] = useState<'free' | 'starter' | 'pro' | 'none' | null>(null);

  const [arcusCredits, setArcusCredits] = useState<{
    usage: number;
    limit: number;
    remaining: number;
    period: 'daily' | 'monthly';
    isUnlimited?: boolean;
  } | null>(null);

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
    toast.success('Mission accepted', { description: 'Opening Arcus Workspace...' });
  }, []);

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
    toast.info('Mission declined', { description: 'Continuing in chat mode.' });
  }, []);

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

  const processAIMessage = async (messageText: string, conversationIdToUse: string, isNew: boolean, attachments?: any[], options?: { isDeepThinking?: boolean; isCanvas?: boolean; isSearch?: boolean; isPlanMode?: boolean }) => {
    // Create new abort controller for this request
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const assistantMsgId = Date.now() + 1;

    try {
      setIsLoading(true);

      const isDeepThinking = options?.isDeepThinking || false;
      const isCanvas = options?.isCanvas || false;
      const isSearch = options?.isSearch || false;
      const isPlanMode = options?.isPlanMode || false;

      setIsDeepThinkingState(isDeepThinking);
      setIsSearchingState(isSearch);

      if (isDeepThinking) {
        setLiveThinkingBlocks([{
          id: 'deep-block',
          title: 'Deep Reasoning Process',
          status: 'active',
          initialContext: 'Initializing multi-path logical analysis...',
          steps: [
            { id: 'deep-analyze', label: 'Analyzing request for deep reasoning...', status: 'active', type: 'think' },
            { id: 'deep-context', label: 'Performing comprehensive context retrieval...', status: 'pending', type: 'search' },
            { id: 'deep-reasoning', label: 'Processing logical pathways and edge cases...', status: 'pending', type: 'think' },
            { id: 'deep-synthesis', label: 'Synthesizing final high-quality resolution...', status: 'pending', type: 'analyze' }
          ]
        }]);
      } else if (isSearch) {
        setLiveThinkingBlocks([{
          id: 'search-block',
          title: 'Advanced Search',
          status: 'active',
          initialContext: 'Configuring deep search parameters...',
          steps: [
            { id: 'search-intent', label: 'Identifying search parameters...', status: 'active', type: 'analyze' },
            { id: 'search-exec', label: 'Executing deep email search...', status: 'pending', type: 'search' },
            { id: 'search-process', label: 'Processing search results...', status: 'pending', type: 'analyze' }
          ]
        }]);
      } else {
        setLiveThinkingBlocks(buildFallbackThinkingBlocks(messageText));
      }

      // Detect query types
      const notesQuery = isNotesRelatedQuery(messageText);
      setIsNotesQuery(notesQuery);
      let extractedQuery = '';
      if (notesQuery) {
        extractedQuery = extractSearchTerm(messageText);
        setNotesSearchQuery(extractedQuery);
      }

      const requestRunId = 'run_client_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

      const requestBody = {
        message: messageText,
        conversationId: conversationIdToUse,
        isNewConversation: isNew,
        gmailAccessToken,
        isNotesQuery: notesQuery,
        notesSearchQuery: extractedQuery,
        activeMission,
        runId: requestRunId,
        attachments: attachments || [],
        isDeepThinking,
        isCanvas,
        isSearch,
        isPlanMode
      };

      // --- PHASE I: Fast Intent Analysis (AI-Driven Assessment) ---
      let intentData: any = null;
      try {
        const intentRes = await fetch('/api/agent-talk/chat-arcus/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: messageText, 
            conversationId: conversationIdToUse, 
            runId: requestRunId, 
            attachments: attachments || [],
            isPlanMode,
            isCanvas,
            isSearch,
            isDeepThinking
          }),
          signal: abortControllerRef.current.signal
        });
        if (intentRes.ok) intentData = await intentRes.json();
      } catch (e) {
        console.warn('Intent analysis failed:', e);
      }

      // --- PHASE II: Immediate AI Assessment ---
      if (intentData?.initialResponse) {
        const initialMessage: AgentMessage = {
          id: assistantMsgId,
          type: 'agent',
          role: 'assistant',
          content: {
            text: intentData.initialResponse,
            list: [],
            footer: ''
          },
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          meta: {
            actionType: 'thought',
            isStreaming: true,
            canvasApproval: ((intentData.needsCanvas === true || isCanvas) && !isPlanMode) ? {
              status: 'pending' as const,
              title: intentData.canvasTitle || 'Launch Arcus Mission?',
              description: intentData.canvasDescription || intentData.initialResponse || 'This request would be best handled in the specialized Arcus Workspace.',
              canvasType: intentData.canvasType || 'none',
              canvasData: null
            } : undefined
          }
        };
        setMessages(prev => [...prev, initialMessage]);
      }

      if (intentData) {
        // --- Sequential Managed Blocks ---
        const rawBlocks = (intentData.thinkingBlocks && intentData.thinkingBlocks.length > 0)
          ? intentData.thinkingBlocks
          : buildFallbackThinkingBlocks(messageText);

        if (rawBlocks && rawBlocks.length > 0 && !isDeepThinking) {
          const blocks = rawBlocks.map((b: any) => ({
            ...b,
            status: 'pending' as const,
            steps: b.steps.map((s: any, idx: number) => ({
              ...s,
              id: `${b.id}-step-${idx}`,
              label: s.action || s.label,
              status: 'pending' as const,
              type: s.type || 'think'
            }))
          }));

          setLiveThinkingBlocks(blocks);

          // --- Trigger Arcus Workspace Approval Step ---
          if (intentData.needsCanvas === true || isCanvas) {
            const canvasInitialData = {
              type: 'workflow' as const,
              title: intentData.canvasTitle || "Arcus's Computer",
              content: {
                steps: blocks.map((b: any) => ({
                  id: b.id,
                  title: b.title,
                  status: 'pending' as const
                }))
              }
            };

            setMessages(prev => prev.map(m => {
              if (m.id === assistantMsgId && m.type === 'agent') {
                return {
                  ...m,
                  meta: {
                    ...m.meta,
                    canvasApproval: {
                      status: 'pending' as const,
                      canvasData: canvasInitialData,
                      title: intentData.canvasTitle || "Launch Arcus Mission?",
                      description: intentData.canvasDescription || "This request would be best handled in the Arcus Workspace. Would you like to open it?"
                    }
                  }
                };
              }
              return m;
            }));
          }

          for (let bIndex = 0; bIndex < blocks.length; bIndex++) {
            // Update Block status to active in both Chat and Canvas
            setLiveThinkingBlocks(prev => prev.map((b, i) => i === bIndex ? { ...b, status: 'active' } : b));
            setCanvasData(prev => {
              if (prev?.type === 'workflow') {
                const newSteps = prev.content.steps.map((s: any, i: number) => ({
                  ...s,
                  status: i === bIndex ? 'active' as const : s.status
                }));
                return { ...prev, content: { ...prev.content, steps: newSteps } };
              }
              return prev;
            });

            const stepsCount = blocks[bIndex].steps.length;
            for (let sIndex = 0; sIndex < stepsCount; sIndex++) {
              setLiveThinkingBlocks(prev => prev.map((b, i) => {
                if (i === bIndex) {
                  const newSteps = b.steps.map((s, si) => ({
                    ...s,
                    status: si < sIndex ? 'completed' as const : si === sIndex ? 'active' as const : 'pending' as const
                  }));
                  return { ...b, steps: newSteps };
                }
                return b;
              }));

              if (sIndex < stepsCount - 1 || bIndex < blocks.length - 1) {
                await new Promise(r => setTimeout(r, 600));
              }
            }

          }

          // --- Deliberate Final Synthesis (Breathing Room) ---
          setLiveThinkingBlocks(prev => prev.map(b => ({
            ...b,
            status: 'completed',
            steps: b.steps.map(s => ({ ...s, status: 'completed' }))
          })));

          const synthesisMessageId = Date.now() + 5;
          setLiveThinkingBlocks(prev => [...prev, {
            id: 'synthesis-block',
            title: 'Completing synthesis',
            status: 'active',
            initialContext: 'Aggregating all findings and finalizing the optimal response...',
            steps: [
              { id: 'synth-1', label: 'Formatting final output', status: 'active', type: 'think' }
            ]
          }]);

          await new Promise(r => setTimeout(r, 600));
        }
      }

      // --- PHASE II: Main Execution & Chat Result ---
      const chatRes = await fetch('/api/agent-talk/chat-arcus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...requestBody,
          intentAnalysis: intentData // Pass analysis to avoid backend re-processing
        }),
        signal: abortControllerRef.current.signal
      });

      if (!chatRes.ok) {
        const errorData = await chatRes.json().catch(() => ({}));
        setMessages(prev => prev.filter(m => m.id !== assistantMsgId));

        if (errorData?.error === 'limit_reached') {
          setUsageLimitModalData({
            featureName: 'Ask AI',
            currentUsage: errorData.usage || 0,
            limit: errorData.limit || 0,
            period: errorData.period || 'daily',
            currentPlan: errorData.planType || 'starter'
          });
          setIsUsageLimitModalOpen(true);

          const limitMessage: AgentMessage = {
            id: Date.now() + 2,
            type: 'agent',
            role: 'assistant',
            content: {
              text: "You've reached your daily AI limit for the Starter plan. To keep using Arcus AI and other premium features, please upgrade to Pro.",
              list: [
                "Unlock unlimited Arcus AI tasks",
                "Priority processing for faster results",
                "Advanced email analytics and search"
              ],
              footer: `[Upgrade to Pro at mailient.xyz/pricing](https://mailient.xyz/pricing)`
            },
            time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            meta: { limitReached: true, actionType: 'limit' }
          };
          setMessages(prev => [...prev, limitMessage]);
          setIsLoading(false);
          setIsSearchingState(false);
          setIsDeepThinkingState(false);
          scrollToBottom(true);
          return;
        }
        throw new Error(errorData.message || `Failed to send message (${chatRes.status})`);
      }

      const data = await chatRes.json();

      // Extract AI thought block (deep thinking mode)
      const { thought: aiThought, cleanText: aiCleanText } = extractThought(data.message || '');
      if (aiThought) {
        data.message = aiCleanText;
      }

      if (data?.run?.runId) {
        setActiveRun({
          runId: data.run.runId,
          status: data.run.status,
          phase: data.run.phase
        });
      }

      // Mark all live blocks and steps as completed
      setLiveThinkingBlocks(prev => prev.map(b => ({
        ...b,
        status: 'completed',
        steps: b.steps.map(s => ({ ...s, status: 'completed' }))
      })));
      await new Promise(r => setTimeout(r, 300));

      // Canvas data handling
      const hasCanvas = Boolean(data.canvasData && (data.canvasData.content || data.execution?.requiresApproval));
      if (hasCanvas) {
        setCanvasData(data.canvasData);
        // Automatically open canvas for complex tasks or explicit canvas requests
        if (isCanvas || data.complexity === 'complex' || data.canvasType === 'action_plan') {
          setIsCanvasOpen(true);
        }
      }

      await refreshArcusCredits(true);

      if (data.conversationId && data.conversationId !== conversationIdToUse) {
        setCurrentConversationId(data.conversationId);
        conversationIdToUse = data.conversationId;
      }

      if (data.integrations) setIntegrations(data.integrations);

      // Store search sessions for transparency
      if (data.searchSessions && data.searchSessions.length > 0) {
        setSearchSessions(data.searchSessions);
      }

      // Final Thinking & Artifact Metadata
      const aiThinkingProcess = (data.thinkingSteps && data.thinkingSteps.length > 0)
        ? data.thinkingSteps.map((s: any, i: number) => ({
          id: `step-${s.id || s.step || i}`,
          label: s.description || s.action || '',
          expandedContent: s.detail || '',
          status: 'completed' as const,
          type: (s.type || 'think') as any
        }))
        : undefined;

      const aiResult = hasCanvas
        ? {
          type: data.canvasData.type,
          title: data.canvasData.title || data.canvasData.content?.title || data.canvasData.content?.subject || intentData?.canvasType || 'Result',
          canvasData: data.canvasData,
        }
        : undefined;

      // --- PHASE III: Update the acknowledgment message with final content ---
      const finalAgentMessage: AgentMessage = {
        id: assistantMsgId,
        type: 'agent',
        role: 'assistant',
        notes: data.notesResult?.notes || [],
        content: {
          text: data.message,
          list: [],
          footer: ''
        },
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        meta: {
          actionHistory: data.actionHistory || [],
          thinkingBlocks: liveThinkingBlocks, // Use the actual blocks shown during streaming
          result: aiResult,
          actionType: data.actionType || 'chat',
          isStreaming: false,
          notesResult: data.notesResult,
          emailResult: data.emailResult,
          internalThought: aiThought || undefined,
          searchSessions: data.searchSessions || undefined,
          planArtifact: data.planArtifact || undefined, // Phase 2: Include plan artifact
        }
      };

      setMessages(prev => {
        const index = prev.findIndex(m => m.id === assistantMsgId);
        if (index !== -1) {
          const newMessages = [...prev];
          newMessages[index] = finalAgentMessage;
          return newMessages;
        }
        return [...prev, finalAgentMessage];
      });

      setNewMessageIds(prev => new Set(prev).add(assistantMsgId));

      // First stop loading to show the message
      setIsLoading(false);
      setIsSearchingState(false);
      setIsDeepThinkingState(false);

      // Force scroll after state update
      requestAnimationFrame(() => {
        scrollToBottom(true);
      });

      // Get existing conversation data from localStorage to preserve title
      const existingConversationRaw = localStorage.getItem(`conversation_${conversationIdToUse}`);
      let existingTitle = '';
      let existingMessages: Message[] = [];
      let shouldGenerateTitle = false;

      if (existingConversationRaw) {
        try {
          const existingData = JSON.parse(existingConversationRaw);
          existingTitle = existingData.title || '';
          existingMessages = existingData.messages || [];

          // If this is the first message pair (only 1 user message exists or no title yet)
          // then we should generate an AI title
          const userMessageCount = existingMessages.filter(m => m.type === 'user').length;
          shouldGenerateTitle = !existingTitle || userMessageCount <= 1;
        } catch (e) {
          console.error('Error parsing existing conversation:', e);
          shouldGenerateTitle = true;
        }
      } else {
        shouldGenerateTitle = true;
      }

      // Use temporary title first (non-blocking), then update with AI title
      if (!existingTitle) {
        existingTitle = messageText.trim().split(' ').slice(0, 5).join(' ');
      }

      // Generate AI title asynchronously (non-blocking) for new conversations
      if (shouldGenerateTitle && isNew) {
        generateChatTitle(messageText).then((aiTitle) => {
          console.log('🏷️ Generated title for new conversation:', aiTitle);
          // Update localStorage with AI-generated title
          const currentDataRaw = localStorage.getItem(`conversation_${conversationIdToUse}`);
          if (currentDataRaw) {
            try {
              const currentData = JSON.parse(currentDataRaw);
              currentData.title = aiTitle;
              setChatTitle(aiTitle);
              localStorage.setItem(`conversation_${conversationIdToUse}`, JSON.stringify(currentData));
              localStorage.setItem(`conv_${conversationIdToUse}_title`, aiTitle);
            } catch (e) {
              console.error('Error updating title:', e);
            }
          }
        }).catch((titleError) => {
          console.error('Failed to generate AI title:', titleError);
        });
      }

      // If we still don't have a title, use the message
      if (!existingTitle) {
        existingTitle = messageText.trim().split(' ').slice(0, 5).join(' ');
      }

      // Build the updated messages list
      const userMessage: UserMessage = {
        id: Date.now(),
        type: 'user',
        role: 'user',
        notes: [],
        content: messageText,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      };

      // Filter out duplicates and combine with existing messages
      const allMessages = [...existingMessages];

      // Check if user message already exists (by content match)
      const userMsgExists = allMessages.some(m => m.type === 'user' && m.content === messageText);
      if (!userMsgExists) {
        allMessages.push(userMessage);
      }
      allMessages.push(finalAgentMessage);

      // Remove duplicates by ID
      const uniqueMessages = allMessages.filter((msg, index, self) =>
        index === self.findIndex((t) => t.id === msg.id)
      );

      const finalConversationData = {
        id: conversationIdToUse,
        messages: uniqueMessages,
        title: existingTitle,
        lastUpdated: new Date().toISOString(),
        messageCount: uniqueMessages.length
      };
      localStorage.setItem(`conversation_${conversationIdToUse}`, JSON.stringify(finalConversationData));
      localStorage.setItem(`conv_${conversationIdToUse}_title`, existingTitle);

      // Update conversations state
      setConversations(prev => ({
        ...prev,
        [conversationIdToUse]: uniqueMessages
      }));

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
        return;
      }
      console.error('Error in processAIMessage:', error);
      const errorAgentMessage: AgentMessage = {
        id: Date.now() + 1,
        type: 'agent',
        role: 'assistant',
        notes: [],
        content: {
          text: error instanceof Error ? error.message : "I encountered an issue. Let me try that again or let me know if you need help with something else!",
          list: [],
          footer: ""
        },
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      };
      setMessages(prev => [...prev, errorAgentMessage]);
    } finally {
      setIsLoading(false);
      setIsDeepThinkingState(false);
      setLiveThinkingBlocks([]);
      setShowNotesFetching(false);
      setTimeout(() => scrollToBottom(true), 100);
    }
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

        // Add confirmation message with external refs if available
        const confirmMessage: AgentMessage = {
          id: Date.now() + 1,
          type: 'agent',
          role: 'assistant',
          notes: [],
          content: {
            text: result.message || 'Done! The action was completed successfully.',
            list: result.executionResult?.externalRefs ? 
              Object.entries(result.executionResult.externalRefs).map(([key, value]) => `${key}: ${value}`) : 
              [],
            footer: result.nextRecommendedActions?.length ? 
              `Next: ${result.nextRecommendedActions.join(', ')}` : 
              ''
          },
          meta: {
            executionResult: result.executionResult,
            externalRefs: result.externalRefs,
            recoveryHint: result.recoveryHint
          },
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        };
        setMessages(prev => [...prev, confirmMessage]);
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
  const handleAcceptPlan = async (plan: PlanArtifact) => {
    setIsProcessingPlan(true);
    try {
      await fetch('/api/agent-talk/chat-arcus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Approve and execute plan: ${plan.planId}`,
          runId: activeRun?.runId || null,
          conversationId: currentConversationId,
          isNewConversation: false,
          actionType: 'approve_plan',
          actionPayload: { planId: plan.planId },
          executeCanvasAction: 'approve_plan',
          canvasActionData: { planId: plan.planId }
        })
      });
      
      toast.success('Plan approved and execution started');
    } catch (error) {
      console.error('Error approving plan:', error);
      toast.error('Error approving plan');
    } finally {
      setIsProcessingPlan(false);
    }
  };

  const handleDeclinePlan = async (plan: PlanArtifact) => {
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

          localStorage.removeItem('pending_arcus_id');
          localStorage.removeItem('pending_arcus_message');
          localStorage.removeItem('pending_arcus_options');

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
        }
      } catch (error) {
        console.error('Error loading conversation from localStorage:', error);
      }
    } else {
      // If not in localStorage, fetch from API
      fetch(`/api/agent-talk/conversation/${conversationId}`)
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

  const handleSend = async (forcedMessage?: string, files?: File[], options?: { isDeepThinking?: boolean; isCanvas?: boolean; isSearch?: boolean; isPlanMode?: boolean }) => {
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
    const conversationData = {
      id: conversationIdToUse as string,
      messages: [...(conversations[conversationIdToUse as string] || []), newMessage],
      title: messageText.trim().split(' ').slice(0, 5).join(' '), // Temporary title, will be updated by AI
      lastUpdated: new Date().toISOString(),
      messageCount: 1
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
    processAIMessage(messageText, conversationIdToUse as string, shouldCreateNewConversation, attachments, { isDeepThinking, isCanvas, isSearch, isPlanMode });
  };



  const startNewChat = async () => {
    // Save current conversation before starting new one
    if (messages.length > 0 && currentConversationId) {
      await saveConversation();
    }

    // Always route to the base Arcus page on a single click
    router.push('/dashboard/agent-talk');
    onNewChat?.();

    // Clear all conversation state for new chat
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
    if (messages.length === 0) return;

    try {
      // Group messages into user-agent pairs and save
      for (let i = 0; i < messages.length; i += 2) {
        const userMessage = messages[i];
        const agentMessage = messages[i + 1];

        if (userMessage && agentMessage && userMessage.type === 'user' && agentMessage.type === 'agent') {
          await fetch('/api/agent-talk/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: userMessage.content,
              conversationId: currentConversationId,
              isNewConversation: isInitialMode
            }),
          });
        }
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
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
          setLiveThinkingBlocks([{
            id: 'running-mission',
            title: 'Strategic mission execution',
            status: 'active',
            initialContext: 'Processing live telemetry and execution steps from Arcus...',
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
              deform={{ incline: 0.3, noiseAmp: 150, noiseFlow: 2 }}
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

          <HomeFeedSidebar 
            className="z-50" 
            onCollapse={(collapsed) => setIsSidebarCollapsed(collapsed)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenHelp={() => setIsHelpOpen(true)}
            onOpenRewards={() => setIsRewardsOpen(true)}
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />

          <LayoutGroup>
          {/* Main Layout Wrapper - Absolute positioned to fill screen strictly */}
          <div 
            className={cn(
              "absolute inset-0 transition-all duration-500 ease-in-out bg-white dark:bg-black overflow-hidden flex flex-col md:flex-row",
              isSidebarCollapsed ? "md:left-20" : "md:left-64",
              "left-0"
            )} 
            style={{ height: '100vh', maxHeight: '100vh' }}
          >
            {/* Chat Column (Order 1 - LEFT) - Premium Refinement */}
            <div
              className="flex-1 flex flex-col relative h-full min-w-0 transition-all duration-500 order-1 bg-neutral-50/80 dark:bg-[#111111]/80 backdrop-blur-3xl border-x border-t border-neutral-200 dark:border-white/5 rounded-t-[40px] shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.5)] overflow-hidden"
              style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%' }}
            >
              {/* Header - Glassmorphic fixed height */}
              <div className="shrink-0 z-40 transition-all duration-300 bg-black/[0.02] dark:bg-black/40 backdrop-blur-md border-b border-neutral-200 dark:border-white/[0.03]" style={{ flexShrink: 0 }}>
                <div className="relative px-8 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Mobile Menu Button */}
                      <button 
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-neutral-600 dark:text-neutral-400"
                      >
                        <PanelLeft className="w-5 h-5" />
                      </button>
                      
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

                    {/* Right Side: New Chat and History */}
                    <div className="flex items-center gap-3">
                      {/* Subscription Badge */}
                      {currentPlan !== 'pro' && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-[#111111] border border-neutral-200 dark:border-white/10 rounded-full shadow-sm transition-all group-hover:border-neutral-300 dark:group-hover:border-white/20">
                          <span className="text-[10px] text-neutral-500 dark:text-white/40 font-medium tracking-wide whitespace-nowrap group-hover:text-black dark:group-hover:text-white/60 transition-colors">Free plan</span>
                          <span className="text-[10px] text-neutral-300 dark:text-white/10">•</span>
                          <button 
                            onClick={() => router.push('/pricing')}
                            className="text-[10px] text-black dark:text-white transition-colors font-bold uppercase tracking-tight whitespace-nowrap hover:text-neutral-600 dark:hover:text-white"
                          >
                            Upgrade
                          </button>
                        </div>
                      )}
                      
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
                    {isInitialMode ? (
                      <div className="flex flex-col items-center justify-center min-h-[50vh] py-12 animate-fade-in relative">
                        <div className="text-center mb-16">
                          <div className="flex justify-center mb-8">
                            <img
                              src="/arcus-ai-icon.jpg"
                              className="w-16 h-16 object-cover rounded-[24px] shadow-2xl grayscale brightness-110"
                              alt="Arcus AI"
                            />
                          </div>
                          <h1 className="text-4xl md:text-6xl font-medium text-black dark:text-white tracking-tighter" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            Ask anything about your emails
                          </h1>
                        </div>

                        {/* Centered Prompt Box for Initial Mode */}
                        <div className="w-full relative group max-w-2xl mx-auto px-4 z-10">
                          <PromptInputBox
                            onSend={(msg, files, opts) => handleSend(msg, files, opts)}
                            onStop={() => abortControllerRef.current?.abort()}
                            isLoading={isLoading}
                            placeholder="Assign a task or ask anything"
                            onSearchClick={() => { }}
                            onAttachEmailClick={() => setIsEmailSelectionModalOpen(true)}
                            onPersonalityClick={() => setIsPersonalityModalOpen(true)}
                            selectedEmailsCount={selectedEmails.length}
                            suggestionInput={suggestionInput}
                            showConnectBanner={true}
                            onConnectClick={() => setIsIntegrationsModalOpen(true)}
                          />
                        </div>

                        {/* Pill-style Action Buttons - Now shifted BELOW */}
                        <div className="flex flex-wrap justify-center gap-2.5 mt-10 max-w-2xl mx-auto">
                          {[
                            { label: 'Catch up', icon: Sparkles, text: "Please provide me with a comprehensive summary of my recent email correspondence from the last 24 hours. I am particularly interested in any urgent matters, action items directed at me, or important status updates that require my immediate attention." },
                            { label: 'Summarize', icon: FileText, text: "Could you please analyze my current unread emails and synthesize the core information from each thread? I would like a breakdown that highlights the main subject of each conversation and identifies any deadlines or specific requests made by the senders." },
                            { label: 'Draft reply', icon: PenTool, text: "I would like some assistance in drafting a professional response to my most recent email. Please ensure the reply is articulate, maintains a collaborative tone, and clearly addresses all the questions or points raised by the sender in their message." },
                            { label: 'Schedule', icon: Calendar, text: "I need to facilitate a meeting for tomorrow based on my recent email threads. Could you please review any pending scheduling requests and compare them with my calendar to suggest the most optimal windows for a 30-minute discussion?" },
                            { label: 'Analytics', icon: BarChart3, text: "Please perform an audit of my email engagement and activity over the past seven days. I am looking for a detailed overview of my top communication partners, peak activity times, and any trends in my response frequency or inbox growth." }
                          ].map((btn) => (
                            <button
                              key={btn.label}
                              onClick={() => setSuggestionInput({
                                text: btn.text,
                                id: Date.now()
                              })}
                              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-full text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-white/10 transition-all text-[13px] font-medium shadow-sm"
                            >
                              <btn.icon className="w-3.5 h-3.5" />
                              {btn.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 pt-4">
                        {activeMission && <MissionStatusHeader mission={activeMission} />}
                        {messages.map((msg) => (
                          <motion.div 
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            key={msg.id} 
                            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                          >
                            <div className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} max-w-full items-start`}>
                              <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center border ${msg.role === 'user' ? 'bg-[#2b2b2b] border-neutral-200 dark:border-white/10' : 'bg-graphite-surface border-graphite-border'}`}>
                                {msg.role === 'user' ? <User2 className="w-3.5 h-3.5 text-black dark:text-white/50" /> : <img src="/arcus-ai-icon.jpg" className="w-full h-full object-cover grayscale" />}
                              </div>
                              <div className="flex flex-col max-w-[85%] group/msg">
                                <div className={`transition-all relative ${msg.role === 'user' ? 'px-4 py-2.5 rounded-xl bg-[#2b2b2b] text-black dark:text-white border border-neutral-200 dark:border-white/5 shadow-sm' : 'text-graphite-text px-0 py-1'}`}>
                                  {msg.role === 'assistant' && msg.meta?.limitReached && (
                                    <div className="flex items-center gap-2 mb-3 opacity-60">
                                      <img src="/arcus-ai-icon.jpg" className="w-4 h-4 rounded-md grayscale" />
                                      <span className="text-[12px] text-black dark:text-white/90 font-medium tracking-tight">Arcus AI</span>
                                      <span className="px-1.5 py-0.5 bg-black/10 dark:bg-white/10 text-black dark:text-white/40 text-[9px] font-bold rounded uppercase tracking-widest leading-none">Lite</span>
                                    </div>
                                  )}

                                  <MessageContent content={msg.content} isUser={msg.role === 'user'} />

                                  {msg.role === 'assistant' && (
                                    <button
                                      onClick={() => {
                                        const text = typeof msg.content === 'string' ? msg.content : msg.content.text;
                                        if ('speechSynthesis' in window) {
                                          window.speechSynthesis.cancel();
                                          const utterance = new SpeechSynthesisUtterance(text);
                                          window.speechSynthesis.speak(utterance);
                                        }
                                      }}
                                      className="absolute -right-8 top-1 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 hover:bg-black/5 dark:bg-white/5 rounded-full text-black hover:text-black dark:text-white"
                                      title="Speak"
                                    >
                                      <Volume2 className="w-3.5 h-3.5" />
                                    </button>
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

                                  {msg.role === 'assistant' && msg.meta?.thinkingBlocks && (
                                    <div className="mt-4 border-t border-neutral-200 dark:border-white/5 pt-3 px-1">
                                      <ThinkingLayer
                                        blocks={msg.meta.thinkingBlocks}
                                        isVisible={true}
                                        searchSessions={(msg.meta as any)?.searchSessions}
                                      />
                                    </div>
                                  )}

                                  {/* Plan Artifact Card (Phase 2) */}
                                  {msg.role === 'assistant' && (msg as AgentMessage).meta?.planArtifact && (
                                    <div className="mt-4">
                                      <PlanArtifactCard
                                        plan={(msg as AgentMessage).meta!.planArtifact!}
                                        onApprove={async (planId) => {
                                          await handleAcceptPlan((msg as AgentMessage).meta!.planArtifact!);
                                        }}
                                        onReject={async (planId) => {
                                          await handleDeclinePlan((msg as AgentMessage).meta!.planArtifact!);
                                        }}
                                        isProcessing={isProcessingPlan}
                                      />
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
                                    <div className="flex flex-col gap-4 mt-2">
                                      <a href="/pricing" className="text-black hover:text-black dark:text-white underline underline-offset-4 decoration-white/10 hover:decoration-white transition-all text-[13px] tracking-tight truncate w-fit">
                                        https://mailient.com/pricing
                                      </a>

                                      <div className="group relative flex items-center justify-between gap-4 p-4 mt-2 w-full max-w-[500px] bg-white/[0.03] border border-white/[0.08] rounded-2xl transition-all duration-300 hover:bg-black/[0.05] dark:bg-white/[0.05] hover:border-white/12 shadow-2xl overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none opacity-50" />

                                        <div className="flex items-center gap-3.5 z-10">
                                          <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 border border-neutral-200 dark:border-white/10 flex items-center justify-center relative shadow-inner shrink-0 transition-transform group-hover:scale-105">
                                            <Sparkles className="w-5 h-5 text-black group-hover:text-black dark:text-white transition-colors" />
                                          </div>
                                          <div className="flex flex-col gap-0.5">
                                            <p className="text-black dark:text-white/90 text-[13px] font-bold tracking-tight leading-relaxed">
                                              Your credits have been used up.
                                            </p>
                                            <p className="text-black dark:text-white/40 text-[11px] font-medium">Please upgrade your plan for more credits.</p>
                                          </div>
                                        </div>

                                        <button
                                          onClick={() => router.push('/pricing')}
                                          className="relative z-10 px-5 py-2.5 bg-white hover:bg-neutral-200 text-black font-bold text-[12px] tracking-tight uppercase rounded-full transition-all group-active:scale-95 shadow-lg"
                                        >
                                          Upgrade
                                        </button>
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
                                      onView={() => {
                                        if ((msg as AgentMessage).meta?.result) {
                                          setCanvasData((msg as AgentMessage).meta!.result!.canvasData);
                                          setIsCanvasOpen(true);
                                        }
                                      }}
                                    />
                                  )}
                                </div>
                                <div className={`mt-2 px-1 text-[10px] tracking-tight text-graphite-muted-2 opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                  {msg.time}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        {isLoading && (
                          <div className="flex items-start gap-2.5 animate-fade-in group">
                            <div className="w-7 h-7 rounded-lg bg-graphite-surface border border-graphite-border flex items-center justify-center overflow-hidden shrink-0 relative shadow-2xl">
                              <motion.img
                                src="/arcus-ai-icon.jpg"
                                className="w-full h-full object-cover grayscale opacity-40"
                                animate={{
                                  rotate: [0, 90, 180, 270, 360],
                                  scale: [1, 1.05, 1]
                                }}
                                transition={{
                                  rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                                  scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                                }}
                              />
                              <div className="absolute inset-0 bg-black/5 dark:bg-white/5 animate-pulse" />
                            </div>

                            <div className="flex flex-col gap-2.5 max-w-full">
                              <motion.div
                                className="inline-flex items-center min-w-[170px] relative group/bubble"
                              >
                                <div className="flex flex-col gap-2">
                                  <RollingThinkingStatus
                                    onToggle={() => setIsThinkingStepsOpen(!isThinkingStepsOpen)}
                                    isOpen={isThinkingStepsOpen}
                                    isDeepThinking={isDeepThinkingState}
                                  />

                                  {isSearchingState && (
                                    <motion.div
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full w-fit"
                                    >
                                      <Search className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                                      <TextShimmer className="text-[11px] text-blue-400 font-medium">Searching...</TextShimmer>
                                    </motion.div>
                                  )}
                                </div>
                              </motion.div>

                              <AnimatePresence mode="wait">
                                {isThinkingStepsOpen && liveThinkingBlocks.length > 0 && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0, scale: 0.98 }}
                                    animate={{ height: 'auto', opacity: 1, scale: 1 }}
                                    exit={{ height: 0, opacity: 0, scale: 0.98 }}
                                    transition={{
                                      height: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                                      opacity: { duration: 0.3 }
                                    }}
                                    className="overflow-hidden px-1 ml-1"
                                  >
                                    <div className="mb-2 flex items-center gap-2 opacity-30 select-none">
                                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                      <span className="text-[10px] font-bold tracking-widest uppercase">Live Activity</span>
                                    </div>
                                    <ThinkingLayer
                                      blocks={liveThinkingBlocks}
                                      isVisible={true}
                                      isGenerating={isLoading}
                                      searchSessions={searchSessions}
                                    />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} className="h-8" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Fixed Prompt Box for Conversation Mode */}
                {!isInitialMode && (
                  <div
                    className="absolute bottom-0 left-0 right-0 z-50 bg-[#161616]"
                    style={{ backgroundColor: '#161616' }}
                  >
                    {/* Shadow gradient to hide content as it scrolls under prompt box */}
                    <div className="absolute bottom-full left-0 right-0 h-24 bg-gradient-to-t from-[#161616] via-[#161616]/90 to-transparent pointer-events-none" />
                    
                    <div className="max-w-3xl mx-auto w-full px-6 py-6 relative">
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
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

              {/* Canvas Sidebar (Order 2 - RIGHT) - Properly Sibling to Chat Column */}
              <AnimatePresence>
                {isCanvasOpen && canvasData && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
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
                )}
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
      </>
    </TooltipProvider>
  );
}
