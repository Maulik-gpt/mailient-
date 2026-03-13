"use client";

import { Send, Mail, Upload, User, User2, MessageCircle, DoorOpen, Bell, Mail as EmailIcon, MoreHorizontal, LogOut, Settings, ChevronRight, ChevronDown, CheckCircle2, Circle, Edit, History, LayoutGrid, Zap, Volume2, Sparkles, FileText, Calendar, BarChart3, PenTool } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { AddSquareIcon, Cancel01Icon, WorkHistoryIcon } from '@hugeicons/core-free-icons';
import { ChatHistoryModal } from './components/ChatHistoryModal';
import { ThinkingLayer, ArtifactCard } from './components/ThinkingLayer';
import { CanvasPanel, type CanvasData } from './components/CanvasPanel';

import { PromptInputBox } from '@/components/ui/ai-prompt-box';
import { IntegrationsModal } from '@/components/ui/integrations-modal';
import { EmailSelectionModal } from '@/components/ui/email-selection-modal';
import { PersonalitySettingsModal } from '@/components/ui/personality-settings-modal';
import { GradientButton } from '@/components/ui/gradient-button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { HomeFeedSidebar } from "@/components/ui/home-feed-sidebar";
import NotesFetchingDisplay from '@/components/ui/notes-fetching-display';
import { UsageLimitModal } from '@/components/ui/usage-limit-modal';
import { ShiningText } from '@/components/ui/shining-text';
import { Note } from '@/components/ui/note';
import { Button as Button1 } from '@/components/ui/button-1';
import { MorphingSquare } from '@/components/ui/morphing-square';
import { toast } from 'sonner';

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
      return `<div class="my-4 p-5 bg-white/[0.03] border border-white/10 rounded-2xl relative group overflow-hidden">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
            <svg class="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="flex-1 text-left">
            <h4 class="text-white font-bold text-[11px] tracking-tight uppercase">Security required</h4>
            <p class="text-white/30 text-[9px] tracking-tight uppercase">Verify link to proceed</p>
          </div>
          <a href="${url}" target="_blank" rel="noopener noreferrer" class="px-5 py-2 bg-white hover:bg-neutral-200 text-black font-bold text-[10px] tracking-tight uppercase rounded-lg transition-all no-underline">Verify</a>
        </div>
        <div class="mt-4 text-[9px] text-white/10 break-all opacity-40 select-all cursor-text py-2 px-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">${url}</div>
      </div>`;
    }

    const displayUrl = url.length > 55 ? url.substring(0, 52) + '...' : url;
    const linkColorClass = isUser ? "text-blue-600 hover:text-blue-800" : "text-white/60 hover:text-white";
    const decorationClass = isUser ? "decoration-blue-200 hover:decoration-blue-600" : "decoration-white/20 hover:decoration-white/100";
    
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="${linkColorClass} underline underline-offset-4 ${decorationClass} transition-all text-[13px] tracking-tight break-all" title="${url}">${displayUrl}</a>`;
  });
};

const renderMarkdown = (text: string, isUser: boolean = false): string => {
  if (!text) return text;

  const paragraphs = text.split(/\n\n+/);

  const renderedParagraphs = paragraphs.map(para => {
    let processedPara = para.replace(/\*\*(.*?)\*\*/g, `<strong class="font-bold ${isUser ? 'text-black' : 'text-white'} tracking-tight">$1</strong>`);

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
      const listBg = isUser ? 'bg-black/[0.03]' : 'bg-white/[0.02]';
      const listBorder = isUser ? 'border-black/[0.05]' : 'border-white/[0.05]';
      joinedList = joinedList.replace(/(<li[\s\S]*?<\/li>(?:\n<li[\s\S]*?<\/li>)*)/g, `<ul class="space-y-1 my-6 list-none ${listBg} p-6 rounded-2xl border ${listBorder} relative shadow-inner overflow-hidden"><div class="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>$1</ul>`);
      return joinedList;
    }

    processedPara = linkify(processedPara, isUser);
    processedPara = processedPara.replace(/\n/g, '<br/>');

    const textColorClass = isUser ? "text-black/80" : "text-white/70";
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

  const statusColors: any = {
    draft: 'bg-white text-black',
    waiting_on_user: 'bg-white text-black',
    waiting_on_other: 'bg-neutral-700 text-white',
    done: 'bg-neutral-800 text-white/60',
    archived: 'bg-transparent border border-white/10 text-white/30'
  };

  const statusLabels: any = {
    draft: 'Draft reply',
    waiting_on_user: 'Waiting on you',
    waiting_on_other: 'Waiting on them',
    done: 'Done',
    archived: 'Archived'
  };

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 bg-neutral-900/60 border border-white/10 rounded-lg w-fit mb-6 transition-all">
      <div className="flex items-center gap-2">
        <span className="text-white/40 text-[9px] font-bold uppercase tracking-tight">Active</span>
        <span className="text-white/20">/</span>
        <span className="text-white/80 text-[13px] font-medium tracking-tight">{mission.goal}</span>
      </div>
      <div className="h-3 w-[1px] bg-white/20 mx-1" />
      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight ${statusColors[mission.status] || 'bg-white text-black'}`}>
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
  const lowerMessage = message.toLowerCase();
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
    thinkingProcess?: {
      id: string;
      label: string;
      expandedContent?: string;
    }[];
    artifact?: {
      type: string;
      title: string;
      canvasData: any;
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
}

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
  const [usageLimitModalData, setUsageLimitModalData] = useState<{
    featureName: string;
    currentUsage: number;
    limit: number;
    period: 'daily' | 'monthly';
    currentPlan: 'free' | 'starter' | 'pro' | 'none';
  } | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(initialConversationId || null);
  const [conversations, setConversations] = useState<{ [key: string]: Message[] }>({});
  const [isNewConversation, setIsNewConversation] = useState<boolean>(!initialConversationId);
  const [selectedEmails, setSelectedEmails] = useState<Email[]>([]);
  const [chatTitle, setChatTitle] = useState<string>('');
  const [suggestionInput, setSuggestionInput] = useState<{ text: string; id: number } | undefined>(undefined);
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
  const [liveThinkingSteps, setLiveThinkingSteps] = useState<LiveThinkingStep[]>([]);

  // Canvas Panel state
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [isCanvasExecuting, setIsCanvasExecuting] = useState(false);
  const [activeRun, setActiveRun] = useState<{ runId: string; status?: string; phase?: string } | null>(null);



  // Subscription state - to hide upgrade button for Pro users
  const [currentPlan, setCurrentPlan] = useState<'free' | 'starter' | 'pro' | 'none' | null>(null);

  const [arcusCredits, setArcusCredits] = useState<{
    usage: number;
    limit: number;
    remaining: number;
    period: 'daily' | 'monthly';
    isUnlimited?: boolean;
  } | null>(null);

  const refreshArcusCredits = async (showToast = false) => {
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
  };

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

  const buildFallbackThinkingSteps = (messageText: string): LiveThinkingStep[] => {
    const emailRelated = isEmailRelatedQuery(messageText);
    const notesRelated = isNotesRelatedQuery(messageText);

    return [
      {
        id: 'fallback-analyze',
        label: 'Understanding your request',
        status: 'active',
        type: 'analyze'
      },
      {
        id: 'fallback-context',
        label: notesRelated
          ? 'Reviewing relevant notes and saved context'
          : emailRelated
            ? 'Searching relevant Gmail threads and context'
            : 'Gathering the context needed to complete this task',
        status: 'pending',
        type: emailRelated ? 'search' : 'read'
      },
      {
        id: 'fallback-output',
        label: emailRelated
          ? 'Preparing a draft, summary, or next action for review'
          : 'Preparing the best output for review',
        status: 'pending',
        type: 'draft'
      }
    ];
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

  const processAIMessage = async (messageText: string, conversationIdToUse: string, isNew: boolean, attachments?: any[]) => {
    try {
      setIsLoading(true);
      setLiveThinkingSteps(buildFallbackThinkingSteps(messageText));

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
        attachments: attachments || []
      };

      // --- PARALLEL REQUESTS: Fast intent + Full chat ---
      // 1) Fire fast intent analysis (returns AI-generated thinking steps quickly)
      const intentPromise = fetch('/api/agent-talk/chat-arcus/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, conversationId: conversationIdToUse, runId: requestRunId, attachments: attachments || [] }),
      }).then(r => r.json()).catch(() => null);

      // 2) Fire main chat request (takes longer - does search, canvas, response)
      const chatPromise = fetch('/api/agent-talk/chat-arcus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // 3) Intent usually returns first — show live thinking steps
      const intentData = await intentPromise;
      if (intentData?.plan && intentData.plan.length > 0) {
        const steps = normalizeIntentPlanSteps(intentData.plan);
        setLiveThinkingSteps(steps);

        for (let i = 0; i < steps.length; i++) {
          setLiveThinkingSteps(prev =>
            prev.map((step, index) => ({
              ...step,
              status: index < i ? 'completed' : index === i ? 'active' : 'pending'
            }))
          );

          if (i < steps.length - 1) {
            await new Promise(r => setTimeout(r, 400));
          }
        }
      }

      // 4) Wait for main chat response
      const response = await chatPromise;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData?.error === 'limit_reached') {
          setUsageLimitModalData({
            featureName: 'Ask AI',
            currentUsage: errorData.usage || 0,
            limit: errorData.limit || 0,
            period: errorData.period || 'daily',
            currentPlan: errorData.planType || 'starter'
          });
          setIsUsageLimitModalOpen(true);
          return;
        }
        throw new Error(errorData.message || `Failed to send message (${response.status})`);
      }

      const data = await response.json();

      if (data?.run?.runId) {
        setActiveRun({
          runId: data.run.runId,
          status: data.run.status,
          phase: data.run.phase
        });
      }

      // Mark all live steps as completed
      setLiveThinkingSteps(prev => prev.map(s => ({ ...s, status: 'completed' as const })));
      await new Promise(r => setTimeout(r, 250));

      // Canvas data handling
      const hasCanvas = Boolean(data.canvasData && (data.canvasData.content || data.execution?.requiresApproval));
      if (hasCanvas) {
        setCanvasData(data.canvasData);
        setIsCanvasOpen(true);
      }

      await refreshArcusCredits(true);

      // Update currentConversationId if needed
      if (data.conversationId && data.conversationId !== conversationIdToUse) {
        setCurrentConversationId(data.conversationId);
        conversationIdToUse = data.conversationId;
      }

      if (data.integrations) {
        setIntegrations(data.integrations);
      }

      // Use AI-generated thinking steps from the MAIN response (most accurate)
      const aiThinkingProcess = (data.thinkingSteps && data.thinkingSteps.length > 0)
        ? data.thinkingSteps.map((s: any, i: number) => ({
          id: `step-${s.step || i}`,
          label: s.description || s.action || '',
          expandedContent: s.detail || '',
        }))
        : (intentData?.plan && intentData.plan.length > 0)
          ? intentData.plan.map((s: any, i: number) => ({
            id: `step-${s.step || i}`,
            label: s.description || s.action || '',
          }))
          : undefined;

      // Use AI-generated artifact title
      const aiArtifact = hasCanvas
        ? {
          type: data.canvasData.type,
          title: data.canvasData.title || data.canvasData.content?.title || data.canvasData.content?.subject || intentData?.canvasType || 'Result',
          canvasData: data.canvasData,
        }
        : undefined;

      const agentMessage: AgentMessage = {
        id: Date.now() + 1,
        type: 'agent',
        role: 'assistant',
        notes: data.notesResult?.notes || [],
        content: {
          text: data.message,
          list: [],
          footer: ''
        },
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }),
        meta: {
          actionType: data.actionType,
          notesResult: data.notesResult,
          emailResult: data.emailResult,
          thinkingProcess: aiThinkingProcess,
          artifact: aiArtifact,
        }
      };

      // First stop loading to show the message
      setIsLoading(false);

      // Add agent message to state
      setMessages(prev => [...prev, agentMessage]);
      setNewMessageIds(prev => new Set(prev).add(agentMessage.id));

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
      allMessages.push(agentMessage);

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

    } catch (error) {
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
      setLiveThinkingSteps([]);
      setShowNotesFetching(false);
      setTimeout(() => scrollToBottom(true), 100);
    }
  };

  // Canvas execution handler
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

      if (result.executionResult?.success) {
        toast.success(result.message || 'Action completed');
        setIsCanvasOpen(false);

        // Add confirmation message
        const confirmMessage: AgentMessage = {
          id: Date.now() + 1,
          type: 'agent',
          role: 'assistant',
          notes: [],
          content: {
            text: result.message || 'Done! The action was completed successfully.',
            list: [],
            footer: ''
          },
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        };
        setMessages(prev => [...prev, confirmMessage]);
      } else {
        toast.error(result.message || 'Action failed');
      }
    } catch (error) {
      toast.error('Failed to execute action');
      console.error('Canvas execution error:', error);
    } finally {
      setIsCanvasExecuting(false);
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
        if (onConversationSelect && conversationId !== initialConversationId) {
          onConversationSelect(conversationId);
        }

        // Scroll to bottom after messages are loaded
        setTimeout(() => scrollToBottom(true), 150);

        // Check for pending AI trigger
        const pendingId = localStorage.getItem('pending_arcus_id');
        if (pendingId === conversationId) {
          const pendingMsg = localStorage.getItem('pending_arcus_message');
          localStorage.removeItem('pending_arcus_id');
          localStorage.removeItem('pending_arcus_message');
          if (pendingMsg) {
            console.log('Resuming pending AI call for new conversation:', conversationId);
            processAIMessage(pendingMsg, conversationId, true);
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

  // Restore conversation state from localStorage on component mount
  useEffect(() => {
    const lastActive = localStorage.getItem('lastActiveConversation');
    if (lastActive && !initialConversationId && isInitialMode) {
      console.log('Found last active conversation, but staying in initial mode for fresh look');
      // We could auto-load it here if we wanted, but the design seems to prefer fresh start
    }
  }, [initialConversationId, isInitialMode]);

  const scrollToBottom = (force = false) => {
    if (messagesEndRef.current) {
      if (messages.length > 0 || force) {
        messagesEndRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end"
        });
      }
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [messages]);

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

  const handleSend = async (forcedMessage?: string, files?: File[]) => {
    const messageText = (forcedMessage || message).trim();
    if (!messageText && (!files || files.length === 0)) return;

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
      onConversationSelect(conversationIdToUse);
      return;
    }

    // Process the AI message directly - don't rely on navigation/loadConversation
    processAIMessage(messageText, conversationIdToUse as string, shouldCreateNewConversation, attachments);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

  const handleConversationDelete = (deletedConversationId: string) => {
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
          setLiveThinkingSteps(data.steps.map((s: any) => ({
            id: s.id || `step-${s.order}`,
            label: s.label || `Step ${s.order}`,
            status: (s.status === 'blocked_approval' ? 'active' : (s.status || 'pending')) as 'pending' | 'active' | 'completed' | 'error',
            type: (s.kind || 'think') as LiveThinkingStep['type'],
            expandedContent: [s.detail || '', formatStepEvidence(s.evidence)].filter(Boolean).join('\n\n')
          })));
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
        
        <div className="flex h-screen w-full text-graphite-text bg-black selection:bg-white selection:text-black overflow-hidden relative tracking-tight">
          {/* Apple-style Premium Grain Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[100] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />
          
          {/* Subtle Ambient Glows for Depth */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] bg-graphite-surface-2/40 rounded-full blur-[140px]" />
            <div className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] bg-graphite-surface/30 rounded-full blur-[120px]" />
          </div>

          {showHistory && (
            <div className="fixed left-16 top-0 h-screen w-80 bg-black/60 border-r border-white/[0.08] flex flex-col backdrop-blur-3xl z-40">
              <div className="p-6 border-b border-white/[0.05]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[11px] tracking-widest text-white/30 uppercase">History</h2>
                  <div className="flex items-center gap-2">
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startNewChat();
                          }}
                          className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-all duration-300 text-gray-400 hover:text-white hover:scale-105"
                        >
                          <HugeiconsIcon icon={AddSquareIcon} size={18} strokeWidth={1.8} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>New Chat</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowHistory(false);
                          }}
                          className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-all duration-300 text-gray-400 hover:text-white hover:scale-105"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.8} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Close</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <ChatHistoryModal
                  key={`history-${historyRefreshKey}`}
                  isOpen={showHistory}
                  onClose={() => setShowHistory(false)}
                  onConversationSelect={loadConversation}
                  onConversationDelete={handleConversationDelete}
                />
              </div>
            </div>
          )}

          <HomeFeedSidebar className="z-30" />

          <div className="flex-1 flex flex-col relative ml-64 transition-all duration-500 ease-in-out">
            {/* Header */}
            <div className={`sticky top-0 z-40 transition-all duration-300 ${(isIntegrationsModalOpen || isEmailSelectionModalOpen || isPersonalityModalOpen) ? 'blur-sm' : ''}`}>
              <div className="relative px-8 py-3">
                <div className="flex items-center justify-between">
                  {/* Left Side: Just a subtle action to start new */}
                  <div className="flex items-center">
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={startNewChat}
                          className="p-2 hover:bg-white/5 rounded-lg transition-all text-white/20 hover:text-white/60 group focus:outline-none"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <span className="text-[10px]">New conversation</span>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Center: The Generated Topic Pill (from mock) */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
                    {!isInitialMode && (
                      <div className="flex items-center bg-[#111111] border border-white/[0.06] rounded-lg overflow-hidden shadow-2xl transition-all hover:border-white/10 group">
                        <button 
                          onClick={() => setShowHistory(!showHistory)}
                          className="pl-4 pr-3 py-1.5 hover:bg-white/[0.02] transition-colors"
                        >
                          <span className="text-sm font-medium text-white/80 whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px] tracking-tight">
                            {chatTitle}
                          </span>
                        </button>
                        <div className="w-[1px] h-3.5 bg-white/[0.08]" />
                        <button 
                          onClick={() => setShowHistory(!showHistory)}
                          className="px-2.5 py-1.5 hover:bg-white/[0.02] transition-colors"
                        >
                          <ChevronDown className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 transition-colors" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Side: Hidden contextual icons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className={`p-2 rounded-lg transition-all hover:bg-white/5 ${showHistory ? 'text-white bg-white/10' : 'text-white/20 hover:text-white/60'}`}
                    >
                      <History className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => setIsPersonalityModalOpen(true)}
                      className="p-2 rounded-lg transition-all hover:bg-white/5 text-white/20 hover:text-white/60"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 flex flex-col relative z-10 min-h-0">
              {isInitialMode ? (
                <div className="flex-1 overflow-y-auto transition-all duration-300 relative bg-[#242424]">
                  {/* Top Status Pill */}
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-[#161616] border border-white/5 rounded-full shadow-lg">
                    <span className="text-[11px] text-white/50 font-medium">Free plan</span>
                    <span className="text-[11px] text-white/20">•</span>
                    <button className="text-[11px] text-white hover:text-white/80 transition-colors font-medium">Upgrade</button>
                  </div>

                  <div className="h-full flex flex-col items-center justify-center px-6">
                    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
                      <div className="text-center mb-12">
                        <div className="flex justify-center mb-6">
                          <img 
                            src="/arcus-ai-icon.jpg" 
                            className="w-16 h-16 object-cover rounded-[20px] shadow-2xl grayscale brightness-110" 
                            alt="Arcus AI" 
                          />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-medium text-white tracking-tight" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                          Ask anything about your emails
                        </h1>
                      </div>

                      <div className="w-full relative group">
                        <PromptInputBox
                          onSend={(msg, files) => handleSend(msg, files)}
                          isLoading={isLoading}
                          placeholder="What would you like to know?"
                          onIntegrationsClick={() => setIsIntegrationsModalOpen(true)}
                          onAttachEmailClick={() => setIsEmailSelectionModalOpen(true)}
                          onPersonalityClick={() => setIsPersonalityModalOpen(true)}
                          selectedEmailsCount={selectedEmails.length}
                          suggestionInput={suggestionInput}
                        />
                      </div>

                      {/* Pill-style Action Buttons */}
                      <div className="flex flex-wrap justify-center gap-2 mt-6">
                        <button 
                          onClick={() => setSuggestionInput({
                            text: "Please provide me with a comprehensive summary of my recent email correspondence from the last 24 hours. I am particularly interested in any urgent matters, action items directed at me, or important status updates that require my immediate attention.",
                            id: Date.now()
                          })}
                          className="flex items-center gap-2 px-3.5 py-1.5 bg-[#161616] border border-white/5 rounded-full text-white/60 hover:text-white hover:bg-white/5 hover:border-white/10 transition-all text-[13px] font-medium"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Catch up
                        </button>
                        <button 
                          onClick={() => setSuggestionInput({
                            text: "Could you please analyze my current unread emails and synthesize the core information from each thread? I would like a breakdown that highlights the main subject of each conversation and identifies any deadlines or specific requests made by the senders.",
                            id: Date.now()
                          })}
                          className="flex items-center gap-2 px-3.5 py-1.5 bg-[#161616] border border-white/5 rounded-full text-white/60 hover:text-white hover:bg-white/5 hover:border-white/10 transition-all text-[13px] font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Summarize
                        </button>
                        <button 
                          onClick={() => setSuggestionInput({
                            text: "I would like some assistance in drafting a professional response to my most recent email. Please ensure the reply is articulate, maintains a collaborative tone, and clearly addresses all the questions or points raised by the sender in their message.",
                            id: Date.now()
                          })}
                          className="flex items-center gap-2 px-3.5 py-1.5 bg-[#161616] border border-white/5 rounded-full text-white/60 hover:text-white hover:bg-white/5 hover:border-white/10 transition-all text-[13px] font-medium"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          Draft reply
                        </button>
                        <button 
                          onClick={() => setSuggestionInput({
                            text: "I need to facilitate a meeting for tomorrow based on my recent email threads. Could you please review any pending scheduling requests and compare them with my calendar to suggest the most optimal windows for a 30-minute discussion?",
                            id: Date.now()
                          })}
                          className="flex items-center gap-2 px-3.5 py-1.5 bg-[#161616] border border-white/5 rounded-full text-white/60 hover:text-white hover:bg-white/5 hover:border-white/10 transition-all text-[13px] font-medium"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Schedule
                        </button>
                        <button 
                          onClick={() => setSuggestionInput({
                            text: "Please perform an audit of my email engagement and activity over the past seven days. I am looking for a detailed overview of my top communication partners, peak activity times, and any trends in my response frequency or inbox growth.",
                            id: Date.now()
                          })}
                          className="flex items-center gap-2 px-3.5 py-1.5 bg-[#161616] border border-white/5 rounded-full text-white/60 hover:text-white hover:bg-white/5 hover:border-white/10 transition-all text-[13px] font-medium"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          Analytics
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                 <div className="flex-1 flex flex-col relative overflow-hidden bg-[#242424]">
                  <div className="flex-1 overflow-y-auto px-6 py-4 scroll-smooth">
                    <div className="max-w-3xl mx-auto space-y-4">
                      {activeMission && <MissionStatusHeader mission={activeMission} />}
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col animate-fade-in ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} max-w-full items-start`}>
                            <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center border ${msg.role === 'user' ? 'bg-white border-white' : 'bg-graphite-surface border-graphite-border'}`}>
                              {msg.role === 'user' ? <User2 className="w-3.5 h-3.5 text-black" /> : <img src="/arcus-ai-icon.jpg" className="w-full h-full object-cover grayscale" />}
                            </div>
                             <div className="flex flex-col max-w-[85%] group/msg">
                               <div className={`px-4 py-2.5 rounded-xl transition-all relative ${msg.role === 'user' ? 'bg-white text-black' : 'bg-graphite-surface border border-graphite-border text-graphite-text group-hover/msg:border-white/20'}`}>
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
                                     className="absolute -right-8 top-1 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 hover:bg-white/5 rounded-full text-white/40 hover:text-white"
                                     title="Speak"
                                   >
                                     <Volume2 className="w-3.5 h-3.5" />
                                   </button>
                                 )}
                                 {msg.role === 'user' && (msg as UserMessage).attachments && (msg as UserMessage).attachments!.length > 0 && (
                                   <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-black/10">
                                     {(msg as UserMessage).attachments!.map((file, idx) => (
                                       <div key={idx} className="flex items-center gap-2 p-2 bg-black/5 rounded-lg border border-black/10 max-w-[200px]">
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
                              </div>
                              <div className={`mt-2 px-1 text-[10px] tracking-tight text-graphite-muted-2 opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                {msg.time}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {liveThinkingSteps.length > 0 && (
                        <div className="flex flex-col gap-1 ml-9.5 max-w-2xl">
                          <ThinkingLayer steps={liveThinkingSteps} isVisible={true} />
                        </div>
                      )}

                      {isLoading && (
                        <div className="flex items-start gap-2.5 animate-fade-in group pb-20">
                          <div className="w-7 h-7 rounded-lg bg-graphite-surface border border-graphite-border flex items-center justify-center overflow-hidden">
                            <img src="/arcus-ai-icon.jpg" className="w-full h-full object-cover grayscale animate-pulse opacity-40" />
                          </div>
                          <div className="bg-graphite-surface/40 border border-graphite-border py-2 px-3.5 rounded-xl inline-flex items-center gap-2.5">
                            <MorphingSquare className="w-3 h-3 bg-graphite-muted" message="Thinking..." messagePlacement="right" />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} className="h-20" />
                    </div>
                  </div>
                  <div className="sticky bottom-0 z-20 w-full px-6 pb-12 mt-auto">
                    <div className="max-w-3xl mx-auto">
                      <PromptInputBox
                        onSend={(msg, files) => handleSend(msg, files)}
                        isLoading={isLoading}
                        placeholder="Ask follow-up..."
                        onIntegrationsClick={() => setIsIntegrationsModalOpen(true)}
                        onAttachEmailClick={() => setIsEmailSelectionModalOpen(true)}
                        onPersonalityClick={() => setIsPersonalityModalOpen(true)}
                        selectedEmailsCount={selectedEmails.length}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <IntegrationsModal isOpen={isIntegrationsModalOpen} onClose={() => setIsIntegrationsModalOpen(false)} />
        <EmailSelectionModal 
          isOpen={isEmailSelectionModalOpen} 
          onClose={() => setIsEmailSelectionModalOpen(false)} 
          onSelectEmails={(emails: Email[]) => {
            setSelectedEmails(prev => [...prev, ...emails]);
            setIsEmailSelectionModalOpen(false);
          }} 
        />
        <PersonalitySettingsModal isOpen={isPersonalityModalOpen} onClose={() => setIsPersonalityModalOpen(false)} onSave={handleSavePersonality} initialPersonality={savedPersonality} />
        <CanvasPanel isOpen={isCanvasOpen} onClose={() => setIsCanvasOpen(false)} canvasData={canvasData} onExecute={handleCanvasExecute} isExecuting={isCanvasExecuting} />
      </>
    </TooltipProvider>
  );
};









