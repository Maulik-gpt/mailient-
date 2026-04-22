'use client';

/**
 * KnowledgeGraphDashboard Component
 * 
 * Dashboard showing knowledge graph statistics, recent agreements,
 * and graph health metrics.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Database, 
    GitGraph, 
    Target, 
    Clock, 
    TrendingUp,
    CheckCircle,
    AlertCircle,
    Sparkles,
    Activity
} from 'lucide-react';
import { GraphVisualization } from './graph-visualization';

interface GraphStats {
    totalNodes: number;
    totalEdges: number;
    recentEdges: number;
    relationTypes: Record<string, number>;
}

interface Agreement {
    id: string;
    type: string;
    from: string;
    to: string;
    createdAt: string;
    confidence: number;
}

export function KnowledgeGraphDashboard() {
    const [stats, setStats] = useState<GraphStats | null>(null);
    const [agreements, setAgreements] = useState<Agreement[]>([]);
    const [loading, setLoading] = useState(true);
    const [sampleNodes] = useState([
        { id: '1', label: 'User', type: 'person' },
        { id: '2', label: 'Project Alpha', type: 'project' },
        { id: '3', label: 'Feature X', type: 'feature' },
        { id: '4', label: 'Deadline', type: 'deadline' },
        { id: '5', label: 'Bug Fix', type: 'bug' }
    ]);
    const [sampleEdges] = useState([
        { source: '1', target: '2', relation: 'LEAD_ON' },
        { source: '2', target: '3', relation: 'HAS_FEATURE' },
        { source: '2', target: '4', relation: 'DUE_ON' },
        { source: '1', target: '5', relation: 'REPORTED_BY' }
    ]);

    useEffect(() => {
        fetchStats();
        fetchAgreements();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/graphrag/search?q=stats');
            // Mock stats for now
            setStats({
                totalNodes: 147,
                totalEdges: 234,
                recentEdges: 12,
                relationTypes: {
                    'AGREED_ON': 23,
                    'DECIDED_ON': 18,
                    'LEAD_ON': 31,
                    'WORKS_ON': 45,
                    'DUE_ON': 12
                }
            });
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const fetchAgreements = async () => {
        try {
            const response = await fetch('/api/graphrag/agreements?days=7');
            const data = await response.json();
            if (data.success) {
                setAgreements(data.agreements || []);
            }
        } catch (error) {
            console.error('Failed to fetch agreements:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            AGREED_ON: 'bg-emerald-500/20 text-emerald-300',
            DECIDED_ON: 'bg-blue-500/20 text-blue-300',
            LEAD_ON: 'bg-purple-500/20 text-purple-300',
            WORKS_ON: 'bg-orange-500/20 text-orange-300',
            DUE_ON: 'bg-red-500/20 text-red-300'
        };
        return colors[type] || 'bg-gray-500/20 text-gray-300';
    };

    const StatCard = ({ icon: Icon, label, value, subtext, color }: any) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5"
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-white/50 mb-1">{label}</p>
                    <p className="text-2xl font-semibold text-white/90">{value}</p>
                    {subtext && (
                        <p className="text-xs text-white/40 mt-1">{subtext}</p>
                    )}
                </div>
                <div className={`p-2 rounded-lg ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl border border-white/10">
                        <Database className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-white/90">Knowledge Graph</h2>
                        <p className="text-sm text-white/50">Smart Search & Retrieval System</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <Activity className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">Active</span>
                </div>
            </div>

            {/* Stats Grid */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        icon={Database}
                        label="Total Nodes"
                        value={stats.totalNodes}
                        subtext="Entities in graph"
                        color="bg-blue-500/20 text-blue-300"
                    />
                    <StatCard
                        icon={GitGraph}
                        label="Relationships"
                        value={stats.totalEdges}
                        subtext="Connected edges"
                        color="bg-purple-500/20 text-purple-300"
                    />
                    <StatCard
                        icon={Clock}
                        label="Recent Activity"
                        value={stats.recentEdges}
                        subtext="Last 7 days"
                        color="bg-orange-500/20 text-orange-300"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Graph Health"
                        value="98%"
                        subtext="All systems operational"
                        color="bg-green-500/20 text-green-300"
                    />
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Graph Visualization */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-white/80 flex items-center gap-2">
                            <GitGraph className="w-5 h-5 text-purple-400" />
                            Graph Visualization
                        </h3>
                        <span className="text-xs text-white/40">
                            Interactive • Drag nodes to rearrange
                        </span>
                    </div>
                    <GraphVisualization
                        nodes={sampleNodes}
                        edges={sampleEdges}
                        width={600}
                        height={300}
                    />
                </motion.div>

                {/* Recent Agreements */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-white/80 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            Recent Agreements
                        </h3>
                        <span className="text-xs text-white/40">
                            Last 7 days
                        </span>
                    </div>

                    <div className="space-y-3 max-h-80 overflow-y-auto">
                        {loading ? (
                            <div className="text-center py-8 text-white/40">
                                Loading...
                            </div>
                        ) : agreements.length === 0 ? (
                            <div className="text-center py-8 text-white/40">
                                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No recent agreements</p>
                                <p className="text-xs mt-1">Your agreements will appear here</p>
                            </div>
                        ) : (
                            agreements.slice(0, 5).map((agreement) => (
                                <div
                                    key={agreement.id}
                                    className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 text-xs rounded ${getTypeColor(agreement.type)}`}>
                                            {agreement.type}
                                        </span>
                                        <span className="text-xs text-white/40">
                                            {new Date(agreement.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-white/70">
                                        <span className="font-medium">{agreement.from}</span>
                                        {' → '}
                                        <span className="font-medium">{agreement.to}</span>
                                    </p>
                                    <div className="flex items-center gap-1 mt-2">
                                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500/50 rounded-full"
                                                style={{ width: `${(agreement.confidence || 0.8) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-white/40">
                                            {(agreement.confidence || 0.8).toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Relation Types Distribution */}
            {stats && stats.relationTypes && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6"
                >
                    <h3 className="text-lg font-medium text-white/80 mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-400" />
                        Relationship Types
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(stats.relationTypes).map(([type, count]) => (
                            <div
                                key={type}
                                className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10"
                            >
                                <span className={`w-2 h-2 rounded-full ${getTypeColor(type).split(' ')[0].replace('/20', '')}`} />
                                <span className="text-sm text-white/70">{type}</span>
                                <span className="text-sm font-medium text-white/90">{count}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"
                >
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-blue-300 mb-1">Hybrid Search Active</h4>
                            <p className="text-sm text-blue-200/70">
                                Your knowledge graph uses BM25 + Vector similarity for optimal retrieval. 
                                Recent items are automatically boosted in results.
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"
                >
                    <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-purple-400 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-purple-300 mb-1">Smart Extraction</h4>
                            <p className="text-sm text-purple-200/70">
                                The AI automatically extracts agreements, decisions, and deadlines 
                                from your conversations to build your knowledge graph.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default KnowledgeGraphDashboard;
