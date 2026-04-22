/**
 * useSmartSearch Hook
 * 
 * React hook for performing hybrid search with GraphRAG context.
 * Handles streaming, caching, and state management.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

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
}

interface SearchOptions {
    limit?: number;
    includeContext?: boolean;
    vectorWeight?: number;
    keywordWeight?: number;
    streaming?: boolean;
}

interface SearchState {
    results: SearchResult[];
    isLoading: boolean;
    error: string | null;
    context: any | null;
}

export function useSmartSearch() {
    const [state, setState] = useState<SearchState>({
        results: [],
        isLoading: false,
        error: null,
        context: null
    });

    const abortControllerRef = useRef<AbortController | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
            eventSourceRef.current?.close();
        };
    }, []);

    const search = useCallback(async (
        query: string,
        options: SearchOptions = {}
    ) => {
        const {
            limit = 10,
            includeContext = true,
            vectorWeight = 0.6,
            keywordWeight = 0.4,
            streaming = false
        } = options;

        // Cancel previous request
        abortControllerRef.current?.abort();
        eventSourceRef.current?.close();

        setState(prev => ({
            ...prev,
            isLoading: true,
            error: null,
            results: []
        }));

        try {
            if (streaming) {
                // Streaming search via SSE
                return await streamSearch(query, { limit, includeContext });
            } else {
                // Standard REST API search
                return await restSearch(query, {
                    limit,
                    includeContext,
                    vectorWeight,
                    keywordWeight
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Search failed';
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: errorMessage
            }));
            return { success: false, error: errorMessage };
        }
    }, []);

    const restSearch = async (
        query: string,
        options: Required<Omit<SearchOptions, 'streaming'>>
    ) => {
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const response = await fetch('/api/graphrag/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                options: {
                    limit: options.limit,
                    vectorWeight: options.vectorWeight,
                    keywordWeight: options.keywordWeight
                },
                includeContext: options.includeContext
            }),
            signal: abortController.signal
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Search failed');
        }

        setState({
            results: data.results || [],
            isLoading: false,
            error: null,
            context: data.context || null
        });

        return { success: true, data };
    };

    const streamSearch = async (
        query: string,
        options: Pick<SearchOptions, 'limit' | 'includeContext'>
    ) => {
        return new Promise((resolve, reject) => {
            const encodedQuery = encodeURIComponent(query);
            const eventSource = new EventSource(
                `/api/graphrag/stream?op=search&q=${encodedQuery}`
            );
            eventSourceRef.current = eventSource;

            const results: SearchResult[] = [];

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'result':
                        if (data.data) {
                            results.push(data.data);
                            setState(prev => ({
                                ...prev,
                                results: [...results],
                                isLoading: true
                            }));
                        }
                        break;

                    case 'results':
                        setState(prev => ({
                            ...prev,
                            isLoading: false
                        }));
                        resolve({ success: true, count: data.count });
                        eventSource.close();
                        break;

                    case 'complete':
                        setState(prev => ({
                            ...prev,
                            isLoading: false
                        }));
                        resolve({ success: true });
                        eventSource.close();
                        break;

                    case 'error':
                        setState(prev => ({
                            ...prev,
                            isLoading: false,
                            error: data.message
                        }));
                        reject(new Error(data.message));
                        eventSource.close();
                        break;
                }
            };

            eventSource.onerror = () => {
                eventSource.close();
                // Fallback to REST
                restSearch(query, {
                    limit: options.limit || 10,
                    includeContext: options.includeContext || true,
                    vectorWeight: 0.6,
                    keywordWeight: 0.4
                }).then(resolve).catch(reject);
            };
        });
    };

    const getContext = useCallback(async (entity: string) => {
        try {
            const response = await fetch(
                `/api/graphrag/context?entity=${encodeURIComponent(entity)}`
            );
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to get context:', error);
            return null;
        }
    }, []);

    const recordAgreement = useCallback(async (
        type: 'agreement' | 'decision',
        text: string,
        metadata?: Record<string, any>
    ) => {
        try {
            const response = await fetch('/api/graphrag/agreements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    text,
                    ...metadata
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to record agreement:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Failed' };
        }
    }, []);

    return {
        ...state,
        search,
        getContext,
        recordAgreement
    };
}

export default useSmartSearch;
