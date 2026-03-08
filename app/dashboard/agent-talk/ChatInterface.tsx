"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Circle,
  Clock3,
  Mail,
  PenSquare,
  Sparkles,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AddSquareIcon,
  Cancel01Icon,
  ViewSidebarLeftIcon,
  ViewSidebarRightIcon,
  WorkHistoryIcon,
} from '@hugeicons/core-free-icons';
import { ChatHistoryModal } from './components/ChatHistoryModal';
import { ChatInput } from './components/ChatInput';
import { IntegrationsModal } from '@/components/ui/integrations-modal';
import { EmailSelectionModal } from '@/components/ui/email-selection-modal';
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';

interface EmailSelection {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

interface ArcusResponse {
  intent?: {
    primary?: string;
    confidence?: number;
  };
  model?: string;
  context?: {
    connected?: boolean;
    query?: string | null;
    totalEmails?: number;
    emails?: Array<{
      id: string;
      threadId: string;
      subject: string;
      from: string;
      date: string;
      snippet: string;
      isUnread: boolean;
      isImportant: boolean;
    }>;
  };
  thinking?: Array<{
    id: string;
    label: string;
    detail: string;
    status: string;
  }>;
  plan?: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  checklist?: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  canvas?: {
    type: string;
    title: string;
    subtitle: string;
    sections: Array<{
      id: string;
      title: string;
      content: string;
      tone?: 'neutral' | 'success' | 'warning';
    }>;
    action: {
      id: string;
      label: string;
      endpoint: string;
      method: 'POST';
      requiresApproval: boolean;
      payload: Record<string, unknown>;
      confirmationText: string;
      followUpPrompt: string;
    } | null;
  };
}

interface UserMessage {
  id: string;
  type: 'user';
  content: string;
  time: string;
}

interface AgentMessage {
  id: string;
  type: 'agent';
  content: {
    text: string;
    arcus?: ArcusResponse;
  };
  time: string;
}

type Message = UserMessage | AgentMessage;

interface ChatInterfaceProps {
  initialConversationId?: string | null;
  onConversationSelect?: (conversationId: string) => void;
  onNewChat?: () => void;
  onConversationDelete?: (conversationId: string) => void;
}

const LOADING_STAGES = [
  'Understanding the request',
  'Searching Gmail context',
  'Planning the workflow',
  'Preparing the canvas',
];

const PROMPT_SUGGESTIONS = [
  'Summarize unread client emails from this week',
  'Draft a reply to the latest email from my investor',
  'Prepare a follow-up email for leads that went quiet',
  'Show me urgent threads and what I should do next',
];

function isAgentMessage(message: Message): message is AgentMessage {
  return message.type === 'agent';
}

function formatTime() {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function createConversationId() {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function serializeConversation(id: string, messages: Message[], title: string) {
  return {
    id,
    title,
    messages,
    lastUpdated: new Date().toISOString(),
    messageCount: messages.length,
  };
}

function normalizeStoredMessage(message: {
  id?: string | number;
  type?: string;
  content?: unknown;
  time?: string;
}): Message {
  if (message.type === 'agent') {
    if (typeof message.content === 'string') {
      return {
        id: String(message.id),
        type: 'agent',
        content: { text: message.content },
        time: message.time || formatTime(),
      };
    }

    const agentContent =
      typeof message.content === 'object' && message.content !== null
        ? (message.content as { text?: string; arcus?: ArcusResponse })
        : {};

    return {
      id: String(message.id),
      type: 'agent',
      content: {
        text: agentContent.text || 'Arcus prepared a response.',
        arcus: agentContent.arcus,
      },
      time: message.time || formatTime(),
    };
  }

  return {
    id: String(message.id),
    type: 'user',
    content: typeof message.content === 'string' ? message.content : '',
    time: message.time || formatTime(),
  };
}

export default function ChatInterface({
  initialConversationId = null,
  onConversationSelect,
  onNewChat,
  onConversationDelete,
}: ChatInterfaceProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isInitialMode, setIsInitialMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false);
  const [isEmailSelectionModalOpen, setIsEmailSelectionModalOpen] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<EmailSelection[]>([]);
  const [activeCanvas, setActiveCanvas] = useState<ArcusResponse['canvas'] | null>(null);
  const [canvasForm, setCanvasForm] = useState<Record<string, string>>({});
  const [isCanvasExecuting, setIsCanvasExecuting] = useState(false);
  const [canvasExecutionError, setCanvasExecutionError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const latestAgentResponse = useMemo(() => {
    const latest = [...messages].reverse().find(isAgentMessage);
    return latest?.content.arcus || null;
  }, [messages]);

  useEffect(() => {
    if (!activeCanvas && latestAgentResponse?.canvas) {
      setActiveCanvas(latestAgentResponse.canvas);
    }
  }, [activeCanvas, latestAgentResponse]);

  useEffect(() => {
    if (!activeCanvas?.action?.payload) {
      setCanvasForm({});
      return;
    }

    setCanvasForm({
      to: String(activeCanvas.action.payload.to || ''),
      subject: String(activeCanvas.action.payload.subject || ''),
      content: String(activeCanvas.action.payload.content || ''),
    });
  }, [activeCanvas]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      setLoadingStage(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingStage((current) => (current + 1) % LOADING_STAGES.length);
    }, 900);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  function persistConversation(conversationId: string, nextMessages: Message[]) {
    const firstUserMessage = nextMessages.find((message) => message.type === 'user');
    const title = firstUserMessage?.content || 'New Arcus workflow';
    localStorage.setItem(
      `conversation_${conversationId}`,
      JSON.stringify(serializeConversation(conversationId, nextMessages, title))
    );
    localStorage.setItem(`conv_${conversationId}_title`, title);
  }

  const loadConversation = useCallback(async (conversationId: string) => {
    const storedConversation = localStorage.getItem(`conversation_${conversationId}`);
    if (storedConversation) {
      try {
        const parsed = JSON.parse(storedConversation);
        const restoredMessages = (parsed.messages || []).map(normalizeStoredMessage);
        setMessages(restoredMessages);
        setCurrentConversationId(conversationId);
        setIsInitialMode(restoredMessages.length === 0);
        const latest = [...restoredMessages].reverse().find(isAgentMessage);
        setActiveCanvas(latest?.content.arcus?.canvas || null);
      } catch (error) {
        console.error('Failed to restore Arcus conversation:', error);
      }
    } else {
      try {
        const response = await fetch(`/api/agent-talk/conversation/${conversationId}`);
        const data = await response.json();
        if (data?.messages && Array.isArray(data.messages)) {
          const restoredMessages = data.messages.map(normalizeStoredMessage);
          setMessages(restoredMessages);
          setCurrentConversationId(conversationId);
          setIsInitialMode(restoredMessages.length === 0);
          const latest = [...restoredMessages].reverse().find(isAgentMessage);
          setActiveCanvas(latest?.content.arcus?.canvas || null);
        }
      } catch (error) {
        console.error('Failed to load Arcus conversation from API:', error);
      }
    }

    onConversationSelect?.(conversationId);
  }, [onConversationSelect]);

  useEffect(() => {
    if (!initialConversationId) {
      setMessages([]);
      setCurrentConversationId(null);
      setIsInitialMode(true);
      setActiveCanvas(null);
      return;
    }

    void loadConversation(initialConversationId);
  }, [initialConversationId, loadConversation]);

  function handleNewChat() {
    router.push('/dashboard/agent-talk');
    setMessages([]);
    setCurrentConversationId(null);
    setIsInitialMode(true);
    setActiveCanvas(null);
    setCanvasForm({});
    setCanvasExecutionError(null);
    onNewChat?.();
  }

  async function handleSendMessage(rawMessage: string) {
    const trimmed = rawMessage.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const conversationId = currentConversationId || createConversationId();
    const userMessage: UserMessage = {
      id: `${Date.now()}-user`,
      type: 'user',
      content: trimmed,
      time: formatTime(),
    };

    const optimisticMessages = [...messages, userMessage];
    setMessages(optimisticMessages);
    setCurrentConversationId(conversationId);
    setIsInitialMode(false);
    setIsLoading(true);
    setCanvasExecutionError(null);

    try {
      const response = await fetch('/api/agent-talk/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          conversationId,
          isNewConversation: !currentConversationId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Arcus could not complete the request.');
      }

      const agentMessage: AgentMessage = {
        id: `${Date.now()}-agent`,
        type: 'agent',
        content: {
          text: data.message,
          arcus: data.arcus,
        },
        time: formatTime(),
      };

      const nextMessages = [...optimisticMessages, agentMessage];
      setMessages(nextMessages);
      setActiveCanvas(data.arcus?.canvas || null);
      persistConversation(conversationId, nextMessages);
    } catch (error) {
      const fallbackMessage: AgentMessage = {
        id: `${Date.now()}-agent-error`,
        type: 'agent',
        content: {
          text:
            error instanceof Error
              ? error.message
              : 'Arcus could not complete the request right now.',
        },
        time: formatTime(),
      };
      const nextMessages = [...optimisticMessages, fallbackMessage];
      setMessages(nextMessages);
      persistConversation(conversationId, nextMessages);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCanvasExecution() {
    if (!activeCanvas?.action) {
      return;
    }

    setIsCanvasExecuting(true);
    setCanvasExecutionError(null);

    try {
      const payload = {
        ...activeCanvas.action.payload,
        to: canvasForm.to || activeCanvas.action.payload.to,
        subject: canvasForm.subject || activeCanvas.action.payload.subject,
        content: canvasForm.content || activeCanvas.action.payload.content,
      };

      const response = await fetch(activeCanvas.action.endpoint, {
        method: activeCanvas.action.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || data?.details || 'Execution failed.');
      }

      const confirmationMessage: AgentMessage = {
        id: `${Date.now()}-confirmation`,
        type: 'agent',
        content: {
          text: `${activeCanvas.action.confirmationText}\n\n${activeCanvas.action.followUpPrompt}`,
        },
        time: formatTime(),
      };

      const nextCanvas = {
        ...activeCanvas,
        action: null,
        sections: [
          ...activeCanvas.sections,
          {
            id: `execution-${Date.now()}`,
            title: 'Execution Result',
            content: 'Approved action completed successfully.',
            tone: 'success' as const,
          },
        ],
      };

      const nextMessages = [...messages, confirmationMessage];
      setMessages(nextMessages);
      setActiveCanvas(nextCanvas);

      if (currentConversationId) {
        persistConversation(currentConversationId, nextMessages);
      }
    } catch (error) {
      setCanvasExecutionError(
        error instanceof Error ? error.message : 'Execution failed. Please try again.'
      );
    } finally {
      setIsCanvasExecuting(false);
    }
  }

  function handleConversationDelete(deletedConversationId: string) {
    localStorage.removeItem(`conversation_${deletedConversationId}`);
    localStorage.removeItem(`conv_${deletedConversationId}_title`);

    if (currentConversationId === deletedConversationId) {
      handleNewChat();
      onConversationDelete?.(deletedConversationId);
    }
  }

  function statusIcon(status?: string) {
    if (status === 'completed') {
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    }

    if (status === 'pending' || status === 'pending_approval') {
      return <Clock3 className="h-4 w-4 text-amber-300" />;
    }

    return <Circle className="h-4 w-4 text-white/40" />;
  }

  const panelOpen = !!activeCanvas;

  return (
    <div className="flex h-screen overflow-hidden bg-[#040404] text-white">
      <HomeFeedSidebar className="z-30" />

      {showHistory && (
        <aside className="fixed left-16 top-0 z-40 h-screen w-80 border-r border-white/10 bg-[#080808]/95 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-white/45">Arcus</p>
              <h2 className="text-lg font-semibold text-white">Workflow History</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="rounded-xl border border-white/10 p-2 text-white/70 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.8} />
            </button>
          </div>
          <div className="h-[calc(100vh-81px)] overflow-y-auto">
            <ChatHistoryModal
              isOpen={true}
              onClose={() => setShowHistory(false)}
              onConversationSelect={loadConversation}
              onConversationDelete={handleConversationDelete}
            />
          </div>
        </aside>
      )}

      <main
        className={`relative flex min-w-0 flex-1 flex-col transition-[margin,padding] duration-500 ${
          showHistory ? 'ml-96' : 'ml-16'
        } ${panelOpen ? 'pr-0 lg:pr-[48vw]' : ''}`}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[12%] top-[-12rem] h-[24rem] w-[24rem] rounded-full bg-cyan-400/8 blur-3xl" />
          <div className="absolute bottom-[-10rem] right-[10%] h-[22rem] w-[22rem] rounded-full bg-emerald-400/7 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%),linear-gradient(135deg,rgba(14,24,20,0.9),rgba(4,4,4,1))]" />
        </div>

        <header className="relative z-10 border-b border-white/10 bg-[#060606]/75 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-[0_0_40px_rgba(94,234,212,0.08)]">
                <Sparkles className="h-5 w-5 text-cyan-200" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Arcus</h1>
                <p className="text-sm text-white/60">
                  Gmail-native AI operator for planning, drafting, and approval-based execution
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleNewChat}
                title="New chat"
                aria-label="New chat"
                className="rounded-2xl border border-white/10 bg-white/5 p-2.5 text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <HugeiconsIcon icon={AddSquareIcon} size={18} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => setShowHistory((value) => !value)}
                title="History"
                aria-label="History"
                className="rounded-2xl border border-white/10 bg-white/5 p-2.5 text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <HugeiconsIcon icon={WorkHistoryIcon} size={18} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => setActiveCanvas((canvas) => (canvas ? null : latestAgentResponse?.canvas || null))}
                title={panelOpen ? 'Close canvas' : 'Open canvas'}
                aria-label={panelOpen ? 'Close canvas' : 'Open canvas'}
                className="rounded-2xl border border-white/10 bg-white/5 p-2.5 text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <HugeiconsIcon
                  icon={panelOpen ? ViewSidebarRightIcon : ViewSidebarLeftIcon}
                  size={18}
                  strokeWidth={1.8}
                />
              </button>
            </div>
          </div>
        </header>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          {isInitialMode ? (
            <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-10">
              <div className="w-full max-w-6xl">
                <div className="mx-auto max-w-3xl text-center">
                  <p className="mb-3 text-xs uppercase tracking-[0.4em] text-cyan-200/70">
                    Transparent AI workflow
                  </p>
                  <h2 className="text-balance text-5xl font-semibold tracking-tight text-white">
                    Turn Arcus into your email chief of staff
                  </h2>
                  <p className="mt-5 text-lg leading-8 text-white/65">
                    Arcus understands intent, reads Gmail context, plans the work, opens a canvas,
                    and waits for approval before taking action.
                  </p>
                </div>

                <div className="mt-10 grid gap-4 lg:grid-cols-4">
                  {PROMPT_SUGGESTIONS.map((prompt, index) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSendMessage(prompt)}
                      className="group rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-left transition duration-300 hover:-translate-y-1 hover:border-cyan-200/30 hover:bg-white/[0.08]"
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/45">
                          0{index + 1}
                        </span>
                        <Mail className="h-4 w-4 text-white/35 transition group-hover:text-cyan-200" />
                      </div>
                      <p className="text-sm leading-6 text-white/80">{prompt}</p>
                    </button>
                  ))}
                </div>

                <div className="mx-auto mt-10 max-w-4xl">
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    disabled={isLoading}
                    placeholder="Ask Arcus to summarize, draft, plan, or prepare an approval-ready action"
                    onModalStateChange={setIsIntegrationsModalOpen}
                    onEmailModalStateChange={setIsEmailSelectionModalOpen}
                    selectedEmails={selectedEmails}
                    onEmailSelect={setSelectedEmails}
                    onEmailRemove={(id) =>
                      setSelectedEmails((current) => current.filter((email) => email.id !== id))
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-6 py-8">
                <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
                  <section className="space-y-6">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {message.type === 'agent' && (
                          <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-100/10 bg-cyan-200/10">
                            <Bot className="h-5 w-5 text-cyan-100" />
                          </div>
                        )}

                        <div
                          className={`max-w-4xl rounded-[28px] border p-5 shadow-2xl backdrop-blur-xl ${
                            message.type === 'user'
                              ? 'border-white/10 bg-white text-black'
                              : 'border-white/10 bg-[#101513]/80 text-white'
                          }`}
                        >
                          {message.type === 'user' ? (
                            <>
                              <p className="text-[11px] uppercase tracking-[0.25em] text-black/45">You</p>
                              <p className="mt-2 whitespace-pre-wrap text-base leading-7">{message.content}</p>
                              <p className="mt-4 text-xs text-black/45">{message.time}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/55">Arcus</p>
                              <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-white/90">
                                {message.content.text}
                              </p>
              {message.content.arcus?.canvas && (
                                <button
                                  type="button"
                                  onClick={() => setActiveCanvas(message.content.arcus?.canvas || null)}
                                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-sm text-cyan-50 transition hover:border-cyan-200/35 hover:bg-cyan-200/15"
                                >
                                  <HugeiconsIcon icon={ViewSidebarLeftIcon} size={16} strokeWidth={1.8} />
                                  Open Canvas
                                </button>
                              )}
                              <p className="mt-4 text-xs text-white/40">{message.time}</p>
                            </>
                          )}
                        </div>

                        {message.type === 'user' && (
                          <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-black/10">
                            <User className="h-5 w-5 text-black/70" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-4">
                        <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-100/10 bg-cyan-200/10">
                          <Bot className="h-5 w-5 text-cyan-100" />
                        </div>
                        <div className="w-full max-w-4xl rounded-[28px] border border-white/10 bg-[#101513]/80 p-5 backdrop-blur-xl">
                          <p className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/55">Arcus</p>
                          <div className="mt-4 space-y-3">
                            {LOADING_STAGES.map((stage, index) => (
                              <div
                                key={stage}
                                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                                  index === loadingStage
                                    ? 'border-cyan-200/20 bg-cyan-200/10'
                                    : 'border-white/5 bg-white/[0.02]'
                                }`}
                              >
                                <div
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    index === loadingStage ? 'bg-cyan-200 animate-pulse' : 'bg-white/20'
                                  }`}
                                />
                                <span className="text-sm text-white/70">{stage}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </section>

                  <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Intent</p>
                          <h3 className="mt-2 text-lg font-semibold text-white">
                            {latestAgentResponse?.intent?.primary || 'Awaiting request'}
                          </h3>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/60">
                          {latestAgentResponse?.model || 'openrouter/free'}
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/60">
                        {latestAgentResponse?.context?.connected
                          ? `Connected to Gmail with ${latestAgentResponse.context.totalEmails || 0} contextual emails in this run.`
                          : 'Arcus is ready to use Gmail context once a connected session is available.'}
                      </p>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Thinking</p>
                      <div className="mt-4 space-y-3">
                        {(latestAgentResponse?.thinking || []).map((item) => (
                          <div key={item.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <div className="flex items-center gap-3">
                              {statusIcon(item.status)}
                              <p className="text-sm font-medium text-white">{item.label}</p>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-white/58">{item.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Task Plan</p>
                      <div className="mt-4 space-y-3">
                        {(latestAgentResponse?.plan || []).map((step) => (
                          <div key={step.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                            {statusIcon(step.status)}
                            <span className="text-sm text-white/78">{step.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {latestAgentResponse?.context?.emails?.length ? (
                      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Gmail Evidence</p>
                        <div className="mt-4 space-y-3">
                          {latestAgentResponse.context.emails.slice(0, 3).map((email) => (
                            <div key={email.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="line-clamp-1 text-sm font-medium text-white">{email.subject}</p>
                                <span className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                                  {email.isUnread ? 'Unread' : 'Seen'}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-white/55">{email.from}</p>
                              <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/60">{email.snippet}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </aside>
                </div>
              </div>

              <div className="relative z-10 border-t border-white/10 bg-[#060606]/82 px-6 py-5 backdrop-blur-xl">
                <div className="mx-auto max-w-5xl">
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    disabled={isLoading}
                    placeholder="Ask Arcus to keep going, revise the plan, or open a new workflow"
                    onModalStateChange={setIsIntegrationsModalOpen}
                    onEmailModalStateChange={setIsEmailSelectionModalOpen}
                    selectedEmails={selectedEmails}
                    onEmailSelect={setSelectedEmails}
                    onEmailRemove={(id) =>
                      setSelectedEmails((current) => current.filter((email) => email.id !== id))
                    }
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <div
        className={`fixed right-0 top-0 z-50 h-screen w-full max-w-none transition-transform duration-500 lg:w-[48vw] ${
          panelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full border-l border-white/10 bg-[#0a1110]/96 backdrop-blur-2xl">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/55">Canvas</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {activeCanvas?.title || 'Arcus Workspace'}
                </h3>
                <p className="mt-1 text-sm text-white/55">
                  {activeCanvas?.subtitle || 'Review drafts, summaries, and execution-ready actions here.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCanvas(null)}
                className="rounded-2xl border border-white/10 p-2 text-white/70 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.8} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              {activeCanvas?.sections?.map((section) => (
                <section
                  key={section.id}
                  className={`rounded-[28px] border p-5 ${
                    section.tone === 'success'
                      ? 'border-emerald-300/15 bg-emerald-400/8'
                      : section.tone === 'warning'
                        ? 'border-amber-300/15 bg-amber-400/8'
                        : 'border-white/10 bg-white/[0.04]'
                  }`}
                >
                  <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-white/55">
                    {section.title}
                  </h4>
                  {activeCanvas.action && section.id === 'draft' ? (
                    <textarea
                      value={canvasForm.content || section.content}
                      onChange={(event) =>
                        setCanvasForm((current) => ({ ...current, content: event.target.value }))
                      }
                      className="mt-4 min-h-[260px] w-full resize-none rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white outline-none transition focus:border-cyan-200/30"
                    />
                  ) : (
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/82">
                      {section.content}
                    </p>
                  )}
                </section>
              ))}
            </div>

            {activeCanvas?.action ? (
              <div className="border-t border-white/10 px-6 py-5">
                <div className="space-y-3 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                  <div className="grid gap-3">
                    <label className="text-xs uppercase tracking-[0.2em] text-white/45">
                      Recipient
                      <input
                        value={canvasForm.to || ''}
                        onChange={(event) =>
                          setCanvasForm((current) => ({ ...current, to: event.target.value }))
                        }
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/30"
                      />
                    </label>
                    <label className="text-xs uppercase tracking-[0.2em] text-white/45">
                      Subject
                      <input
                        value={canvasForm.subject || ''}
                        onChange={(event) =>
                          setCanvasForm((current) => ({ ...current, subject: event.target.value }))
                        }
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/30"
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm leading-6 text-white/60">
                    Arcus will not execute this step automatically. The action runs only after you press the approval button below.
                  </div>

                  {canvasExecutionError ? (
                    <div className="rounded-2xl border border-rose-300/15 bg-rose-400/8 px-4 py-3 text-sm text-rose-100">
                      {canvasExecutionError}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleCanvasExecution}
                    disabled={isCanvasExecuting}
                    className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-white px-5 py-4 text-sm font-medium text-black transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCanvasExecuting ? <Clock3 className="h-4 w-4 animate-spin" /> : <PenSquare className="h-4 w-4" />}
                    {isCanvasExecuting ? 'Executing...' : activeCanvas.action.label}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <IntegrationsModal
        isOpen={isIntegrationsModalOpen}
        onClose={() => setIsIntegrationsModalOpen(false)}
      />

      <EmailSelectionModal
        isOpen={isEmailSelectionModalOpen}
        onClose={() => setIsEmailSelectionModalOpen(false)}
        onSelectEmails={(emails: EmailSelection[]) => {
          setSelectedEmails((current) => [...current, ...emails]);
          setIsEmailSelectionModalOpen(false);
        }}
      />
    </div>
  );
}
