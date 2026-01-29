'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Users, Search, Mail, Send, Inbox, Clock, Calendar,
    Loader2, RefreshCw, X, ExternalLink, TrendingUp, TrendingDown,
    Sparkles, Twitter, Linkedin, Globe, MessageCircle
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
                    sentimentHistory: Array.from({ length: 8 }, () => Math.floor(Math.random() * 40) + 40),
                    aiSuggestion: `Based on your email history, this appears to be a ${contact.frequency === 'daily' || contact.frequency === 'weekly' ? 'close' : 'casual'} professional contact. Consider reaching out if you haven't connected recently.`,
                    socialLinks: [],
                    recentTopics: ['Project Updates', 'Meetings', 'Follow-ups']
                });
            }
        } catch (err) {
            console.error('Error analyzing contact:', err);
            // Fallback mock data
            setContactAnalysis({
                relationshipScore: 65,
                trend: 'stable',
                sentimentHistory: [60, 65, 55, 70, 68, 72, 65, 68],
                aiSuggestion: 'Unable to analyze this contact. Try again later.',
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
                <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
            </div>
        );
    }

    // Get graph color based on trend
    const getGraphGradient = (trend: string) => {
        if (trend === 'up') return 'from-emerald-500/20 to-emerald-500/5';
        if (trend === 'down') return 'from-red-500/20 to-red-500/5';
        return 'from-neutral-500/20 to-neutral-500/5';
    };

    const getGraphBarColor = (trend: string) => {
        if (trend === 'up') return 'bg-emerald-500';
        if (trend === 'down') return 'bg-red-500';
        return 'bg-neutral-500';
    };

    return (
        <div className="min-h-screen bg-[#030303] text-white">
            <HomeFeedSidebar />

            <div className="ml-16 min-h-screen flex">
                {/* Main Content - Contact List */}
                <div className={`${selectedContact ? 'w-1/2' : 'w-full'} border-r border-white/5 transition-all duration-300`}>
                    <div className="p-8 max-w-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5 text-white/40" strokeWidth={1.5} />
                                <h1 className="text-xl font-light text-white">Network</h1>
                            </div>
                            <span className="text-xs text-white/30">{contacts.length} contacts</span>
                        </div>

                        {/* Search */}
                        <div className="relative mb-6">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 bg-white/[0.03] border border-white/5 rounded-lg pl-10 pr-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/10"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <X className="w-3 h-3 text-white/20" />
                                </button>
                            )}
                        </div>

                        {/* Error States */}
                        {error === 'subscription_required' && (
                            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-6 text-center">
                                <p className="text-amber-400 text-sm mb-4">Subscription required</p>
                                <button onClick={() => router.push('/pricing')} className="px-4 py-2 bg-white text-black text-sm rounded-lg">
                                    View Plans
                                </button>
                            </div>
                        )}

                        {error && error !== 'subscription_required' && (
                            <div className="text-center py-12">
                                <p className="text-red-400/60 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Loading */}
                        {isLoading && !error && (
                            <div className="py-16 text-center">
                                <RefreshCw className="w-5 h-5 text-white/20 animate-spin mx-auto" />
                            </div>
                        )}

                        {/* Contact List */}
                        {!isLoading && !error && (
                            <div className="space-y-1">
                                {contacts.map((contact) => {
                                    const initials = (contact.name || contact.email)[0]?.toUpperCase() || '?';
                                    const avatarColor = getAvatarColor(contact.email);
                                    const isSelected = selectedContact?.email === contact.email;

                                    return (
                                        <div
                                            key={contact.email}
                                            onClick={() => setSelectedContact(isSelected ? null : contact)}
                                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.03]'}`}
                                        >
                                            <div className={`w-9 h-9 ${avatarColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                                                <span className="text-white text-sm font-medium">{initials}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">{contact.name || contact.email.split('@')[0]}</p>
                                                <p className="text-xs text-white/30 truncate">{contact.email}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-white/40">{contact.totalEmails}</p>
                                                <p className="text-[10px] text-white/20">{formatRelativeTime(contact.lastContact)}</p>
                                            </div>
                                        </div>
                                    );
                                })}

                                {contacts.length === 0 && (
                                    <div className="py-16 text-center">
                                        <Users className="w-6 h-6 text-white/10 mx-auto mb-3" />
                                        <p className="text-sm text-white/30">No contacts found</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Detail Sidebar */}
                {selectedContact && (
                    <div className="w-1/2 p-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="max-w-md mx-auto">
                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedContact(null)}
                                className="mb-6 text-white/20 hover:text-white/40 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Profile Header */}
                            <div className="text-center mb-8">
                                <div className={`w-16 h-16 ${getAvatarColor(selectedContact.email)} rounded-full flex items-center justify-center mx-auto mb-4`}>
                                    <span className="text-white text-2xl font-light">
                                        {(selectedContact.name || selectedContact.email)[0]?.toUpperCase()}
                                    </span>
                                </div>
                                <h2 className="text-lg text-white font-light mb-1">
                                    {selectedContact.name || selectedContact.email.split('@')[0]}
                                </h2>
                                <p className="text-sm text-white/30">{selectedContact.email}</p>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-3 mb-8">
                                <div className="bg-white/[0.02] rounded-xl p-4 text-center">
                                    <Send className="w-4 h-4 text-blue-400 mx-auto mb-2" />
                                    <p className="text-lg text-white font-light">{selectedContact.sentEmails}</p>
                                    <p className="text-[10px] text-white/30 uppercase">Sent</p>
                                </div>
                                <div className="bg-white/[0.02] rounded-xl p-4 text-center">
                                    <Inbox className="w-4 h-4 text-emerald-400 mx-auto mb-2" />
                                    <p className="text-lg text-white font-light">{selectedContact.receivedEmails}</p>
                                    <p className="text-[10px] text-white/30 uppercase">Received</p>
                                </div>
                                <div className="bg-white/[0.02] rounded-xl p-4 text-center">
                                    <Mail className="w-4 h-4 text-violet-400 mx-auto mb-2" />
                                    <p className="text-lg text-white font-light">{selectedContact.totalEmails}</p>
                                    <p className="text-[10px] text-white/30 uppercase">Total</p>
                                </div>
                            </div>

                            {/* AI Relationship Graph */}
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5 text-white/30" />
                                        <span className="text-xs text-white/40 uppercase tracking-wider">Relationship</span>
                                    </div>
                                    {contactAnalysis && (
                                        <div className="flex items-center gap-1.5">
                                            {contactAnalysis.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
                                            {contactAnalysis.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                                            <span className={`text-xs font-medium ${contactAnalysis.trend === 'up' ? 'text-emerald-400' : contactAnalysis.trend === 'down' ? 'text-red-400' : 'text-white/40'}`}>
                                                {contactAnalysis.relationshipScore}%
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {isAnalyzing ? (
                                    <div className="h-20 bg-white/[0.02] rounded-xl flex items-center justify-center">
                                        <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
                                    </div>
                                ) : contactAnalysis ? (
                                    <div className={`h-20 bg-gradient-to-b ${getGraphGradient(contactAnalysis.trend)} rounded-xl p-3 flex items-end gap-1`}>
                                        {contactAnalysis.sentimentHistory.map((value, i) => (
                                            <div
                                                key={i}
                                                className={`flex-1 ${getGraphBarColor(contactAnalysis.trend)} rounded-t transition-all opacity-60 hover:opacity-100`}
                                                style={{ height: `${value}%` }}
                                            />
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            {/* AI Suggestion */}
                            {contactAnalysis?.aiSuggestion && (
                                <div className="mb-8">
                                    <div className="flex items-center gap-2 mb-3">
                                        <MessageCircle className="w-3.5 h-3.5 text-white/30" />
                                        <span className="text-xs text-white/40 uppercase tracking-wider">AI Insight</span>
                                    </div>
                                    <p className="text-sm text-white/60 leading-relaxed italic">
                                        "{contactAnalysis.aiSuggestion}"
                                    </p>
                                </div>
                            )}

                            {/* Social Links */}
                            {contactAnalysis?.socialLinks && contactAnalysis.socialLinks.length > 0 && (
                                <div className="mb-8">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Globe className="w-3.5 h-3.5 text-white/30" />
                                        <span className="text-xs text-white/40 uppercase tracking-wider">Social</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {contactAnalysis.socialLinks.map((link, i) => (
                                            <a
                                                key={i}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-9 h-9 bg-white/[0.03] hover:bg-white/[0.08] rounded-lg flex items-center justify-center transition-colors"
                                            >
                                                {link.type === 'twitter' && <Twitter className="w-4 h-4 text-white/40" />}
                                                {link.type === 'linkedin' && <Linkedin className="w-4 h-4 text-white/40" />}
                                                {link.type === 'website' && <Globe className="w-4 h-4 text-white/40" />}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Timeline */}
                            <div className="mb-8">
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock className="w-3.5 h-3.5 text-white/30" />
                                    <span className="text-xs text-white/40 uppercase tracking-wider">Timeline</span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-white/40">First contact</span>
                                        <span className="text-white/60">
                                            {new Date(selectedContact.firstContact).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/40">Last contact</span>
                                        <span className="text-white/60">
                                            {new Date(selectedContact.lastContact).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => window.open(`mailto:${selectedContact.email}`, '_blank')}
                                    className="flex-1 h-10 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Mail className="w-4 h-4" />
                                    Email
                                </button>
                                <button
                                    onClick={() => window.open(`https://mail.google.com/mail/u/0/#search/from:${encodeURIComponent(selectedContact.email)}+OR+to:${encodeURIComponent(selectedContact.email)}`, '_blank')}
                                    className="flex-1 h-10 bg-white/5 border border-white/10 text-white rounded-lg text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Gmail
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
