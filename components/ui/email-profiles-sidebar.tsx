"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    X,
    Mail,
    Phone,
    Building,
    Calendar,
    TrendingUp,
    TrendingDown,
    Minus,
    Sparkles,
    ArrowLeft,
    User,
    Clock,
    MessageCircle,
    Send,
    Inbox,
    ChevronRight,
    Loader2,
    Filter
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Button } from './button';
import { Badge } from './badge';

interface EmailContact {
    email: string;
    name: string;
    avatar?: string;
    firstContact: string;
    lastContact: string;
    totalEmails: number;
    sentEmails: number;
    receivedEmails: number;
    phone?: string;
    company?: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'rare';
}

interface ContactDetail {
    email: string;
    name: string;
    phone?: string;
    company?: string;
    position?: string;
    address?: string;
    firstContact: string;
    lastContact: string;
    totalEmails: number;
    sentEmails: number;
    receivedEmails: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'rare';
    relationshipScore: number;
    sentimentHistory: {
        date: string;
        score: number;
    }[];
    aiSuggestion?: string;
    recentSubjects: string[];
}

interface EmailProfilesSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function EmailProfilesSidebar({ isOpen, onClose }: EmailProfilesSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [contacts, setContacts] = useState<EmailContact[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedContact, setSelectedContact] = useState<ContactDetail | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'frequent'>('all');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchContacts('');
            setTimeout(() => searchInputRef.current?.focus(), 200);
        }
    }, [isOpen]);

    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (searchQuery.length >= 2) {
            searchTimeoutRef.current = setTimeout(() => fetchContacts(searchQuery), 300);
        } else if (searchQuery.length === 0) {
            fetchContacts('');
        }

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, [searchQuery]);

    const fetchContacts = async (query: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const searchParam = query ? `?search=${encodeURIComponent(query)}` : '';
            const response = await fetch(`/api/contacts/profiles${searchParam}`);
            if (!response.ok) throw new Error('Failed to fetch contacts');
            const data = await response.json();
            setContacts(data.contacts || []);
        } catch (err) {
            console.error('Error fetching contacts:', err);
            setError('Failed to load contacts');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchContactDetail = async (email: string) => {
        setIsLoadingProfile(true);
        try {
            const response = await fetch(`/api/contacts/profiles/${encodeURIComponent(email)}`);
            if (!response.ok) throw new Error('Failed to fetch contact details');
            const data = await response.json();
            setSelectedContact(data.contact);
        } catch (err) {
            console.error('Error fetching contact details:', err);
        } finally {
            setIsLoadingProfile(false);
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-[8px] z-[60]"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-lg bg-black border-l border-white/10 z-[70] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                    >
                        {/* Premium B&W Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/50 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                {selectedContact ? (
                                    <button onClick={() => setSelectedContact(null)} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-all group">
                                        <ArrowLeft className="w-5 h-5 text-white/50 group-hover:text-white" />
                                    </button>
                                ) : (
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                                        <User className="w-5 h-5 text-black" />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight text-white uppercase italic">
                                        {selectedContact ? 'Profile Entity' : 'Network Map'}
                                    </h2>
                                    <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-medium">
                                        {selectedContact ? selectedContact.email : 'Gmail Relationship Analysis'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all group">
                                <X className="w-5 h-5 text-white/50 group-hover:text-white" />
                            </button>
                        </div>

                        {/* List View */}
                        {!selectedContact ? (
                            <>
                                <div className="p-6 pb-2 space-y-6">
                                    {/* Premium Search Experience */}
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-white transition-colors" />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            placeholder="SEARCH NETWORK..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all text-sm uppercase tracking-widest"
                                        />
                                        {searchQuery && (
                                            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-all">
                                                <X className="w-3 h-3 text-white/40" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex gap-2">
                                        {(['all', 'recent', 'frequent'] as const).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-[0.15em] font-bold transition-all ${activeTab === tab
                                                        ? 'bg-white text-black'
                                                        : 'text-white/40 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto px-6 py-4">
                                    {isLoading ? (
                                        <div className="flex flex-col items-center justify-center h-64 gap-4 opacity-50">
                                            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            <p className="text-white/30 text-[10px] uppercase tracking-tighter">Syncing Intelligence</p>
                                        </div>
                                    ) : contacts.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-64 gap-4 border-2 border-dashed border-white/5 rounded-3xl">
                                            <Search className="w-8 h-8 text-white/10" />
                                            <p className="text-white/20 text-[10px] uppercase tracking-widest">No matching entities located</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {contacts.map((contact, idx) => (
                                                <motion.button
                                                    key={contact.email}
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.03 }}
                                                    onClick={() => fetchContactDetail(contact.email)}
                                                    className="w-full p-4 flex items-center gap-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-2xl transition-all group relative overflow-hidden text-left"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />

                                                    <Avatar className="w-12 h-12 border border-white/10 ring-2 ring-transparent group-hover:ring-white/20 transition-all">
                                                        <AvatarFallback className="bg-white text-black font-bold text-sm">
                                                            {getInitials(contact.name)}
                                                        </AvatarFallback>
                                                    </Avatar>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="text-white font-bold text-sm truncate uppercase tracking-tight group-hover:translate-x-1 transition-transform">{contact.name}</h3>
                                                            <span className="text-[9px] font-black text-white/30 group-hover:text-white transition-colors">{contact.frequency.toUpperCase()}</span>
                                                        </div>
                                                        <p className="text-white/40 text-[11px] truncate mt-0.5">{contact.email}</p>
                                                        <div className="flex items-center gap-3 mt-2">
                                                            <span className="text-[9px] text-white/30 flex items-center gap-1 font-bold">
                                                                <MessageCircle className="w-3 h-3" />
                                                                {contact.totalEmails} TX
                                                            </span>
                                                            <span className="text-[9px] text-white/30 flex items-center gap-1 font-bold">
                                                                <Clock className="w-3 h-3" />
                                                                {formatDate(contact.lastContact).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <ContactDetailView
                                contact={selectedContact}
                                isLoading={isLoadingProfile}
                                getInitials={getInitials}
                                formatDate={formatDate}
                            />
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// B&W Detail View
function ContactDetailView({ contact, isLoading, getInitials, formatDate }: any) {
    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-white/10 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    const sentimentTrend = contact.sentimentHistory.length >= 2
        ? contact.sentimentHistory[contact.sentimentHistory.length - 1].score - contact.sentimentHistory[0].score
        : 0;

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Profile Central */}
            <div className="p-8 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

                <Avatar className="w-24 h-24 border-2 border-white/20 p-1 mb-6">
                    <AvatarFallback className="bg-white text-black text-3xl font-black">
                        {getInitials(contact.name || contact.email)}
                    </AvatarFallback>
                </Avatar>

                <h2 className="text-3xl font-black text-white italic tracking-tighter mb-1 uppercase">
                    {contact.name || contact.email.split('@')[0]}
                </h2>
                <p className="text-white/40 text-xs tracking-widest font-medium mb-6">{contact.email.toUpperCase()}</p>

                <div className="flex gap-4">
                    <Button className="bg-white text-black hover:bg-white/90 rounded-full px-8 font-black uppercase text-[10px] tracking-widest h-11"
                        onClick={() => window.open(`mailto:${contact.email}`, '_blank')}>
                        Initiate Contact
                    </Button>
                    <Button variant="outline" className="border-white/20 text-white hover:bg-white/5 rounded-full px-8 font-black uppercase text-[10px] tracking-widest h-11"
                        onClick={() => window.open(`tel:${contact.phone}`, '_blank')}>
                        Direct Line
                    </Button>
                </div>
            </div>

            {/* AI Intelligence - B&W Glassmorphism */}
            {contact.aiSuggestion && (
                <div className="px-6 py-4">
                    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Sparkles className="w-12 h-12 text-white" />
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Neural Insight</span>
                        </div>
                        <p className="text-lg font-medium text-white italic leading-relaxed tracking-tight">
                            "{contact.aiSuggestion}"
                        </p>
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="px-6 grid grid-cols-2 gap-4 py-6 border-y border-white/5">
                {[
                    { icon: Mail, label: 'Transmission Volume', value: contact.totalEmails, sub: 'Total' },
                    { icon: Clock, label: 'Origin Point', value: formatDate(contact.firstContact), sub: 'Initial' },
                    { icon: Send, label: 'Outbound Flow', value: contact.sentEmails, sub: 'Responses', color: 'text-white' },
                    { icon: Inbox, label: 'Inbound Signal', value: contact.receivedEmails, sub: 'Inputs', color: 'text-white' }
                ].map((item, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center gap-2 mb-3">
                            <item.icon className="w-3 h-3 text-white/30" />
                            <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">{item.label}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-xl font-black ${item.color || 'text-white'}`}>{item.value}</span>
                            <span className="text-[9px] text-white/20 font-medium uppercase mt-1">{item.sub}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Relationship Graph - Modern B&W */}
            <div className="p-6 border-b border-white/5">
                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    Relationship Dynamic
                </h3>

                <div className="mb-8">
                    <div className="flex items-end justify-between mb-3">
                        <span className="text-[11px] font-bold text-white uppercase tracking-tighter">Connection Integrity</span>
                        <span className="text-2xl font-black text-white italic">{contact.relationshipScore}%</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${contact.relationshipScore}%` }}
                            className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                        />
                    </div>
                </div>

                {contact.sentimentHistory.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[11px] font-bold text-white uppercase tracking-tighter">Sentiment Flux</span>
                            <div className="px-2 py-1 bg-white/5 rounded-md flex items-center gap-1.5">
                                {sentimentTrend > 0 ? <TrendingUp className="w-3 h-3 text-white" /> : <TrendingDown className="w-3 h-3 text-white/40" />}
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">
                                    {Math.abs(sentimentTrend)}% {sentimentTrend > 0 ? 'Surge' : 'Decline'}
                                </span>
                            </div>
                        </div>

                        <div className="h-20 flex items-end gap-1.5">
                            {contact.sentimentHistory.map((item: any, index: number) => (
                                <div
                                    key={index}
                                    className="flex-1 transition-all relative group hover:opacity-100 opacity-60"
                                    style={{ height: `${item.score}%` }}
                                >
                                    <div className="absolute inset-0 bg-white rounded-t-sm" />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-3 px-1">
                            <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest italic">Temporal Start</span>
                            <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest italic">Current State</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Corporate Metadata */}
            {(contact.phone || contact.company) && (
                <div className="p-6">
                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 text-center">Entity Metadata</h3>
                    <div className="space-y-3">
                        {contact.phone && (
                            <div className="flex items-center justify-center gap-4 text-sm bg-white/5 p-4 rounded-2xl border border-white/5">
                                <Phone className="w-4 h-4 text-white/40" />
                                <span className="text-white font-bold tracking-tight">{contact.phone}</span>
                            </div>
                        )}
                        {contact.company && (
                            <div className="flex items-center justify-center gap-4 text-sm bg-white/5 p-4 rounded-2xl border border-white/5">
                                <Building className="w-4 h-4 text-white/40" />
                                <span className="text-white font-bold tracking-tight uppercase">{contact.company}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Communication Log */}
            {contact.recentSubjects.length > 0 && (
                <div className="p-6 pt-0">
                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Transmission Subjects</h3>
                    <div className="space-y-2">
                        {contact.recentSubjects.map((subject: string, index: number) => (
                            <div key={index} className="text-[11px] font-bold text-white/50 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 truncate hover:text-white transition-colors cursor-default">
                                {subject || '(NULL SUBJECT)'}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
