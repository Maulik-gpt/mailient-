'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Users, Search, Mail, Send, Inbox, Clock, Calendar,
    ArrowUpRight, Loader2, RefreshCw, ChevronRight, X,
    TrendingUp, TrendingDown, Minus, ExternalLink
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
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

// Get frequency badge styling
function getFrequencyBadge(frequency: string): { label: string; className: string } {
    switch (frequency) {
        case 'daily':
            return { label: 'Frequent', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
        case 'weekly':
            return { label: 'Regular', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
        case 'monthly':
            return { label: 'Occasional', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
        default:
            return { label: 'Rare', className: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20' };
    }
}

export default function ProfilesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

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
            setError('Failed to load your network. Please try again.');
            toast.error('Failed to load contacts');
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery]);

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

    // Calculate stats
    const totalContacts = contacts.length;
    const frequentContacts = contacts.filter(c => c.frequency === 'daily' || c.frequency === 'weekly').length;
    const totalEmails = contacts.reduce((sum, c) => sum + c.totalEmails, 0);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-[#030303] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#030303] text-white">
            {/* Sidebar */}
            <HomeFeedSidebar
                onPeopleClick={() => { }}
                activeView="people"
            />

            {/* Main Content */}
            <div className="ml-16 min-h-screen">
                <div className="max-w-6xl mx-auto px-8 py-12">

                    {/* Header */}
                    <div className="mb-12">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-white/60" strokeWidth={1.5} />
                            </div>
                            <h1 className="text-3xl font-light text-white tracking-tight">
                                Your Network
                            </h1>
                        </div>
                        <p className="text-white/40 font-light ml-14">
                            People you've communicated with via email
                        </p>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 mb-10">
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.03] transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <Users className="w-4 h-4 text-white/30" />
                                <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">Total Contacts</span>
                            </div>
                            <p className="text-3xl font-light text-white">{totalContacts}</p>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.03] transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <TrendingUp className="w-4 h-4 text-white/30" />
                                <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">Frequent</span>
                            </div>
                            <p className="text-3xl font-light text-white">{frequentContacts}</p>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.03] transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <Mail className="w-4 h-4 text-white/30" />
                                <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">Emails Analyzed</span>
                            </div>
                            <p className="text-3xl font-light text-white">{totalEmails}</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-8">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-12 bg-white/[0.02] border border-white/5 rounded-xl pl-11 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-white/10 transition-all font-light"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Error State */}
                    {error === 'subscription_required' && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-8 text-center">
                            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-6 h-6 text-amber-400" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">Subscription Required</h3>
                            <p className="text-white/40 font-light mb-6 max-w-md mx-auto">
                                Access to your network requires an active subscription.
                            </p>
                            <button
                                onClick={() => router.push('/pricing')}
                                className="px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-colors"
                            >
                                View Plans
                            </button>
                        </div>
                    )}

                    {error && error !== 'subscription_required' && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8 text-center">
                            <p className="text-red-400 mb-4">{error}</p>
                            <button
                                onClick={fetchContacts}
                                className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && !error && (
                        <div className="py-24 text-center">
                            <RefreshCw className="w-8 h-8 text-white/20 animate-spin mx-auto mb-4" />
                            <p className="text-white/40 font-light">Loading your network...</p>
                        </div>
                    )}

                    {/* Contacts List */}
                    {!isLoading && !error && contacts.length > 0 && (
                        <div className="space-y-2">
                            {contacts.map((contact) => {
                                const badge = getFrequencyBadge(contact.frequency);
                                const initials = (contact.name || contact.email)[0]?.toUpperCase() || '?';
                                const avatarColor = getAvatarColor(contact.email);

                                return (
                                    <div
                                        key={contact.email}
                                        onClick={() => setSelectedContact(selectedContact?.email === contact.email ? null : contact)}
                                        className={`group bg-white/[0.01] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.03] hover:border-white/10 transition-all cursor-pointer ${selectedContact?.email === contact.email ? 'bg-white/[0.04] border-white/10' : ''}`}
                                    >
                                        <div className="flex items-center gap-5">
                                            {/* Avatar - Initials only, no fake images */}
                                            <div className={`w-12 h-12 ${avatarColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                                                <span className="text-white font-medium text-lg">{initials}</span>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-white font-medium truncate">
                                                        {contact.name || contact.email.split('@')[0]}
                                                    </h3>
                                                    <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full border ${badge.className}`}>
                                                        {badge.label}
                                                    </span>
                                                </div>
                                                <p className="text-white/40 text-sm font-light truncate">
                                                    {contact.email}
                                                </p>
                                            </div>

                                            {/* Stats */}
                                            <div className="flex items-center gap-8 text-right">
                                                <div>
                                                    <p className="text-white/80 font-medium">{contact.totalEmails}</p>
                                                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Emails</p>
                                                </div>
                                                <div>
                                                    <p className="text-white/60 font-light text-sm">
                                                        {formatRelativeTime(contact.lastContact)}
                                                    </p>
                                                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Last Contact</p>
                                                </div>
                                                <ChevronRight className={`w-5 h-5 text-white/20 transition-transform ${selectedContact?.email === contact.email ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {selectedContact?.email === contact.email && (
                                            <div className="mt-6 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="grid grid-cols-4 gap-6">
                                                    <div className="bg-white/[0.02] rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Send className="w-3.5 h-3.5 text-blue-400" />
                                                            <span className="text-[10px] text-white/40 uppercase tracking-wider">Sent</span>
                                                        </div>
                                                        <p className="text-2xl font-light text-white">{contact.sentEmails}</p>
                                                    </div>
                                                    <div className="bg-white/[0.02] rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Inbox className="w-3.5 h-3.5 text-emerald-400" />
                                                            <span className="text-[10px] text-white/40 uppercase tracking-wider">Received</span>
                                                        </div>
                                                        <p className="text-2xl font-light text-white">{contact.receivedEmails}</p>
                                                    </div>
                                                    <div className="bg-white/[0.02] rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Calendar className="w-3.5 h-3.5 text-violet-400" />
                                                            <span className="text-[10px] text-white/40 uppercase tracking-wider">First Contact</span>
                                                        </div>
                                                        <p className="text-sm font-light text-white">
                                                            {new Date(contact.firstContact).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white/[0.02] rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                                                            <span className="text-[10px] text-white/40 uppercase tracking-wider">Last Contact</span>
                                                        </div>
                                                        <p className="text-sm font-light text-white">
                                                            {new Date(contact.lastContact).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-3 mt-6">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(`mailto:${contact.email}`, '_blank');
                                                        }}
                                                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-white/90 transition-colors"
                                                    >
                                                        <Mail className="w-4 h-4" />
                                                        Send Email
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(`https://mail.google.com/mail/u/0/#search/from:${encodeURIComponent(contact.email)}+OR+to:${encodeURIComponent(contact.email)}`, '_blank');
                                                        }}
                                                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/10 transition-colors"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                        View in Gmail
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading && !error && contacts.length === 0 && (
                        <div className="py-24 text-center">
                            <div className="w-16 h-16 bg-white/[0.02] border border-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Users className="w-8 h-8 text-white/20" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">No contacts found</h3>
                            <p className="text-white/40 font-light max-w-md mx-auto">
                                {searchQuery
                                    ? `No contacts matching "${searchQuery}"`
                                    : 'Start emailing people to build your network.'
                                }
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
