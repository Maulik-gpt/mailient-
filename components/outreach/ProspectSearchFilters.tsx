'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Building2, MapPin, Briefcase,
    Users, ChevronDown, X, Sparkles
} from 'lucide-react';

interface SearchFilters {
    query: string;
    jobTitle: string;
    company: string;
    industry: string;
    location: string;
    companySize: string;
    seniorityLevel: string;
}

interface ProspectSearchFiltersProps {
    filters: SearchFilters;
    onFiltersChange: (filters: SearchFilters) => void;
    onSearch: () => void;
    onApplyAISuggestions?: () => void;
    isLoading?: boolean;
    hasAISuggestions?: boolean;
}

const INDUSTRIES = [
    { value: '', label: 'All Industries' },
    { value: 'technology', label: 'Technology' },
    { value: 'saas', label: 'SaaS / Software' },
    { value: 'finance', label: 'Finance & Banking' },
    { value: 'fintech', label: 'Fintech' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'ecommerce', label: 'E-commerce' },
    { value: 'retail', label: 'Retail' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'education', label: 'Education' },
    { value: 'consulting', label: 'Consulting' },
    { value: 'marketing', label: 'Marketing & Advertising' },
    { value: 'real-estate', label: 'Real Estate' },
    { value: 'legal', label: 'Legal' }
];

const COMPANY_SIZES = [
    { value: '', label: 'Any Size' },
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '501-1000', label: '501-1000 employees' },
    { value: '1001-5000', label: '1001-5000 employees' },
    { value: '5001+', label: '5001+ employees' }
];

const SENIORITY_LEVELS = [
    { value: '', label: 'Any Level' },
    { value: 'entry', label: 'Entry Level' },
    { value: 'mid', label: 'Mid Level' },
    { value: 'senior', label: 'Senior Level' },
    { value: 'manager', label: 'Manager' },
    { value: 'director', label: 'Director' },
    { value: 'vp', label: 'VP' },
    { value: 'c-level', label: 'C-Level Executive' },
    { value: 'founder', label: 'Founder / Owner' }
];

const POPULAR_JOB_TITLES = [
    'CEO', 'CTO', 'CFO', 'CMO', 'COO',
    'VP of Sales', 'VP of Marketing', 'VP of Engineering',
    'Director of Sales', 'Director of Marketing', 'Director of Product',
    'Sales Manager', 'Marketing Manager', 'Product Manager',
    'Founder', 'Co-Founder', 'Head of Growth'
];

export function ProspectSearchFilters({
    filters,
    onFiltersChange,
    onSearch,
    onApplyAISuggestions,
    isLoading = false,
    hasAISuggestions = false
}: ProspectSearchFiltersProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showJobTitleSuggestions, setShowJobTitleSuggestions] = useState(false);

    const updateFilter = (key: keyof SearchFilters, value: string) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    const clearFilters = () => {
        onFiltersChange({
            query: '',
            jobTitle: '',
            company: '',
            industry: '',
            location: '',
            companySize: '',
            seniorityLevel: ''
        });
    };

    const activeFilterCount = Object.values(filters).filter(v => v).length;

    return (
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Search className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Find Prospects</h3>
                        <p className="text-sm text-gray-400">Search 700M+ professionals worldwide</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {hasAISuggestions && onApplyAISuggestions && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onApplyAISuggestions}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            Apply AI Suggestions
                        </motion.button>
                    )}

                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                        >
                            <X className="w-4 h-4" />
                            Clear ({activeFilterCount})
                        </button>
                    )}
                </div>
            </div>

            {/* Main Filters */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Job Title */}
                <div className="relative">
                    <label className="block text-sm text-gray-400 mb-1.5">Job Title</label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            value={filters.jobTitle}
                            onChange={(e) => updateFilter('jobTitle', e.target.value)}
                            onFocus={() => setShowJobTitleSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowJobTitleSuggestions(false), 200)}
                            placeholder="e.g., CEO, VP of Sales"
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                    </div>

                    {/* Job Title Suggestions */}
                    <AnimatePresence>
                        {showJobTitleSuggestions && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute z-20 top-full left-0 right-0 mt-1 p-2 bg-[#1a1a1f] border border-white/10 rounded-xl shadow-xl max-h-48 overflow-y-auto"
                            >
                                <div className="flex flex-wrap gap-1.5">
                                    {POPULAR_JOB_TITLES.map(title => (
                                        <button
                                            key={title}
                                            onClick={() => {
                                                const current = filters.jobTitle;
                                                updateFilter('jobTitle', current ? `${current}, ${title}` : title);
                                            }}
                                            className="px-2 py-1 text-xs bg-white/5 hover:bg-purple-500/20 border border-white/10 rounded-md text-gray-300 hover:text-white transition-colors"
                                        >
                                            {title}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Company */}
                <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Company</label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            value={filters.company}
                            onChange={(e) => updateFilter('company', e.target.value)}
                            placeholder="e.g., Google, Stripe"
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                    </div>
                </div>

                {/* Industry */}
                <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Industry</label>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <select
                            value={filters.industry}
                            onChange={(e) => updateFilter('industry', e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all appearance-none cursor-pointer"
                        >
                            {INDUSTRIES.map(industry => (
                                <option key={industry.value} value={industry.value} className="bg-[#1a1a1f]">
                                    {industry.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                </div>

                {/* Location */}
                <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Location</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            value={filters.location}
                            onChange={(e) => updateFilter('location', e.target.value)}
                            placeholder="e.g., San Francisco, USA"
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Advanced Filters Toggle */}
            <div className="px-4 pb-2">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    Advanced Filters
                </button>
            </div>

            {/* Advanced Filters */}
            <AnimatePresence>
                {showAdvanced && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/10 pt-4">
                            {/* Company Size */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">Company Size</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <select
                                        value={filters.companySize}
                                        onChange={(e) => updateFilter('companySize', e.target.value)}
                                        className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all appearance-none cursor-pointer"
                                    >
                                        {COMPANY_SIZES.map(size => (
                                            <option key={size.value} value={size.value} className="bg-[#1a1a1f]">
                                                {size.label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                </div>
                            </div>

                            {/* Seniority Level */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">Seniority Level</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <select
                                        value={filters.seniorityLevel}
                                        onChange={(e) => updateFilter('seniorityLevel', e.target.value)}
                                        className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all appearance-none cursor-pointer"
                                    >
                                        {SENIORITY_LEVELS.map(level => (
                                            <option key={level.value} value={level.value} className="bg-[#1a1a1f]">
                                                {level.label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search Button */}
            <div className="p-4 border-t border-white/10 bg-white/5">
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={onSearch}
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
    );
}

export default ProspectSearchFilters;
