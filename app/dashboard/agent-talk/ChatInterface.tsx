"use client";

import { Send, Mail, Upload, User, MessageCircle, DoorOpen, Bell, Mail as EmailIcon, MoreHorizontal, LogOut, Settings, ChevronRight, ChevronDown, CheckCircle2, Circle, Edit, History } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { AddSquareIcon, Cancel01Icon, WorkHistoryIcon } from '@hugeicons/core-free-icons';
import { ChatHistoryModal } from './components/ChatHistoryModal';
import { ChatInput } from './components/ChatInput';
import { DraftReplyBox } from './components/DraftReplyBox';
import { ThinkingLayer, ArtifactCard } from './components/ThinkingLayer';
import { CanvasPanel, type CanvasData } from './components/CanvasPanel';

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
const linkify = (text: string): string => {
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
      // Premium Monochrome Action Button Layout
      return `<div class="my-8 p-[1px] bg-white/10 rounded-3xl shadow-2xl relative group overflow-hidden">
        <div class="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <div class="bg-[#080808] rounded-[1.4rem] p-8 flex flex-col items-center text-center relative z-10">
          <div class="w-14 h-14 bg-white/[0.03] rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-2xl">
            <svg class="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h4 class="text-white font-mono font-bold text-xs tracking-[0.2em] uppercase mb-2">SECURE_ACTION_REQUIRED</h4>
          <p class="text-white/30 text-[10px] font-mono tracking-widest mb-8 uppercase">Neural link validation mandatory</p>
          <a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center px-14 py-3.5 bg-white hover:bg-neutral-200 text-black font-mono font-bold text-[10px] tracking-[0.2em] uppercase rounded-2xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] no-underline">EXECUTE_HANDSHAKE</a>
          <div class="mt-6 text-[9px] text-white/10 font-mono break-all opacity-40 hover:opacity-100 transition-opacity select-all cursor-text py-3 px-5 bg-white/[0.02] rounded-xl border border-white/[0.05]">${url}</div>
        </div>
      </div>`;
    }

    const displayUrl = url.length > 55 ? url.substring(0, 52) + '...' : url;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-white/60 hover:text-white underline underline-offset-4 decoration-white/20 hover:decoration-white/100 transition-all font-mono text-[13px] tracking-tight break-all" title="${url}">${displayUrl}</a>`;
  });
};

const renderMarkdown = (text: string): string => {
  if (!text) return text;

  const paragraphs = text.split(/\n\n+/);

  const renderedParagraphs = paragraphs.map(para => {
    let processedPara = para.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white tracking-tight">$1</strong>');

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
      joinedList = joinedList.replace(/(<li[\s\S]*?<\/li>(?:\n<li[\s\S]*?<\/li>)*)/g, '<ul class="space-y-1 my-6 list-none bg-white/[0.02] p-6 rounded-2xl border border-white/[0.05] relative shadow-inner overflow-hidden"><div class="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>$1</ul>');
      return joinedList;
    }

    processedPara = linkify(processedPara);
    processedPara = processedPara.replace(/\n/g, '<br/>');

    return `<p class="mb-5 last:mb-0 leading-[1.8] text-white/70 font-sans text-[15px]">${processedPara}</p>`;
  });

  return renderedParagraphs.join('');
};

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
    // Arcus V2: Muse-style inline thinking + artifacts
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
  content: string;
  time: string;
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
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState<boolean>(false);
  const [isEmailSelectionModalOpen, setIsEmailSelectionModalOpen] = useState<boolean>(false);
  const [selectedEmails, setSelectedEmails] = useState<Email[]>([]);
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

  const processAIMessage = async (messageText: string, conversationIdToUse: string, isNew: boolean) => {
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
        runId: requestRunId
      };

      // --- PARALLEL REQUESTS: Fast intent + Full chat ---
      // 1) Fire fast intent analysis (returns AI-generated thinking steps quickly)
      const intentPromise = fetch('/api/agent-talk/chat-arcus/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, conversationId: conversationIdToUse, runId: requestRunId }),
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
        id: Date.now() - 1,
        type: 'user',
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

  const handleSend = async (forcedMessage?: string) => {
    const messageText = (forcedMessage || message).trim();
    if (!messageText) return;

    // Determine if this is a new conversation or continuation
    const shouldCreateNewConversation = !currentConversationId;

    // Generate conversation ID if this is a new conversation
    let conversationIdToUse = currentConversationId;
    if (shouldCreateNewConversation) {
      conversationIdToUse = generateConversationId();
      setCurrentConversationId(conversationIdToUse);
      setIsNewConversation(true);

      // Save to localStorage for persistence IMMEDIATELY
      localStorage.setItem(`conv_${conversationIdToUse}_title`, messageText);
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
      content: messageText,
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
    processAIMessage(messageText, conversationIdToUse as string, shouldCreateNewConversation);
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
      <UsageLimitModal
        isOpen={isUsageLimitModalOpen}
        onClose={() => setIsUsageLimitModalOpen(false)}
        featureName={usageLimitModalData?.featureName || 'Ask AI'}
        currentUsage={usageLimitModalData?.currentUsage || 0}
        limit={usageLimitModalData?.limit || 0}
        period={usageLimitModalData?.period || 'daily'}
        currentPlan={usageLimitModalData?.currentPlan || 'starter'}
      />
      <div className="flex h-screen w-full text-white bg-black selection:bg-white selection:text-black overflow-hidden relative">
        {/* Technical noise overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[100] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />
        {/* History Sidebar - Positioned to the right of Mailient sidebar (left: 64px = 16 * 4 for w-16 sidebar) */}
        {showHistory && (
          <div className="fixed left-16 top-0 h-screen w-80 bg-black/60 border-r border-white/[0.08] flex flex-col backdrop-blur-3xl z-40">
            <div className="p-6 border-b border-white/[0.05]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-mono tracking-[0.2em] text-white/30 uppercase">Local_History</h2>
                <div className="flex items-center gap-2">
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startNewChat();
                        }}
                        className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-all duration-300 text-gray-400 hover:text-white hover:scale-105"
                        aria-label="New chat"
                        title="New chat"
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
                        aria-label="Hide sidebar"
                        title="Close"
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

        {/* Universal Sidebar - Fixed Position Full Height */}
        <HomeFeedSidebar className="z-30" />
        {/* Main Content */}
        <div className={`flex-1 flex flex-col relative ${showHistory ? 'ml-96' : 'ml-16'} transition-all duration-500 ease-in-out`}>
          {/* Subtle Ambient Glows */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/[0.01] rounded-full blur-[100px]" />
          </div>

          {/* Header */}
          <div className={`sticky top-0 z-30 border-b border-white/[0.05] bg-black/40 backdrop-blur-xl transition-all duration-300 ${(isIntegrationsModalOpen || isEmailSelectionModalOpen || isPersonalityModalOpen) ? 'blur-sm' : ''}`}>
            <div className="relative px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/[0.03] rounded-2xl w-12 h-12 flex items-center justify-center border border-white/10 shadow-2xl overflow-hidden group hover:border-white/20 transition-all">
                      <img src="/arcus-ai-icon.jpg" alt="Arcus AI" className="w-full h-full object-cover grayscale transition-all group-hover:grayscale-0" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h1 className="text-lg font-bold text-white tracking-tight uppercase font-mono">ARCUS_STREAM</h1>
                        {arcusCredits && currentPlan !== 'pro' && arcusCredits.limit > 0 && !arcusCredits.isUnlimited && (
                          <span className="text-[9px] font-mono tracking-widest px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/40">
                            {arcusCredits.remaining}_CREDITS
                          </span>
                        )}
                        {(currentPlan === 'pro' || arcusCredits?.isUnlimited) && (
                          <span className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                            Unlimited
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/60 font-sans">
                        Intelligent email analysis and agentic AI
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={startNewChat}
                        className="p-2.5 hover:bg-white/5 rounded-xl transition-all hover:scale-105 active:scale-95 group text-white/40 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <span className="text-[10px] font-mono">NEW_SESSION</span>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          if (!showHistory) {
                            setHistoryRefreshKey(prev => prev + 1);
                          }
                          setShowHistory(!showHistory);
                        }}
                        className="p-2.5 hover:bg-white/5 rounded-xl transition-all hover:scale-105 active:scale-95 group text-white/40 hover:text-white"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <span className="text-[10px] font-mono">SESSION_LOGS</span>
                    </TooltipContent>
                  </Tooltip>
                  <div className="h-6 w-[1px] bg-white/[0.08] mx-2" />
                  <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                    <span className="text-white/40 font-mono text-[11px] font-bold tracking-tighter uppercase">V2.4</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-center -mt-8">
                {currentPlan !== 'pro' && (
                  <RainbowButton onClick={() => window.location.href = '/pricing'}>Get Unlimited Access</RainbowButton>
                )}
              </div>
            </div>
          </div>

          {/* Chat Content */}
          <div className="flex-1 flex flex-col relative z-10 min-h-0">

            {isInitialMode ? (
              /* Initial Interface */
              <div className="flex-1 overflow-y-auto transition-all duration-300">
                <div className="h-full flex items-center justify-center px-6">
                  <div className="w-full max-w-3xl mx-auto">
                    <div className="text-center mb-8">
                      <h1 className="text-4xl font-medium text-white mb-2 font-sans">
                        Ask about your emails
                      </h1>
                    </div>

                    <div className="mb-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div
                          className="group bg-[#0a0a0a] backdrop-blur-md border border-[#1a1a1a] rounded-xl p-4 shadow-lg hover:border-[#2a2a2a] hover:bg-[#151515] transition-all duration-300 cursor-pointer"
                          onClick={() => handleSend("Catch me up on my recent emails and highlight what I missed.")}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-blue-500/20 rounded-lg p-2">
                              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <h3 className="text-white font-medium font-sans text-sm">Catch up</h3>
                          </div>
                          <p className="text-white/60 text-sm leading-relaxed font-sans">Summarize threads and highlight what you missed.</p>
                        </div>

                        <div
                          className="group bg-[#0a0a0a] backdrop-blur-md border border-[#1a1a1a] rounded-xl p-4 shadow-lg hover:border-[#2a2a2a] hover:bg-[#151515] transition-all duration-300 cursor-pointer"
                          onClick={() => handleSend("Help me schedule a meeting.")}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="bg-white/10 rounded-lg p-2">
                              <svg className="w-5 h-5 text-white/75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <h3 className="text-white font-medium font-sans text-sm">Smart Scheduling</h3>
                          </div>
                          <p className="text-white/60 text-xs leading-relaxed font-sans">Automatically schedule meetings or email deliveries via Google Calendar and Meet.</p>
                        </div>

                        <div
                          className="group bg-[#0a0a0a] backdrop-blur-md border border-[#1a1a1a] rounded-xl p-4 shadow-lg hover:border-[#2a2a2a] hover:bg-[#151515] transition-all duration-300 cursor-pointer"
                          onClick={() => handleSend("Show me my email analytics and activity insights.")}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="bg-orange-500/20 rounded-lg p-2">
                              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                            <h3 className="text-white font-medium font-sans text-sm">Analytics</h3>
                          </div>
                          <p className="text-white/60 text-xs leading-relaxed font-sans">Track performance metrics and uncover insights from your email activity.</p>
                        </div>

                        <div
                          className="group bg-[#0a0a0a] backdrop-blur-md border border-[#1a1a1a] rounded-xl p-4 shadow-lg hover:border-[#2a2a2a] hover:bg-[#151515] transition-all duration-300 cursor-pointer"
                          onClick={() => handleSend("Help me draft a reply to my latest thread.")}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="bg-purple-500/20 rounded-lg p-2">
                              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                            </div>
                            <h3 className="text-white font-medium font-sans text-sm">Draft reply</h3>
                          </div>
                          <p className="text-white/60 text-xs leading-relaxed font-sans">AI that crafts smart, context-aware replies to your emails.</p>
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      {pendingReplyProposal && (
                        <div className="mb-4">
                          <DraftReplyBox
                            isVisible={!!pendingReplyProposal}
                            draftData={{
                              content: pendingReplyProposal.content,
                              recipientName: pendingReplyProposal.recipientName,
                              recipientEmail: pendingReplyProposal.recipientEmail,
                              senderName: 'Me',
                              subject: pendingReplyProposal.subject,
                              threadId: pendingReplyProposal.threadId
                            }}
                            onSendReply={handleSendReply}
                            onDismiss={() => setPendingReplyProposal(null)}
                          />
                        </div>
                      )}
                      {currentPlan !== null && currentPlan !== 'pro' && (
                        <div className="mb-3">
                          <Note
                            type="secondary"
                            size="small"
                            action={
                              <Button1
                                size="small"
                                onClick={() => window.location.href = '/pricing'}
                              >
                                Upgrade
                              </Button1>
                            }
                          >
                            You&apos;re on the free plan. Upgrade for unlimited Arcus AI access.
                          </Note>
                        </div>
                      )}
                      <ChatInput
                        onSendMessage={(msg) => {
                          handleSend(msg);
                        }}
                        disabled={isLoading}
                        placeholder="Ask anything about your emails"
                        onModalStateChange={setIsIntegrationsModalOpen}
                        onEmailModalStateChange={setIsEmailSelectionModalOpen}
                        selectedEmails={selectedEmails}
                        onEmailSelect={setSelectedEmails}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Conversation Interface */
              <>
                <div className="flex-1 overflow-y-auto px-6 py-8 min-h-0 transition-all duration-300">
                  <div className="max-w-3xl mx-auto space-y-8">
                    {activeMission && <MissionStatusHeader mission={activeMission} />}
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex items-start gap-6 ${newMessageIds.has(msg.id) ? 'animate-fade-in' : ''}`}>
                        {msg.type === 'agent' && (
                          <div className="flex-shrink-0 mt-3">
                            <div className="bg-white/[0.03] rounded-2xl w-10 h-10 flex items-center justify-center border border-white/[0.08] shadow-2xl overflow-hidden">
                              <img src="/arcus-ai-icon.jpg" alt="Arcus AI" className="w-full h-full object-cover grayscale opacity-60" />
                            </div>
                          </div>
                        )}

                        <div className={`flex-1 ${msg.type === 'user' ? 'flex justify-end' : ''}`}>
                          {msg.type === 'agent' ? (
                            <div className="space-y-1 pt-1">
                              {/* Muse-style inline thinking process (persistent in message) */}
                              {(msg as AgentMessage).meta?.thinkingProcess && (msg as AgentMessage).meta!.thinkingProcess!.length > 0 && (
                                <div className="mb-3">
                                  <ThinkingLayer
                                    steps={(msg as AgentMessage).meta!.thinkingProcess!.map(tp => ({
                                      id: tp.id,
                                      label: tp.label,
                                      status: 'completed' as const,
                                      type: 'think' as const,
                                      expandedContent: tp.expandedContent,
                                    }))}
                                    isVisible={true}
                                  />
                                </div>
                              )}

                              {/* Artifact card — inline clickable card to open canvas */}
                              {(msg as AgentMessage).meta?.artifact && (
                                <ArtifactCard
                                  type={(msg as AgentMessage).meta!.artifact!.type}
                                  title={(msg as AgentMessage).meta!.artifact!.title}
                                  onView={() => {
                                    setCanvasData((msg as AgentMessage).meta!.artifact!.canvasData);
                                    setIsCanvasOpen(true);
                                  }}
                                />
                              )}

                              {/* Response text */}
                              {typeof msg.content === 'string' ? (
                                <div
                                  className="text-white/[0.85] text-[15px] leading-[1.8] font-sans prose prose-invert max-w-none prose-p:mb-5 prose-strong:text-white prose-strong:font-bold prose-headings:text-white prose-headings:font-bold selection:bg-white selection:text-black"
                                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                />
                              ) : (
                                <>
                                  <div
                                    className="text-white/[0.85] text-[15px] leading-[1.8] font-sans prose prose-invert max-w-none selection:bg-white selection:text-black"
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content.text) }}
                                  />
                                  {msg.content.list && msg.content.list.length > 0 && (
                                    <ul className="space-y-3 pl-1 mt-4">
                                      {msg.content.list.map((item: string, idx: number) => (
                                        <li key={idx} className="text-white/[0.85] text-[15px] leading-[1.8] flex items-start gap-3">
                                          <div className="w-1 h-1 rounded-full bg-white/20 mt-2.5 shrink-0" />
                                          <span dangerouslySetInnerHTML={{ __html: renderMarkdown(item) }} />
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  {msg.content.footer && (
                                    <div
                                      className="text-white/[0.85] text-[15px] leading-[1.8] pt-5 font-sans italic opacity-60"
                                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content.footer) }}
                                    />
                                  )}
                                </>
                              )}
                              <p className="text-white/10 text-[10px] font-mono tracking-widest pt-4 uppercase">{msg.time}</p>

                              {(msg as AgentMessage).meta?.actionType === 'email' && (msg as AgentMessage).meta?.emailResult?.success && (
                                <div className="mt-4 space-y-3">
                                  {Array.isArray((msg as AgentMessage).meta?.emailResult?.emails) && (msg as AgentMessage).meta?.emailResult?.emails?.length > 0 ? (
                                    (msg as AgentMessage).meta?.emailResult?.emails?.map((email: any) => (
                                      <div key={email.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <div className="text-white font-medium leading-snug">{email.subject || '(No Subject)'}</div>
                                        <div className="text-white/60 text-sm mt-1">{email.from || 'Unknown Sender'}</div>
                                        {email.date && <div className="text-white/40 text-xs mt-1">{email.date}</div>}
                                        {email.snippet && <div className="text-white/70 text-sm mt-3 leading-relaxed">{email.snippet}</div>}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-white/70 text-sm">No results found.</div>
                                  )}
                                </div>
                              )}

                              {(msg as AgentMessage).meta?.actionType === 'notes' && (msg as AgentMessage).meta?.notesResult?.success && (
                                <div className="mt-4 space-y-3">
                                  {Array.isArray((msg as AgentMessage).meta?.notesResult?.notes) && (msg as AgentMessage).meta?.notesResult?.notes?.length > 0 ? (
                                    (msg as AgentMessage).meta?.notesResult?.notes?.slice(0, 10).map((note: any, idx: number) => (
                                      <div key={note.id || idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <div className="text-white font-medium leading-snug">{note.subject || '(No Subject)'}</div>
                                        {note.created_at && <div className="text-white/40 text-xs mt-1">{note.created_at}</div>}
                                        {note.content && <div className="text-white/70 text-sm mt-3 leading-relaxed">{note.content}</div>}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-white/70 text-sm">No results found.</div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="max-w-2xl">
                              <div className="bg-white text-black rounded-2xl px-5 py-4 shadow-2xl shadow-black/40">
                                <p className="text-black text-[15px] font-medium leading-relaxed">{msg.content}</p>
                              </div>
                              <p className="text-right text-white/10 text-[10px] font-mono tracking-widest pt-3 uppercase">{msg.time}</p>
                            </div>
                          )}
                        </div>

                        {msg.type === 'user' && (
                          <div className="flex-shrink-0 mt-1">
                            <div className="bg-[#2a2a2a] rounded-full p-2.5 w-11 h-11 flex items-center justify-center backdrop-blur-sm border border-[#3a3a3a] shadow-lg">
                              <User className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Loading indicator with live AI-generated thinking */}
                    {isLoading && (
                      <div className="flex items-start gap-4 mt-4 animate-fade-in">
                        <div className="flex-shrink-0 mt-1">
                          <div className="bg-neutral-800 rounded-full w-11 h-11 flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-lg overflow-hidden">
                            <img src="/arcus-ai-icon.jpg" alt="Arcus AI" className="w-full h-full object-cover opacity-80" />
                          </div>
                        </div>
                        <div className="flex-1 pt-1">
                          {liveThinkingSteps.length > 0 ? (
                            <ThinkingLayer
                              steps={liveThinkingSteps.map(s => ({
                                ...s,
                                status: s.status as 'active' | 'completed' | 'pending' | 'error',
                                type: (s.type || 'think') as 'think' | 'search' | 'read' | 'analyze' | 'draft' | 'execute',
                              }))}
                              isVisible={true}
                              isGenerating={true}
                              generatingLabel="Arcus is preparing the workflow"
                            />
                          ) : (
                            <div className="flex items-center gap-2 pt-1.5">
                              <MorphingSquare
                                className="w-4 h-4 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                message="Arcus is working..."
                                messagePlacement="right"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Floating Input Area with Progressive Blur */}
                <div className="sticky bottom-0 z-20 w-full px-6 pb-12 mt-auto pointer-events-none">
                  {/* Progressive blur overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
                  <div className="max-w-3xl mx-auto relative z-10 pointer-events-auto">
                    {currentPlan !== null && currentPlan !== 'pro' && (
                      <div className="mb-3">
                        <Note
                          type="secondary"
                          size="small"
                          action={
                            <Button1
                              size="small"
                              onClick={() => window.location.href = '/pricing'}
                            >
                              Upgrade
                            </Button1>
                          }
                        >
                          You&apos;re on the free plan. Upgrade for unlimited Arcus AI access.
                        </Note>
                      </div>
                    )}
                    <ChatInput
                      onSendMessage={(msg) => {
                        handleSend(msg);
                      }}
                      disabled={isLoading}
                      placeholder="Ask follow-up..."
                      onModalStateChange={setIsIntegrationsModalOpen}
                      onEmailModalStateChange={setIsEmailSelectionModalOpen}
                      selectedEmails={selectedEmails}
                      onEmailSelect={setSelectedEmails}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Integrations Modal */}
      <IntegrationsModal
        isOpen={isIntegrationsModalOpen}
        onClose={() => setIsIntegrationsModalOpen(false)}
      />

      {/* Email Selection Modal */}
      <EmailSelectionModal
        isOpen={isEmailSelectionModalOpen}
        onClose={() => setIsEmailSelectionModalOpen(false)}
        onSelectEmails={(emails: Email[]) => {
          setSelectedEmails(prev => [...prev, ...emails]);
          setIsEmailSelectionModalOpen(false);
        }}
      />

      {/* Personality Settings Modal */}
      <PersonalitySettingsModal
        isOpen={isPersonalityModalOpen}
        onClose={() => setIsPersonalityModalOpen(false)}
        onSave={handleSavePersonality}
        initialPersonality={savedPersonality}
      />

      {/* Canvas Panel */}
      <CanvasPanel
        isOpen={isCanvasOpen}
        onClose={() => setIsCanvasOpen(false)}
        canvasData={canvasData}
        onExecute={handleCanvasExecute}
        isExecuting={isCanvasExecuting}
      />

      <style jsx global>{`
        @keyframes dot-pulse {
          0% { transform: scale(0.6); opacity: 0.4; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.6); opacity: 0.4; }
        }
        .animate-dot-pulse {
          animation: dot-pulse 1.2s infinite ease-in-out;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </TooltipProvider>
  );
};

/**
 * Mission Status Header Component
 */
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
    <div className="flex items-center gap-3 px-4 py-2.5 bg-neutral-900/40 border border-white/5 rounded-xl w-fit mx-auto mb-10 backdrop-blur-md animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">In progress</span>
        <span className="text-white/20">/</span>
        <span className="text-white text-sm font-medium">{mission.goal}</span>
      </div>
      <div className="h-3 w-[1px] bg-white/10 mx-1" />
      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-tight ${statusColors[mission.status] || 'bg-white text-black'}`}>
        {statusLabels[mission.status] || mission.status}
      </span>
    </div>
  );
};






/**
* Helper functions for notes detection and search
*/
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

  // Patterns to extract search terms
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

  // If no pattern matches, return the entire message as search term
  return message.trim();
}









