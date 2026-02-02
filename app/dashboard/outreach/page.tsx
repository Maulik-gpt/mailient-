'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Users, Mail, Sparkles, Globe, Building2,
    Briefcase, Target, Zap, ChevronRight, Plus, Send,
    RefreshCw, CheckCircle2, AlertCircle, Loader2, ArrowRight,
    UserPlus, Download, Upload, BarChart3, Rocket, Brain,
    Link2, ScanLine, TrendingUp, Crown, Star
} from 'lucide-react';
import { toast } from 'sonner';

interface Prospect {
    id: string;
    name: string;
    email: string;
    jobTitle: string;
    company: string;
    companyDomain: string;
    location: string;
    industry: string;
    linkedinUrl?: string;
    verified: boolean;
    selected?: boolean;
}

interface Campaign {
    id: string;
    name: string;
    status: 'draft' | 'active' | 'paused' | 'completed';
    prospects: number;
    sent: number;
    opened: number;
    replied: number;
    createdAt: string;
}

interface BusinessProfile {
    name: string;
    url: string;
    description: string;
    valueProposition: string;
    targetAudience: string;
    industry: string;
    tone: string;
}

export default function OutreachPage() {
    const [activeTab, setActiveTab] = useState<'search' | 'lists' | 'campaigns' | 'ai-setup'>('ai-setup');
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());
    const [savedLists, setSavedLists] = useState<{ name: string; prospects: Prospect[] }[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Search filters
    const [searchFilters, setSearchFilters] = useState({
        query: '',
        jobTitle: '',
        company: '',
        industry: '',
        location: '',
        companySize: '',
        seniorityLevel: ''
    });

    // Business profile for AI
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
        name: '',
        url: '',
        description: '',
        valueProposition: '',
        targetAudience: '',
        industry: '',
        tone: 'professional'
    });

    // Campaign composer
    const [campaignDraft, setCampaignDraft] = useState({
        name: '',
        subject: '',
        body: '',
        followUpDays: 3
    });

    // AI-generated suggestions
    const [aiSuggestions, setAiSuggestions] = useState<{
        filters: typeof searchFilters;
        emailTemplate: string;
        subjectLines: string[];
    } | null>(null);

    const handleAnalyzeWebsite = async () => {
        if (!businessProfile.url) {
            toast.error('Please enter your product URL');
            return;
        }

        setIsAnalyzing(true);
        try {
            const response = await fetch('/api/outreach/analyze-business', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: businessProfile.url })
            });

            if (!response.ok) throw new Error('Failed to analyze website');

            const data = await response.json();

            setBusinessProfile(prev => ({
                ...prev,
                name: data.businessName || prev.name,
                description: data.description || prev.description,
                valueProposition: data.valueProposition || prev.valueProposition,
                targetAudience: data.targetAudience || prev.targetAudience,
                industry: data.industry || prev.industry
            }));

            if (data.suggestedFilters) {
                setAiSuggestions({
                    filters: data.suggestedFilters,
                    emailTemplate: data.emailTemplate || '',
                    subjectLines: data.subjectLines || []
                });
            }

            toast.success('AI analyzed your business! Filters and templates ready.');
        } catch (error) {
            console.error('Analysis error:', error);
            toast.error('Failed to analyze website. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSearchProspects = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/outreach/search-prospects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchFilters)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to search prospects');
            }

            const data = await response.json();
            setProspects(data.prospects || []);
            toast.success(`Found ${data.prospects?.length || 0} prospects!`);
        } catch (error) {
            console.error('Search error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to search prospects. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyAiFilters = () => {
        if (aiSuggestions?.filters) {
            setSearchFilters(aiSuggestions.filters);
            setActiveTab('search');
            toast.success('AI filters applied! Ready to search.');
        }
    };

    const handleSelectAll = () => {
        if (selectedProspects.size === prospects.length) {
            setSelectedProspects(new Set());
        } else {
            setSelectedProspects(new Set(prospects.map(p => p.id)));
        }
    };

    const handleSaveList = () => {
        const selected = prospects.filter(p => selectedProspects.has(p.id));
        if (selected.length === 0) {
            toast.error('Please select at least one prospect');
            return;
        }

        const listName = `List ${savedLists.length + 1} - ${new Date().toLocaleDateString()}`;
        setSavedLists(prev => [...prev, { name: listName, prospects: selected }]);
        toast.success(`Saved ${selected.length} prospects to "${listName}"`);
    };

    const handleGenerateEmail = async () => {
        if (selectedProspects.size === 0) {
            toast.error('Please select prospects first');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/outreach/generate-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessProfile,
                    prospects: prospects.filter(p => selectedProspects.has(p.id))
                })
            });

            if (!response.ok) throw new Error('Failed to generate email');

            const data = await response.json();
            setCampaignDraft(prev => ({
                ...prev,
                subject: data.subject || prev.subject,
                body: data.body || prev.body
            }));

            toast.success('AI generated your personalized email template!');
        } catch (error) {
            console.error('Generate error:', error);
            toast.error('Failed to generate email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendCampaign = async () => {
        if (selectedProspects.size === 0 || !campaignDraft.body) {
            toast.error('Please select prospects and create an email');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/outreach/send-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: campaignDraft.name || `Campaign ${campaigns.length + 1}`,
                    subject: campaignDraft.subject,
                    body: campaignDraft.body,
                    prospects: prospects.filter(p => selectedProspects.has(p.id)),
                    followUpDays: campaignDraft.followUpDays
                })
            });

            if (!response.ok) throw new Error('Failed to send campaign');

            const data = await response.json();

            setCampaigns(prev => [...prev, {
                id: data.campaignId,
                name: campaignDraft.name || `Campaign ${campaigns.length + 1}`,
                status: 'active',
                prospects: selectedProspects.size,
                sent: 0,
                opened: 0,
                replied: 0,
                createdAt: new Date().toISOString()
            }]);

            toast.success(`Campaign launched! Sending to ${selectedProspects.size} prospects.`);
            setSelectedProspects(new Set());
            setCampaignDraft({ name: '', subject: '', body: '', followUpDays: 3 });
        } catch (error) {
            console.error('Campaign error:', error);
            toast.error('Failed to send campaign. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12 border-b border-white/5 pb-8"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                        <Rocket className="w-5 h-5 text-black" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-normal tracking-tight text-white">
                            Outreach
                        </h1>
                        <p className="text-gray-500 text-sm">Scale your acquisition with AI personalization.</p>
                    </div>
                </div>
            </motion.div>

            {/* Tab Navigation */}
            <div className="flex gap-4 mb-10 border-b border-white/5">
                {[
                    { id: 'ai-setup', label: 'AI Setup', icon: Brain },
                    { id: 'search', label: 'Prospects', icon: Search },
                    { id: 'lists', label: 'Lists', icon: Users },
                    { id: 'campaigns', label: 'Campaigns', icon: Send }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-normal transition-all relative ${activeTab === tab.id
                            ? 'text-white'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'ai-setup' && (
                    <motion.div
                        key="ai-setup"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="max-w-4xl space-y-8"
                    >
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <ScanLine className="w-5 h-5 text-gray-400" />
                                <h2 className="text-lg font-normal">Business Context</h2>
                            </div>

                            <div className="grid gap-6 p-8 border border-white/10 rounded-2xl bg-white/[0.02]">
                                <div className="space-y-4">
                                    <label className="text-xs uppercase tracking-widest text-gray-500 font-normal">Website URL</label>
                                    <div className="flex gap-4">
                                        <input
                                            type="url"
                                            value={businessProfile.url}
                                            onChange={(e) => setBusinessProfile(prev => ({ ...prev, url: e.target.value }))}
                                            placeholder="https://yourproduct.com"
                                            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-white/20 transition-all text-white"
                                        />
                                        <button
                                            onClick={handleAnalyzeWebsite}
                                            disabled={isAnalyzing}
                                            className="px-6 py-3 bg-white text-black rounded-lg text-sm font-normal hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            Analyze
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase tracking-widest text-gray-500 font-normal">Name</label>
                                        <input
                                            type="text"
                                            value={businessProfile.name}
                                            onChange={(e) => setBusinessProfile(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-white/20 text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase tracking-widest text-gray-500 font-normal">Industry</label>
                                        <input
                                            type="text"
                                            value={businessProfile.industry}
                                            onChange={(e) => setBusinessProfile(prev => ({ ...prev, industry: e.target.value }))}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-white/20 text-white"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs uppercase tracking-widest text-gray-500 font-normal">Value Proposition</label>
                                        <textarea
                                            value={businessProfile.valueProposition}
                                            onChange={(e) => setBusinessProfile(prev => ({ ...prev, valueProposition: e.target.value }))}
                                            rows={2}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-white/20 resize-none text-white"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs uppercase tracking-widest text-gray-500 font-normal">Target Audience</label>
                                        <textarea
                                            value={businessProfile.targetAudience}
                                            onChange={(e) => setBusinessProfile(prev => ({ ...prev, targetAudience: e.target.value }))}
                                            rows={2}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-white/20 resize-none text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {aiSuggestions && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-8 border border-white/10 rounded-2xl bg-white/[0.01] flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center">
                                            <Sparkles className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-normal text-white">AI Recommendation Ready</p>
                                            <p className="text-xs text-gray-500">Suggested audience segments and copy are calibrated.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleApplyAiFilters}
                                        className="px-6 py-2 border border-white text-white rounded-lg text-xs font-normal hover:bg-white hover:text-black transition-all"
                                    >
                                        Apply Calibration
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'search' && (
                    <motion.div
                        key="search"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-8"
                    >
                        <div className="p-8 border border-white/10 rounded-2xl bg-white/[0.02]">
                            <div className="grid grid-cols-4 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest text-gray-500 font-normal">Job Title</label>
                                    <input
                                        type="text"
                                        value={searchFilters.jobTitle}
                                        onChange={(e) => setSearchFilters(prev => ({ ...prev, jobTitle: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-white/20 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest text-gray-500 font-normal">Industry</label>
                                    <input
                                        type="text"
                                        value={searchFilters.industry}
                                        onChange={(e) => setSearchFilters(prev => ({ ...prev, industry: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-white/20 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest text-gray-500 font-normal">Location</label>
                                    <input
                                        type="text"
                                        value={searchFilters.location}
                                        onChange={(e) => setSearchFilters(prev => ({ ...prev, location: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-white/20 text-white"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={handleSearchProspects}
                                        disabled={isLoading}
                                        className="w-full h-[46px] bg-white text-black rounded-lg text-sm font-normal hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        Run Search
                                    </button>
                                </div>
                            </div>
                        </div>

                        {prospects.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-normal text-white">{prospects.length} professional profiles found</p>
                                    <div className="flex gap-4">
                                        <button onClick={handleSaveList} className="text-xs text-gray-500 hover:text-white transition-all uppercase tracking-widest">Store in List</button>
                                        <button onClick={handleGenerateEmail} className="text-xs text-gray-500 hover:text-white transition-all uppercase tracking-widest">Create Campaign</button>
                                    </div>
                                </div>

                                <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.01]">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10 text-gray-500 text-xs">
                                                <th className="px-6 py-4 font-normal"><input type="checkbox" checked={selectedProspects.size === prospects.length} onChange={handleSelectAll} className="accent-white" /></th>
                                                <th className="px-6 py-4 font-normal uppercase tracking-widest">Name</th>
                                                <th className="px-6 py-4 font-normal uppercase tracking-widest">Job</th>
                                                <th className="px-6 py-4 font-normal uppercase tracking-widest">Company</th>
                                                <th className="px-6 py-4 font-normal uppercase tracking-widest">Location</th>
                                                <th className="px-6 py-4 font-normal uppercase tracking-widest">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {prospects.map((p) => (
                                                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedProspects.has(p.id)}
                                                            onChange={() => {
                                                                const s = new Set(selectedProspects);
                                                                s.has(p.id) ? s.delete(p.id) : s.add(p.id);
                                                                setSelectedProspects(s);
                                                            }}
                                                            className="accent-white"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-white font-normal">{p.name}</td>
                                                    <td className="px-6 py-4 text-gray-400 font-normal">{p.jobTitle}</td>
                                                    <td className="px-6 py-4 text-gray-400 font-normal">{p.company}</td>
                                                    <td className="px-6 py-4 text-gray-500 font-normal">{p.location}</td>
                                                    <td className="px-6 py-4">
                                                        {p.verified ? (
                                                            <div className="w-2 h-2 rounded-full bg-white opacity-40 shadow-[0_0_8px_white]" />
                                                        ) : (
                                                            <div className="w-2 h-2 rounded-full border border-white/20" />
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'lists' && (
                    <motion.div
                        key="lists"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-8"
                    >
                        <div className="grid grid-cols-3 gap-6">
                            {savedLists.length > 0 ? (
                                savedLists.map((list, i) => (
                                    <div key={i} className="p-6 border border-white/10 rounded-2xl bg-white/[0.02] space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center">
                                                <Users className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-normal">{list.prospects.length} Profiles</span>
                                        </div>
                                        <h3 className="text-sm font-normal text-white">{list.name}</h3>
                                        <div className="flex gap-4 pt-2">
                                            <button className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-all font-normal">View</button>
                                            <button className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-all font-normal">Campaign</button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-3 py-20 text-center border border-dashed border-white/10 rounded-2xl">
                                    <p className="text-sm text-gray-500">No prospect lists discovered yet.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'campaigns' && (
                    <motion.div
                        key="campaigns"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-8"
                    >
                        <div className="flex flex-col gap-6">
                            {campaigns.length > 0 ? (
                                campaigns.map((campaign) => (
                                    <div key={campaign.id} className="p-8 border border-white/10 rounded-2xl bg-white/[0.02] flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
                                                <Send className="w-5 h-5 text-gray-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-normal text-white">{campaign.name}</h3>
                                                <p className="text-xs text-gray-500">Sent {new Date(campaign.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-12 text-center">
                                            <div>
                                                <p className="text-lg font-normal text-white">{campaign.prospects}</p>
                                                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-normal">Profiles</p>
                                            </div>
                                            <div>
                                                <p className="text-lg font-normal text-white">{campaign.opened}</p>
                                                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-normal">Opens</p>
                                            </div>
                                            <div>
                                                <p className="text-lg font-normal text-white">{campaign.replied}</p>
                                                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-normal">Replies</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-2 h-2 rounded-full bg-white opacity-40 animate-pulse" />
                                            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-normal">{campaign.status}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl">
                                    <p className="text-sm text-gray-500">No active campaigns running.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Email Composer Overlay */}
            {selectedProspects.size > 0 && campaignDraft.body && (
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-black border border-white/10 rounded-2xl shadow-2xl p-8 z-50 backdrop-blur-xl"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-white" />
                            <h2 className="text-lg font-normal text-white">Campaign Composer</h2>
                        </div>
                        <button onClick={() => setCampaignDraft(prev => ({ ...prev, body: '' }))} className="text-gray-500 hover:text-white">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-normal">Subject</label>
                            <input
                                type="text"
                                value={campaignDraft.subject}
                                onChange={(e) => setCampaignDraft(prev => ({ ...prev, subject: e.target.value }))}
                                className="w-full bg-transparent border-b border-white/10 py-2 text-white focus:outline-none focus:border-white transition-all text-sm font-normal"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-normal">Content</label>
                            <textarea
                                value={campaignDraft.body}
                                onChange={(e) => setCampaignDraft(prev => ({ ...prev, body: e.target.value }))}
                                rows={8}
                                className="w-full bg-white/[0.02] border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-white/20 transition-all text-sm font-normal resize-none"
                            />
                        </div>
                        <div className="flex items-center justify-between pt-4">
                            <p className="text-xs text-gray-500 font-normal">Targeting {selectedProspects.size} curated profiles</p>
                            <button
                                onClick={handleSendCampaign}
                                disabled={isLoading}
                                className="px-8 py-3 bg-white text-black rounded-lg text-sm font-normal hover:bg-gray-200 transition-all disabled:opacity-50"
                            >
                                {isLoading ? 'Launching...' : 'Deploy Campaign'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
