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

            if (!response.ok) throw new Error('Failed to search prospects');

            const data = await response.json();
            setProspects(data.prospects || []);
            toast.success(`Found ${data.prospects?.length || 0} prospects!`);
        } catch (error) {
            console.error('Search error:', error);
            toast.error('Failed to search prospects. Please try again.');
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
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d0d14] to-[#0a0a0f] text-white p-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center">
                        <Rocket className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                            AI Outreach Engine
                        </h1>
                        <p className="text-gray-400">Find leads, personalize at scale, send with AI</p>
                    </div>
                </div>
            </motion.div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-2xl w-fit backdrop-blur-xl border border-white/10">
                {[
                    { id: 'ai-setup', label: 'AI Setup', icon: Brain },
                    { id: 'search', label: 'Find Prospects', icon: Search },
                    { id: 'lists', label: 'My Lists', icon: Users },
                    { id: 'campaigns', label: 'Campaigns', icon: Send }
                ].map(tab => (
                    <motion.button
                        key={tab.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${activeTab === tab.id
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </motion.button>
                ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {/* AI Setup Tab */}
                {activeTab === 'ai-setup' && (
                    <motion.div
                        key="ai-setup"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        {/* Business URL Analyzer */}
                        <div className="bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-cyan-900/20 rounded-3xl p-8 border border-purple-500/20 backdrop-blur-xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                                    <ScanLine className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">AI Business Analyzer</h2>
                                    <p className="text-gray-400 text-sm">Enter your product URL and let AI understand your business</p>
                                </div>
                            </div>

                            <div className="flex gap-4 mb-6">
                                <div className="flex-1 relative">
                                    <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="url"
                                        value={businessProfile.url}
                                        onChange={(e) => setBusinessProfile(prev => ({ ...prev, url: e.target.value }))}
                                        placeholder="https://yourproduct.com"
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                    />
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleAnalyzeWebsite}
                                    disabled={isAnalyzing}
                                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            Analyze with AI
                                        </>
                                    )}
                                </motion.button>
                            </div>

                            {/* Business Profile Form */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Business Name</label>
                                    <input
                                        type="text"
                                        value={businessProfile.name}
                                        onChange={(e) => setBusinessProfile(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Your Business Name"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Industry</label>
                                    <select
                                        value={businessProfile.industry}
                                        onChange={(e) => setBusinessProfile(prev => ({ ...prev, industry: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-all"
                                    >
                                        <option value="">Select Industry</option>
                                        <option value="saas">SaaS / Software</option>
                                        <option value="ecommerce">E-commerce</option>
                                        <option value="fintech">Fintech</option>
                                        <option value="healthcare">Healthcare</option>
                                        <option value="education">Education</option>
                                        <option value="marketing">Marketing / Agency</option>
                                        <option value="consulting">Consulting</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm text-gray-400 mb-2">Value Proposition</label>
                                    <textarea
                                        value={businessProfile.valueProposition}
                                        onChange={(e) => setBusinessProfile(prev => ({ ...prev, valueProposition: e.target.value }))}
                                        placeholder="What unique value does your product provide?"
                                        rows={3}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all resize-none"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm text-gray-400 mb-2">Target Audience</label>
                                    <textarea
                                        value={businessProfile.targetAudience}
                                        onChange={(e) => setBusinessProfile(prev => ({ ...prev, targetAudience: e.target.value }))}
                                        placeholder="Who are your ideal customers? (e.g., SaaS founders, marketing managers...)"
                                        rows={2}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Email Tone</label>
                                    <select
                                        value={businessProfile.tone}
                                        onChange={(e) => setBusinessProfile(prev => ({ ...prev, tone: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-all"
                                    >
                                        <option value="professional">Professional</option>
                                        <option value="friendly">Friendly & Casual</option>
                                        <option value="bold">Bold & Direct</option>
                                        <option value="consultative">Consultative</option>
                                    </select>
                                </div>
                            </div>

                            {/* AI Suggestions */}
                            {aiSuggestions && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-6 p-6 bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-2xl border border-green-500/20"
                                >
                                    <div className="flex items-center gap-2 mb-4">
                                        <Sparkles className="w-5 h-5 text-green-400" />
                                        <h3 className="font-semibold text-green-400">AI Suggestions Ready!</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white/5 rounded-xl">
                                            <p className="text-sm text-gray-400 mb-2">Suggested Target Filters</p>
                                            <p className="text-white">{aiSuggestions.filters.jobTitle || 'Marketing, Sales, Founders'}</p>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-xl">
                                            <p className="text-sm text-gray-400 mb-2">Email Subject Lines</p>
                                            {aiSuggestions.subjectLines.slice(0, 2).map((line, i) => (
                                                <p key={i} className="text-white text-sm">• {line}</p>
                                            ))}
                                        </div>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleApplyAiFilters}
                                        className="mt-4 px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-semibold flex items-center gap-2 transition-colors"
                                    >
                                        <Target className="w-4 h-4" />
                                        Apply AI Filters & Start Searching
                                        <ArrowRight className="w-4 h-4" />
                                    </motion.button>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Search Tab */}
                {activeTab === 'search' && (
                    <motion.div
                        key="search"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        {/* Search Filters */}
                        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <Filter className="w-5 h-5 text-purple-400" />
                                    <h2 className="text-lg font-semibold">Search Filters</h2>
                                </div>
                                <span className="text-sm text-gray-400">Access to 700M+ professionals globally</span>
                            </div>

                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Job Title</label>
                                    <input
                                        type="text"
                                        value={searchFilters.jobTitle}
                                        onChange={(e) => setSearchFilters(prev => ({ ...prev, jobTitle: e.target.value }))}
                                        placeholder="e.g., CEO, Marketing Manager"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Company</label>
                                    <input
                                        type="text"
                                        value={searchFilters.company}
                                        onChange={(e) => setSearchFilters(prev => ({ ...prev, company: e.target.value }))}
                                        placeholder="e.g., Google, Stripe"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Industry</label>
                                    <select
                                        value={searchFilters.industry}
                                        onChange={(e) => setSearchFilters(prev => ({ ...prev, industry: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-all"
                                    >
                                        <option value="">All Industries</option>
                                        <option value="technology">Technology</option>
                                        <option value="finance">Finance</option>
                                        <option value="healthcare">Healthcare</option>
                                        <option value="retail">Retail</option>
                                        <option value="manufacturing">Manufacturing</option>
                                        <option value="education">Education</option>
                                        <option value="consulting">Consulting</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Location</label>
                                    <input
                                        type="text"
                                        value={searchFilters.location}
                                        onChange={(e) => setSearchFilters(prev => ({ ...prev, location: e.target.value }))}
                                        placeholder="e.g., San Francisco, USA"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Company Size</label>
                                    <select
                                        value={searchFilters.companySize}
                                        onChange={(e) => setSearchFilters(prev => ({ ...prev, companySize: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-all"
                                    >
                                        <option value="">Any Size</option>
                                        <option value="1-10">1-10 employees</option>
                                        <option value="11-50">11-50 employees</option>
                                        <option value="51-200">51-200 employees</option>
                                        <option value="201-500">201-500 employees</option>
                                        <option value="501-1000">501-1000 employees</option>
                                        <option value="1001+">1001+ employees</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Seniority Level</label>
                                    <select
                                        value={searchFilters.seniorityLevel}
                                        onChange={(e) => setSearchFilters(prev => ({ ...prev, seniorityLevel: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-all"
                                    >
                                        <option value="">Any Level</option>
                                        <option value="entry">Entry Level</option>
                                        <option value="mid">Mid Level</option>
                                        <option value="senior">Senior Level</option>
                                        <option value="director">Director</option>
                                        <option value="vp">VP</option>
                                        <option value="c-level">C-Level</option>
                                        <option value="founder">Founder / Owner</option>
                                    </select>
                                </div>
                                <div className="col-span-2 flex items-end">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleSearchProspects}
                                        disabled={isLoading}
                                        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Searching...
                                            </>
                                        ) : (
                                            <>
                                                <Search className="w-5 h-5" />
                                                Search Prospects
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        {/* Results */}
                        {prospects.length > 0 && (
                            <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <Users className="w-5 h-5 text-blue-400" />
                                        <h2 className="text-lg font-semibold">
                                            {prospects.length} Prospects Found
                                        </h2>
                                        <span className="text-sm text-gray-400">
                                            ({selectedProspects.size} selected)
                                        </span>
                                    </div>
                                    <div className="flex gap-3">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleSelectAll}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors"
                                        >
                                            {selectedProspects.size === prospects.length ? 'Deselect All' : 'Select All'}
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleSaveList}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Save to List
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleGenerateEmail}
                                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            Generate Email
                                        </motion.button>
                                    </div>
                                </div>

                                {/* Prospects Table */}
                                <div className="overflow-hidden rounded-2xl border border-white/10">
                                    <table className="w-full">
                                        <thead className="bg-white/5">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProspects.size === prospects.length}
                                                        onChange={handleSelectAll}
                                                        className="rounded"
                                                    />
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Name</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Email</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Job Title</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Company</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Location</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {prospects.map((prospect) => (
                                                <motion.tr
                                                    key={prospect.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className={`hover:bg-white/5 transition-colors ${selectedProspects.has(prospect.id) ? 'bg-purple-900/20' : ''
                                                        }`}
                                                >
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedProspects.has(prospect.id)}
                                                            onChange={(e) => {
                                                                const newSelected = new Set(selectedProspects);
                                                                if (e.target.checked) {
                                                                    newSelected.add(prospect.id);
                                                                } else {
                                                                    newSelected.delete(prospect.id);
                                                                }
                                                                setSelectedProspects(newSelected);
                                                            }}
                                                            className="rounded"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 font-medium">{prospect.name}</td>
                                                    <td className="px-4 py-3 text-gray-400">{prospect.email}</td>
                                                    <td className="px-4 py-3">{prospect.jobTitle}</td>
                                                    <td className="px-4 py-3 text-gray-300">{prospect.company}</td>
                                                    <td className="px-4 py-3 text-gray-400">{prospect.location}</td>
                                                    <td className="px-4 py-3">
                                                        {prospect.verified ? (
                                                            <span className="flex items-center gap-1 text-green-400 text-sm">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                Verified
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-yellow-400 text-sm">
                                                                <AlertCircle className="w-4 h-4" />
                                                                Unverified
                                                            </span>
                                                        )}
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Email Composer (shows when prospects are selected) */}
                        {selectedProspects.size > 0 && campaignDraft.body && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-cyan-900/20 rounded-3xl p-6 border border-purple-500/20 backdrop-blur-xl"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <Mail className="w-5 h-5 text-purple-400" />
                                    <h2 className="text-lg font-semibold">AI-Generated Email Template</h2>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Campaign Name</label>
                                        <input
                                            type="text"
                                            value={campaignDraft.name}
                                            onChange={(e) => setCampaignDraft(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g., Q1 SaaS Outreach"
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Subject Line</label>
                                        <input
                                            type="text"
                                            value={campaignDraft.subject}
                                            onChange={(e) => setCampaignDraft(prev => ({ ...prev, subject: e.target.value }))}
                                            placeholder="Email subject..."
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Email Body</label>
                                        <textarea
                                            value={campaignDraft.body}
                                            onChange={(e) => setCampaignDraft(prev => ({ ...prev, body: e.target.value }))}
                                            rows={8}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all resize-none font-mono text-sm"
                                        />
                                        <p className="mt-2 text-sm text-gray-500">
                                            Use variables: {'{{name}}'}, {'{{company}}'}, {'{{jobTitle}}'} for personalization
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center pt-4">
                                        <div className="text-sm text-gray-400">
                                            Ready to send to <span className="text-white font-semibold">{selectedProspects.size}</span> prospects
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleSendCampaign}
                                            disabled={isLoading}
                                            className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-green-500/25 transition-all disabled:opacity-50"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Launching...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-5 h-5" />
                                                    Launch Campaign
                                                </>
                                            )}
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* Lists Tab */}
                {activeTab === 'lists' && (
                    <motion.div
                        key="lists"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-xl">
                            <div className="flex items-center gap-3 mb-6">
                                <Users className="w-5 h-5 text-blue-400" />
                                <h2 className="text-lg font-semibold">My Prospect Lists</h2>
                            </div>

                            {savedLists.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400">No lists yet. Search and save prospects to create a list.</p>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setActiveTab('search')}
                                        className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-semibold"
                                    >
                                        Start Searching
                                    </motion.button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-4">
                                    {savedLists.map((list, index) => (
                                        <motion.div
                                            key={index}
                                            whileHover={{ scale: 1.02 }}
                                            className="p-6 bg-white/5 rounded-2xl border border-white/10 cursor-pointer hover:border-purple-500/50 transition-all"
                                        >
                                            <h3 className="font-semibold mb-2">{list.name}</h3>
                                            <p className="text-sm text-gray-400 mb-4">{list.prospects.length} prospects</p>
                                            <div className="flex gap-2">
                                                <button className="px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg text-sm hover:bg-purple-600/30 transition-colors">
                                                    View
                                                </button>
                                                <button className="px-3 py-1.5 bg-green-600/20 text-green-400 rounded-lg text-sm hover:bg-green-600/30 transition-colors">
                                                    Export
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Campaigns Tab */}
                {activeTab === 'campaigns' && (
                    <motion.div
                        key="campaigns"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <BarChart3 className="w-5 h-5 text-green-400" />
                                    <h2 className="text-lg font-semibold">Campaign Performance</h2>
                                </div>
                            </div>

                            {campaigns.length === 0 ? (
                                <div className="text-center py-12">
                                    <Send className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400">No campaigns yet. Create your first outreach campaign.</p>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setActiveTab('ai-setup')}
                                        className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-semibold"
                                    >
                                        Setup AI & Start
                                    </motion.button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {campaigns.map((campaign) => (
                                        <motion.div
                                            key={campaign.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="p-6 bg-white/5 rounded-2xl border border-white/10"
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h3 className="font-semibold text-lg">{campaign.name}</h3>
                                                    <p className="text-sm text-gray-400">
                                                        Created {new Date(campaign.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${campaign.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                                        campaign.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                                                            campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-4">
                                                <div className="p-4 bg-white/5 rounded-xl text-center">
                                                    <p className="text-2xl font-bold text-white">{campaign.prospects}</p>
                                                    <p className="text-sm text-gray-400">Total Prospects</p>
                                                </div>
                                                <div className="p-4 bg-white/5 rounded-xl text-center">
                                                    <p className="text-2xl font-bold text-blue-400">{campaign.sent}</p>
                                                    <p className="text-sm text-gray-400">Emails Sent</p>
                                                </div>
                                                <div className="p-4 bg-white/5 rounded-xl text-center">
                                                    <p className="text-2xl font-bold text-green-400">{campaign.opened}</p>
                                                    <p className="text-sm text-gray-400">Opened</p>
                                                </div>
                                                <div className="p-4 bg-white/5 rounded-xl text-center">
                                                    <p className="text-2xl font-bold text-purple-400">{campaign.replied}</p>
                                                    <p className="text-sm text-gray-400">Replied</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
