'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Play, Pause, BarChart3, Users, Mail,
    Clock, CheckCircle2, AlertCircle, RefreshCw, Download,
    Edit2, Trash2, Send, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { CampaignStatsCard } from '@/components/outreach/CampaignStatsCard';

interface Campaign {
    id: string;
    name: string;
    subject: string;
    body: string;
    status: 'draft' | 'active' | 'paused' | 'completed';
    total_prospects: number;
    sent_count: number;
    opened_count: number;
    replied_count: number;
    bounced_count: number;
    created_at: string;
    scheduled_at?: string;
}

interface CampaignEmail {
    id: string;
    to_email: string;
    to_name: string;
    subject: string;
    status: 'pending' | 'sent' | 'opened' | 'replied' | 'bounced';
    sent_at?: string;
    opened_at?: string;
}

export default function CampaignDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [emails, setEmails] = useState<CampaignEmail[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'emails' | 'settings'>('overview');

    useEffect(() => {
        loadCampaign();
    }, [params.campaignId]);

    const loadCampaign = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/outreach/campaigns/${params.campaignId}`);
            if (!response.ok) throw new Error('Failed to load campaign');

            const data = await response.json();
            setCampaign(data.campaign);
            setEmails(data.emails || []);
        } catch (error) {
            console.error('Load campaign error:', error);
            toast.error('Failed to load campaign');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: 'active' | 'paused') => {
        try {
            const response = await fetch(`/api/outreach/campaigns/${params.campaignId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) throw new Error('Failed to update status');

            setCampaign(prev => prev ? { ...prev, status: newStatus } : null);
            toast.success(`Campaign ${newStatus === 'active' ? 'resumed' : 'paused'}`);
        } catch (error) {
            console.error('Status update error:', error);
            toast.error('Failed to update campaign status');
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this campaign?')) return;

        try {
            const response = await fetch(`/api/outreach/campaigns/${params.campaignId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete');

            toast.success('Campaign deleted');
            router.push('/dashboard/outreach');
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete campaign');
        }
    };

    const getStatusBadge = (status: Campaign['status']) => {
        const styles = {
            draft: 'bg-gray-500/20 text-gray-400',
            active: 'bg-green-500/20 text-green-400',
            paused: 'bg-yellow-500/20 text-yellow-400',
            completed: 'bg-blue-500/20 text-blue-400'
        };

        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d0d14] to-[#0a0a0f] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!campaign) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d0d14] to-[#0a0a0f] flex flex-col items-center justify-center text-white">
                <AlertCircle className="w-12 h-12 text-gray-500 mb-4" />
                <p className="text-gray-400 mb-4">Campaign not found</p>
                <button
                    onClick={() => router.push('/dashboard/outreach')}
                    className="px-4 py-2 bg-purple-600 rounded-lg"
                >
                    Back to Outreach
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d0d14] to-[#0a0a0f] text-white p-6">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => router.push('/dashboard/outreach')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Outreach
                </button>

                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold">{campaign.name}</h1>
                            {getStatusBadge(campaign.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Created {new Date(campaign.created_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {campaign.total_prospects} prospects
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {campaign.status === 'active' ? (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleStatusChange('paused')}
                                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-medium flex items-center gap-2 transition-colors"
                            >
                                <Pause className="w-4 h-4" />
                                Pause
                            </motion.button>
                        ) : campaign.status === 'paused' && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleStatusChange('active')}
                                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium flex items-center gap-2 transition-colors"
                            >
                                <Play className="w-4 h-4" />
                                Resume
                            </motion.button>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleDelete}
                            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg font-medium flex items-center gap-2 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl w-fit">
                {[
                    { id: 'overview', label: 'Overview', icon: BarChart3 },
                    { id: 'emails', label: 'Emails', icon: Mail },
                    { id: 'settings', label: 'Settings', icon: Edit2 }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <CampaignStatsCard
                        campaignName={campaign.name}
                        startDate={new Date(campaign.created_at).toLocaleDateString()}
                        stats={{
                            totalProspects: campaign.total_prospects,
                            emailsSent: campaign.sent_count,
                            opened: campaign.opened_count,
                            clicked: 0,
                            replied: campaign.replied_count,
                            bounced: campaign.bounced_count
                        }}
                    />

                    {/* Email Template Preview */}
                    <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-purple-400" />
                            Email Template
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400">Subject</label>
                                <p className="text-white font-medium mt-1">{campaign.subject}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Body</label>
                                <div className="mt-1 p-4 bg-white/5 rounded-xl whitespace-pre-wrap text-gray-300 text-sm">
                                    {campaign.body}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'emails' && (
                <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                        <h3 className="font-semibold">Email Activity</h3>
                    </div>

                    {emails.length === 0 ? (
                        <div className="p-12 text-center">
                            <Mail className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">No emails sent yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {emails.map(email => (
                                <div key={email.id} className="p-4 flex items-center justify-between hover:bg-white/5">
                                    <div>
                                        <p className="font-medium text-white">{email.to_name || email.to_email}</p>
                                        <p className="text-sm text-gray-400">{email.to_email}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {email.sent_at && (
                                            <span className="text-xs text-gray-500">
                                                Sent {new Date(email.sent_at).toLocaleDateString()}
                                            </span>
                                        )}
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${email.status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                                                email.status === 'opened' ? 'bg-green-500/20 text-green-400' :
                                                    email.status === 'replied' ? 'bg-purple-500/20 text-purple-400' :
                                                        email.status === 'bounced' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {email.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                    <h3 className="text-lg font-semibold mb-4">Campaign Settings</h3>
                    <div className="space-y-4 max-w-xl">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Campaign Name</label>
                            <input
                                type="text"
                                defaultValue={campaign.name}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Subject Line</label>
                            <input
                                type="text"
                                defaultValue={campaign.subject}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                            />
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium"
                        >
                            Save Changes
                        </motion.button>
                    </div>
                </div>
            )}
        </div>
    );
}
