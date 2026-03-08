'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { SiftCard } from './sift-card';
import { Button } from './button';
import { Badge } from './badge';
import { HomeFeedSidebar } from './home-feed-sidebar';
import { RefreshCw, AlertCircle, TrendingUp, Clock, Target, Zap, Mail, Home, X, User, Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { SchedulingModal } from './scheduling-modal';

// Simple markdown renderer for bold text
const renderMarkdown = (text: string): string => {
    if (!text) return text;
    
    // Replace **bold** with <strong>bold</strong>
    let result = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace - bullet points with HTML list items
    result = result.replace(/^\s*-\s*(.*)$/gm, '<li>$1</li>');
    
    // Wrap consecutive list items in <ul> tags
    result = result.replace(/((<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
    
    return result;
};

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

            if (!response.ok) throw new Error('Failed to fetch summary');

            const data = await response.json();
            setEmailSummary(data.summary);
        } catch (error) {
            console.error('Error fetching summary:', error);
            setEmailSummary("Failed to generate summary. Please try again.");
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

        // Populate specific fields
        const email = selectedInsight?.source_emails?.find(e => e.id === emailId);
        if (email) {
            setDraftSubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
            setDraftTo(email.sender.email);
        }

        try {
            const response = await fetch('/api/email/draft-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailId, category })
            });

            if (!response.ok) throw new Error('Failed to generate draft');

            const data = await response.json();
            setDraftContent(data.draftReply);
        } catch (error) {
            console.error('Error generating draft:', error);
            setDraftContent("Failed to generate draft. Please try again.");
        } finally {
            setIsDrafting(false);
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

            if (!response.ok) throw new Error('Failed to generate repair reply');

            const data = await response.json();
            setDraftContent(data.repairReply);
        } catch (error) {
            console.error('Error generating repair reply:', error);
            setDraftContent("Dear there,\n\nThank you for reaching out. I appreciate your message and will respond shortly.\n\nWith gratitude,\n" + (session?.user?.name || 'User'));
        } finally {
            setIsDrafting(false);
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
                    body: JSON.stringify({ emailId, subject: email.subject, snippet: email.snippet })
                });

                if (response.ok) {
                    const data = await response.json();
                    setNoteContent(data.noteContent);
                }
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

            if (!response.ok) {
                throw new Error('Failed to save note');
            }

            const result = await response.json();
            toast.success('📝 Note saved successfully!', { id: toastId });
            console.log('✅ Note saved:', result);
            
            // Redirect to the note page
            if (result.note?.id) {
                window.location.href = `/i/notes/${result.note.id}`;
            }
            
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
                <a href="http://localhost:3000/auth/signup" style="background-color: #ffffff; color: #000000; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-weight: 500; border: 1px solid #e5e5e5; font-size: 12px; display: inline-block;">Join Now!</a>
            </div>
        `;

        // Convert newlines to breaks for simple text-to-html
        const bodyHtml = `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6; color: #333;">
                ${draftContent.replace(/\n/g, '<br/>')}
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


    const fetchSiftInsights = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('🤖 Fetching Sift AI insights...');
            const response = await fetch('/api/home-feed/insights', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch insights: ${response.statusText}`);
            }

            const data: SiftInsightsResponse = await response.json();

            if (data.success) {
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

                    return {
                        ...insight,
                        source_emails: sourceEmails.map(email => ({
                            id: email.id,
                            subject: email.subject || 'No Subject',
                            snippet: email.snippet || '',
                            sender: email.sender || { name: 'Unknown', email: '' },
                            receivedAt: email.receivedAt || new Date().toISOString()
                        }))
                    };
                });

                setInsights(enrichedInsights);
                setSummary(data.sift_intelligence_summary);
                setLastUpdated(new Date().toLocaleString());
                setHasInitialLoad(true);
                console.log('✅ Sift AI insights loaded successfully');
            } else {
                throw new Error(data.error || 'Unknown error occurred');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load insights';
            setError(errorMessage);
            console.error('❌ Error fetching Sift AI insights:', errorMessage);
        } finally {
            setLoading(false);
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
                return ['Draft Reply', 'Follow'];
            case 'missed-followups':
                return ['Send follow-up', 'Schedule call'];
            default:
                return ['Reply', 'View Details'];
        }
    };

    const totalItems = summary ? Object.values(summary).reduce((a, b) => a + b, 0) : 0;

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif" }}>
            {/* Sidebar */}
            <HomeFeedSidebar />

            {/* Main Content */}
            <div className="flex-1 ml-16">
                <div className="max-w-5xl mx-auto px-8 py-10">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-16">
                        <div className="flex items-center gap-4">
                            <Home className="w-6 h-6 text-[#fafafa]" strokeWidth={1.5} />
                            <h1 className="text-2xl font-medium text-[#fafafa] tracking-tight">
                                Home
                            </h1>
                        </div>

                        <div className="flex items-center gap-6">
                            {lastUpdated && (
                                <span className="text-xs text-neutral-500 font-light">
                                    Updated {lastUpdated}
                                </span>
                            )}
                            <Button
                                onClick={refreshInsights}
                                disabled={loading}
                                className="h-9 px-4 bg-transparent hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-[#fafafa] rounded-lg transition-colors"
                                size="sm"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                {loading ? 'Syncing' : 'Refresh'}
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

                    {/* Insights */}
                    {hasInitialLoad ? (
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
                                            {selectedInsight.content}
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
                                                    {emailSummary}
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

            {/* Backdrop */}
            {selectedInsight && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-xl z-40 transition-opacity duration-300"
                    onClick={() => setSelectedInsight(null)}
                />
            )}
        </div>
    );
}