"use client";

import { Send, Mail, Upload, User, History, Plus, MessageCircle, Edit, DoorOpen, Bell, Mail as EmailIcon, MoreHorizontal, LogOut, Settings, Target, Zap } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { ChatHistoryModal } from './components/ChatHistoryModal';
import { ChatInput } from './components/ChatInput';
import { DraftReplyBox } from './components/DraftReplyBox';
import { PlanCard } from './components/PlanCard';
import { MissionCard } from './components/MissionCard';
import { ExecutionResultCard } from './components/ExecutionResultCard';
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
import { toast } from 'sonner';
import type { PlanCard as PlanCardType, Mission, ExecutionResult } from './types/mission';

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
      // Premium Action Button Layout
      return `<div class="my-6 p-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-3xl shadow-2xl overflow-hidden"><div class="bg-neutral-900 rounded-[1.4rem] p-6 flex flex-col items-center text-center"><div class="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 border border-blue-500/20"><svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div><h4 class="text-white font-bold text-lg mb-2">Priority Action</h4><p class="text-neutral-400 text-xs mb-6 max-w-[250px]">Secure action link detected in conversation</p><a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center px-12 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(37,99,235,0.4)] no-underline">Confirm & Proceed</a><div class="mt-4 text-[9px] text-neutral-600 font-mono break-all opacity-40 hover:opacity-100 transition-opacity select-all cursor-text py-2 px-4 bg-black/20 rounded-lg">${url}</div></div></div>`;
    }

    const displayUrl = url.length > 55 ? url.substring(0, 52) + '...' : url;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-500/30 transition-all font-medium break-all" title="${url}">${displayUrl}</a>`;
  });
};

// Rich markdown renderer for AI messages
const renderMarkdown = (text: string): string => {
  if (!text) return text;

  // Handle paragraphs: Split by double newlines and wrap in <p>
  const paragraphs = text.split(/\n\n+/);

  const renderedParagraphs = paragraphs.map(para => {
    // Handle bold: **text** -> <strong>text</strong>
    let processedPara = para.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white brightness-125">$1</strong>');

    // Handle bullet points: Start with - or *
    if (processedPara.includes('\n- ') || processedPara.startsWith('- ') || processedPara.includes('\n* ') || processedPara.startsWith('* ')) {
      const lines = processedPara.split('\n');
      const listItems = lines.map(line => {
        const match = line.match(/^[\s]*[-*]\s*(.*)$/);
        if (match) {
          return `<li class="ml-4">${match[1]}</li>`;
        }
        return line;
      });

      // Rejoin, wrapping groups of <li> in <ul>
      let joinedList = listItems.join('\n');
      joinedList = joinedList.replace(/(<li[\s\S]*?<\/li>(?:\n<li[\s\S]*?<\/li>)*)/g, '<ul class="space-y-2 my-5 list-disc list-inside bg-white/5 p-4 rounded-xl border border-white/10">$1</ul>');
      return joinedList;
    }

    // Linkify URLs
    processedPara = linkify(processedPara);

    // Handle single newlines: Convert to <br/>
    processedPara = processedPara.replace(/\n/g, '<br/>');

    return `<p class="mb-4 last:mb-0 leading-relaxed text-[#f0f0f0]">${processedPara}</p>`;
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
    actionType?: 'notes' | 'email' | 'general' | 'mission_plan' | 'mission_created' | 'execution_result' | string;
    notesResult?: any;
    emailResult?: any;
    planCard?: PlanCardType;
    mission?: Mission;
    executionResult?: ExecutionResult;
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
  const [actionStatus, setActionStatus] = useState<'planning' | 'processing' | 'done' | null>(null);
  const [activeSearchLabel, setActiveSearchLabel] = useState<string | null>(null);

  // Mission & Plan Card state
  const [activeMissions, setActiveMissions] = useState<Mission[]>([]);
  const [planCards, setPlanCards] = useState<Record<string, PlanCardType>>({});

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

  // Draft reply state
  const [currentDraftData, setCurrentDraftData] = useState<{
    content: string;
    recipientName: string;
    recipientEmail: string;
    senderName: string;
    originalEmailId?: string;
    threadId?: string;
    messageId?: string;
    subject: string;
  } | null>(null);
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

  const processAIMessage = async (messageText: string, conversationIdToUse: string, isNew: boolean) => {
    let actionTriggered = false;
    let statusTimeout: any = null;

    try {
      setIsLoading(true);

      const notesQuery = isNotesRelatedQuery(messageText);
      const emailQuery = isEmailRelatedQuery(messageText);
      setIsNotesQuery(notesQuery);

      if (notesQuery || emailQuery) {
        setActiveSearchLabel('Searching...');
      }

      let extractedQuery = '';
      if (notesQuery) {
        actionTriggered = true;
        setActionStatus('planning');
        extractedQuery = extractSearchTerm(messageText);
        setNotesSearchQuery(extractedQuery);
        setShowNotesFetching(true);
        setNotesResults([]);

        // Simulate planning phase
        statusTimeout = setTimeout(() => setActionStatus('processing'), 1500);
      } else if (isSchedulingRequest(messageText) || /^(yes|yeah|yep|correct|do it|confirm|proceed|ok|okay|sure|that works|go ahead)$/i.test(messageText.trim())) {
        actionTriggered = true;
        setActionStatus('planning');
        statusTimeout = setTimeout(() => setActionStatus('processing'), 1000);
      }

      const requestBody = {
        message: messageText,
        conversationId: conversationIdToUse,
        isNewConversation: isNew,
        gmailAccessToken,
        isNotesQuery: notesQuery,
        notesSearchQuery: extractedQuery
      };

      const response = await fetch('/api/agent-talk/chat-arcus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

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

      await refreshArcusCredits(true);

      // Update currentConversationId if needed
      if (data.conversationId && data.conversationId !== conversationIdToUse) {
        setCurrentConversationId(data.conversationId);
        conversationIdToUse = data.conversationId;
      }

      if (data.integrations) {
        setIntegrations(data.integrations);
      }

      if (data.draftData && data.actionType === 'draft_reply') {
        setCurrentDraftData(data.draftData);
        setShowDraftBox(true);
        console.log('Draft data received:', data.draftData);
      }

      // Handle Plan Card response from API
      if (data.planCard) {
        setPlanCards(prev => ({ ...prev, [data.planCard.id]: data.planCard }));
      }

      // Handle Mission creation
      if (data.mission) {
        setActiveMissions(prev => {
          const exists = prev.find(m => m.mission_id === data.mission.mission_id);
          if (exists) {
            return prev.map(m => m.mission_id === data.mission.mission_id ? data.mission : m);
          }
          return [data.mission, ...prev];
        });
      }

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
          planCard: data.planCard || undefined,
          mission: data.mission || undefined,
          executionResult: data.executionResult || undefined
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

      // Build the updated messages list - use current messages state
      // Note: We need to access the current messages state synchronously
      // The messages already include all prior messages + the new user message we added in handleSend
      // Now we need to add the agent message
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
        title: existingTitle, // Use AI-generated title or preserved original
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
      setActiveSearchLabel(null);
      setShowNotesFetching(false);
      if (statusTimeout) clearTimeout(statusTimeout);

      if (actionTriggered) {
        setActionStatus('done');
        setTimeout(() => setActionStatus(null), 3000);
      }
      setTimeout(() => scrollToBottom(true), 100);
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

    // Navigate to base agent-talk page for new chat FIRST
    if (onNewChat) {
      onNewChat();
    } else {
      // Fallback: use router directly
      router.push('/dashboard/agent-talk');
    }

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

  // ── Plan Card handlers ──
  const handlePlanApprove = useCallback(async (planId: string) => {
    const plan = planCards[planId];
    if (!plan) return;

    // Update plan status to executing
    setPlanCards(prev => ({
      ...prev,
      [planId]: { ...prev[planId], status: 'executing' }
    }));

    // Also update the plan in any message meta
    setMessages(prev => prev.map(msg => {
      if (msg.type === 'agent' && (msg as AgentMessage).meta?.planCard?.id === planId) {
        return {
          ...msg,
          meta: {
            ...(msg as AgentMessage).meta,
            planCard: { ...(msg as AgentMessage).meta!.planCard!, status: 'executing' }
          }
        } as AgentMessage;
      }
      return msg;
    }));

    toast.success('Plan approved! Executing...', { description: plan.goal });

    try {
      const response = await fetch('/api/agent-talk/chat-arcus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[PLAN_APPROVED:${planId}] Execute the approved plan: ${plan.goal}`,
          conversationId: currentConversationId,
          isNewConversation: false,
          gmailAccessToken,
          planApproval: { planId, action: 'approve' }
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Update plan to done
        setPlanCards(prev => ({
          ...prev,
          [planId]: { ...prev[planId], status: 'done' }
        }));

        // Update message with done status
        setMessages(prev => prev.map(msg => {
          if (msg.type === 'agent' && (msg as AgentMessage).meta?.planCard?.id === planId) {
            return {
              ...msg,
              meta: {
                ...(msg as AgentMessage).meta,
                planCard: { ...(msg as AgentMessage).meta!.planCard!, status: 'done' }
              }
            } as AgentMessage;
          }
          return msg;
        }));

        // Add execution result message
        const resultMessage: AgentMessage = {
          id: Date.now() + 2,
          type: 'agent',
          content: { text: data.message, list: [], footer: '' },
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }),
          meta: {
            actionType: 'execution_result',
            executionResult: data.executionResult || {
              success: true,
              changes: ['Plan executed successfully'],
              artifacts: [],
            }
          }
        };
        setMessages(prev => [...prev, resultMessage]);
        await refreshArcusCredits(true);
        toast.success('Mission complete!', { description: plan.goal });
      } else {
        // Handle non-200 API responses
        const errorData = await response.json().catch(() => ({}));

        setPlanCards(prev => ({
          ...prev,
          [planId]: { ...prev[planId], status: 'failed' }
        }));

        setMessages(prev => prev.map(msg => {
          if (msg.type === 'agent' && (msg as AgentMessage).meta?.planCard?.id === planId) {
            return {
              ...msg,
              meta: {
                ...(msg as AgentMessage).meta,
                planCard: { ...(msg as AgentMessage).meta!.planCard!, status: 'failed' }
              }
            } as AgentMessage;
          }
          return msg;
        }));

        toast.error('Plan execution failed', {
          description: errorData?.message || 'The server returned an error. Please try again.'
        });
      }
    } catch (error) {
      console.error('Plan execution error:', error);
      setPlanCards(prev => ({
        ...prev,
        [planId]: { ...prev[planId], status: 'failed' }
      }));

      // Also update in messages
      setMessages(prev => prev.map(msg => {
        if (msg.type === 'agent' && (msg as AgentMessage).meta?.planCard?.id === planId) {
          return {
            ...msg,
            meta: {
              ...(msg as AgentMessage).meta,
              planCard: { ...(msg as AgentMessage).meta!.planCard!, status: 'failed' }
            }
          } as AgentMessage;
        }
        return msg;
      }));

      toast.error('Plan execution failed', { description: 'Something went wrong. Please try again.' });
    }
  }, [planCards, currentConversationId, gmailAccessToken]);

  const handlePlanReject = useCallback((planId: string) => {
    setPlanCards(prev => ({
      ...prev,
      [planId]: { ...prev[planId], status: 'rejected' }
    }));

    setMessages(prev => prev.map(msg => {
      if (msg.type === 'agent' && (msg as AgentMessage).meta?.planCard?.id === planId) {
        return {
          ...msg,
          meta: {
            ...(msg as AgentMessage).meta,
            planCard: { ...(msg as AgentMessage).meta!.planCard!, status: 'rejected' }
          }
        } as AgentMessage;
      }
      return msg;
    }));

    toast('Plan cancelled', { description: 'No actions were taken.' });
  }, []);

  const handlePlanEdit = useCallback((planId: string, instructions: string) => {
    handleSend(`Adjust the plan: ${instructions}`);
  }, [handleSend]);

  const handleMissionGenerateNextStep = useCallback((missionId: string) => {
    handleSend(`Generate the next step for mission ${missionId}`);
  }, [handleSend]);

  const handleMissionMarkDone = useCallback((missionId: string) => {
    setActiveMissions(prev => prev.map(m =>
      m.mission_id === missionId ? { ...m, status: 'done' as const } : m
    ));
    toast.success('Mission marked as done!');
  }, []);

  const handleMissionArchive = useCallback((missionId: string) => {
    setActiveMissions(prev => prev.map(m =>
      m.mission_id === missionId ? { ...m, status: 'archived' as const } : m
    ));
    toast('Mission archived');
  }, []);

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
      <div className="flex h-screen w-full text-white overflow-hidden" style={{
        background: '#000000'
      }}>
        {/* History Sidebar - Positioned to the right of Mailient sidebar (left: 64px = 16 * 4 for w-16 sidebar) */}
        {showHistory && (
          <div className="fixed left-16 top-0 h-screen w-80 bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col backdrop-blur-md z-40">
            <div className="p-4 border-b border-[#2a2a2a]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-white font-sans">Chats</h2>
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
                      >
                        <Plus className="w-4 h-4" />
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
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
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
        {/* Main Content - Adjust margin when history sidebar is open (ml-16 for Mailient sidebar + 80 for history = 96) */}
        <div className={`flex-1 flex flex-col relative font-sans ${showHistory ? 'ml-96' : 'ml-16'} transition-all duration-300`}>
          {/* Background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gray-500/5 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gray-500/4 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gray-500/3 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '4s' }}></div>
          </div>

          {/* Header */}
          <div className={`sticky top-0 z-30 border-b border-[#000000]/20 bg-[#000000]/70 backdrop-blur-2xl transition-all duration-300 ${(isIntegrationsModalOpen || isEmailSelectionModalOpen || isPersonalityModalOpen) ? 'blur-sm' : ''}`}>
            <div className="relative px-6 py-2">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 via-black/50 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent via-black/35 to-black/60" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Placeholder for arrow space */}
                  <div className="w-9 h-9"></div>
                  <div className="flex items-center gap-3">
                    <div className="bg-neutral-800 rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-lg overflow-hidden">
                      <img src="/arcus-ai-icon.jpg" alt="Arcus AI" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h1 className="text-xl font-semibold text-white tracking-tight font-sans">Arcus</h1>
                        {arcusCredits && currentPlan !== 'pro' && arcusCredits.limit > 0 && !arcusCredits.isUnlimited && (
                          <span className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                            {arcusCredits.remaining} left
                          </span>
                        )}
                        {(currentPlan === 'pro' || arcusCredits?.isUnlimited) && (
                          <span className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                            Unlimited
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/60 font-sans">
                        Chat-to-Mission · Email · Scheduling
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={startNewChat}
                        className="p-2.5 hover:bg-[#2a2a2a] rounded-lg transition-all duration-300 hover:scale-105"
                        aria-label="New chat"
                      >
                        <Edit className="w-5 h-5 text-white/60 hover:text-white" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>New Chat</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          if (!showHistory) {
                            setHistoryRefreshKey(prev => prev + 1); // Force refresh when opening
                          }
                          setShowHistory(!showHistory);
                        }}
                        className="p-2.5 hover:bg-[#2a2a2a] rounded-lg transition-all duration-300 hover:scale-105"
                        aria-label="Toggle chat history"
                      >
                        <History className="w-5 h-5 text-white/60 hover:text-white" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>History</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="p-2.5">
                    <span className="text-white font-sans text-lg">『A』</span>
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
              /* Initial Interface — Mission-oriented */
              <div className="flex-1 overflow-y-auto transition-all duration-300">
                <div className="h-full flex items-center justify-center px-6">
                  <div className="w-full max-w-4xl mx-auto">
                    <div className="text-center mb-8">
                      <h1 className="text-4xl font-medium text-white mb-2 font-sans">
                        What do you want to get done?
                      </h1>
                      <p className="text-white/40 text-base font-sans">Arcus turns your instructions into missions — search, draft, send, schedule.</p>
                    </div>

                    <div className="mb-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <button
                          onClick={() => handleSend('Find the latest emails I need to reply to and create missions for them')}
                          className="group bg-[#0a0a0a] backdrop-blur-md border border-[#1a1a1a] rounded-xl p-4 shadow-lg hover:border-blue-500/30 hover:bg-[#0d0d14] transition-all duration-300 cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-blue-500/15 rounded-lg p-2 border border-blue-500/20">
                              <Target className="w-5 h-5 text-blue-400" />
                            </div>
                            <h3 className="text-white font-medium font-sans text-sm">Create Mission</h3>
                          </div>
                          <p className="text-white/50 text-xs leading-relaxed font-sans">Turn emails into goals with actionable next steps and follow-ups.</p>
                        </button>

                        <button
                          onClick={() => handleSend('Schedule a call for next week')}
                          className="group bg-[#0a0a0a] backdrop-blur-md border border-[#1a1a1a] rounded-xl p-4 shadow-lg hover:border-emerald-500/30 hover:bg-[#0a0d0a] transition-all duration-300 cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="bg-emerald-500/15 rounded-lg p-2 border border-emerald-500/20">
                              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <h3 className="text-white font-medium font-sans text-sm">Schedule Call</h3>
                          </div>
                          <p className="text-white/50 text-xs leading-relaxed font-sans">Schedule meetings with Google Meet invites and email confirmations.</p>
                        </button>

                        <button
                          onClick={() => handleSend('Draft a reply to the latest important email')}
                          className="group bg-[#0a0a0a] backdrop-blur-md border border-[#1a1a1a] rounded-xl p-4 shadow-lg hover:border-amber-500/30 hover:bg-[#0d0d0a] transition-all duration-300 cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="bg-amber-500/15 rounded-lg p-2 border border-amber-500/20">
                              <Mail className="w-5 h-5 text-amber-400" />
                            </div>
                            <h3 className="text-white font-medium font-sans text-sm">Draft & Send</h3>
                          </div>
                          <p className="text-white/50 text-xs leading-relaxed font-sans">Draft context-aware replies, review before sending — you're always in control.</p>
                        </button>

                        <button
                          onClick={() => handleSend('Show me emails I need to follow up on')}
                          className="group bg-[#0a0a0a] backdrop-blur-md border border-[#1a1a1a] rounded-xl p-4 shadow-lg hover:border-purple-500/30 hover:bg-[#0d0a0d] transition-all duration-300 cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="bg-purple-500/15 rounded-lg p-2 border border-purple-500/20">
                              <Zap className="w-5 h-5 text-purple-400" />
                            </div>
                            <h3 className="text-white font-medium font-sans text-sm">Follow-ups</h3>
                          </div>
                          <p className="text-white/50 text-xs leading-relaxed font-sans">Detect stale threads, generate nudges, and track who owes you a reply.</p>
                        </button>
                      </div>
                    </div>

                    {/* Active Missions Summary (if any) */}
                    {activeMissions.filter(m => m.status !== 'done' && m.status !== 'archived').length > 0 && (
                      <div className="mb-6 space-y-3">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-white/30" />
                          <span className="text-xs uppercase tracking-wider font-bold text-white/30">Active Missions</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold">
                            {activeMissions.filter(m => m.status !== 'done' && m.status !== 'archived').length}
                          </span>
                        </div>
                        {activeMissions.filter(m => m.status !== 'done' && m.status !== 'archived').slice(0, 3).map(mission => (
                          <MissionCard
                            key={mission.mission_id}
                            mission={mission}
                            isCompact
                            onGenerateNextStep={handleMissionGenerateNextStep}
                            onMarkDone={handleMissionMarkDone}
                            onArchive={handleMissionArchive}
                          />
                        ))}
                      </div>
                    )}

                    <div className="relative">
                      <ChatInput
                        onSendMessage={(msg) => {
                          handleSend(msg);
                        }}
                        disabled={isLoading}
                        placeholder="Tell Arcus what you want to get done..."
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
                  <div className="max-w-4xl mx-auto space-y-8">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex items-start gap-4 ${newMessageIds.has(msg.id) ? 'animate-fade-in' : ''}`}>
                        {msg.type === 'agent' && (
                          <div className="flex-shrink-0 mt-1">
                            <div className="bg-neutral-800 rounded-full w-11 h-11 flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-lg overflow-hidden">
                              <img src="/arcus-ai-icon.jpg" alt="Arcus AI" className="w-full h-full object-cover" />
                            </div>
                          </div>
                        )}

                        <div className={`flex-1 ${msg.type === 'user' ? 'flex justify-end' : ''}`}>
                          {msg.type === 'agent' ? (
                            <div className="space-y-1 pt-1">
                              {typeof msg.content === 'string' ? (
                                <div
                                  className="text-white/90 text-base leading-[1.9] font-sans prose prose-invert max-w-none"
                                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                />
                              ) : (
                                <>
                                  <div
                                    className="text-white/90 text-base leading-[1.9] font-sans prose prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content.text) }}
                                  />
                                  {msg.content.list && msg.content.list.length > 0 && (
                                    <ul className="space-y-2.5 pl-2 mt-3">
                                      {msg.content.list.map((item: string, idx: number) => (
                                        <li key={idx} className="text-white/90 text-base leading-[1.9] flex items-start gap-2">
                                          <span className="text-white/40 mt-1 text-lg">•</span>
                                          <span dangerouslySetInnerHTML={{ __html: renderMarkdown(item) }} />
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  {msg.content.footer && (
                                    <div
                                      className="text-white/90 text-base leading-[1.9] pt-3 font-sans"
                                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content.footer) }}
                                    />
                                  )}
                                </>
                              )}
                              <p className="text-white/40 text-xs font-medium pt-3">{msg.time}</p>

                              {/* Plan Card rendering */}
                              {(msg as AgentMessage).meta?.planCard && (
                                <div className="mt-4">
                                  <PlanCard
                                    plan={planCards[(msg as AgentMessage).meta!.planCard!.id] || (msg as AgentMessage).meta!.planCard!}
                                    onApprove={handlePlanApprove}
                                    onReject={handlePlanReject}
                                    onEdit={handlePlanEdit}
                                    isExecuting={planCards[(msg as AgentMessage).meta!.planCard!.id]?.status === 'executing'}
                                  />
                                </div>
                              )}

                              {/* Mission Card rendering */}
                              {(msg as AgentMessage).meta?.mission && (
                                <div className="mt-4">
                                  <MissionCard
                                    mission={activeMissions.find(m => m.mission_id === (msg as AgentMessage).meta?.mission?.mission_id) || (msg as AgentMessage).meta!.mission!}
                                    onGenerateNextStep={handleMissionGenerateNextStep}
                                    onMarkDone={handleMissionMarkDone}
                                    onArchive={handleMissionArchive}
                                  />
                                </div>
                              )}

                              {/* Execution Result rendering */}
                              {(msg as AgentMessage).meta?.executionResult && (
                                <div className="mt-4">
                                  <ExecutionResultCard result={(msg as AgentMessage).meta!.executionResult!} />
                                </div>
                              )}

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
                              <div className="bg-[#fafafa] text-black rounded-2xl px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.35)] border border-black/10">
                                <p className="text-black text-base leading-relaxed font-sans">{msg.content}</p>
                              </div>
                              <p className="text-right text-white/40 text-xs font-medium pt-2">{msg.time}</p>
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
                    {isLoading && (
                      <div className="flex items-start gap-4 animate-fade-in">
                        <div className="flex-shrink-0 mt-1">
                          <div className="bg-neutral-800 rounded-full w-11 h-11 flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-lg overflow-hidden">
                            <img src="/arcus-ai-icon.jpg" alt="Arcus AI" className="w-full h-full object-cover" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <ShiningText
                            text={activeSearchLabel ? activeSearchLabel : 'Arcus is thinking...'}
                            className="text-sm relative top-1"
                          />
                        </div>
                      </div>
                    )}

                    {/* Notes Fetching Display */}
                    {showNotesFetching && (
                      <NotesFetchingDisplay
                        searchQuery={notesSearchQuery}
                        isVisible={showNotesFetching}
                      />
                    )}

                    {/* Agent Action Status */}
                    {actionStatus && (
                      <AgentActionStatus status={actionStatus} />
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Floating Input Area with Progressive Blur */}
                <div className="sticky bottom-0 z-20 w-full px-6 pb-12 mt-auto pointer-events-none">
                  {/* Progressive blur overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
                  <div className="max-w-4xl mx-auto relative z-10 pointer-events-auto">
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

      {/* Draft Reply Box */}
      {showDraftBox && currentDraftData && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
          <DraftReplyBox
            draftData={currentDraftData}
            isVisible={showDraftBox}
            onDismiss={() => {
              setShowDraftBox(false);
              setCurrentDraftData(null);
            }}
            onSendReply={async (replyData) => {
              try {
                const response = await fetch('/api/agent-talk/send-reply', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: replyData.recipientEmail,
                    subject: replyData.subject,
                    content: replyData.content,
                    threadId: currentDraftData.threadId,
                    replyToMessageId: currentDraftData.messageId
                  })
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to send email');
                }

                const result = await response.json();
                console.log('Email sent successfully:', result);

                // Add success message to chat
                const successMessage: AgentMessage = {
                  id: Date.now(),
                  type: 'agent',
                  content: {
                    text: `Great news! I've sent your reply to ${currentDraftData.recipientName}. The email is on its way!`,
                    list: [],
                    footer: ''
                  },
                  time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
                };
                setMessages(prev => [...prev, successMessage]);

              } catch (error) {
                console.error('Failed to send reply:', error);
                throw error;
              }
            }}
          />
        </div>
      )}
      <style jsx global>{`
        @keyframes arcus-dot-pulse {
          0% { transform: scale(0.7); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.7); opacity: 0.8; }
        }
      `}</style>
    </TooltipProvider>
  );
}

const AgentActionStatus = ({ status }: { status: 'planning' | 'processing' | 'done' }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'planning':
        return {
          icon: <History className="w-4 h-4 text-blue-400 animate-spin" />,
          text: 'Planning action...',
          color: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
        };
      case 'processing':
        return {
          icon: <Settings className="w-4 h-4 text-purple-400 animate-spin" />,
          text: 'Processing task...',
          color: 'bg-purple-500/10 border-purple-500/20 text-purple-400'
        };
      case 'done':
        return {
          icon: <Bell className="w-4 h-4 text-emerald-400" />,
          text: 'Action complete',
          color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        };
      default:
        return null;
    }
  };

  const info = getStatusInfo();
  if (!info) return null;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${info.color} backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300 mb-4 ml-14 max-w-xs`}>
      {info.icon}
      <span className="text-sm font-medium font-sans tracking-wide">{info.text}</span>
    </div>
  );
};

const isSchedulingRequest = (message: string) => {
  const keywords = ['schedule', 'meeting', 'calendar', 'meet', 'call', 'appointment', 'event'];
  return keywords.some(k => message.toLowerCase().includes(k));
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
