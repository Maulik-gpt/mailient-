"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';
import {
    Bell, Clock, Sparkles, ShieldAlert, ShieldX, ShieldCheck,
    Key, Copy, CheckCircle2, FileText, Download, FileIcon, Reply,
    RefreshCw, AlertTriangle, Loader2, ChevronRight,
    Lock, FileSpreadsheet, Receipt, FileSignature, Mail, LogOut,
    ExternalLink, Eye, X, User, Calendar, FilePlus, StickyNote, Pencil
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';

// Types
interface ThreatNotification {
    id: string;
    type: 'threat';
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    emailId: string;
    from: string;
    subject: string;
    indicators: string[];
    timestamp: string;
}

interface VerificationCodeNotification {
    id: string;
    type: 'verification';
    code: string;
    platform: string;
    description: string;
    emailId: string;
    expiresIn?: string;
    timestamp: string;
}

interface DocumentNotification {
    id: string;
    type: 'document';
    category: 'invoice' | 'payment' | 'receipt' | 'contract' | 'report' | 'other';
    title: string;
    description: string;
    emailId: string;
    attachments: { filename: string; mimeType: string; size: number; attachmentId: string; }[];
    from: string;
    isImportant: boolean;
    timestamp: string;
}

interface ReplyNotification {
    id: string;
    type: 'reply';
    title: string;
    description: string;
    emailId: string;
    threadId: string;
    from: string;
    subject: string;
    preview: string;
    timestamp: string;
}

type SmartNotification = ThreatNotification | VerificationCodeNotification | DocumentNotification | ReplyNotification;
type NotificationCategory = 'all' | 'threats' | 'verification' | 'documents' | 'replies';

// Loading fallback
function NotificationsLoadingFallback() {
    return (
        <div className="min-h-screen bg-black dark:bg-black flex" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            <HomeFeedSidebar />
            <div className="flex-1 ml-16">
                <div className="max-w-4xl mx-auto px-6 py-12">
                    <div className="py-24 text-center space-y-6">
                        <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
                            <Loader2 className="w-6 h-6 text-white/60 animate-spin" />
                        </div>
                        <p className="text-white/60 text-sm">Loading notifications...</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Wrapper
export default function NotificationsPageWrapper() {
    return (
        <Suspense fallback={<NotificationsLoadingFallback />}>
            <NotificationsPage />
        </Suspense>
    );
}

function NotificationsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [notifications, setNotifications] = useState<SmartNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [authError, setAuthError] = useState(false);
    const [summary, setSummary] = useState({ threats: 0, verificationCodes: 0, documents: 0, replies: 0 });

    // Email Modal State
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    // Note functionality state
    const [showNoteEditor, setShowNoteEditor] = useState(false);
    const [noteEmailId, setNoteEmailId] = useState<string | null>(null);
    const [noteSubject, setNoteSubject] = useState<string>('');
    const [noteContent, setNoteContent] = useState<string>('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [isGeneratingNote, setIsGeneratingNote] = useState(false);

    const fetchNotifications = useCallback(async (showToast = false) => {
        try {
            showToast ? setIsRefreshing(true) : setIsLoading(true);
            const response = await fetch('/api/notifications/analyze');
            const data = await response.json();

            if (data.success) {
                setNotifications(data.notifications || []);
                setSummary(data.summary || { threats: 0, verificationCodes: 0, documents: 0, replies: 0 });
                setAuthError(false);
                if (showToast) {
                    toast.success('Refreshed', { description: `${data.notifications.length} notifications found` });
                }
            } else {
                if (data.authRequired || data.error?.includes('expired') || data.error?.includes('authenticate')) {
                    setAuthError(true);
                }
                throw new Error(data.error);
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            if (msg.includes('expired') || msg.includes('authenticate') || msg.includes('Unauthorized')) {
                setAuthError(true);
            }
            if (showToast) toast.error('Failed to refresh');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        document.title = 'Notifications / Mailient';
        if (searchParams.get('onboarding') === 'complete') {
            toast.success('Signed in successfully');
            setTimeout(() => toast("Welcome to Mailient!", { icon: <Sparkles className="w-4 h-4 text-white" /> }), 1500);
        }
        fetchNotifications();
    }, [searchParams, fetchNotifications]);

    const copyCode = async (code: string) => {
        await navigator.clipboard.writeText(code);
        setCopiedCode(code);
        toast.success('Copied!');
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const handleViewEmail = (emailId: string) => {
        setSelectedEmailId(emailId);
        setIsEmailModalOpen(true);
    };

    const handleAddNote = async (emailId: string, subject: string, snippet: string, type: string, filename?: string) => {
        setNoteEmailId(emailId);
        setNoteSubject(filename ? `Document: ${filename}` : subject);
        setNoteContent('');
        setShowNoteEditor(true);
        setIsGeneratingNote(true);

        try {
            const response = await fetch('/api/email/generate-note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    emailId,
                    subject: filename ? `File: ${filename}` : subject,
                    snippet: filename ? `This notification is about an attachment: ${filename}. Brief context: ${snippet}` : snippet,
                    category: type || 'document'
                })
            });

            if (response.ok) {
                const data = await response.json();
                setNoteContent(data.noteContent);
            } else {
                setNoteContent(`Personal Note: Reviewed document "${filename || subject}".\n\n[Add your details here]`);
            }
        } catch (error) {
            console.error('Error generating note:', error);
            setNoteContent(`Personal Note regarding: ${filename || subject}`);
        } finally {
            setIsGeneratingNote(false);
        }
    };

    const handleSaveNote = async () => {
        if (!noteContent.trim()) {
            toast.error('Note content cannot be empty');
            return;
        }

        setIsSavingNote(true);
        const toastId = toast.loading('Saving your personal note...');

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

            if (!response.ok) throw new Error('Failed to save note');

            const result = await response.json();
            toast.success('Saved successfully', { id: toastId });

            setTimeout(() => {
                setShowNoteEditor(false);
                if (result.note?.id) {
                    router.push(`/i/notes/${result.note.id}`);
                }
            }, 800);

        } catch (error) {
            toast.error('Failed to save note', { id: toastId });
        } finally {
            setIsSavingNote(false);
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (activeCategory === 'all') return true;
        if (activeCategory === 'threats') return n.type === 'threat';
        if (activeCategory === 'verification') return n.type === 'verification';
        if (activeCategory === 'documents') return n.type === 'document';
        if (activeCategory === 'replies') return n.type === 'reply';
        return true;
    });

    const formatTime = (timestamp: string) => {
        try {
            const diff = Date.now() - new Date(timestamp).getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return 'now';
            if (mins < 60) return `${mins}m`;
            const hrs = Math.floor(diff / 3600000);
            if (hrs < 24) return `${hrs}h`;
            return `${Math.floor(diff / 86400000)}d`;
        } catch { return ''; }
    };

    const categories = [
        { id: 'all', label: 'All', count: notifications.length, icon: Bell },
        { id: 'threats', label: 'Threats', count: summary.threats, icon: ShieldAlert },
        { id: 'verification', label: 'Codes', count: summary.verificationCodes, icon: Key },
        { id: 'documents', label: 'Documents', count: summary.documents, icon: FileText },
        { id: 'replies', label: 'Replies', count: summary.replies, icon: Reply },
    ];

    return (
        <div className="min-h-screen bg-black dark:bg-black flex" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            <HomeFeedSidebar />
            <div className="flex-1 ml-16">
                <div className="max-w-4xl mx-auto px-6 py-12">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-white text-2xl font-semibold tracking-tight flex items-center gap-3">
                                Notifications
                                <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] uppercase tracking-widest text-white/50 font-medium">
                                    AI
                                </span>
                            </h1>
                            <p className="text-white/40 text-sm mt-1">Security alerts, codes, documents & replies</p>
                        </div>
                        <button
                            onClick={() => fetchNotifications(true)}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-sm text-white/70 hover:text-white transition-all"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Analyzing...' : 'Refresh'}
                        </button>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex items-center gap-1 mb-8 p-1 bg-white/5 rounded-xl border border-white/10">
                        {categories.map((cat) => {
                            const Icon = cat.icon;
                            const isActive = activeCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id as NotificationCategory)}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-white text-black' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{cat.label}</span>
                                    {cat.count > 0 && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${isActive ? 'bg-black/10' : 'bg-white/10'}`}>
                                            {cat.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="py-24 text-center space-y-6">
                            <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
                                <Loader2 className="w-6 h-6 text-white/60 animate-spin" />
                            </div>
                            <div>
                                <p className="text-white font-medium">Analyzing inbox...</p>
                                <p className="text-white/40 text-sm mt-1">Scanning for threats, codes & documents</p>
                            </div>
                        </div>
                    )}

                    {/* Auth Error */}
                    {!isLoading && authError && (
                        <div className="py-16 text-center space-y-6 border border-white/10 rounded-2xl bg-white/5">
                            <ShieldAlert className="w-10 h-10 text-white/40 mx-auto" />
                            <div>
                                <p className="text-white font-medium">Session Expired</p>
                                <p className="text-white/40 text-sm mt-1 max-w-sm mx-auto">Please sign out and sign back in to restore functionality.</p>
                            </div>
                            <button
                                onClick={async () => { await signOut({ redirect: false }); router.push('/'); }}
                                className="px-5 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-white/90 transition-all"
                            >
                                Sign Out & Re-authenticate
                            </button>
                        </div>
                    )}

                    {/* Notifications */}
                    {!isLoading && !authError && (
                        <div className="space-y-3">
                            {filteredNotifications.length > 0 ? (
                                filteredNotifications.map((notification) => (
                                    <NotificationCard
                                        key={notification.id}
                                        notification={notification}
                                        onCopyCode={copyCode}
                                        copiedCode={copiedCode}
                                        formatTime={formatTime}
                                        onViewEmail={handleViewEmail}
                                        onAddNote={handleAddNote}
                                        router={router}
                                    />
                                ))
                            ) : (
                                <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl">
                                    <Bell className="w-8 h-8 text-white/20 mx-auto mb-4" />
                                    <p className="text-white/60 font-medium">No notifications</p>
                                    <p className="text-white/30 text-sm mt-1">You're all caught up!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Email Detail Modal */}
            <EmailDetailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                emailId={selectedEmailId}
                onAddNote={handleAddNote}
            />

            {/* Note Editor Modal */}
            <NoteEditorModal
                isOpen={showNoteEditor}
                onClose={() => setShowNoteEditor(false)}
                subject={noteSubject}
                content={noteContent}
                setContent={setNoteContent}
                isGenerating={isGeneratingNote}
                isSaving={isSavingNote}
                onSave={handleSaveNote}
            />
        </div>
    );
}

// Notification Card
function NotificationCard({
    notification, onCopyCode, copiedCode, formatTime, onViewEmail, onAddNote, router
}: {
    notification: SmartNotification;
    onCopyCode: (code: string) => void;
    copiedCode: string | null;
    formatTime: (timestamp: string) => string;
    onViewEmail: (emailId: string) => void;
    onAddNote: (emailId: string, subject: string, snippet: string, type: string, filename?: string) => void;
    router: ReturnType<typeof useRouter>;
}) {
    // Shared "View Email" button UI
    const ViewEmailButton = () => (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onViewEmail(notification.emailId);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/60 hover:text-white transition-all"
        >
            <Eye className="w-3.5 h-3.5" />
            View Email
        </button>
    );

    // Threat
    if (notification.type === 'threat') {
        const severityStyles: Record<string, string> = {
            critical: 'text-red-400 bg-red-500/10 border-red-500/20',
            high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
            medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
            low: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
        };
        return (
            <div className="p-5 bg-white/[0.02] border border-white/10 hover:border-white/20 rounded-2xl transition-all group">
                <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <ShieldX className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <h3 className="text-white font-medium">{notification.title}</h3>
                                <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider border rounded-md ${severityStyles[notification.severity]}`}>
                                    {notification.severity}
                                </span>
                            </div>
                            <span className="text-white/30 text-xs">{formatTime(notification.timestamp)}</span>
                        </div>
                        <p className="text-white/50 text-sm mb-3">{notification.description}</p>
                        <div className="flex items-center justify-between">
                            <p className="text-white/30 text-xs truncate max-w-[200px]">From: {notification.from}</p>
                            <ViewEmailButton />
                        </div>
                        {notification.indicators.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {notification.indicators.map((ind, i) => (
                                    <span key={i} className="px-2 py-1 bg-red-500/5 text-red-400/80 border border-red-500/10 rounded-lg text-xs">
                                        {ind.replace('_', ' ')}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Verification Code
    if (notification.type === 'verification') {
        const isCopied = copiedCode === notification.code;
        return (
            <div className="p-5 bg-white/[0.02] border border-white/10 hover:border-white/20 rounded-2xl transition-all">
                <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                        <Key className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-white font-medium">{notification.platform} Code</h3>
                            <span className="text-white/30 text-xs">{formatTime(notification.timestamp)}</span>
                        </div>
                        <p className="text-white/50 text-sm mb-4">{notification.description}</p>
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => onCopyCode(notification.code)}
                                className="flex items-center gap-3 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all group"
                            >
                                <Lock className="w-4 h-4 text-white/40" />
                                <span className="text-2xl font-mono font-bold text-white tracking-[0.2em]">{notification.code}</span>
                                {isCopied ? <CheckCircle2 className="w-4 h-4 text-green-400 ml-2" /> : <Copy className="w-4 h-4 text-white/30 group-hover:text-white/60 ml-2" />}
                            </button>
                            <ViewEmailButton />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Document
    if (notification.type === 'document') {
        const icons: Record<string, React.ReactNode> = {
            invoice: <Receipt className="w-5 h-5" />,
            payment: <FileSpreadsheet className="w-5 h-5" />,
            contract: <FileSignature className="w-5 h-5" />,
            report: <FileText className="w-5 h-5" />,
            other: <FileIcon className="w-5 h-5" />
        };
        return (
            <div className="p-5 bg-white/[0.02] border border-white/10 hover:border-white/20 rounded-2xl transition-all">
                <div className="flex items-start gap-4">
                    <div className={`p-2.5 border rounded-xl ${notification.isImportant ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-white/5 border-white/10 text-white/50'}`}>
                        {icons[notification.category] || icons.other}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <h3 className="text-white font-medium">{notification.title}</h3>
                                {notification.isImportant && <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md text-[10px] uppercase tracking-wider">Important</span>}
                                <span className="px-2 py-0.5 bg-white/5 text-white/40 rounded-md text-xs capitalize">{notification.category}</span>
                            </div>
                            <span className="text-white/30 text-xs">{formatTime(notification.timestamp)}</span>
                        </div>
                        <p className="text-white/50 text-sm mb-3">{notification.description}</p>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-white/30 text-xs">From: {notification.from}</p>
                            <ViewEmailButton />
                        </div>
                        {notification.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {notification.attachments.map((att, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                        <a
                                            href={`/api/attachments/download?messageId=${notification.emailId}&attachmentId=${att.attachmentId}&filename=${encodeURIComponent(att.filename)}`}
                                            download={att.filename}
                                            onClick={(e) => { e.stopPropagation(); toast.success('Downloading...', { description: att.filename }); }}
                                            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition-all"
                                        >
                                            <FileIcon className="w-3.5 h-3.5 text-white/40" />
                                            <span className="text-sm text-white/70 max-w-[100px] truncate">{att.filename}</span>
                                            <span className="text-xs text-white/30">{(att.size / 1024).toFixed(0)}KB</span>
                                            <Download className="w-3.5 h-3.5 text-white/30" />
                                        </a>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddNote(notification.emailId, notification.title, notification.description, 'document', att.filename);
                                            }}
                                            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-white/30 hover:text-white transition-all shadow-sm group/note"
                                            title="Add to Note"
                                        >
                                            <FilePlus className="w-3.5 h-3.5 group-hover/note:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Reply
    if (notification.type === 'reply') {
        return (
            <div
                className="p-5 bg-white/[0.02] border border-white/10 hover:border-white/20 rounded-2xl transition-all group"
            >
                <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                        <Reply className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-white font-medium">{notification.title}</h3>
                            <span className="text-white/30 text-xs">{formatTime(notification.timestamp)}</span>
                        </div>
                        <p className="text-white/50 text-sm mb-3">{notification.description}</p>
                        <div className="flex items-center gap-2 mb-3">
                            <Mail className="w-3 h-3 text-white/30" />
                            <span className="text-xs text-white/40 truncate">{notification.subject}</span>
                        </div>
                        <p className="text-white/30 text-sm line-clamp-2 mb-4">{notification.preview}</p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => router.push(`/home-feed?email=${notification.emailId}`)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg text-xs text-green-400 transition-all font-medium"
                            >
                                Open in Thread
                            </button>
                            <ViewEmailButton />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

// ------------------------------------------------------------------------------------------------
// Email Detail Modal Component
// ------------------------------------------------------------------------------------------------
function EmailDetailModal({
    isOpen,
    onClose,
    emailId,
    onAddNote
}: {
    isOpen: boolean;
    onClose: () => void;
    emailId: string | null;
    onAddNote: (emailId: string, subject: string, snippet: string, type: string, filename?: string) => void;
}) {
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && emailId) {
            setLoading(true);
            setError(null);
            fetch(`/api/gmail/messages/${emailId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.error) throw new Error(data.error);
                    setEmail(data);
                })
                .catch(err => {
                    console.error('Error fetching email detail:', err);
                    setError(err.message);
                })
                .finally(() => setLoading(false));
        }
    }, [isOpen, emailId]);

    // Close on escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 md:p-10">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div
                ref={modalRef}
                className="relative w-full max-w-4xl max-h-[90vh] bg-black border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
            >
                {/* Header Area */}
                <div className="p-8 border-b border-white/5 flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-10">
                        {loading ? (
                            <div className="space-y-3">
                                <div className="h-7 w-2/3 bg-white/5 rounded-lg animate-pulse" />
                                <div className="h-4 w-1/3 bg-white/5 rounded-lg animate-pulse" />
                            </div>
                        ) : error ? (
                            <h2 className="text-red-400 font-medium tracking-tight">Failed to load email</h2>
                        ) : (
                            <div className="space-y-4">
                                <h2 className="text-2xl font-semibold text-white tracking-tight leading-tight">
                                    {email?.subject || '(No Subject)'}
                                </h2>
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full">
                                        <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                                            <User className="w-3.5 h-3.5 text-white/60" />
                                        </div>
                                        <span className="text-sm text-white/70 font-medium">
                                            {email?.from?.split('<')[0]?.trim() || 'Sender'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-white/30">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-sm">
                                            {email?.date ? new Date(email.date).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' }) : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-full text-white/40 hover:text-white transition-all shadow-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 sm:p-10 custom-scrollbar">
                    {loading ? (
                        <div className="space-y-6">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-4 bg-white/5 rounded animate-pulse w-full" style={{ width: `${100 - (i * 10)}%` }} />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="py-20 text-center space-y-4 text-white/40">
                            <AlertTriangle className="w-12 h-12 mx-auto opacity-20" />
                            <p className="max-w-xs mx-auto text-sm">{error}</p>
                            <button
                                onClick={onClose}
                                className="px-5 py-2 bg-white/10 text-white rounded-full text-sm font-medium"
                            >
                                Go Back
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {/* Body Content */}
                            <div className="prose prose-invert max-w-none email-content">
                                {email?.isHtml ? (
                                    <div
                                        className="text-white/80 leading-relaxed overflow-x-auto whitespace-pre-wrap font-sans transition-all"
                                        dangerouslySetInnerHTML={{ __html: cleanHtml(email.body) }}
                                    />
                                ) : (
                                    <div
                                        className="text-white/80 leading-relaxed whitespace-pre-wrap font-sans text-lg"
                                        dangerouslySetInnerHTML={{ __html: linkify(email.body) }}
                                    />
                                )}
                            </div>

                            {/* Image Attachments */}
                            {email?.attachments?.some((att: any) => att.mimeType.startsWith('image/')) && (
                                <div className="space-y-4 pt-12 border-t border-white/5">
                                    <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">
                                        <Sparkles className="w-3 h-3" />
                                        Visual Assets
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        {email.attachments.filter((att: any) => att.mimeType.startsWith('image/')).map((img: any, i: number) => (
                                            <div key={i} className="group relative aspect-[16/10] bg-white/[0.02] border border-white/10 rounded-[2rem] overflow-hidden">
                                                <img
                                                    src={`/api/attachments/download?messageId=${emailId}&attachmentId=${img.attachmentId}&filename=${encodeURIComponent(img.filename)}`}
                                                    alt={img.filename}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
                                                    <p className="text-white text-sm font-semibold truncate mb-3">{img.filename}</p>
                                                    <div className="flex items-center gap-3 pr-2">
                                                        <a
                                                            href={`/api/attachments/download?messageId=${emailId}&attachmentId=${img.attachmentId}&filename=${encodeURIComponent(img.filename)}`}
                                                            download={img.filename}
                                                            className="flex items-center gap-2 text-xs text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full transition-all"
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                            Download
                                                        </a>
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddNote(emailId as string, email?.subject || 'Attachment', email?.snippet || '', 'document', img.filename); }}
                                                            className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all shadow-lg"
                                                            title="Add to Note"
                                                        >
                                                            <FilePlus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Other Documents */}
                            {email?.attachments?.some((att: any) => !att.mimeType.startsWith('image/')) && (
                                <div className="space-y-4 pt-12 border-t border-white/5">
                                    <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold">
                                        <FileText className="w-3.5 h-3.5" />
                                        Documents
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {email.attachments.filter((att: any) => !att.mimeType.startsWith('image/')).map((doc: any, i: number) => (
                                            <a
                                                key={i}
                                                href={`/api/attachments/download?messageId=${emailId}&attachmentId=${doc.attachmentId}&filename=${encodeURIComponent(doc.filename)}`}
                                                download={doc.filename}
                                                className="flex items-center gap-4 p-5 bg-white/[0.02] border border-white/10 hover:border-white/20 rounded-3xl transition-all group"
                                            >
                                                <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-white/10 transition-colors">
                                                    <FileIcon className="w-5 h-5 text-white/60" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm font-semibold truncate">{doc.filename}</p>
                                                    <p className="text-white/30 text-[10px] uppercase tracking-wider mt-0.5">{(doc.size / 1024).toFixed(0)} KB</p>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-20 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddNote(emailId as string, email?.subject || 'Attachment', email?.snippet || '', 'document', doc.filename); }}
                                                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-all"
                                                        title="Add to Note"
                                                    >
                                                        <FilePlus className="w-4 h-4" />
                                                    </button>
                                                    <Download className="w-4 h-4 text-white/20 group-hover:text-white transition-all transform group-hover:-translate-y-0.5" />
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Area */}
                {!loading && !error && (
                    <div className="p-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-medium text-white/60 transition-all hover:text-white"
                        >
                            Close Viewer
                        </button>
                        <button
                            onClick={() => {
                                window.open(`https://mail.google.com/mail/u/0/#inbox/${emailId}`, '_blank');
                            }}
                            className="flex items-center gap-3 px-8 py-3 bg-white text-black hover:bg-neutral-200 rounded-2xl text-sm font-bold transition-all shadow-2xl active:scale-95 hover:shadow-white/5"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Open in Gmail
                        </button>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                .email-content a {
                    color: #fff !important;
                    text-decoration: underline !important;
                    text-underline-offset: 4px;
                    opacity: 0.8;
                    transition: opacity 0.2s;
                    font-weight: 500;
                }
                .email-content a:hover {
                    opacity: 1;
                }
                .email-content img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 1.5rem;
                    border: 1px solid rgba(255,255,255,0.1);
                }
            `}</style>
        </div>
    );
}

/**
 * Clean HTML for embedding
 */
function cleanHtml(html: string) {
    if (!html) return '';
    // Ensure all links target blank and have security attributes
    return html.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
}

/**
 * Detect and wrap URLs in plain text
 */
function linkify(text: string) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
}

// ------------------------------------------------------------------------------------------------
// Note Editor Modal
// ------------------------------------------------------------------------------------------------
function NoteEditorModal({
    isOpen, onClose, subject, content, setContent, isGenerating, isSaving, onSave
}: {
    isOpen: boolean; onClose: () => void; subject: string; content: string;
    setContent: (c: string) => void; isGenerating: boolean; isSaving: boolean; onSave: () => void;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-xl text-white/40">
                            <StickyNote className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold">New Personal Note</h3>
                            <p className="text-white/30 text-xs truncate max-w-[200px]">{subject}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/40"><X className="w-4 h-4" /></button>
                </div>

                <div className="p-8 flex-1">
                    {isGenerating ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <Sparkles className="w-6 h-6 text-white/40 animate-pulse" />
                            <p className="text-white/40 text-sm font-medium">AI is crafting your personal notes...</p>
                        </div>
                    ) : (
                        <div className="space-y-4 h-full flex flex-col">
                            <div className="flex items-center gap-2 text-white/20 text-[10px] uppercase tracking-wider font-bold mb-1">
                                <Pencil className="w-3 h-3" />
                                Edit content
                            </div>
                            <textarea
                                autoFocus
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Start writing your thoughts..."
                                className="w-full h-64 bg-transparent border-none focus:ring-0 text-white/80 placeholder:text-white/10 resize-none font-sans leading-relaxed text-lg"
                            />
                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <p className="text-white/20 text-[10px] italic">Will be saved to personal notes with dynamic access.</p>
                    <button
                        onClick={onSave}
                        disabled={isSaving || isGenerating || !content}
                        className="flex items-center gap-2 px-8 py-3 bg-white text-black hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-sm font-bold transition-all shadow-xl"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Save Research
                    </button>
                </div>
            </div>
        </div>
    );
}
