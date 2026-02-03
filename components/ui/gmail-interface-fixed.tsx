'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion, type PanInfo, useAnimation, useDragControls } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { SiftCard } from './sift-card';
import { Button } from './button';
import { Badge } from './badge';
import { HomeFeedSidebar } from './home-feed-sidebar';
import { RefreshCw, AlertCircle, TrendingUp, Clock, Target, Zap, Mail, Home, X, User, Sparkles, ArrowLeft, LayoutList, Inbox, ExternalLink, Download, FilePlus, ChevronDown, ChevronRight, Plus, Users, Building, Phone, Loader2, MessageCircle, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { toast } from 'sonner';
import { SchedulingModal } from './scheduling-modal';
import { UsageLimitModal } from './usage-limit-modal';
import { UsageBadge } from './bubble-button';
import { triggerSuccessConfetti } from '@/lib/confetti';

// Simple markdown renderer for bold text
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
                    return `<li>${match[1]}</li>`;
                }
                return line;
            });

            // Rejoin, wrapping groups of <li> in <ul>
            let joinedList = listItems.join('\n');
            joinedList = joinedList.replace(/(<li>[\s\S]*?<\/li>(?:\n<li>[\s\S]*?<\/li>)*)/g, '<ul class="list-disc list-inside my-4 space-y-2">$1</ul>');
            return joinedList;
        }

        // Linkify URLs
        processedPara = linkify(processedPara);

        // Handle single newlines: Convert to <br/>
        processedPara = processedPara.replace(/\n/g, '<br/>');

        return `<p class="mb-4 last:mb-0">${processedPara}</p>`;
    });

    return renderedParagraphs.join('');
};

/**
 * Clean HTML for embedding
 */
function cleanHtml(html: string) {
    if (!html) return '';

    // First style existing links
    let processed = html
        .replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" class="email-link" ')
        .replace(/<button/g, '<button class="email-button" ')
        .replace(/style="[^"]*background-color:[^"]*"/g, (match) => match + ' class="email-styled-element"');

    // Attempt to linkify plain text URLs in HTML (risky but needed)
    // Only linkify if they aren't inside a tag or attribute
    const urlRegex = /(?<!["'=])(https?:\/\/[^\s<]+[^.,;?!)\]\s<])/g;
    return processed.replace(urlRegex, (url) => {
        return linkify(url);
    });
}

/**
 * Detect and wrap URLs in plain text with premium styling for actions
 */
function linkify(text: string) {
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
            return `
                <div class="my-6 p-[1px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl shadow-2xl">
                    <div class="bg-neutral-950 rounded-[0.95rem] p-6 flex flex-col items-center text-center">
                        <div class="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                            <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <h4 class="text-white font-bold text-lg mb-2">Priority Action Detected</h4>
                        <p class="text-neutral-500 text-xs mb-6 max-w-[250px]">Secure verification link found in this message</p>
                        <a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.4)] no-underline">
                            Open Link
                        </a>
                        <div class="mt-4 text-[9px] text-neutral-700 font-mono break-all opacity-40 hover:opacity-100 transition-opacity select-all">
                            ${url}
                        </div>
                    </div>
                </div>
            `;
        }

        const displayUrl = url.length > 55 ? url.substring(0, 52) + '...' : url;
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-500/30 transition-all clickable-link break-all font-medium" title="${url}">${displayUrl}</a>`;
    });
}

interface SiftInsight {
    id: string;
    type: string;
    title: string;
    subtitle: string;
    content: string;
    timestamp: string;
    metadata: any;
    section: string;
    user?: {
        name: string;
        company?: string;
        avatar: string;
        username?: string;
        title?: string;
    };
    source_emails?: {
        id: string;
        subject: string;
        snippet: string;
        sender: {
            name: string;
            email: string;
            avatar?: string;
        };
        receivedAt: string;
    }[];
}

interface SiftInsightsResponse {
    success: boolean;
    insights: SiftInsight[];
    timestamp: string;
    userEmail: string;
    ai_version: string;
    sift_intelligence_summary?: {
        opportunities_detected: number;
        urgent_action_required: number;
        hot_leads_heating_up: number;
        conversations_at_risk: number;
        missed_follow_ups: number;
        unread_but_important: number;
    };
    nextPageToken?: string;
    error?: string;
    fallback?: any;
}

export function GmailInterfaceFixed() {
    const { data: session } = useSession();
    const [insights, setInsights] = useState<SiftInsight[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [summary, setSummary] = useState<SiftInsightsResponse['sift_intelligence_summary']>();
    const [nextPageToken, setNextPageToken] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);

    const [hasInitialLoad, setHasInitialLoad] = useState(false);
    const [selectedInsight, setSelectedInsight] = useState<SiftInsight | null>(null);
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [emailSummary, setEmailSummary] = useState<string | null>(null);

    const [isDrafting, setIsDrafting] = useState(false);
    const [draftContent, setDraftContent] = useState<string>('');
    const [showDraftEditor, setShowDraftEditor] = useState(false);

    const [showSchedulingModal, setShowSchedulingModal] = useState(false);
    const [schedulingEmailId, setSchedulingEmailId] = useState<string | null>(null);

    // Note functionality state
    const [showNoteEditor, setShowNoteEditor] = useState(false);
    const [noteEmailId, setNoteEmailId] = useState<string | null>(null);
    const [noteSubject, setNoteSubject] = useState<string>('');
    const [noteContent, setNoteContent] = useState<string>('');
    const [isSavingNote, setIsSavingNote] = useState(false);

    const [isUsageLimitModalOpen, setIsUsageLimitModalOpen] = useState(false);
    const [usageLimitModalData, setUsageLimitModalData] = useState<{
        featureName: string;
        currentUsage: number;
        limit: number;
        period: 'daily' | 'monthly';
        currentPlan: 'starter' | 'pro' | 'none';
    } | null>(null);

    // --- All State Hooks ---

    // Usage & Subscription
    const [usageData, setUsageData] = useState<{
        planType: 'starter' | 'pro' | 'none';
        features: Record<string, { usage: number; limit: number; period: 'daily' | 'monthly'; remaining: number; isUnlimited: boolean }>;
    } | null>(null);

    // View Management
    const [viewMode, setViewMode] = useState<'home' | 'people'>('home');

    // Traditional View states
    const [isTraditionalView, setIsTraditionalView] = useState(false);
    const [traditionalEmails, setTraditionalEmails] = useState<any[]>([]);
    const [isLoadingTraditional, setIsLoadingTraditional] = useState(false);
    const [selectedTraditionalEmail, setSelectedTraditionalEmail] = useState<any | null>(null);
    const [isTraditionalModalOpen, setIsTraditionalModalOpen] = useState(false);
    const [isTraditionalLoadingError, setIsTraditionalLoadingError] = useState(false);
    const [traditionalNextPageToken, setTraditionalNextPageToken] = useState<string | null>(null);
    const [isLoadingMoreTraditional, setIsLoadingMoreTraditional] = useState(false);
    const [hasLoadedMore, setHasLoadedMore] = useState(false);

    // People View states
    const [contacts, setContacts] = useState<any[]>([]);
    const [isLoadingContacts, setIsLoadingContacts] = useState(false);
    const [selectedContactEmail, setSelectedContactEmail] = useState<string | null>(null);
    const [contactDetail, setContactDetail] = useState<any | null>(null);
    const [isLoadingContactDetail, setIsLoadingContactDetail] = useState(false);
    const [peopleSearchQuery, setPeopleSearchQuery] = useState('');

    // Arcus AI Panel states
    const [isArcusOpen, setIsArcusOpen] = useState(false);
    const [isArcusMinimized, setIsArcusMinimized] = useState(false);
    const [arcusEmailId, setArcusEmailId] = useState<string | null>(null);
    const [arcusEmailSubject, setArcusEmailSubject] = useState('');
    const [arcusQuery, setArcusQuery] = useState('What is this email about?');
    const [arcusMessages, setArcusMessages] = useState<any[]>([]);
    const [isArcusLoading, setIsArcusLoading] = useState(false);
    const [arcusConversationId, setArcusConversationId] = useState<string | null>(null);
    const [arcusPanelHeight, setArcusPanelHeight] = useState(800);

    const arcusDragControls = useDragControls();
    const arcusPanelAnimControls = useAnimation();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // --- Debouncing for API calls ---
    const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastFetchTimeRef = useRef<number>(0);

    // --- All Callbacks (useCallback) ---

    const fetchUsage = useCallback(async (force: boolean = false) => {
        const now = Date.now();
        
        // Debounce: Only allow fetch every 2 seconds unless forced
        if (!force && now - lastFetchTimeRef.current < 2000) {
            console.log('🔄 fetchUsage debounced, skipping call');
            return;
        }
        
        // Clear any existing timeout
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }
        
        // Set timeout for debounced call
        fetchTimeoutRef.current = setTimeout(async () => {
            try {
                console.log('📡 Fetching usage data...');
                const res = await fetch('/api/subscription/usage');
                if (res.ok) {
                    const data = await res.json();
                    setUsageData({
                        planType: data.planType || 'none',
                        features: data.features || {}
                    });
                    lastFetchTimeRef.current = Date.now();
                } else {
                    console.warn('fetchUsage failed:', res.status);
                }
            } catch (e) {
                console.warn('Failed to fetch usage', e);
            }
        }, force ? 0 : 500); // 500ms debounce delay, immediate if forced
    }, [setUsageData]);

    // Force fetch usage (for immediate updates after AI operations)
    const forceFetchUsage = useCallback(() => {
        fetchUsage(true);
    }, [fetchUsage]);

    const fetchContacts = useCallback(async (query: string = '') => {
        setIsLoadingContacts(true);
        try {
            const searchParam = query ? `?search=${encodeURIComponent(query)}` : '';
            const response = await fetch(`/api/contacts/profiles${searchParam}`);
            if (!response.ok) throw new Error('Failed to fetch contacts');
            const data = await response.json();
            setContacts(data.contacts || []);
        } catch (err) {
            console.error('Error fetching contacts:', err);
            toast.error('Failed to load contacts');
        } finally {
            setIsLoadingContacts(false);
        }
    }, [setContacts, setIsLoadingContacts]);

    const fetchContactDetail = useCallback(async (email: string) => {
        setIsLoadingContactDetail(true);
        setSelectedContactEmail(email);
        try {
            const response = await fetch(`/api/contacts/profiles/${encodeURIComponent(email)}`);
            if (!response.ok) throw new Error('Failed to fetch contact details');
            const data = await response.json();
            setContactDetail(data.contact);
        } catch (err) {
            console.error('Error fetching contact details:', err);
            toast.error('Failed to load profile details');
        } finally {
            setIsLoadingContactDetail(false);
        }
    }, [setContactDetail, setIsLoadingContactDetail, setSelectedContactEmail]);

    // --- All Effects (useEffect) ---

    useEffect(() => {
        if (viewMode === 'people') {
            fetchContacts(peopleSearchQuery);
        }
    }, [viewMode, peopleSearchQuery, fetchContacts]);

    useEffect(() => {
        // Force fetch usage on component mount to get initial state
        forceFetchUsage();
    }, [forceFetchUsage]);


    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [arcusMessages]);

    useEffect(() => {
        const computeHeight = () => {
            const h = typeof window !== 'undefined' ? window.innerHeight : 900;
            setArcusPanelHeight(Math.max(h - 48, 520));
        };
        computeHeight();
        window.addEventListener('resize', computeHeight);
        
        // Cleanup fetch timeout on unmount
        return () => {
            window.removeEventListener('resize', computeHeight);
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!isArcusOpen || isArcusMinimized) return;
        arcusPanelAnimControls.set({ opacity: 0, y: 18, scale: 0.985 });
        arcusPanelAnimControls.start({
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: 'spring', damping: 28, stiffness: 320 }
        });
    }, [isArcusOpen, isArcusMinimized, arcusPanelAnimControls]);

    const minimizeArcus = useCallback(() => {
        setIsArcusMinimized(true);
    }, []);

    const restoreArcus = useCallback(() => {
        setIsArcusMinimized(false);
    }, []);

    const closeArcus = useCallback(() => {
        setIsArcusOpen(false);
        setIsArcusMinimized(false);
    }, []);

    const handleArcusDragEnd = useCallback((_: unknown, info: PanInfo) => {
        const shouldMinimize = info.offset.y > 140 || info.velocity.y > 900;
        if (shouldMinimize) {
            setIsArcusMinimized(true);
            return;
        }
        arcusPanelAnimControls.start({ y: 0, transition: { type: 'spring', damping: 30, stiffness: 380 } });
    }, [arcusPanelAnimControls]);

    useEffect(() => {
        if (!isArcusOpen) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeArcus();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isArcusOpen, closeArcus]);

    // Reset email selection when closing panel or changing insight
    useEffect(() => {
        if (!selectedInsight) {
            setSelectedEmailId(null);
            setEmailSummary(null);
            setIsSummarizing(false);
            setShowDraftEditor(false);
            setDraftContent('');
            setIsDrafting(false);
        }
    }, [selectedInsight]);

    // AI Text Formatting Utility
    const decodeEntities = (text: string | null) => {
        if (!text) return '';
        return text
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&apos;/g, "'")
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ')
            .replace(/&rsquo;/g, "'")
            .replace(/&lsquo;/g, "'")
            .replace(/&rdquo;/g, '"')
            .replace(/&ldquo;/g, '"')
            .replace(/&ndash;/g, '-')
            .replace(/&mdash;/g, '--');
    };

    const formatAIText = (text: string | null) => {
        if (!text) return null;
        let decoded = decodeEntities(text);

        // Handle bold markdown **text**
        const parts = decoded.split(/(\*\*.*?\*\*)/g);

        return (
            <>
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        const boldText = part.slice(2, -2);
                        return (
                            <strong
                                key={i}
                                className="font-bold text-black dark:text-white brightness-150"
                            >
                                {boldText}
                            </strong>
                        );
                    }

                    // Linkify the non-bold part
                    const urlRegex = /(https?:\/\/[^\s<]+[^.,;?!)\]\s<])/g;
                    const subParts = part.split(urlRegex);

                    return subParts.map((subPart, j) => {
                        if (subPart.match(urlRegex)) {
                            return (
                                <a
                                    key={`${i}-${j}`}
                                    href={subPart}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline font-medium clickable-link"
                                >
                                    {subPart}
                                </a>
                            );
                        }
                        return subPart;
                    });
                })}
            </>
        );
    };

    const handleEmailClick = async (emailId: string) => {
        setSelectedEmailId(emailId);
        setIsSummarizing(true);
        setEmailSummary(null);

        try {
            const response = await fetch('/api/email/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailId })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (data?.error === 'limit_reached') {
                    setUsageLimitModalData({
                        featureName: 'Email Summary',
                        currentUsage: data.usage || 0,
                        limit: data.limit || 0,
                        period: data.period || 'daily',
                        currentPlan: data.planType || 'starter'
                    });
                    setIsUsageLimitModalOpen(true);
                    return;
                }
                throw new Error(data?.error || 'Failed to fetch summary');
            }
            setEmailSummary(decodeEntities(data.summary));
            forceFetchUsage();
        } catch (error) {
            console.error('Error fetching summary:', error);
            setEmailSummary("Failed to generate summary. Please try again.");
        } finally {
            setIsSummarizing(false);
        }
    };

    const fetchTraditionalEmails = async () => {
        setIsLoadingTraditional(true);
        setIsTraditionalLoadingError(false);
        setHasLoadedMore(false);
        try {
            const response = await fetch('/api/gmail/messages?maxResults=50');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.emails) {
                setTraditionalEmails(data.emails);
                setTraditionalNextPageToken(data.nextPageToken);
            } else {
                setTraditionalEmails([]);
                setTraditionalNextPageToken(null);
            }
        } catch (error) {
            console.error('Error fetching traditional emails:', error);
            setIsTraditionalLoadingError(true);
            toast.error('Failed to load traditional view', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsLoadingTraditional(false);
        }
    };

    const handleLoadMoreTraditional = async () => {
        if (!traditionalNextPageToken || isLoadingMoreTraditional) return;

        setIsLoadingMoreTraditional(true);
        const toastId = toast.loading('Fetching more emails...');
        try {
            const response = await fetch(`/api/gmail/messages?maxResults=25&pageToken=${traditionalNextPageToken}`);
            if (!response.ok) throw new Error('Failed to load more emails');

            const data = await response.json();
            if (data.emails && data.emails.length > 0) {
                setTraditionalEmails(prev => [...prev, ...data.emails]);
                setTraditionalNextPageToken(data.nextPageToken);
                setHasLoadedMore(true);
                toast.success(`Loaded ${data.emails.length} more emails`, { id: toastId });
            } else {
                setTraditionalNextPageToken(null);
                toast.info('No more emails found', { id: toastId });
            }
        } catch (error) {
            console.error('Error loading more emails:', error);
            toast.error('Failed to load more emails', { id: toastId });
        } finally {
            setIsLoadingMoreTraditional(false);
        }
    };

    const handleTraditionalEmailClick = async (emailId: string) => {
        setSelectedTraditionalEmail(null);
        setIsTraditionalModalOpen(true);
        setIsSummarizing(true);
        try {
            const response = await fetch(`/api/gmail/messages/${emailId}`);
            const data = await response.json();
            setSelectedTraditionalEmail(data);
        } catch (error) {
            console.error('Error fetching email details:', error);
            toast.error('Failed to load email details');
            setIsTraditionalModalOpen(false);
        } finally {
            setIsSummarizing(false);
        }
    };

    const [draftSubject, setDraftSubject] = useState('');
    const [draftTo, setDraftTo] = useState('');

    // ... (keep existing handleEmailClick)

    const handleDraftReply = async (emailId: string, category: string) => {
        setIsDrafting(true);
        setShowDraftEditor(true);
        setDraftContent('');

        // Get the email to reply to and set the "To" field
        const email = selectedInsight?.source_emails?.find(e => e.id === emailId);
        if (email) {
            setDraftTo(email.sender.email); // Set recipient email
            setDraftSubject(email.subject || 'Reply'); // Use original subject without "Re:" prefix
        }

        try {
            const response = await fetch('/api/email/draft-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailId, category })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (data?.error === 'limit_reached') {
                    setUsageLimitModalData({
                        featureName: 'Draft Reply',
                        currentUsage: data.usage || 0,
                        limit: data.limit || 0,
                        period: data.period || 'monthly',
                        currentPlan: data.planType || 'starter'
                    });
                    setIsUsageLimitModalOpen(true);
                    setShowDraftEditor(false);
                    return;
                }
                throw new Error(data?.error || 'Failed to generate draft');
            }
            setDraftContent(decodeEntities(data.draftReply));
            forceFetchUsage();
        } catch (error) {
            console.error('Error generating draft:', error);
            toast.error('Failed to generate draft');
        } finally {
            setIsDrafting(false);
        }
    };

    const saveToLocalStorage = (convId: string, messages: any[], title: string) => {
        try {
            const conversationData = {
                id: convId,
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp
                })),
                title: title,
                lastUpdated: new Date().toISOString(),
                messageCount: messages.length
            };
            localStorage.setItem(`conversation_${convId}`, JSON.stringify(conversationData));
            localStorage.setItem(`conv_${convId}_title`, title);
        } catch (e) {
            console.error('Failed to save Arcus chat to localStorage:', e);
        }
    };

    const handleSendAskAI = async (forcedQuery?: string) => {
        const queryToSend = forcedQuery || arcusQuery;
        if (!arcusEmailId || !queryToSend.trim() || isArcusLoading) return;

        // Add user message to UI
        const userMsg = {
            id: Date.now().toString(),
            role: 'user',
            content: queryToSend,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setArcusMessages(prev => {
            const updated = [...prev, userMsg];
            if (arcusConversationId) {
                saveToLocalStorage(arcusConversationId, updated, arcusEmailSubject);
            }
            return updated;
        });
        setIsArcusLoading(true);
        setArcusQuery(''); // Clear input

        try {
            // Using the real Arcus Chat API for "connected" experience
            const response = await fetch('/api/agent-talk/chat-arcus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: queryToSend,
                    selectedEmailId: arcusEmailId,
                    conversationId: arcusConversationId,
                    isNewConversation: !arcusConversationId
                })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (data?.error === 'limit_reached') {
                    setUsageLimitModalData({
                        featureName: 'Ask AI',
                        currentUsage: data.usage || 0,
                        limit: data.limit || 0,
                        period: data.period || 'daily',
                        currentPlan: data.planType || 'starter'
                    });
                    setIsUsageLimitModalOpen(true);
                    return;
                }
                throw new Error(data.message || 'Failed to get answer');
            }

            if (data.conversationId) setArcusConversationId(data.conversationId);

            const assistantMsg = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.message,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setArcusMessages(prev => [...prev, assistantMsg]);
            setArcusQuery('');
            forceFetchUsage();
        } catch (error) {
            console.error('Error asking AI:', error);
            const errorMsg = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setArcusMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsArcusLoading(false);
        }
    };

    const handleScheduleCall = async (emailId: string) => {
        setSchedulingEmailId(emailId);
        setShowSchedulingModal(true);
    };

    const handleEscalate = async (emailId: string) => {
        const toastId = toast.loading('Escalating urgent message...');

        try {
            const email = selectedInsight?.source_emails?.find(e => e.id === emailId);
            if (!email) {
                throw new Error('Email not found');
            }

            // Get the current user's email from session
            const userEmail = session?.user?.email;
            if (!userEmail) {
                throw new Error('User not authenticated');
            }

            // Prepare escalation data
            const escalationData = {
                emailId: emailId,
                subject: email.subject,
                sender: email.sender.email,
                senderName: email.sender.name,
                receivedAt: email.receivedAt,
                snippet: email.snippet,
                userEmail: userEmail,
                urgencyLevel: 'high',
                category: selectedInsight?.type || 'urgent'
            };

            // Call escalation API
            const response = await fetch('/api/email/escalate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(escalationData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to escalate message');
            }

            const result = await response.json();
            toast.success('Message escalated successfully! Team notified.', { id: toastId });
            triggerSuccessConfetti(); // Dopamine boost!
            console.log('✅ Escalation successful:', result);

        } catch (error: unknown) {
            console.error('❌ Escalation failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            toast.error(`Escalation failed: ${errorMessage}`, { id: toastId });
        }
    };
    const handleRepairReply = async (emailId: string, category: string) => {
        setIsDrafting(true);
        setShowDraftEditor(true);
        setDraftContent('');

        // Populate specific fields
        const email = selectedInsight?.source_emails?.find(e => e.id === emailId);
        if (email) {
            setDraftSubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
            setDraftTo(email.sender.email);
        }

        try {
            const response = await fetch('/api/email/repair-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailId, category })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (data?.error === 'limit_reached') {
                    setUsageLimitModalData({
                        featureName: 'Repair Reply',
                        currentUsage: data.usage || 0,
                        limit: data.limit || 0,
                        period: data.period || 'monthly',
                        currentPlan: data.planType || 'starter'
                    });
                    setIsUsageLimitModalOpen(true);
                    setShowDraftEditor(false);
                    return;
                }
                throw new Error(data?.error || 'Failed to generate repair reply');
            }
            setDraftContent(data.repairReply);
            forceFetchUsage();
        } catch (error) {
            console.error('Error generating repair reply:', error);
            setDraftContent("Dear there,\n\nThank you for reaching out. I appreciate your message and will respond shortly.\n\nWith gratitude,\n" + (session?.user?.name || 'User'));
        } finally {
            setIsDrafting(false);
        }
    };

    const handleUnsubscribe = async (emailId: string) => {
        const toastId = toast.loading('Unsubscribing from newsletter...');

        try {
            const email = selectedInsight?.source_emails?.find(e => e.id === emailId);
            if (!email) {
                throw new Error('Email not found');
            }

            // Get the current user's email from session
            const userEmail = session?.user?.email;
            if (!userEmail) {
                throw new Error('User not authenticated');
            }

            // Prepare unsubscribe data
            const unsubscribeData = {
                emailId: emailId,
                subject: email.subject,
                sender: email.sender.email,
                senderName: email.sender.name,
                receivedAt: email.receivedAt,
                snippet: email.snippet,
                userEmail: userEmail,
                userName: session?.user?.name || '',
                category: selectedInsight?.type || 'unread-important'
            };

            // Call unsubscribe API
            const response = await fetch('/api/email/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(unsubscribeData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to unsubscribe');
            }

            const result = await response.json();
            toast.success('Unsubscribed successfully! This email will no longer appear in your updates.', { id: toastId });
            triggerSuccessConfetti(); // Dopamine boost!
            console.log('✅ Unsubscribe successful:', result);

            // Refresh insights to update the list
            await fetchSiftInsights();

        } catch (error: unknown) {
            console.error('❌ Unsubscribe failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            toast.error(`Unsubscribe failed: ${errorMessage}`, { id: toastId });
        }
    };

    // Add Note functionality - will be implemented next
    const handleAddNote = async (emailId: string) => {
        const email = selectedInsight?.source_emails?.find(e => e.id === emailId);
        if (email) {
            setNoteEmailId(emailId);
            setNoteSubject(email.subject);
            setShowNoteEditor(true);

            // Generate AI note content
            try {
                const response = await fetch('/api/email/generate-note', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        emailId,
                        subject: email.subject,
                        snippet: email.snippet,
                        category: selectedInsight?.type || 'general'
                    })
                });

                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    if (data?.error === 'limit_reached') {
                        setUsageLimitModalData({
                            featureName: 'AI Notes',
                            currentUsage: data.usage || 0,
                            limit: data.limit || 0,
                            period: data.period || 'monthly',
                            currentPlan: data.planType || 'starter'
                        });
                        setIsUsageLimitModalOpen(true);
                        setShowNoteEditor(false);
                        return;
                    }
                    throw new Error(data?.error || 'Failed to generate note');
                }
                setNoteContent(decodeEntities(data.noteContent));
            } catch (error) {
                console.error('Error generating note:', error);
                setNoteContent(`Note about: ${email.subject}\n\n`);
            }
        }
    };

    const handleSaveNote = async () => {
        if (!noteContent.trim()) {
            toast.error('Note content cannot be empty');
            return;
        }

        setIsSavingNote(true);
        const toastId = toast.loading('Saving your note...');

        try {
            const response = await fetch('/api/notes/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    emailId: noteEmailId,
                    subject: noteSubject,
                    content: noteContent,
                    createdAt: new Date().toISOString()
                })
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (result?.error === 'limit_reached') {
                    setUsageLimitModalData({
                        featureName: 'AI Notes',
                        currentUsage: result.usage || 0,
                        limit: result.limit || 0,
                        period: result.period || 'monthly',
                        currentPlan: result.planType || 'starter'
                    });
                    setIsUsageLimitModalOpen(true);
                    toast.dismiss(toastId);
                    return;
                }
                throw new Error(result?.error || 'Failed to save note');
            }
            toast.success('📝 Note saved successfully!', { id: toastId });
            triggerSuccessConfetti(); // Dopamine boost!
            console.log('✅ Note saved:', result);

            // Redirect to the note page
            if (result.note?.id) {
                window.location.href = `/i/notes/${result.note.id}`;
            }
            forceFetchUsage();

            // Reset and close
            setNoteContent('');
            setNoteSubject('');
            setNoteEmailId(null);
            setShowNoteEditor(false);

        } catch (error: unknown) {
            console.error('❌ Save note failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            toast.error(`Failed to save note: ${errorMessage}`, { id: toastId });
        } finally {
            setIsSavingNote(false);
        }
    };

    const handleSendReply = async () => {
        if (!draftTo || !draftSubject || !draftContent) {
            toast.error('Please check recipients and content.');
            return;
        }

        const toastId = toast.loading('Sending email...');
        console.log('📡 Sending email to:', draftTo, 'Subject:', draftSubject);

        // Create the "Made by Mailient" footer
        const footerHtml = `
            <br/><br/>
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; color: #888; font-family: system-ui, sans-serif;">
                <span style="opacity: 0.7; font-size: 12px; margin-right: 12px;">Made by Mailient</span>
                <a href="https://mailient.xyz/auth/signup" style="background-color: #ffffff; color: #000000; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-weight: 500; border: 1px solid #e5e5e5; font-size: 12px; display: inline-block;">Join Now!</a>
            </div>
        `;

        // Convert newlines to breaks and markdown bold to strong tags
        const formattedContent = draftContent
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>');

        const bodyHtml = `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6; color: #333 text-align: left;">
                ${formattedContent}
            </div>
            ${footerHtml}
        `;

        try {
            const response = await fetch('/api/gmail/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: draftTo,
                    subject: draftSubject,
                    body: bodyHtml,
                    isHtml: true
                })
            });

            const data = await response.json();

            if (response.ok) {
                console.log('✅ Email sent successfully:', data);
                toast.success('Email sent successfully!', { id: toastId });
                triggerSuccessConfetti(); // Dopamine boost!
                setShowDraftEditor(false);
                setDraftContent('');
            } else {
                console.error('❌ Failed to send email:', data);
                toast.error(`Failed to send: ${data.error || 'Unknown error'}`, { id: toastId });
            }
        } catch (e) {
            console.error('💥 Send execution failed:', e);
            toast.error('Failed to send email due to a network or execution error.', { id: toastId });
        }
    };

    // ... (keep fetchSiftInsights and others)


    const fetchSiftInsights = async (isLoadMore: boolean = false) => {
        let timerInterval: any;
        try {
            setLoading(true);
            setError(null);

            // Timer logic: Start at 30 and count down
            setCountdown(30);
            timerInterval = setInterval(() => {
                setCountdown(prev => (prev !== null ? prev - 1 : null));
            }, 1000);

            console.log(isLoadMore ? '🤖 Loading more Sift AI insights...' : '🤖 Fetching Sift AI insights...');

            const url = isLoadMore && nextPageToken
                ? `/api/home-feed/insights?pageToken=${encodeURIComponent(nextPageToken)}`
                : '/api/home-feed/insights';

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch insights: ${response.statusText}`);
            }

            const data: SiftInsightsResponse = await response.json();

            if (data.success) {
                // Fetch unsubscribed emails from the database
                const unsubscribedResponse = await fetch('/api/email/unsubscribe/list', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                const unsubscribedData = await unsubscribedResponse.json();
                const unsubscribedEmailIds = unsubscribedData.success ? unsubscribedData.emails.map((e: any) => e.email_id) : [];

                const enrichedInsights = (data.insights || []).map(insight => {
                    // Prefer source_emails directly from API, fallback to metadata categories
                    let sourceEmails: any[] = insight.source_emails || [];

                    // If no source_emails, try metadata categories
                    if (sourceEmails.length === 0 && insight.metadata) {
                        const meta = insight.metadata;
                        sourceEmails = meta.opportunityDetails ||
                            meta.urgentItems ||
                            meta.hotLeads ||
                            meta.atRiskConversations ||
                            meta.missedFollowUps ||
                            meta.unreadImportantEmails || [];
                    }

                    // Filter out unsubscribed emails
                    const filteredEmails = sourceEmails.filter(email => !unsubscribedEmailIds.includes(email.id));

                    return {
                        ...insight,
                        source_emails: filteredEmails.map(email => ({
                            id: email.id,
                            subject: email.subject || 'No Subject',
                            snippet: email.snippet || '',
                            sender: email.sender || { name: 'Unknown', email: '' },
                            receivedAt: email.receivedAt || new Date().toISOString()
                        }))
                    };
                }).filter(insight => insight.source_emails.length > 0); // Only keep insights with emails

                if (isLoadMore) {
                    // Merging logic: Combine new insights with existing ones by category type
                    setInsights(prevInsights => {
                        const merged = [...prevInsights];
                        enrichedInsights.forEach(newInsight => {
                            const existingIndex = merged.findIndex(i => i.type === newInsight.type);
                            if (existingIndex !== -1) {
                                // Merge source emails and update content
                                const existingEmails = merged[existingIndex].source_emails || [];
                                const newEmails = newInsight.source_emails || [];

                                // Avoid duplicates
                                const existingIds = new Set(existingEmails.map(e => e.id));
                                const uniqueNewEmails = newEmails.filter(e => !existingIds.has(e.id));

                                merged[existingIndex] = {
                                    ...merged[existingIndex],
                                    source_emails: [...existingEmails, ...uniqueNewEmails],
                                    content: `${existingEmails.length + uniqueNewEmails.length} items identified`
                                };
                            } else {
                                merged.push(newInsight);
                            }
                        });
                        return merged;
                    });

                    // Merge summaries
                    if (data.sift_intelligence_summary) {
                        setSummary(prevSummary => {
                            if (!prevSummary) return data.sift_intelligence_summary;
                            const newSummary = { ...prevSummary };
                            Object.keys(data.sift_intelligence_summary as object).forEach(key => {
                                (newSummary as any)[key] = ((prevSummary as any)[key] || 0) + ((data.sift_intelligence_summary as any)[key] || 0);
                            });
                            return newSummary;
                        });
                    }
                } else {
                    setInsights(enrichedInsights);
                    setSummary(data.sift_intelligence_summary);
                }

                setNextPageToken(data.nextPageToken || null);
                setLastUpdated(new Date().toLocaleString());
                setHasInitialLoad(true);
                console.log('✅ Sift AI insights processed successfully');
            } else {
                throw new Error(data.error || 'Unknown error occurred');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load insights';
            setError(errorMessage);
            console.error('❌ Error fetching Sift AI insights:', errorMessage);
        } finally {
            setLoading(false);
            setCountdown(null);
            if (timerInterval) clearInterval(timerInterval);
        }
    };


    useEffect(() => {
        console.log('🔐 Session status:', session?.user?.email ? 'Authenticated' : 'Not authenticated');
    }, [session]);

    const refreshInsights = () => {
        fetchSiftInsights();
    };

    const getCardType = (insight: SiftInsight) => {
        const category = insight.metadata?.category || "";

        if (category === 'opportunity') return 'opportunity' as const;
        if (category === 'urgent') return 'urgent-action' as const;
        if (category === 'lead') return 'hot-leads' as const;
        if (category === 'risk') return 'at-risk' as const;
        if (category === 'follow_up') return 'missed-followups' as const;
        if (category === 'important') return 'unread-important' as const;

        // Fallback to title keywords if category is missing
        const title = (insight.title || "").toLowerCase();
        if (title.includes('urgent') || title.includes('action')) return 'urgent-action' as const;
        if (title.includes('lead') || title.includes('hot')) return 'hot-leads' as const;
        if (title.includes('risk') || title.includes('at risk')) return 'at-risk' as const;
        if (title.includes('follow')) return 'missed-followups' as const;
        if (title.includes('important')) return 'unread-important' as const;
        if (title.includes('opportunity')) return 'opportunity' as const;

        // Final fallback to section
        switch (insight.section) {
            case 'opportunities': return 'opportunity' as const;
            case 'ai-highlights': return 'arcus-suggestion' as const;
            case 'founder-execution': return 'founder-progress' as const;
            default: return 'inbox-intelligence' as const;
        }
    };

    const getActionButtons = (insight: SiftInsight) => {
        const type = getCardType(insight);
        switch (type) {
            case 'opportunity':
                return ['Draft Reply', 'Schedule Call'];
            case 'urgent-action':
                return ['Reply Now', 'Escalate'];
            case 'hot-leads':
                return ['Coming Soon', 'Schedule Meeting'];
            case 'at-risk':
                return ['Repair Reply', 'Add Note'];
            case 'unread-important':
                return ['Draft Reply', 'Unsubscribe'];
            case 'missed-followups':
                return ['Send follow-up', 'Schedule call'];
            default:
                return ['Reply', 'View Details'];
        }
    };

    const totalItems = summary ? Object.values(summary as Record<string, number>).reduce((a: number, b: number) => a + b, 0) : 0;

    return (
        <div className="min-h-screen bg-[#0a0a0a] dark:bg-[#0a0a0a] flex" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif" }}>
            <UsageLimitModal
                isOpen={isUsageLimitModalOpen}
                onClose={() => setIsUsageLimitModalOpen(false)}
                featureName={usageLimitModalData?.featureName || 'AI'}
                currentUsage={usageLimitModalData?.currentUsage || 0}
                limit={usageLimitModalData?.limit || 0}
                period={usageLimitModalData?.period || 'monthly'}
                currentPlan={usageLimitModalData?.currentPlan || 'starter'}
            />
            {/* Credits Badge in Header */}
            {usageData && usageData.planType !== 'pro' && (
                <div className="fixed top-4 right-4 z-50">
                    <UsageBadge
                        icon={<Sparkles className="h-4 w-4" />}
                        planName={usageData.planType === 'starter' ? 'Starter' : 'Free'}
                        usage={usageData.features?.arcus_ai?.usage || 0}
                        limit={usageData.features?.arcus_ai?.limit || 10}
                        tooltipContent={
                            <p>
                                You are on the {usageData.planType === 'starter' ? 'Starter' : 'Free'} plan.
                                <br />
                                {usageData.features?.arcus_ai?.remaining ?? 0}/{usageData.features?.arcus_ai?.limit ?? 10} AI credits left today.
                            </p>
                        }
                    />
                </div>
            )}
            {/* Sidebar */}
            <HomeFeedSidebar
                onPeopleClick={() => setViewMode(prev => prev === 'people' ? 'home' : 'people')}
                activeView={viewMode}
            />

            {/* Main Content */}
            <div className="flex-1 ml-16">
                <div className={`${viewMode === 'people' ? 'max-w-[1600px]' : 'max-w-5xl'} mx-auto px-8 py-10 transition-all duration-500`}>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-16">
                        <div className="flex items-center gap-4">
                            {viewMode === 'people' ? (
                                <Users className="w-6 h-6 text-[#fafafa]" strokeWidth={1.5} />
                            ) : (
                                <Home className="w-6 h-6 text-[#fafafa]" strokeWidth={1.5} />
                            )}
                            <h1 className="text-2xl font-medium text-[#fafafa] tracking-tight">
                                {viewMode === 'people' ? 'People' : 'Home'}
                            </h1>
                        </div>

                        <div className="flex items-center gap-6">
                            {countdown !== null && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-neutral-900/50 rounded-full border border-neutral-800/50">
                                    <div className={`w-1.5 h-1.5 rounded-full ${countdown < 0 ? 'bg-red-500 animate-pulse' : 'bg-blue-500 animate-pulse'}`} />
                                    <span className={`text-xs font-mono tabular-nums ${countdown < 0 ? 'text-red-500' : 'text-neutral-400'}`}>
                                        {countdown}s
                                    </span>
                                </div>
                            )}
                            {lastUpdated && (
                                <span className="text-xs text-neutral-500 font-light">
                                    Updated {lastUpdated}
                                </span>
                            )}
                            <button
                                onClick={() => {
                                    const nextState = !isTraditionalView;
                                    setIsTraditionalView(nextState);
                                    if (nextState && traditionalEmails.length === 0) {
                                        fetchTraditionalEmails();
                                    }
                                }}
                                className="h-10 px-6 metallic-glowing-button text-white rounded-xl text-sm font-medium flex items-center gap-3 group border border-white/20"
                            >
                                {isTraditionalView ? (
                                    <>
                                        <Sparkles className="h-4 w-4 text-yellow-500 group-hover:scale-110 transition-transform" />
                                        <span>Switch to AI Sift</span>
                                    </>
                                ) : (
                                    <>
                                        <LayoutList className="h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform" />
                                        <span>Switch to Traditional</span>
                                    </>
                                )}
                            </button>

                            <Button
                                onClick={() => isTraditionalView ? fetchTraditionalEmails() : fetchSiftInsights(true)}
                                disabled={loading || isLoadingTraditional || (!isTraditionalView && !nextPageToken)}
                                className="h-9 px-4 bg-transparent hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-[#fafafa] rounded-lg transition-colors flex items-center gap-2"
                                size="sm"
                            >
                                <Sparkles className={`h-3.5 w-3.5 ${loading || isLoadingTraditional ? 'animate-pulse' : ''}`} />
                                <span>{loading || isLoadingTraditional ? 'Sifting...' : 'Load More'}</span>
                            </Button>
                            <Button
                                onClick={() => isTraditionalView ? fetchTraditionalEmails() : fetchSiftInsights(false)}
                                disabled={loading || isLoadingTraditional}
                                className="h-9 px-4 bg-transparent hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-[#fafafa] rounded-lg transition-colors flex items-center gap-2"
                                size="sm"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${loading || isLoadingTraditional ? 'animate-spin' : ''}`} />
                                <span>{loading || isLoadingTraditional ? 'Syncing' : 'Refresh'}</span>
                            </Button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    {summary && (
                        <div className="grid grid-cols-6 gap-px bg-neutral-800/50 rounded-xl overflow-hidden mb-16">
                            {/* Opportunities */}
                            <div className="bg-[#0a0a0a] p-6 hover:bg-neutral-900/50 transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <Target className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
                                </div>
                                <p className="text-2xl font-medium text-[#fafafa] mb-1">{summary.opportunities_detected || 0}</p>
                                <p className="text-xs text-neutral-500 font-light">Opportunities</p>
                            </div>

                            {/* Urgent */}
                            <div className="bg-[#0a0a0a] p-6 hover:bg-neutral-900/50 transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <Zap className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
                                </div>
                                <p className="text-2xl font-medium text-[#fafafa] mb-1">{summary.urgent_action_required || 0}</p>
                                <p className="text-xs text-neutral-500 font-light">Urgent</p>
                            </div>

                            {/* Hot Leads */}
                            <div className="bg-[#0a0a0a] p-6 hover:bg-neutral-900/50 transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <TrendingUp className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
                                </div>
                                <p className="text-2xl font-medium text-[#fafafa] mb-1">{summary.hot_leads_heating_up || 0}</p>
                                <p className="text-xs text-neutral-500 font-light">Hot Leads</p>
                            </div>

                            {/* At Risk */}
                            <div className="bg-[#0a0a0a] p-6 hover:bg-neutral-900/50 transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <AlertCircle className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
                                </div>
                                <p className="text-2xl font-medium text-[#fafafa] mb-1">{summary.conversations_at_risk || 0}</p>
                                <p className="text-xs text-neutral-500 font-light">At Risk</p>
                            </div>

                            {/* Follow-ups */}
                            <div className="bg-[#0a0a0a] p-6 hover:bg-neutral-900/50 transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <Clock className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
                                </div>
                                <p className="text-2xl font-medium text-[#fafafa] mb-1">{summary.missed_follow_ups || 0}</p>
                                <p className="text-xs text-neutral-500 font-light">Follow-ups</p>
                            </div>

                            {/* Important */}
                            <div className="bg-[#0a0a0a] p-6 hover:bg-neutral-900/50 transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <Mail className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
                                </div>
                                <p className="text-2xl font-medium text-[#fafafa] mb-1">{summary.unread_but_important || 0}</p>
                                <p className="text-xs text-neutral-500 font-light">Important</p>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mb-12 p-4 border border-neutral-800 rounded-lg bg-neutral-900/30">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="h-4 w-4 text-neutral-500" />
                                <p className="text-sm text-neutral-400 font-light">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* People View */}
                    {viewMode === 'people' ? (
                        <div className="flex gap-6 min-h-[700px] animate-in fade-in slide-in-from-bottom-2 duration-500">

                            {/* Left Column: Context Sidebar (Blank until click) */}
                            <div className="w-64 bg-neutral-900/10 border border-neutral-800/30 rounded-3xl overflow-hidden flex flex-col transition-all duration-500 border-dashed">
                                {!selectedContactEmail ? (
                                    <div className="flex-1 flex items-center justify-center p-8 opacity-20">
                                        <div className="w-px h-12 bg-white/20" />
                                    </div>
                                ) : (
                                    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-600">Filters</h4>
                                            <div className="space-y-1">
                                                {['All Activity', 'Sent', 'Received', 'Attachments', 'Reminders'].map((filter) => (
                                                    <button key={filter} className="w-full text-left px-3 py-2 text-xs text-neutral-500 hover:text-white hover:bg-white/5 rounded-lg transition-all font-normal">
                                                        {filter}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-600">Timeline</h4>
                                            <div className="space-y-4 pl-2">
                                                {[
                                                    { date: 'Recent', desc: 'Latest interaction' },
                                                    { date: '30d+', desc: 'Stable period' },
                                                    { date: 'Initial', desc: 'First contact' }
                                                ].map((t) => (
                                                    <div key={t.date} className="relative pl-4 border-l border-white/5">
                                                        <div className="absolute -left-[4.5px] top-1 w-2 h-2 rounded-full bg-white/10" />
                                                        <p className="text-[10px] text-white/60 font-medium">{t.date}</p>
                                                        <p className="text-[9px] text-neutral-600 font-light">{t.desc}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Middle Column: People List (Max Space) */}
                            <div className="flex-1 space-y-px bg-neutral-900/20 border border-neutral-800/50 rounded-3xl overflow-hidden shadow-2xl transition-all">
                                <div className="p-6 border-b border-white/[0.03] flex items-center justify-between bg-white/[0.01]">
                                    <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">Recently Contacted</h3>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search people..."
                                            value={peopleSearchQuery}
                                            onChange={(e) => setPeopleSearchQuery(e.target.value)}
                                            className="bg-white/5 border border-white/5 rounded-full px-4 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/10 transition-all w-48 font-normal"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[700px] overflow-y-auto custom-scrollbar">
                                    {isLoadingContacts && contacts.length === 0 ? (
                                        <div className="py-32 text-center">
                                            <Loader2 className="w-8 h-8 mx-auto text-neutral-700 animate-spin mb-4" />
                                            <p className="text-neutral-500 font-light text-lg">Loading contacts...</p>
                                        </div>
                                    ) : contacts.length > 0 ? (
                                        contacts.map((contact) => (
                                            <div
                                                key={contact.email}
                                                onClick={() => fetchContactDetail(contact.email)}
                                                className={`group flex items-center gap-6 p-5 hover:bg-white/[0.04] active:bg-white/[0.06] transition-all cursor-pointer border-b border-white/[0.02] last:border-0 relative ${selectedContactEmail === contact.email ? 'bg-white/[0.05]' : ''}`}
                                            >
                                                <Avatar className="w-12 h-12 border border-white/[0.05]">
                                                    <AvatarFallback className="bg-neutral-800 text-white/50 text-sm font-normal">
                                                        {contact.name?.[0]?.toUpperCase() || contact.email?.[0]?.toUpperCase() || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <h4 className="text-sm font-semibold text-white/90 truncate group-hover:text-white transition-colors">
                                                            {contact.name || contact.email.split('@')[0]}
                                                        </h4>
                                                        <span className="text-[10px] uppercase tracking-widest text-neutral-600 font-medium">
                                                            {contact.frequency}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-neutral-500 truncate font-light leading-relaxed">
                                                        {contact.email}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 pr-2">
                                                    <div className="text-[10px] text-white/20 font-mono">
                                                        {contact.totalEmails} emails
                                                    </div>
                                                    <ChevronRight className={`w-4 h-4 text-neutral-600 transition-all ${selectedContactEmail === contact.email ? 'translate-x-1 text-white' : 'opacity-0 group-hover:opacity-100'}`} />
                                                </div>
                                                {selectedContactEmail === contact.email && (
                                                    <div className="absolute inset-y-0 left-0 w-1 bg-white" />
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-32 text-center">
                                            <Users className="w-8 h-8 mx-auto text-neutral-700 mb-4" strokeWidth={1} />
                                            <h3 className="text-lg font-light text-neutral-300">No contacts found</h3>
                                            <p className="text-sm text-neutral-600 mt-2 font-light">Try searching for someone else.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Profile Details */}
                            <div className="w-[400px] flex flex-col bg-neutral-900/40 border border-neutral-800/50 rounded-3xl overflow-hidden shadow-2xl transition-all">
                                {!selectedContactEmail ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                        <div className="w-20 h-20 bg-white/[0.02] border border-white/[0.05] rounded-full flex items-center justify-center mb-6">
                                            <User className="w-8 h-8 text-white/10" strokeWidth={1} />
                                        </div>
                                        <h3 className="text-lg font-light text-white/30 mb-2">Select a profile</h3>
                                        <p className="text-sm text-white/10 font-light max-w-[200px]">Choose someone from the list to view their relationship history.</p>
                                    </div>
                                ) : isLoadingContactDetail ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                        <Loader2 className="w-8 h-8 text-white/20 animate-spin mb-4" />
                                        <p className="text-white/20 font-light">Fetching details...</p>
                                    </div>
                                ) : contactDetail ? (
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                                        {/* Profile Header */}
                                        <div className="flex flex-col items-center text-center mb-10">
                                            <Avatar className="w-24 h-24 border border-white/10 mb-6">
                                                <AvatarFallback className="bg-neutral-800 text-white/80 text-3xl font-normal">
                                                    {(contactDetail.name || contactDetail.email)?.[0]?.toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <h2 className="text-2xl font-normal text-white mb-1">
                                                {contactDetail.name || contactDetail.email.split('@')[0]}
                                            </h2>
                                            <p className="text-white/40 text-sm font-normal truncate max-w-full">{contactDetail.email}</p>

                                            <div className="flex gap-3 mt-8">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-white/10 text-white/80 hover:bg-white/5 rounded-full px-6 font-normal"
                                                    onClick={() => window.open(`mailto:${contactDetail.email}`, '_blank')}
                                                >
                                                    Email
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-white/10 text-white/80 hover:bg-white/5 rounded-full px-6 font-normal"
                                                    onClick={() => window.open(`tel:${contactDetail.phone || ''}`, '_blank')}
                                                >
                                                    Call
                                                </Button>
                                            </div>
                                        </div>

                                        {/* AI Insight */}
                                        {contactDetail.aiSuggestion && (
                                            <div className="mb-10 bg-white/5 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                                                <div className="flex items-center gap-2 mb-3 text-white/30">
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">AI Intelligence</span>
                                                </div>
                                                <p className="text-sm text-white/90 leading-relaxed font-normal italic">
                                                    "{contactDetail.aiSuggestion}"
                                                </p>
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors" />
                                            </div>
                                        )}

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-3 mb-10">
                                            {[
                                                { label: 'Total Emails', value: contactDetail.totalEmails },
                                                { label: 'Score', value: `${contactDetail.relationshipScore}%` },
                                                { label: 'Sent', value: contactDetail.sentEmails },
                                                { label: 'Received', value: contactDetail.receivedEmails }
                                            ].map((item, i) => (
                                                <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:bg-white/[0.04] transition-colors">
                                                    <span className="text-[10px] text-white/20 block mb-1 font-bold uppercase tracking-wider">{item.label}</span>
                                                    <span className="text-xl text-white font-normal">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Sentiment History */}
                                        {contactDetail.sentimentHistory?.length > 0 && (
                                            <div className="mb-10">
                                                <h3 className="text-[10px] text-white/20 mb-4 font-bold uppercase tracking-widest">Sentiment Drift</h3>
                                                <div className="h-16 flex items-end gap-1 px-1">
                                                    {contactDetail.sentimentHistory.map((item: any, index: number) => (
                                                        <div
                                                            key={index}
                                                            className="flex-1 bg-white/10 hover:bg-white/40 transition-all rounded-t-sm"
                                                            style={{ height: `${item.score}%` }}
                                                            title={`Score: ${item.score}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Subjects */}
                                        {contactDetail.recentSubjects?.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Recent Topics</h3>
                                                <div className="space-y-2">
                                                    {contactDetail.recentSubjects.map((subject: string, index: number) => (
                                                        <div key={index} className="text-xs text-white/60 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 truncate font-normal hover:bg-white/[0.04] transition-colors">
                                                            {subject || '(No subject)'}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ) : (
                        /* Insights or Traditional View */
                        isTraditionalView ? (
                            /* ... existing traditional view code ... */
                            <div className="animate-in fade-in duration-500">
                                {/* ... rest of traditional view ... */}
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
                                        Traditional Inbox
                                    </h2>
                                    <div className="flex items-center gap-3 text-xs text-neutral-600">
                                        <Inbox className="w-3.5 h-3.5" />
                                        <span>Latest 50 emails</span>
                                    </div>
                                </div>

                                {isLoadingTraditional ? (
                                    <div className="py-32 text-center">
                                        <RefreshCw className="w-8 h-8 mx-auto text-neutral-700 animate-spin mb-4" />
                                        <p className="text-neutral-500 font-light text-lg">Loading your inbox...</p>
                                    </div>
                                ) : traditionalEmails.length > 0 ? (
                                    <div className="space-y-px bg-neutral-900/20 border border-neutral-800/50 rounded-2xl overflow-hidden shadow-2xl">
                                        {traditionalEmails.map((email, index) => (
                                            <React.Fragment key={email.id}>
                                                {/* Separation line after 50 emails */}
                                                {index === 50 && (
                                                    <div className="py-8 flex items-center justify-center gap-4 bg-white/[0.01] border-y border-white/[0.03]">
                                                        <div className="h-[1px] w-24 bg-gradient-to-r from-transparent to-neutral-800" />
                                                        <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-neutral-600">Previous Messages</span>
                                                        <div className="h-[1px] w-24 bg-gradient-to-l from-transparent to-neutral-800" />
                                                    </div>
                                                )}
                                                <div
                                                    onClick={() => handleTraditionalEmailClick(email.id)}
                                                    className="group flex items-center gap-6 p-5 hover:bg-white/[0.04] active:bg-white/[0.06] transition-all cursor-pointer border-b border-white/[0.02] last:border-0 relative overflow-hidden"
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-neutral-800/50 flex items-center justify-center flex-shrink-0 border border-white/[0.05] text-white/40 group-hover:text-white/80 transition-colors">
                                                        {email.from?.[0]?.toUpperCase() || 'M'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <h4 className="text-sm font-semibold text-white/90 truncate group-hover:text-white transition-colors">
                                                                {email.from?.split('<')[0]?.trim()}
                                                            </h4>
                                                            <span className="text-[10px] uppercase tracking-widest text-neutral-600 font-medium">
                                                                {new Date(email.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-white/60 font-medium truncate mb-1">
                                                            {email.subject}
                                                        </p>
                                                        <p className="text-xs text-neutral-500 truncate font-light leading-relaxed">
                                                            {email.snippet}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3 pr-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setArcusEmailId(email.id);
                                                                setArcusEmailSubject(email.subject);
                                                                setArcusQuery('What is this email about?');
                                                                setArcusConversationId(null);
                                                                const initMsg = {
                                                                    id: 'init',
                                                                    role: 'assistant',
                                                                    content: `I've connected to the email: **${email.subject}**. Ask me anything about it.`,
                                                                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                };
                                                                setArcusMessages([initMsg]);
                                                                setIsArcusMinimized(false);
                                                                setIsArcusOpen(true);
                                                            }}
                                                            className="w-9 h-9 bg-white/5 hover:bg-blue-500/20 rounded-xl text-white/30 hover:text-blue-400 transition-all border border-white/5 hover:border-blue-500/30 group/ai flex items-center justify-center overflow-hidden"
                                                            title="Ask Arcus AI"
                                                        >
                                                            <img src="/arcus-ai-icon.jpg" alt="Ask AI" className="w-full h-full object-cover brightness-90 group-hover:brightness-110 transition-all" />
                                                        </button>
                                                        <ChevronRight className="w-4 h-4 text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    <div className="absolute inset-y-0 left-0 w-1 bg-white scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />
                                                </div>
                                            </React.Fragment>
                                        ))}

                                        {/* Load More Button */}
                                        {traditionalNextPageToken && (
                                            <div className="p-8 text-center border-t border-white/[0.02] bg-white/[0.01]">
                                                <Button
                                                    onClick={handleLoadMoreTraditional}
                                                    disabled={isLoadingMoreTraditional}
                                                    className="h-12 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl px-12 transition-all transform hover:scale-105 active:scale-95 group shadow-lg"
                                                >
                                                    {isLoadingMoreTraditional ? (
                                                        <RefreshCw className="w-4 h-4 animate-spin mr-3" />
                                                    ) : (
                                                        <Plus className="w-4 h-4 mr-3 group-hover:rotate-90 transition-transform duration-300" />
                                                    )}
                                                    Load More Emails
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : isTraditionalLoadingError ? (
                                    <div className="py-32 text-center">
                                        <AlertCircle className="w-8 h-8 mx-auto text-red-900/50 mb-4" />
                                        <h3 className="text-lg font-light text-neutral-300">Failed to load Inbox</h3>
                                        <p className="text-sm text-neutral-600 mt-2 mb-8 font-light italic">There was an error connecting to Gmail.</p>
                                        <Button
                                            onClick={fetchTraditionalEmails}
                                            className="h-10 px-6 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl"
                                        >
                                            Try again
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="py-32 text-center">
                                        <Inbox className="w-8 h-8 mx-auto text-neutral-700 mb-4" strokeWidth={1} />
                                        <h3 className="text-lg font-light text-neutral-300">Your inbox is empty</h3>
                                        <p className="text-sm text-neutral-600 mt-2 font-light">All caught up!</p>
                                    </div>
                                )}
                            </div>
                        ) : hasInitialLoad ? (
                            insights.length > 0 ? (
                                <div>
                                    <div className="flex items-center justify-between mb-8">
                                        <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
                                            Insights
                                        </h2>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-neutral-600">{insights.length} insights</span>
                                            <span className="text-neutral-800">·</span>
                                            <span className="text-xs text-neutral-600">{totalItems} items</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {insights.map((insight) => (
                                            <SiftCard
                                                key={insight.id}
                                                type={getCardType(insight)}
                                                title={insight.title}
                                                content={insight.content}
                                                onClick={() => setSelectedInsight(insight)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-24">
                                    <Mail className="h-8 w-8 mx-auto text-neutral-700 mb-6" strokeWidth={1} />
                                    <h3 className="text-lg font-light text-neutral-300 mb-2">No insights yet</h3>
                                    <p className="text-sm text-neutral-600 mb-8 font-light">
                                        {error ? "Unable to load insights" : "Click refresh to load insights"}
                                    </p>
                                    <Button
                                        onClick={refreshInsights}
                                        disabled={loading}
                                        className="h-10 px-6 bg-[#fafafa] hover:bg-neutral-200 text-[#0a0a0a] rounded-lg transition-colors font-medium"
                                    >
                                        {loading ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                Loading
                                            </>
                                        ) : (
                                            'Load Insights'
                                        )}
                                    </Button>
                                </div>
                            )
                        ) : (
                            <div className="text-center py-24">
                                <div className="w-12 h-12 mx-auto mb-8 rounded-full border border-neutral-800 flex items-center justify-center">
                                    <Mail className="h-5 w-5 text-neutral-500" strokeWidth={1.5} />
                                </div>
                                <h3 className="text-xl font-light text-[#fafafa] mb-3">Welcome</h3>
                                <p className="text-sm text-neutral-500 mb-10 font-light max-w-sm mx-auto">
                                    Analyze your inbox to surface opportunities, urgent items, and important conversations.
                                </p>
                                <Button
                                    onClick={refreshInsights}
                                    disabled={loading}
                                    className="h-11 px-8 bg-[#fafafa] hover:bg-neutral-200 text-[#0a0a0a] rounded-lg transition-colors font-medium"
                                >
                                    {loading ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Analyzing
                                        </>
                                    ) : (
                                        'Start Analysis'
                                    )}
                                </Button>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Details Modal */}
            <div
                className={`fixed top-1/2 left-1/2 bg-[#1a1a1a] rounded-[2.5rem] shadow-2xl transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1) z-50 flex flex-col border border-neutral-800`}
                style={{
                    width: '70%',
                    height: '85vh',
                    transform: selectedInsight ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -45%) scale(0.95)',
                    opacity: selectedInsight ? 1 : 0,
                    pointerEvents: selectedInsight ? 'auto' : 'none'
                }}
            >
                <div className="p-10 flex-1 overflow-y-auto relative custom-scrollbar">
                    {selectedInsight && (
                        <div className="space-y-8 pb-20">
                            {/* Header with Back Button if Email Selected */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    {selectedEmailId && (
                                        <button
                                            onClick={() => setSelectedEmailId(null)}
                                            className="p-2 -ml-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white"
                                        >
                                            <ArrowLeft className="w-6 h-6" />
                                        </button>
                                    )}
                                    <div>
                                        {!selectedEmailId && (
                                            <Badge variant="outline" className="mb-4 border-neutral-700 text-neutral-400 px-3 py-1 rounded-full text-xs uppercase tracking-wider">
                                                {selectedInsight.type.replace('-', ' ')}
                                            </Badge>
                                        )}
                                        <h2 className={`font-medium text-white mb-2 ${selectedEmailId ? 'text-2xl' : 'text-3xl'}`}>
                                            {selectedEmailId
                                                ? selectedInsight.source_emails?.find(e => e.id === selectedEmailId)?.subject
                                                : selectedInsight.title}
                                        </h2>
                                        {!selectedEmailId && (
                                            <p className="text-neutral-500 text-sm font-light">
                                                {new Date(selectedInsight.timestamp).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedInsight(null)}
                                    className="p-3 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Main Content Area */}
                            {!selectedEmailId ? (
                                /* Insight Overview View */
                                <>
                                    <div className="prose prose-invert max-w-none">
                                        <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap text-lg font-light">
                                            {formatAIText(selectedInsight.content)}
                                        </p>
                                    </div>

                                    {/* Source Emails List */}
                                    {selectedInsight.source_emails && selectedInsight.source_emails.length > 0 && (
                                        <div className="mt-12">
                                            <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-6">
                                                Source Emails
                                            </h3>
                                            <div className="grid grid-cols-1 gap-4">
                                                {selectedInsight.source_emails.map((email) => (
                                                    <div
                                                        key={email.id}
                                                        onClick={() => handleEmailClick(email.id)}
                                                        className="bg-neutral-900/50 rounded-2xl p-6 hover:bg-neutral-800/50 transition-all cursor-pointer border border-neutral-800/50 group hover:border-neutral-700"
                                                    >
                                                        <div className="flex items-start gap-5">
                                                            {email.sender.avatar ? (
                                                                <img
                                                                    src={email.sender.avatar}
                                                                    alt={email.sender.name}
                                                                    className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-neutral-800"
                                                                />
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center flex-shrink-0 border border-neutral-700">
                                                                    <User className="w-6 h-6 text-neutral-500" />
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <p className="text-base font-medium text-[#fafafa] truncate pr-2 group-hover:text-blue-400 transition-colors">
                                                                        {email.sender.name}
                                                                    </p>
                                                                    <span className="text-xs text-neutral-500 whitespace-nowrap font-light">
                                                                        {new Date(email.receivedAt).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-neutral-300 font-medium truncate mb-2">
                                                                    {email.subject}
                                                                </p>
                                                                <p className="text-sm text-neutral-500 line-clamp-2 font-light leading-relaxed">
                                                                    {email.snippet}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* Email Detail & AI Summary View */
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {isSummarizing ? (
                                        <div className="flex flex-col items-center justify-center py-32">
                                            <div className="relative">
                                                <Sparkles className="w-16 h-16 text-white animate-pulse" strokeWidth={1} />
                                                <div className="absolute inset-0 bg-white/10 blur-3xl rounded-full animate-pulse" />
                                            </div>
                                            <p className="mt-8 text-neutral-500 font-light text-xl animate-pulse">
                                                Sift AI is analyzing the conversation...
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-10">
                                            {/* AI Summary Card */}
                                            <div className="bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 rounded-[2rem] p-8 border border-neutral-800/50 shadow-2xl relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                                    <Sparkles className="w-32 h-32 text-white" />
                                                </div>

                                                <div className="flex items-center gap-3 mb-6">
                                                    <Sparkles className="w-5 h-5 text-yellow-500" />
                                                    <h3 className="text-xs font-medium text-yellow-600 uppercase tracking-widest">
                                                        AI Intelligence Summary
                                                    </h3>
                                                </div>

                                                <p className="text-neutral-200 leading-relaxed text-xl font-light whitespace-pre-wrap">
                                                    {formatAIText(emailSummary)}
                                                </p>
                                            </div>

                                            {/* Premium Coming Soon Message (inline) */}
                                            <div id="coming-soon-message" className="mb-6 p-4 bg-gradient-to-r from-neutral-800 to-neutral-900 rounded-2xl border border-neutral-700 text-center hidden">
                                                <p className="text-neutral-300 font-medium">
                                                    🚀 <span className="font-light">Coming Soon...</span>
                                                </p>
                                                <p className="text-neutral-500 text-sm font-light mt-1">
                                                    This premium feature will be available soon!
                                                </p>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="grid grid-cols-2 gap-6">
                                                {getActionButtons(selectedInsight).map((label, index) => (
                                                    <Button
                                                        key={index}
                                                        onClick={() => {
                                                            if (label === 'Draft Reply' && selectedEmailId) {
                                                                handleDraftReply(selectedEmailId, selectedInsight.type);
                                                            } else if (label === 'Reply Now' && selectedEmailId) {
                                                                handleDraftReply(selectedEmailId, selectedInsight.type);
                                                            } else if (label === 'Repair Reply' && selectedEmailId) {
                                                                handleRepairReply(selectedEmailId, selectedInsight.type);
                                                            } else if (label.toLowerCase().includes('call') && selectedEmailId) {
                                                                handleScheduleCall(selectedEmailId);
                                                            } else if (label === 'Schedule Meeting' && selectedEmailId) {
                                                                handleScheduleCall(selectedEmailId);
                                                            } else if (label === 'Escalate' && selectedEmailId) {
                                                                handleEscalate(selectedEmailId);
                                                            } else if (label === 'Add Note' && selectedEmailId) {
                                                                handleAddNote(selectedEmailId);
                                                            } else if (label === 'Send follow-up' && selectedEmailId) {
                                                                handleDraftReply(selectedEmailId, 'follow-up');
                                                            } else if (label === 'Unsubscribe' && selectedEmailId) {
                                                                handleUnsubscribe(selectedEmailId);
                                                            } else if (label === 'Coming Soon') {
                                                                // Premium inline message instead of toast
                                                                const comingSoonElement = document.getElementById('coming-soon-message');
                                                                if (comingSoonElement) {
                                                                    comingSoonElement.style.display = 'block';
                                                                    setTimeout(() => {
                                                                        comingSoonElement.style.display = 'none';
                                                                    }, 3000);
                                                                }
                                                            }
                                                        }}
                                                        className="h-16 bg-gradient-to-r from-neutral-900 to-neutral-700 hover:from-neutral-800 hover:to-neutral-600 text-[#fafafa] border border-neutral-600 rounded-2xl transition-all duration-300 font-medium text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                                    >
                                                        {label}
                                                    </Button>
                                                ))}
                                            </div>

                                            {/* Original Email Content (Optional context) */}
                                            <div className="pt-10 border-t border-neutral-800/50">
                                                <h4 className="text-xs font-medium text-neutral-600 uppercase tracking-widest mb-6">Original Message Snippet</h4>
                                                <div className="bg-neutral-900/30 rounded-2xl p-8 text-neutral-400 text-base leading-relaxed font-light border border-neutral-800/30">
                                                    {selectedInsight.source_emails?.find(e => e.id === selectedEmailId)?.snippet}
                                                    ...
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {/* Progressive Blur Bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#1a1a1a] to-transparent pointer-events-none rounded-b-[2.5rem] z-10" />
            </div>

            {/* Draft Editor Modal */}
            <div
                className={`fixed top-1/2 left-1/2 bg-[#1a1a1a] rounded-[2.5rem] shadow-2xl transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1) z-[60] flex flex-col border border-neutral-800`}
                style={{
                    width: '60%',
                    height: '75vh',
                    transform: showDraftEditor ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -45%) scale(0.95)',
                    opacity: showDraftEditor ? 1 : 0,
                    pointerEvents: showDraftEditor ? 'auto' : 'none'
                }}
            >
                <div className="p-10 flex flex-col h-full relative">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-2xl">
                                <Sparkles className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-medium text-white">AI Draft Reply</h3>
                                <p className="text-sm text-neutral-500 font-light">Sift AI generated response</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowDraftEditor(false)}
                            className="p-3 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 bg-neutral-900/30 rounded-[2rem] border border-neutral-800/50 p-8 overflow-hidden flex flex-col shadow-inner relative">
                        {isDrafting ? (
                            <div className="flex-1 flex flex-col items-center justify-center">
                                <div className="relative mb-6">
                                    <Sparkles className="w-12 h-12 text-blue-400 animate-pulse" />
                                    <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full animate-pulse" />
                                </div>
                                <p className="text-neutral-400 text-lg font-light animate-pulse">Sift AI is drafting your response...</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <input
                                        type="text"
                                        value={draftSubject}
                                        onChange={(e) => setDraftSubject(e.target.value)}
                                        className="w-full bg-neutral-900/30 text-white text-lg font-medium px-4 py-3 rounded-xl border border-neutral-800 focus:outline-none focus:border-neutral-700 transition-colors"
                                        placeholder="Subject"
                                    />
                                </div>
                                <textarea
                                    value={draftContent}
                                    onChange={(e) => setDraftContent(e.target.value)}
                                    className="flex-1 bg-transparent text-neutral-200 resize-none focus:outline-none font-light leading-relaxed text-xl custom-scrollbar"
                                    placeholder="AI generated draft will appear here..."
                                />
                                {/* Progressive Blur for Textarea */}
                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-neutral-900/80 to-transparent pointer-events-none z-10" />
                            </>
                        )}
                    </div>

                    <div className="mt-8 flex justify-end gap-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowDraftEditor(false)}
                            className="h-14 px-8 border-neutral-800 text-neutral-400 hover:bg-neutral-800 rounded-2xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="h-14 bg-[#fafafa] hover:bg-neutral-200 text-[#0a0a0a] px-10 rounded-2xl text-lg font-medium shadow-lg shadow-white/5"
                            onClick={handleSendReply}
                        >
                            Send Reply
                        </Button>
                    </div>
                </div>
            </div>

            {/* Draft Backdrop */}
            {showDraftEditor && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[55] transition-opacity duration-500"
                    onClick={() => setShowDraftEditor(false)}
                />
            )}

            {/* Note Editor - Premium UI in bottom-right */}
            <div
                className={`fixed bottom-6 right-6 w-96 bg-gradient-to-br from-neutral-800/90 to-neutral-900/90 backdrop-blur-2xl rounded-[2rem] shadow-2xl transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1) z-[60] border border-neutral-700/50`}
                style={{
                    transform: showNoteEditor ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                    opacity: showNoteEditor ? 1 : 0,
                    pointerEvents: showNoteEditor ? 'auto' : 'none'
                }}
            >
                <div className="p-6 h-[32rem] flex flex-col">
                    {/* Header with close button */}
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-xl">
                                <Sparkles className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-white">AI Note</h3>
                                <p className="text-xs text-neutral-400 font-light">Intelligent insights</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowNoteEditor(false)}
                            className="p-2 hover:bg-neutral-700/50 rounded-full transition-colors text-neutral-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Note Content Area */}
                    <div className="flex-1 bg-neutral-900/30 rounded-[1.5rem] border border-neutral-800/50 p-4 mb-4 overflow-hidden flex flex-col">
                        <input
                            type="text"
                            value={noteSubject}
                            onChange={(e) => setNoteSubject(e.target.value)}
                            className="w-full bg-transparent text-white text-base font-medium px-3 py-2 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-colors mb-3"
                            placeholder="Note heading..."
                        />
                        <div className="flex-1 bg-transparent text-neutral-200 resize-none focus:outline-none font-light leading-relaxed text-sm custom-scrollbar overflow-y-auto">
                            {/* Render markdown formatting */}
                            <div className="prose prose-invert max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderMarkdown(noteContent) }} />
                        </div>
                        {/* Progressive Blur for Textarea */}
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-neutral-900/80 to-transparent pointer-events-none z-10" />
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSaveNote}
                        disabled={isSavingNote || !noteContent.trim()}
                        className={`h-12 bg-gradient-to-r ${isSavingNote || !noteContent.trim() ? 'from-neutral-700 to-neutral-800' : 'from-yellow-500 to-yellow-600'} text-black font-medium rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center`}
                    >
                        {isSavingNote ? (
                            <>
                                <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Save Note
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Scheduling Modal */}
            <SchedulingModal
                isOpen={showSchedulingModal}
                onClose={() => setShowSchedulingModal(false)}
                emailId={schedulingEmailId || ''}
            />

            {/* Traditional Email Detailed View Modal */}
            <div
                className={`fixed top-1/2 left-1/2 bg-black rounded-[2.5rem] shadow-2xl transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1) z-[70] flex flex-col border border-white/10`}
                style={{
                    width: '75%',
                    height: '90vh',
                    transform: isTraditionalModalOpen ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -45%) scale(0.95)',
                    opacity: isTraditionalModalOpen ? 1 : 0,
                    pointerEvents: isTraditionalModalOpen ? 'auto' : 'none'
                }}
            >
                {/* Header */}
                <div className="p-10 border-b border-white/5 flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-10">
                        {isSummarizing ? (
                            <div className="space-y-3">
                                <div className="h-7 w-2/3 bg-white/5 rounded-lg animate-pulse" />
                                <div className="h-4 w-1/3 bg-white/5 rounded-lg animate-pulse" />
                            </div>
                        ) : selectedTraditionalEmail ? (
                            <div className="space-y-4">
                                <h2 className="text-3xl font-semibold text-white tracking-tight leading-tight">
                                    {selectedTraditionalEmail.subject}
                                </h2>
                                <div className="flex flex-wrap items-center gap-5">
                                    <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-white/40 text-sm font-bold">
                                            {selectedTraditionalEmail.from?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm text-white font-medium">
                                                {selectedTraditionalEmail.from?.split('<')[0]?.trim() || 'Sender'}
                                            </span>
                                            <span className="text-[10px] text-neutral-500 font-light truncate max-w-[200px]">
                                                {selectedTraditionalEmail.from?.match(/<(.+)>/)?.[1] || selectedTraditionalEmail.from}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-neutral-500">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-sm font-light">
                                            {new Date(selectedTraditionalEmail.date).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <button
                        onClick={() => setIsTraditionalModalOpen(false)}
                        className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/40 hover:text-white transition-all shadow-lg"
                    >
                        <X className="w-7 h-7" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                    {isSummarizing ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <RefreshCw className="w-10 h-10 text-white/20 animate-spin mb-6" />
                            <p className="text-white/40 font-light text-xl">Opening message...</p>
                        </div>
                    ) : selectedTraditionalEmail ? (
                        <div className="max-w-4xl mx-auto space-y-12 pb-20">
                            <div className="traditional-email-content font-sans text-lg">
                                {selectedTraditionalEmail.isHtml ? (
                                    <div
                                        className="whitespace-pre-wrap transition-all selection:bg-blue-500/30"
                                        dangerouslySetInnerHTML={{ __html: cleanHtml(selectedTraditionalEmail.body) }}
                                    />
                                ) : (
                                    <div
                                        className="whitespace-pre-wrap selection:bg-blue-500/30"
                                        dangerouslySetInnerHTML={{ __html: linkify(selectedTraditionalEmail.body) }}
                                    />
                                )}
                            </div>

                            {/* Attachments Section */}
                            {selectedTraditionalEmail.attachments?.length > 0 && (
                                <div className="space-y-6 pt-12 border-t border-white/5">
                                    <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">
                                        <Download className="w-3.5 h-3.5" />
                                        Attachments
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {selectedTraditionalEmail.attachments.map((att: any, i: number) => (
                                            <div key={i} className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl group hover:border-white/20 transition-all">
                                                <div className="p-3 bg-white/5 rounded-xl text-white/40">
                                                    {att.mimeType?.startsWith('image/') ? <Sparkles className="w-5 h-5" /> : <Inbox className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">{att.filename}</p>
                                                    <p className="text-xs text-neutral-500 font-light mt-0.5">{(att.size / 1024).toFixed(0)} KB</p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        window.open(`/api/attachments/download?messageId=${selectedTraditionalEmail.id}&attachmentId=${att.attachmentId}&filename=${encodeURIComponent(att.filename)}`, '_blank');
                                                        toast.success('Downloading...', { description: att.filename });
                                                    }}
                                                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all shadow-sm"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setNoteEmailId(selectedTraditionalEmail.id); setNoteSubject(`Note: ${att.filename}`); setNoteContent(`Reference to document "${att.filename}" in email "${selectedTraditionalEmail.subject}"`); setShowNoteEditor(true); }}
                                                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/30 hover:text-white transition-all"
                                                >
                                                    <FilePlus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* Footer Controls */}
                {!isSummarizing && selectedTraditionalEmail && (
                    <div className="p-10 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                        <button
                            onClick={() => setIsTraditionalModalOpen(false)}
                            className="px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-base font-medium text-white/60 transition-all hover:text-white"
                        >
                            Close Viewer
                        </button>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => { setDraftTo(selectedTraditionalEmail.from?.match(/<(.+)>/)?.[1] || selectedTraditionalEmail.from); setDraftSubject(`Re: ${selectedTraditionalEmail.subject}`); setDraftContent(''); setShowDraftEditor(true); }}
                                className="px-10 py-4 bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl text-base font-medium text-white/80 hover:text-white transition-all"
                            >
                                Reply
                            </button>
                            <button
                                onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${selectedTraditionalEmail.id}`, '_blank')}
                                className="flex items-center gap-3 px-10 py-4 bg-white text-black hover:bg-neutral-200 rounded-2xl text-base font-bold transition-all shadow-2xl active:scale-95"
                            >
                                <ExternalLink className="w-5 h-5" />
                                Open in Gmail
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Traditional Backdrop */}
            {isTraditionalModalOpen && (
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[65] transition-opacity duration-300"
                    onClick={() => setIsTraditionalModalOpen(false)}
                />
            )}

            {/* Arcus AI Panel */}
            <AnimatePresence>
                {isArcusOpen && !isArcusMinimized && (
                    <motion.div
                        className="arcus-panel arcus-panel-motion"
                        style={{ height: arcusPanelHeight }}
                        drag="y"
                        dragControls={arcusDragControls}
                        dragListener={false}
                        dragConstraints={{ top: 0, bottom: arcusPanelHeight }}
                        dragElastic={0.06}
                        onDragEnd={handleArcusDragEnd}
                        animate={arcusPanelAnimControls}
                        initial={false}
                        exit={{ opacity: 0, y: arcusPanelHeight * 0.55, scale: 0.985, transition: { duration: 0.18 } }}
                    >
                        <div
                            className="arcus-header"
                            style={{ touchAction: 'none' }}
                            onPointerDown={(e) => arcusDragControls.start(e)}
                            onDoubleClick={minimizeArcus}
                        >
                            <div className="w-full">
                                <div className="flex justify-center">
                                    <div className="h-1 w-12 rounded-full bg-white/10" />
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center border border-white/10 transition-all flex-shrink-0 overflow-hidden">
                                            <img src="/arcus-ai-icon.jpg" alt="Arcus" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-white uppercase tracking-widest leading-none mb-1 font-sans">Arcus Intelligence</h4>
                                            <p className="text-[10px] text-neutral-500 truncate max-w-[250px] font-medium font-sans">{arcusEmailSubject}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); minimizeArcus(); }}
                                            className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all"
                                            aria-label="Minimize Arcus"
                                            type="button"
                                        >
                                            <ChevronDown className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); closeArcus(); }}
                                            className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all"
                                            aria-label="Close Arcus"
                                            type="button"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="arcus-content custom-scrollbar">
                            {arcusMessages.map((msg) => (
                                <div key={msg.id} className={msg.role === 'user' ? 'arcus-message-user' : 'arcus-message-agent'}>
                                    <div className="prose prose-invert prose-sm">
                                        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                                    </div>
                                    <div className={`text-[10px] mt-2 font-medium ${msg.role === 'user' ? 'text-black/40' : 'text-white/20'}`}>
                                        {msg.timestamp}
                                    </div>
                                </div>
                            ))}

                            {isArcusLoading && (
                                <div className="arcus-message-agent flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-white animate-[arcus-dot-pulse_1s_ease-in-out_infinite]" />
                                    <span className="text-sm text-white/70 font-medium">Thinking...</span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="arcus-input-container">
                            <div className="arcus-input-wrapper">
                                <input
                                    type="text"
                                    className="arcus-input"
                                    value={arcusQuery}
                                    placeholder="Ask Arcus anything..."
                                    onChange={(e) => setArcusQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSendAskAI();
                                        }
                                    }}
                                    autoFocus
                                />
                                <button
                                    onClick={() => handleSendAskAI()}
                                    disabled={isArcusLoading || !arcusQuery.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white text-black hover:bg-neutral-200 rounded-xl disabled:opacity-30 transition-all shadow-lg"
                                    type="button"
                                >
                                    <Zap className={`w-4 h-4 ${isArcusLoading ? 'animate-pulse' : 'fill-black'}`} />
                                </button>
                            </div>
                            <p className="text-[10px] text-neutral-600 text-center mt-4 font-medium uppercase tracking-tighter italic">
                                Connected to Arcus Agent Intelligence
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isArcusOpen && isArcusMinimized && (
                    <motion.button
                        type="button"
                        className="arcus-minimized-tab"
                        onClick={restoreArcus}
                        initial={{ opacity: 0, y: 14, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 26, stiffness: 340 } }}
                        exit={{ opacity: 0, y: 14, scale: 0.98, transition: { duration: 0.14 } }}
                        aria-label="Restore Arcus"
                    >
                        <span className="arcus-minimized-dot" aria-hidden="true" />
                        <span className="arcus-minimized-title">Ask AI</span>
                        <span className="arcus-minimized-subject">{arcusEmailSubject || 'Conversation'}</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Backdrop */}
            {selectedInsight && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-xl z-40 transition-opacity duration-300"
                    onClick={() => setSelectedInsight(null)}
                />
            )}

            {/* Global Style for Email Content */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .traditional-email-content a, 
                .traditional-email-content [href] {
                    color: #3b82f6 !important;
                    text-decoration: underline !important;
                    cursor: pointer !important;
                    pointer-events: auto !important;
                    display: inline-block !important;
                }
                
                .traditional-email-content .email-link {
                    color: #3b82f6 !important;
                    text-decoration: underline !important;
                }
                
                /* Ensure buttons and styled elements in emails are visible */
                .traditional-email-content table,
                .traditional-email-content div,
                .traditional-email-content section {
                    max-width: 100% !important;
                    background-color: transparent !important;
                }
                
                /* Force background colors for specific structured elements that might be buttons */
                .traditional-email-content [style*="background-color"] {
                    display: inline-block !important;
                    min-width: 10px !important;
                    min-height: 10px !important;
                }

                .clickable-link {
                    cursor: pointer !important;
                    pointer-events: auto !important;
                }

                @keyframes arcus-dot-pulse {
                    0% { transform: scale(0.7); opacity: 0.8; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(0.7); opacity: 0.8; }
                }
            ` }} />
        </div>
    );
}
