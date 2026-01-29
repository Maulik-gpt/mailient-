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
    Loader2
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
    const [activeTab, setActiveTab] = useState<'all' | 'frequent'>('all');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchContacts('');
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
        return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0a0a0a] border-l border-white/5 z-[70] flex flex-col overflow-hidden"
                    >
                        {/* Minimalist Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                {selectedContact ? (
                                    <button onClick={() => setSelectedContact(null)} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors group">
                                        <ArrowLeft className="w-5 h-5 text-white/40 group-hover:text-white" />
                                    </button>
                                ) : (
                                    <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center border border-white/10">
                                        <User className="w-4 h-4 text-white/60" />
                                    </div>
                                )}
                                <h2 className="text-base font-medium text-white">
                                    {selectedContact ? 'Profile' : 'People'}
                                </h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors group">
                                <X className="w-5 h-5 text-white/40 group-hover:text-white" />
                            </button>
                        </div>

                        {/* Content View */}
                        {!selectedContact ? (
                            <>
                                <div className="flex-1 overflow-y-auto px-4 py-4">
                                    {isLoading && contacts.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                                            <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
                                        </div>
                                    ) : error ? (
                                        <div className="flex flex-col items-center justify-center h-64 px-4 text-center">
                                            <p className="text-white/40 text-sm mb-4">{error}</p>
                                            <Button variant="outline" size="sm" onClick={() => fetchContacts(searchQuery)}>Retry</Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {contacts.map((contact) => (
                                                <button
                                                    key={contact.email}
                                                    onClick={() => fetchContactDetail(contact.email)}
                                                    className="w-full p-3 flex items-center gap-3 hover:bg-white/5 rounded-xl transition-colors text-left group"
                                                >
                                                    <Avatar className="w-10 h-10 border border-white/5">
                                                        <AvatarFallback className="bg-neutral-800 text-white/80 text-xs font-normal">
                                                            {getInitials(contact.name || contact.email)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="text-sm font-normal text-white truncate">{contact.name || contact.email.split('@')[0]}</h3>
                                                            <span className="text-[10px] text-white/20">{contact.frequency}</span>
                                                        </div>
                                                        <p className="text-white/40 text-xs truncate mt-0.5 font-normal">{contact.email}</p>
                                                    </div>
                                                </button>
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

function ContactDetailView({ contact, isLoading, getInitials, formatDate }: any) {
    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Profile Info */}
            <div className="p-8 flex flex-col items-center text-center">
                <Avatar className="w-20 h-20 border border-white/10 mb-6 font-normal">
                    <AvatarFallback className="bg-neutral-900 text-white/80 text-2xl font-normal">
                        {getInitials(contact.name || contact.email)}
                    </AvatarFallback>
                </Avatar>

                <h2 className="text-2xl font-normal text-white mb-1">
                    {contact.name || contact.email.split('@')[0]}
                </h2>
                <p className="text-white/40 text-sm mb-6 font-normal">{contact.email}</p>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-white/10 text-white/80 hover:bg-white/5 rounded-full px-5 font-normal"
                        onClick={() => window.open(`mailto:${contact.email}`, '_blank')}>
                        Email
                    </Button>
                    <Button variant="outline" size="sm" className="border-white/10 text-white/80 hover:bg-white/5 rounded-full px-5 font-normal"
                        onClick={() => window.open(`tel:${contact.phone}`, '_blank')}>
                        Call
                    </Button>
                </div>
            </div>

            {/* AI Suggestion */}
            {contact.aiSuggestion && (
                <div className="px-6 py-2">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2 text-white/30">
                            <Sparkles className="w-3 h-3" />
                            <span className="text-[11px] font-normal">AI Suggestion</span>
                        </div>
                        <p className="text-sm text-white/80 leading-relaxed font-normal">
                            {contact.aiSuggestion}
                        </p>
                    </div>
                </div>
            )}

            {/* Metrics */}
            <div className="p-6 grid grid-cols-2 gap-3">
                {[
                    { label: 'Emails', value: contact.totalEmails },
                    { label: 'Relationship', value: `${contact.relationshipScore}%` },
                    { label: 'Sent', value: contact.sentEmails },
                    { label: 'Received', value: contact.receivedEmails }
                ].map((item, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                        <span className="text-[10px] text-white/30 block mb-1 font-normal">{item.label}</span>
                        <span className="text-xl text-white font-normal">{item.value}</span>
                    </div>
                ))}
            </div>

            {/* Activity Graph */}
            {contact.sentimentHistory.length > 0 && (
                <div className="p-6 pt-0">
                    <h3 className="text-[10px] text-white/30 mb-4 font-normal">Sentiment History</h3>
                    <div className="h-20 flex items-end gap-1">
                        {contact.sentimentHistory.map((item: any, index: number) => (
                            <div
                                key={index}
                                className="flex-1 bg-white/10 hover:bg-white/20 transition-colors rounded-sm"
                                style={{ height: `${item.score}%` }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Meta Info */}
            <div className="p-6 pt-0 space-y-4">
                {contact.company && (
                    <div className="flex items-start gap-3">
                        <Building className="w-4 h-4 text-white/20 mt-0.5" />
                        <div className="min-w-0">
                            <span className="text-[10px] text-white/30 block font-normal">Company</span>
                            <span className="text-sm text-white/80 font-normal truncate block">{contact.company}</span>
                        </div>
                    </div>
                )}
                <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-white/20 mt-0.5" />
                    <div className="min-w-0">
                        <span className="text-[10px] text-white/30 block font-normal">First Contact</span>
                        <span className="text-sm text-white/80 font-normal truncate block">{formatDate(contact.firstContact)}</span>
                    </div>
                </div>
            </div>

            {/* Subjects */}
            {contact.recentSubjects.length > 0 && (
                <div className="p-6 pt-0 pb-12">
                    <h3 className="text-[10px] text-white/30 mb-3 font-normal">Recent Subjects</h3>
                    <div className="space-y-2">
                        {contact.recentSubjects.map((subject: string, index: number) => (
                            <div key={index} className="text-xs text-white/50 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 truncate font-normal">
                                {subject || '(No subject)'}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
