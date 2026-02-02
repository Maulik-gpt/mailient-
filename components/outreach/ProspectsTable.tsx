'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, AlertCircle, ExternalLink,
    ChevronUp, ChevronDown, Search, Filter,
    Download, Mail, Linkedin
} from 'lucide-react';

interface Prospect {
    id: string;
    name: string;
    email: string;
    jobTitle: string;
    company: string;
    companyDomain?: string;
    location: string;
    industry?: string;
    linkedinUrl?: string;
    verified: boolean;
}

type SortField = 'name' | 'company' | 'jobTitle' | 'location';
type SortDirection = 'asc' | 'desc';

interface ProspectsTableProps {
    prospects: Prospect[];
    selectedIds: Set<string>;
    onSelectionChange: (ids: Set<string>) => void;
    onExport?: (prospects: Prospect[]) => void;
    className?: string;
}

export function ProspectsTable({
    prospects,
    selectedIds,
    onSelectionChange,
    onExport,
    className = ''
}: ProspectsTableProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'unverified'>('all');

    // Filter and sort prospects
    const filteredProspects = useMemo(() => {
        let result = [...prospects];

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.email.toLowerCase().includes(query) ||
                p.company.toLowerCase().includes(query) ||
                p.jobTitle.toLowerCase().includes(query)
            );
        }

        // Apply verified filter
        if (filterVerified !== 'all') {
            result = result.filter(p =>
                filterVerified === 'verified' ? p.verified : !p.verified
            );
        }

        // Apply sorting
        result.sort((a, b) => {
            const aVal = a[sortField].toLowerCase();
            const bVal = b[sortField].toLowerCase();
            const comparison = aVal.localeCompare(bVal);
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [prospects, searchQuery, sortField, sortDirection, filterVerified]);

    const handleSelectAll = () => {
        if (selectedIds.size === filteredProspects.length) {
            onSelectionChange(new Set());
        } else {
            onSelectionChange(new Set(filteredProspects.map(p => p.id)));
        }
    };

    const handleSelectOne = (id: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        onSelectionChange(newSelection);
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleExport = () => {
        if (onExport) {
            const selected = prospects.filter(p => selectedIds.has(p.id));
            onExport(selected.length > 0 ? selected : filteredProspects);
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc'
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />;
    };

    const verifiedCount = prospects.filter(p => p.verified).length;

    return (
        <div className={`bg-white/5 rounded-2xl border border-white/10 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 lg:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search prospects..."
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 text-sm"
                        />
                    </div>

                    <select
                        value={filterVerified}
                        onChange={(e) => setFilterVerified(e.target.value as typeof filterVerified)}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
                    >
                        <option value="all" className="bg-[#1a1a1f]">All ({prospects.length})</option>
                        <option value="verified" className="bg-[#1a1a1f]">Verified ({verifiedCount})</option>
                        <option value="unverified" className="bg-[#1a1a1f]">Unverified ({prospects.length - verifiedCount})</option>
                    </select>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">
                        {selectedIds.size} of {filteredProspects.length} selected
                    </span>

                    {onExport && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleExport}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="px-4 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size === filteredProspects.length && filteredProspects.length > 0}
                                    onChange={handleSelectAll}
                                    className="rounded border-gray-600 bg-white/10 text-purple-500 focus:ring-purple-500"
                                />
                            </th>
                            <th
                                className="px-4 py-3 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center gap-1">
                                    Name <SortIcon field="name" />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Email</th>
                            <th
                                className="px-4 py-3 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                                onClick={() => handleSort('jobTitle')}
                            >
                                <div className="flex items-center gap-1">
                                    Job Title <SortIcon field="jobTitle" />
                                </div>
                            </th>
                            <th
                                className="px-4 py-3 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                                onClick={() => handleSort('company')}
                            >
                                <div className="flex items-center gap-1">
                                    Company <SortIcon field="company" />
                                </div>
                            </th>
                            <th
                                className="px-4 py-3 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                                onClick={() => handleSort('location')}
                            >
                                <div className="flex items-center gap-1">
                                    Location <SortIcon field="location" />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        <AnimatePresence>
                            {filteredProspects.map((prospect, index) => (
                                <motion.tr
                                    key={prospect.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: index * 0.02 }}
                                    className={`hover:bg-white/5 transition-colors ${selectedIds.has(prospect.id) ? 'bg-purple-900/20' : ''
                                        }`}
                                >
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(prospect.id)}
                                            onChange={() => handleSelectOne(prospect.id)}
                                            className="rounded border-gray-600 bg-white/10 text-purple-500 focus:ring-purple-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium text-sm">
                                                {prospect.name[0]}
                                            </div>
                                            <span className="font-medium text-white">{prospect.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 text-sm">{prospect.email}</td>
                                    <td className="px-4 py-3 text-white text-sm">{prospect.jobTitle}</td>
                                    <td className="px-4 py-3 text-gray-300 text-sm">{prospect.company}</td>
                                    <td className="px-4 py-3 text-gray-400 text-sm">{prospect.location}</td>
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
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                                title="Send email"
                                            >
                                                <Mail className="w-4 h-4 text-gray-400 hover:text-white" />
                                            </button>
                                            {prospect.linkedinUrl && (
                                                <a
                                                    href={prospect.linkedinUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                                    title="View LinkedIn"
                                                >
                                                    <Linkedin className="w-4 h-4 text-gray-400 hover:text-blue-400" />
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>

            {/* Empty State */}
            {filteredProspects.length === 0 && (
                <div className="p-12 text-center">
                    <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No prospects found matching your criteria</p>
                </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between text-sm text-gray-400">
                <span>Showing {filteredProspects.length} of {prospects.length} prospects</span>
                <span>{verifiedCount} verified emails ({((verifiedCount / prospects.length) * 100 || 0).toFixed(0)}%)</span>
            </div>
        </div>
    );
}

export default ProspectsTable;
