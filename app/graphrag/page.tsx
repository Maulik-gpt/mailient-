'use client';

/**
 * GraphRAG Demo Page
 * 
 * Demonstrates Smart Search & Retrieval with Knowledge Graph
 */

import { SmartSearch, KnowledgeGraphDashboard } from '@/components/graphrag';
import { motion } from 'framer-motion';
import { Brain, GitGraph, Sparkles } from 'lucide-react';

export default function GraphRAGPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
            <div className="max-w-6xl mx-auto px-6 py-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl border border-white/10">
                            <Brain className="w-8 h-8 text-purple-400" />
                        </div>
                        <div className="p-3 bg-gradient-to-br from-blue-500/20 to-green-500/20 rounded-2xl border border-white/10">
                            <GitGraph className="w-8 h-8 text-blue-400" />
                        </div>
                        <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl border border-white/10">
                            <Sparkles className="w-8 h-8 text-green-400" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-blue-400 to-green-400 bg-clip-text text-transparent">
                        Smart Search & Retrieval
                    </h1>
                    <p className="text-lg text-white/60">
                        Hybrid BM25 + Vector Search with GraphRAG Context
                    </p>
                </motion.div>

                {/* Smart Search */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-12"
                >
                    <SmartSearch />
                </motion.div>

                {/* Dashboard */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <KnowledgeGraphDashboard />
                </motion.div>
            </div>
        </div>
    );
}
