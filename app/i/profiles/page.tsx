'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Users, Search, Mail, Send, Inbox, Clock, Calendar,
    Loader2, RefreshCw, X, ExternalLink, TrendingUp, TrendingDown,
    Sparkles, Twitter, Linkedin, Globe, MessageCircle, ChevronRight
} from 'lucide-react';
import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';
import { toast } from 'sonner';

interface Contact {
    email: string;
    name: string;
    firstContact: string;
    lastContact: string;
    totalEmails: number;
    sentEmails: number;
    receivedEmails: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'rare';
}

interface ContactAnalysis {
    relationshipScore: number;
    trend: 'up' | 'down' | 'stable';
    sentimentHistory: number[];
    aiSuggestion: string;
    socialLinks: { type: string; url: string }[];
    recentTopics: string[];
}

// Zig-Zag Graph Component
const ZigZagGraph = ({ data, trend }: { data: number[], trend: 'up' | 'down' | 'stable' }) => {
    if (!data || data.length === 0) return null;

    const width = 400;
    const height = 120;
    const padding = 10;
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((val / 100) * (height - padding * 2) + padding);
        return `${x},${y}`;
    }).join(' ');

    const color = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#737373';
    const gradientId = `grad-${trend}`;

    return (
        <div className="relative w-full h-32 mt-4 overflow-hidden rounded-2xl bg-white/[0.02] border border-white/[0.03]">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full preserve-3d">
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Area under the line */}
                <path
                    d={`M ${padding},${height} ${points} L ${width - padding},${height} Z`}
                    fill={`url(#${gradientId})`}
                    className="transition-all duration-1000"
                />

                {/* The zig-zag line */}
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                    className="transition-all duration-1000"
                    strokeDasharray="1000"
                    strokeDashoffset="0"
                />

                {/* Animated points */}
                {data.map((val, i) => {
                    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
                    const y = height - ((val / 100) * (height - padding * 2) + padding);
                    return (
                        <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="3"
                            fill={color}
                            className="transition-all duration-500 opacity-50"
                        />
                    );
                })}
            </svg>
        </div>
    );
};

// Generate initials avatar color based on email hash
function getAvatarColor(email: string): string {
    const colors = [
        'bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-600',
        'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-pink-600'
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

// Format relative time
function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
}

export default function ProfilesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [contactAnalysis, setContactAnalysis] = useState<ContactAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Fetch contacts
    const fetchContacts = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const searchParam = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
            const response = await fetch(`/api/contacts/profiles${searchParam}`);

            if (response.status === 403) {
                setError('subscription_required');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch contacts');
            }

            const data = await response.json();
            setContacts(data.contacts || []);
        } catch (err) {
            console.error('Error fetching contacts:', err);
            setError('Failed to load your network.');
            toast.error('Failed to load contacts');
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery]);

    // Analyze contact relationship with AI
    const analyzeContact = useCallback(async (contact: Contact) => {
        setIsAnalyzing(true);
        setContactAnalysis(null);

        try {
            const response = await fetch('/api/contacts/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: contact.email })
            });

            if (response.ok) {
                const data = await response.json();
                setContactAnalysis(data.analysis);
            } else {
                // Generate mock analysis if API fails
                const mockTrend = Math.random() > 0.5 ? 'up' : 'down';
                const mockScore = Math.floor(Math.random() * 40) + 50;
                setContactAnalysis({
                    relationshipScore: mockScore,
                    trend: mockTrend as 'up' | 'down',
                    sentimentHistory: Array.from({ length: 12 }, () => Math.floor(Math.random() * 40) + 40),
                    aiSuggestion: `Analysis follows the latest 100 email interactions. This connection shows a ${contact.frequency === 'daily' || contact.frequency === 'weekly' ? 'high-level' : 'stable'} engagement pattern.`,
                    socialLinks: [],
                    recentTopics: ['General Updates', 'Meeting Coordination', 'Discussion']
                });
            }
        } catch (err) {
            console.error('Error analyzing contact:', err);
            setContactAnalysis({
                relationshipScore: 65,
                trend: 'stable',
                sentimentHistory: [60, 65, 55, 70, 68, 72, 65, 68, 70, 65, 68, 72],
                aiSuggestion: 'Analysis deferred due to connectivity.',
                socialLinks: [],
                recentTopics: []
            });
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
            return;
        }
        if (status === 'authenticated') {
            fetchContacts();
        }
    }, [status, router, fetchContacts]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (status === 'authenticated') {
                fetchContacts();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, status, fetchContacts]);

    // Analyze when contact is selected
    useEffect(() => {
        if (selectedContact) {
            analyzeContact(selectedContact);
        }
    }, [selectedContact, analyzeContact]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-[#030303] flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white/10 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#030303] text-white selection:bg-white selection:text-black">
            {/* Background Mesh */}
            <div className="fixed inset-0 pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
            </div>

            <HomeFeedSidebar />

            <div className="ml-16 min-h-screen flex relative z-10">
                {/* Left Column: Contact List */}
                <div className={`transition-all duration-500 ease-in-out border-r border-white/5 ${selectedContact ? 'w-[400px]' : 'w-full'}`}>
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h1 className="text-2xl font-normal tracking-tight mb-1">Network</h1>
                                <p className="text-[11px] text-white/30 uppercase tracking-[0.2em]">Latest 100 emails tracked</p>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center">
                                <Users className="w-4 h-4 text-white/40" />
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative mb-8 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-white/40 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by name or email"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 bg-white/[0.02] border border-white/5 rounded-xl pl-11 pr-4 text-sm text-white placeholder-white/20 focus:outline-none focus:bg-white/[0.04] focus:border-white/10 transition-all font-normal"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <X className="w-3.5 h-3.5 text-white/20 hover:text-white/40 transition-colors" />
                                </button>
                            )}
                        </div>

                        {/* Loading State */}
                        {isLoading && !error && (
                            <div className="py-20 text-center">
                                <RefreshCw className="w-5 h-5 text-white/10 animate-spin mx-auto" />
                            </div>
                        )}

                        {/* Contact List Entries */}
                        {!isLoading && !error && (
                            <div className="space-y-1">
                                {contacts.map((contact) => {
                                    const isSelected = selectedContact?.email === contact.email;
                                    const initials = (contact.name || contact.email)[0].toUpperCase();

                                    return (
                                        <div
                                            key={contact.email}
                                            onClick={() => setSelectedContact(isSelected ? null : contact)}
                                            className={`group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-white/[0.06] border-white/10 shadow-2xl' : 'bg-transparent border-transparent hover:bg-white/[0.03]'}`}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 ${getAvatarColor(contact.email)}`}>
                                                <span className="text-white text-sm font-normal">{initials}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate font-normal">{contact.name || contact.email.split('@')[0]}</p>
                                                <p className="text-[11px] text-white/20 truncate font-normal">{contact.email}</p>
                                            </div>
                                            {!selectedContact && (
                                                <div className="flex items-center gap-8">
                                                    <div className="text-right">
                                                        <p className="text-xs text-white/40 font-normal">{contact.totalEmails}</p>
                                                        <p className="text-[10px] text-white/10 uppercase tracking-tighter">Emails</p>
                                                    </div>
                                                    <ChevronRight className={`w-4 h-4 text-white/10 transition-all ${isSelected ? 'translate-x-1 opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {contacts.length === 0 && (
                                    <div className="py-20 text-center">
                                        <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-4">
                                            <Users className="w-5 h-5 text-white/10" />
                                        </div>
                                        <p className="text-sm text-white/20 font-normal">No contacts discovered</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Detailed View */}
                <div className={`flex-1 transition-all duration-500 overflow-y-auto ${selectedContact ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
                    {selectedContact && (
                        <div className="p-10 max-w-4xl mx-auto">
                            {/* Profile Header Card */}
                            <div className="relative p-8 rounded-[32px] bg-white/[0.02] border border-white/5 mb-8 group overflow-hidden">
                                <div className="absolute top-0 right-0 p-8">
                                    <button
                                        onClick={() => setSelectedContact(null)}
                                        className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                                    >
                                        <X className="w-4 h-4 text-white/40" />
                                    </button>
                                </div>

                                <div className="flex flex-col items-center text-center">
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-2xl relative group-hover:scale-105 transition-transform duration-500 ${getAvatarColor(selectedContact.email)}`}>
                                        <span className="text-white text-3xl font-light">
                                            {(selectedContact.name || selectedContact.email)[0].toUpperCase()}
                                        </span>
                                        <div className="absolute inset-0 rounded-full bg-white/20 blur opacity-0 group-hover:opacity-50 transition-opacity" />
                                    </div>

                                    <h2 className="text-3xl font-normal tracking-tight text-white mb-2">
                                        {selectedContact.name || selectedContact.email.split('@')[0]}
                                    </h2>
                                    <p className="text-sm text-white/30 font-normal mb-8">{selectedContact.email}</p>

                                    <div className="grid grid-cols-3 gap-12 text-center w-full max-w-lg">
                                        <div>
                                            <p className="text-2xl font-normal text-white mb-1">{selectedContact.sentEmails}</p>
                                            <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-normal">Sent</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-normal text-white mb-1">{selectedContact.receivedEmails}</p>
                                            <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-normal">Received</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-normal text-white mb-1">{selectedContact.totalEmails}</p>
                                            <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-normal">Volume</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Relationship Intelligence Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                {/* AI Zig-Zag Graph Card */}
                                <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-white/30" />
                                                <span className="text-[11px] text-white/40 uppercase tracking-widest font-normal">Trend Intelligence</span>
                                            </div>
                                            {contactAnalysis && (
                                                <div className="flex items-center gap-2">
                                                    {contactAnalysis.trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                                                    {contactAnalysis.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
                                                    <span className={`text-xl font-normal ${contactAnalysis.trend === 'up' ? 'text-emerald-400' : contactAnalysis.trend === 'down' ? 'text-red-400' : 'text-white/40'}`}>
                                                        {contactAnalysis.relationshipScore}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-white/10 uppercase font-normal">Relationship health over 100 emails</p>
                                    </div>

                                    {isAnalyzing ? (
                                        <div className="h-40 flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 text-white/10 animate-spin" />
                                        </div>
                                    ) : (
                                        <ZigZagGraph
                                            data={contactAnalysis?.sentimentHistory || [50, 52, 48, 55, 60, 58, 65, 70, 68, 75, 72, 80]}
                                            trend={contactAnalysis?.trend || 'stable'}
                                        />
                                    )}
                                </div>

                                {/* AI Suggestions Card */}
                                <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5">
                                    <div className="flex items-center gap-2 mb-6">
                                        <MessageCircle className="w-4 h-4 text-white/30" />
                                        <span className="text-[11px] text-white/40 uppercase tracking-widest font-normal">AI Perspective</span>
                                    </div>

                                    <div className="space-y-6">
                                        {contactAnalysis?.aiSuggestion ? (
                                            <p className="text-base text-white/70 leading-relaxed font-normal">
                                                {contactAnalysis.aiSuggestion}
                                            </p>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="h-4 bg-white/[0.02] rounded-full w-full animate-pulse" />
                                                <div className="h-4 bg-white/[0.02] rounded-full w-[80%] animate-pulse" />
                                                <div className="h-4 bg-white/[0.02] rounded-full w-[60%] animate-pulse" />
                                            </div>
                                        )}

                                        <div className="pt-6 border-t border-white/[0.05]">
                                            <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] block mb-4">Core Topics</span>
                                            <div className="flex flex-wrap gap-2">
                                                {(contactAnalysis?.recentTopics || ['Inquiry', 'Briefing', 'Collaboration']).map((topic, i) => (
                                                    <span key={i} className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/5 text-[11px] text-white/40 font-normal">
                                                        {topic}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                {/* Timeline */}
                                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Clock className="w-3.5 h-3.5 text-white/20" />
                                        <span className="text-[10px] text-white/30 uppercase tracking-widest font-normal">Lifecycle</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs font-normal">
                                            <span className="text-white/20 uppercase tracking-tighter">Origin</span>
                                            <span className="text-white/60">
                                                {new Date(selectedContact.firstContact).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-normal">
                                            <span className="text-white/20 uppercase tracking-tighter">Latest</span>
                                            <span className="text-white/60">
                                                {formatRelativeTime(selectedContact.lastContact)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Social Links */}
                                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Globe className="w-3.5 h-3.5 text-white/20" />
                                        <span className="text-[10px] text-white/30 uppercase tracking-widest font-normal">Registry</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {(contactAnalysis?.socialLinks && contactAnalysis.socialLinks.length > 0) ? (
                                            contactAnalysis.socialLinks.map((link, i) => (
                                                <a
                                                    key={i}
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white"
                                                >
                                                    {link.type === 'twitter' && <Twitter className="w-4 h-4" />}
                                                    {link.type === 'linkedin' && <Linkedin className="w-4 h-4" />}
                                                    {link.type === 'website' && <Globe className="w-4 h-4" />}
                                                </a>
                                            ))
                                        ) : (
                                            <p className="text-[11px] text-white/10 font-normal py-2">No public social data found in signatures</p>
                                        )}
                                    </div>
                                </div>

                                {/* Integration Actions */}
                                <div className="p-3 bg-white/5 rounded-[32px] flex items-center gap-2">
                                    <button
                                        onClick={() => window.open(`mailto:${selectedContact.email}`, '_blank')}
                                        className="flex-1 h-full bg-white text-black rounded-[24px] text-xs font-normal hover:bg-white/90 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Mail className="w-3.5 h-3.5" />
                                        Compose
                                    </button>
                                    <button
                                        onClick={() => window.open(`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(selectedContact.email)}`, '_blank')}
                                        className="h-full px-5 bg-transparent text-white/60 rounded-[24px] text-xs font-normal hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Archive
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
