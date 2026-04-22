'use client';

/**
 * SmartSearch Component
 * 
 * Hybrid Search interface with real-time updates via SSE.
 * Features:
 * - Glassmorphism design
 * - Real-time streaming results
 * - Context visualization
 * - Agreement/Decision recording
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, 
    Brain, 
    GitGraph, 
    Clock, 
    CheckCircle, 
    Loader2,
    Sparkles,
    Zap,
    Target,
    Network
} from 'lucide-react';

interface SearchResult {
    id: string;
    label: string;
    type: string;
    score: number;
    scores?: {
        relevance: number;
        recency: number;
        confidence: number;
        final: number;
    };
    explanation?: any;
}

interface PlanStep {
    id: number;
    action: string;
    description: string;
    status: 'pending' | 'running' | 'complete';
}

interface StreamEvent {
    type: string;
    [key: string]: any;
}

export function SmartSearch() {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [planSteps, setPlanSteps] = useState<PlanStep[]>([]);
    const [streamStatus, setStreamStatus] = useState<'idle' | 'streaming' | 'complete'>('idle');
    const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
    const [contextData, setContextData] = useState<any>(null);
    const [showContext, setShowContext] = useState(false);
    
    const eventSourceRef = useRef<EventSource | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Cleanup SSE on unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const performSearch = useCallback(async (searchQuery: string, useStreaming = true) => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setResults([]);
        setPlanSteps([]);
        setStreamStatus('streaming');
        setContextData(null);

        if (useStreaming) {
            // Use SSE for real-time updates
            const encodedQuery = encodeURIComponent(searchQuery);
            const eventSource = new EventSource(
                `/api/graphrag/stream?op=plan&q=${encodedQuery}`
            );
            eventSourceRef.current = eventSource;

            eventSource.onmessage = (event) => {
                const data: StreamEvent = JSON.parse(event.data);
                
                switch (data.type) {
                    case 'init':
                        console.log('Stream initialized');
                        break;
                    
                    case 'plan':
                        if (data.steps) {
                            setPlanSteps(data.steps);
                        }
                        break;
                    
                    case 'plan-update':
                        setPlanSteps(prev => 
                            prev.map(step => 
                                step.id === data.stepId 
                                    ? { ...step, status: data.status }
                                    : step
                            )
                        );
                        break;
                    
                    case 'progress':
                        // Progress updates
                        break;
                    
                    case 'results':
                        // Switch to REST API for actual results
                        fetchResults(searchQuery);
                        break;
                    
                    case 'complete':
                        setStreamStatus('complete');
                        eventSource.close();
                        break;
                    
                    case 'error':
                        console.error('Stream error:', data.message);
                        eventSource.close();
                        fetchResults(searchQuery);
                        break;
                }
            };

            eventSource.onerror = () => {
                eventSource.close();
                fetchResults(searchQuery);
            };
        } else {
            await fetchResults(searchQuery);
        }
    }, []);

    const fetchResults = async (searchQuery: string) => {
        try {
            const response = await fetch('/api/graphrag/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: searchQuery,
                    includeContext: true,
                    options: { limit: 10 }
                })
            });

            const data = await response.json();
            
            if (data.success) {
                setResults(data.results);
                if (data.context) {
                    setContextData(data.context);
                }
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
            setStreamStatus('complete');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            performSearch(query);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'person': return <Target className="w-4 h-4" />;
            case 'project': return <GitGraph className="w-4 h-4" />;
            case 'decision': return <CheckCircle className="w-4 h-4" />;
            case 'agreement': return <CheckCircle className="w-4 h-4" />;
            case 'bug': return <Zap className="w-4 h-4" />;
            default: return <Brain className="w-4 h-4" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'person': return 'bg-blue-500/20 text-blue-300';
            case 'project': return 'bg-purple-500/20 text-purple-300';
            case 'decision': return 'bg-green-500/20 text-green-300';
            case 'agreement': return 'bg-emerald-500/20 text-emerald-300';
            case 'bug': return 'bg-red-500/20 text-red-300';
            case 'deadline': return 'bg-orange-500/20 text-orange-300';
            default: return 'bg-gray-500/20 text-gray-300';
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            {/* Glassmorphism Search Bar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl" />
                <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-2">
                    <div className="flex items-center gap-3 px-4">
                        <Search className="w-5 h-5 text-white/50" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search your knowledge graph... (e.g., 'What did we agree on?')"
                            className="flex-1 bg-transparent text-white placeholder-white/40 outline-none py-4 text-lg"
                        />
                        {isSearching ? (
                            <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => performSearch(query)}
                                disabled={!query.trim()}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl 
                                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Search
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Dynamic Plan Visualization - Liquid Glass */}
            <AnimatePresence>
                {planSteps.length > 0 && streamStatus === 'streaming' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-medium text-white/70">Execution Plan</span>
                        </div>
                        <div className="space-y-3">
                            {planSteps.map((step, index) => (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                                        step.status === 'complete' 
                                            ? 'bg-green-500/10 border-green-500/30' 
                                            : step.status === 'running'
                                                ? 'bg-blue-500/10 border-blue-500/30'
                                                : 'bg-white/5 border-white/10'
                                    }`}
                                >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                        step.status === 'complete'
                                            ? 'bg-green-500/30 text-green-400'
                                            : step.status === 'running'
                                                ? 'bg-blue-500/30 text-blue-400 animate-pulse'
                                                : 'bg-white/10 text-white/40'
                                    }`}>
                                        {step.status === 'complete' ? (
                                            <CheckCircle className="w-4 h-4" />
                                        ) : step.status === 'running' ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <span className="text-xs">{index + 1}</span>
                                        )}
                                    </div>
                                    <span className={`text-sm ${
                                        step.status === 'pending' ? 'text-white/40' : 'text-white/80'
                                    }`}>
                                        {step.description}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search Results */}
            <AnimatePresence>
                {results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-white/80">
                                Found {results.length} results
                            </h3>
                            <button
                                onClick={() => setShowContext(!showContext)}
                                className="flex items-center gap-2 text-sm text-white/60 hover:text-white/80 transition-colors"
                            >
                                <Network className="w-4 h-4" />
                                {showContext ? 'Hide Context' : 'Show Context'}
                            </button>
                        </div>

                        {results.map((result, index) => (
                            <motion.div
                                key={result.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => setSelectedResult(result)}
                                className={`group backdrop-blur-xl bg-white/5 border border-white/10 
                                          rounded-xl p-4 cursor-pointer transition-all duration-200
                                          hover:bg-white/10 hover:border-white/20
                                          ${selectedResult?.id === result.id ? 'ring-1 ring-blue-500/50' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${getTypeColor(result.type)}`}>
                                            {getTypeIcon(result.type)}
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-white/90">{result.label}</h4>
                                            <p className="text-sm text-white/50 capitalize">{result.type}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-semibold text-white/70">
                                            {(result.score * 100).toFixed(0)}%
                                        </div>
                                        <p className="text-xs text-white/40">match</p>
                                    </div>
                                </div>

                                {/* Score Breakdown */}
                                {result.scores && (
                                    <div className="mt-3 pt-3 border-t border-white/10">
                                        <div className="flex items-center gap-4 text-xs">
                                            <div className="flex items-center gap-1">
                                                <div className="w-2 h-2 rounded-full bg-blue-400" />
                                                <span className="text-white/50">
                                                    Relevance: {(result.scores.relevance * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="w-2 h-2 rounded-full bg-green-400" />
                                                <span className="text-white/50">
                                                    Recency: {(result.scores.recency * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="w-2 h-2 rounded-full bg-purple-400" />
                                                <span className="text-white/50">
                                                    Confidence: {(result.scores.confidence * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Context Visualization */}
            <AnimatePresence>
                {showContext && contextData && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <GitGraph className="w-5 h-5 text-purple-400" />
                            <h3 className="text-lg font-medium text-white/80">Related Context</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {contextData.map((node: any) => (
                                <motion.div
                                    key={node.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-3 rounded-lg bg-white/5 border border-white/10"
                                >
                                    <div className="flex items-center gap-2">
                                        {getTypeIcon(node.type)}
                                        <span className="font-medium text-white/80">{node.label}</span>
                                    </div>
                                    {node.sourceEntity && (
                                        <p className="text-xs text-white/40 mt-1">
                                            via {node.sourceEntity}
                                        </p>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty State */}
            {!isSearching && results.length === 0 && query && streamStatus === 'complete' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 text-white/40"
                >
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No results found in your knowledge graph.</p>
                    <p className="text-sm mt-2">Try a different query or check back later.</p>
                </motion.div>
            )}
        </div>
    );
}

export default SmartSearch;
