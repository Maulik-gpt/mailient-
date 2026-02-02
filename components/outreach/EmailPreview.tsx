'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, User, Building2, ChevronLeft, ChevronRight,
    Copy, Check, Eye, Sparkles, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface Prospect {
    name: string;
    email: string;
    jobTitle: string;
    company: string;
}

interface EmailPreviewProps {
    subject: string;
    body: string;
    prospects: Prospect[];
    senderName?: string;
    senderEmail?: string;
    onSubjectChange?: (subject: string) => void;
    onBodyChange?: (body: string) => void;
}

export function EmailPreview({
    subject,
    body,
    prospects,
    senderName = 'Your Name',
    senderEmail = 'you@company.com',
    onSubjectChange,
    onBodyChange
}: EmailPreviewProps) {
    const [currentProspectIndex, setCurrentProspectIndex] = useState(0);
    const [viewMode, setViewMode] = useState<'template' | 'preview'>('preview');
    const [copied, setCopied] = useState(false);

    const currentProspect = prospects[currentProspectIndex] || {
        name: 'John Smith',
        email: 'john@example.com',
        jobTitle: 'CEO',
        company: 'Acme Inc'
    };

    const personalizeContent = (content: string, prospect: Prospect): string => {
        return content
            .replace(/\{\{name\}\}/gi, prospect.name.split(' ')[0])
            .replace(/\{\{fullName\}\}/gi, prospect.name)
            .replace(/\{\{firstName\}\}/gi, prospect.name.split(' ')[0])
            .replace(/\{\{lastName\}\}/gi, prospect.name.split(' ').slice(1).join(' '))
            .replace(/\{\{company\}\}/gi, prospect.company)
            .replace(/\{\{jobTitle\}\}/gi, prospect.jobTitle)
            .replace(/\{\{email\}\}/gi, prospect.email);
    };

    const handleCopy = async () => {
        const previewSubject = personalizeContent(subject, currentProspect);
        const previewBody = personalizeContent(body, currentProspect);

        await navigator.clipboard.writeText(`Subject: ${previewSubject}\n\n${previewBody}`);
        setCopied(true);
        toast.success('Email copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const navigateProspect = (direction: 'prev' | 'next') => {
        if (direction === 'prev' && currentProspectIndex > 0) {
            setCurrentProspectIndex(currentProspectIndex - 1);
        } else if (direction === 'next' && currentProspectIndex < prospects.length - 1) {
            setCurrentProspectIndex(currentProspectIndex + 1);
        }
    };

    const displaySubject = viewMode === 'preview'
        ? personalizeContent(subject, currentProspect)
        : subject;

    const displayBody = viewMode === 'preview'
        ? personalizeContent(body, currentProspect)
        : body;

    return (
        <div className="bg-gradient-to-br from-[#0d0d14] to-[#0a0a0f] rounded-2xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Email Preview</h3>
                        <p className="text-sm text-gray-400">
                            {viewMode === 'preview' ? 'Personalized view' : 'Template view'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex bg-white/5 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'preview'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <Eye className="w-4 h-4 inline mr-1" />
                            Preview
                        </button>
                        <button
                            onClick={() => setViewMode('template')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'template'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <Sparkles className="w-4 h-4 inline mr-1" />
                            Variables
                        </button>
                    </div>

                    {/* Copy Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopy}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        {copied ? (
                            <Check className="w-4 h-4 text-green-400" />
                        ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                        )}
                    </motion.button>
                </div>
            </div>

            {/* Prospect Navigation */}
            {prospects.length > 0 && viewMode === 'preview' && (
                <div className="flex items-center justify-between p-3 bg-purple-900/20 border-b border-white/10">
                    <button
                        onClick={() => navigateProspect('prev')}
                        disabled={currentProspectIndex === 0}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                            <span className="text-sm font-bold text-white">
                                {currentProspect.name[0]}
                            </span>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-white">{currentProspect.name}</p>
                            <p className="text-xs text-gray-400">
                                {currentProspect.jobTitle} at {currentProspect.company}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => navigateProspect('next')}
                        disabled={currentProspectIndex === prospects.length - 1}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Email Content */}
            <div className="p-6 space-y-4">
                {/* Sender Info */}
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">{senderName}</p>
                        <p className="text-xs text-gray-400">{senderEmail}</p>
                    </div>
                </div>

                {/* Recipient Info */}
                {viewMode === 'preview' && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>To:</span>
                        <span className="text-white">{currentProspect.email}</span>
                    </div>
                )}

                {/* Subject */}
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Subject</label>
                    <div className={`p-3 rounded-lg ${viewMode === 'template'
                            ? 'bg-purple-900/20 border border-purple-500/30'
                            : 'bg-white/5'
                        }`}>
                        <p className="text-white font-medium">{displaySubject}</p>
                    </div>
                </div>

                {/* Body */}
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Body</label>
                    <div className={`p-4 rounded-lg whitespace-pre-wrap ${viewMode === 'template'
                            ? 'bg-purple-900/20 border border-purple-500/30'
                            : 'bg-white/5'
                        }`}>
                        <p className="text-gray-300 text-sm leading-relaxed">{displayBody}</p>
                    </div>
                </div>

                {/* Variable Legend (template mode) */}
                {viewMode === 'template' && (
                    <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                        <h4 className="text-sm font-semibold text-blue-400 mb-2">Personalization Variables</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                                <code className="px-2 py-0.5 bg-blue-500/20 rounded text-blue-300">{'{{name}}'}</code>
                                <span className="text-gray-400">First name</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="px-2 py-0.5 bg-blue-500/20 rounded text-blue-300">{'{{company}}'}</code>
                                <span className="text-gray-400">Company name</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="px-2 py-0.5 bg-blue-500/20 rounded text-blue-300">{'{{jobTitle}}'}</code>
                                <span className="text-gray-400">Job title</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="px-2 py-0.5 bg-blue-500/20 rounded text-blue-300">{'{{fullName}}'}</code>
                                <span className="text-gray-400">Full name</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            <div className="flex items-center justify-between p-4 bg-white/5 border-t border-white/10 text-sm text-gray-400">
                <span>{prospects.length} recipients selected</span>
                <span>Viewing {currentProspectIndex + 1} of {prospects.length || 1}</span>
            </div>
        </div>
    );
}

export default EmailPreview;
