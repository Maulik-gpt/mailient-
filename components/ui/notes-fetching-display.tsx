"use client";

import React from 'react';
import { Search, FileText, Clock } from 'lucide-react';

interface NotesFetchingDisplayProps {
    searchQuery?: string;
    isVisible: boolean;
}

export function NotesFetchingDisplay({ searchQuery, isVisible }: NotesFetchingDisplayProps) {
    if (!isVisible) return null;

    return (
        <div className="w-full max-w-4xl mx-auto my-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-lg">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-500 rounded-lg p-2">
                        <Search className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                            Fetching Your Notes
                        </h3>
                        {searchQuery && (
                            <p className="text-sm text-gray-600">
                                Searching for: "<span className="font-medium text-blue-700">{searchQuery}</span>"
                            </p>
                        )}
                    </div>
                </div>

                {/* Fetching Animation */}
                <div className="relative">
                    <div className="flex items-center justify-center py-8">
                        {/* Main fetching indicator */}
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <FileText className="w-6 h-6 text-blue-500 animate-pulse" />
                            </div>
                        </div>
                    </div>

                    {/* Fetching status */}
                    <div className="text-center space-y-2">
                        <p className="text-blue-700 font-medium">🔍 Special function performed: fetching</p>
                        <p className="text-sm text-gray-600">
                            I'm analyzing your notes database to find the most relevant information...
                        </p>
                    </div>

                    {/* Progress indicators */}
                    <div className="flex justify-center gap-2 mt-4">
                        {[0, 1, 2].map((index) => (
                            <div
                                key={index}
                                className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                                style={{
                                    animationDelay: `${index * 0.2}s`,
                                    animationDuration: '1s'
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer with estimated time */}
                <div className="mt-6 pt-4 border-t border-blue-200">
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>Usually takes 1-2 seconds</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default NotesFetchingDisplay;
