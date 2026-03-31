/**
 * SearchExecutionPanel - Live search progress UI
 * 
 * Shows animated search execution with:
 * - Progress steps for each search query
 * - Source results with icons
 * - Expandable "+X more" section
 * - Final synthesized answer
 * 
 * Based on Manus AI search interface design
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  Search, 
  CheckCircle2, 
  Circle,
  ChevronDown,
  ChevronUp,
  FileText,
  Mail,
  Calendar,
  Database,
  ExternalLink,
  Sparkles,
  Clock
} from 'lucide-react';

interface SearchQuery {
  id: string;
  query: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  results?: number;
  sources?: SearchSource[];
}

interface SearchSource {
  id: string;
  title: string;
  url?: string;
  icon?: string;
  favicon?: string;
  snippet?: string;
  type: 'web' | 'email' | 'document' | 'calendar' | 'database';
  connectorId?: string;
}

interface SearchExecutionPanelProps {
  mainQuery: string;
  subQueries: SearchQuery[];
  isSearching: boolean;
  sources: SearchSource[];
  answer?: string;
  onSourceClick?: (source: SearchSource) => void;
  maxVisibleSources?: number;
}

const sourceTypeIcons = {
  web: Globe,
  email: Mail,
  document: FileText,
  calendar: Calendar,
  database: Database
};

const sourceTypeColors = {
  web: 'bg-blue-500/20 text-blue-400',
  email: 'bg-yellow-500/20 text-yellow-400',
  document: 'bg-green-500/20 text-green-400',
  calendar: 'bg-purple-500/20 text-purple-400',
  database: 'bg-orange-500/20 text-orange-400'
};

export function SearchExecutionPanel({
  mainQuery,
  subQueries,
  isSearching,
  sources,
  answer,
  onSourceClick,
  maxVisibleSources = 3
}: SearchExecutionPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(0);

  // Calculate completed steps
  useEffect(() => {
    const completed = subQueries.filter(q => q.status === 'completed').length;
    setCompletedSteps(completed);
  }, [subQueries]);

  const visibleSources = expanded ? sources : sources.slice(0, maxVisibleSources);
  const hiddenCount = sources.length - maxVisibleSources;

  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden">
      {/* Header - Completed Steps */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2 text-sm">
          <motion.div
            initial={false}
            animate={isSearching ? { rotate: 360 } : { rotate: 0 }}
            transition={isSearching ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
          >
            {isSearching ? (
              <Search className="w-4 h-4 text-blue-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            )}
          </motion.div>
          <span className="text-gray-400">
            Completed {completedSteps} step{completedSteps !== 1 ? 's' : ''}
          </span>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="ml-auto text-gray-500 hover:text-gray-300 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main Query */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-start gap-3">
          <Globe className="w-4 h-4 text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm text-gray-300">{mainQuery}</p>
            <div className="mt-2 flex items-center gap-2">
              {isSearching && (
                <span className="text-xs text-blue-400 animate-pulse">Searching...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search Queries Progress */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-800 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-2">
              {subQueries.map((query, index) => (
                <SearchQueryItem key={query.id} query={query} index={index} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sources Found */}
      <div className="px-4 py-3 space-y-2">
        {visibleSources.map((source, index) => (
          <SourceCard 
            key={source.id} 
            source={source} 
            index={index}
            onClick={() => onSourceClick?.(source)}
          />
        ))}

        {/* +X More Button */}
        {hiddenCount > 0 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full py-2 px-3 flex items-center justify-center gap-2 
                       text-sm text-gray-500 hover:text-gray-300 
                       hover:bg-gray-800/50 rounded-lg transition-all"
          >
            <span>+{hiddenCount} more</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Answer Section */}
      {answer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-4 border-t border-gray-800"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-purple-400 mt-1" />
            <div className="flex-1">
              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                {answer}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function SearchQueryItem({ query, index }: { query: SearchQuery; index: number }) {
  const StatusIcon = query.status === 'completed' ? CheckCircle2 : 
                     query.status === 'running' ? Search : 
                     query.status === 'error' ? Circle : Circle;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-center gap-3"
    >
      <StatusIcon 
        className={`w-4 h-4 ${
          query.status === 'completed' ? 'text-green-400' :
          query.status === 'running' ? 'text-blue-400 animate-pulse' :
          query.status === 'error' ? 'text-red-400' :
          'text-gray-600'
        }`} 
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${
          query.status === 'completed' ? 'text-gray-400 line-through' :
          query.status === 'running' ? 'text-gray-300' :
          'text-gray-500'
        }`}>
          {query.query}
        </p>
      </div>
      {query.results !== undefined && (
        <span className="text-xs text-gray-500">
          {query.results} results
        </span>
      )}
    </motion.div>
  );
}

function SourceCard({ 
  source, 
  index,
  onClick 
}: { 
  source: SearchSource; 
  index: number;
  onClick?: () => void;
}) {
  const Icon = sourceTypeIcons[source.type] || Globe;
  const colorClass = sourceTypeColors[source.type] || sourceTypeColors.web;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`flex items-start gap-3 p-3 rounded-lg 
                  bg-gray-900/50 border border-gray-800/50
                  ${onClick ? 'cursor-pointer hover:bg-gray-800/50 hover:border-gray-700 transition-all' : ''}`}
    >
      {/* Icon or Favicon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        {source.favicon ? (
          <img 
            src={source.favicon} 
            alt="" 
            className="w-4 h-4 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <Icon className="w-4 h-4" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-gray-300 line-clamp-1">
            {source.title}
          </h4>
          {source.url && (
            <ExternalLink className="w-3 h-3 text-gray-600 flex-shrink-0 mt-0.5" />
          )}
        </div>
        {source.snippet && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {source.snippet}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// Example usage with mock data for Gmail search
export function GmailSearchExample() {
  const [isSearching, setIsSearching] = useState(true);
  const [subQueries, setSubQueries] = useState<SearchQuery[]>([
    { id: '1', query: 'emails from john@company.com', status: 'completed', results: 15 },
    { id: '2', query: 'meetings scheduled last week', status: 'completed', results: 8 },
    { id: '3', query: 'invoices and receipts', status: 'running', results: 0 },
    { id: '4', query: 'project updates Q4 2026', status: 'pending' },
  ]);

  const sources: SearchSource[] = [
    {
      id: '1',
      title: 'Re: Project Timeline Update - Q4 2026',
      type: 'email',
      snippet: 'Hi team, Here are the latest updates on our Q4 project timeline...',
      connectorId: 'google-calendar'
    },
    {
      id: '2',
      title: 'Invoice #2345 - Payment Confirmation',
      type: 'email',
      snippet: 'Thank you for your payment of $2,500. This confirms your transaction...',
      connectorId: 'google-calendar'
    },
    {
      id: '3',
      title: 'Weekly Team Sync - Notes',
      type: 'document',
      snippet: 'Meeting notes from our weekly sync held on March 15, 2026...',
      connectorId: 'notion'
    },
    {
      id: '4',
      title: 'SalesHandy - Email Analytics Report',
      type: 'web',
      url: 'https://saleshandy.com',
      favicon: '/connectors/saleshandy.svg',
      snippet: 'Your email open rates have increased by 25% this month...',
    },
    {
      id: '5',
      title: 'Cal.com - Meeting Scheduled',
      type: 'calendar',
      snippet: 'New meeting scheduled for March 25, 2026 at 2:00 PM...',
      connectorId: 'calcom'
    },
    {
      id: '6',
      title: 'Notion - Project Database',
      type: 'database',
      snippet: 'Found 12 matching pages in your workspace...',
      connectorId: 'notion'
    },
  ];

  return (
    <SearchExecutionPanel
      mainQuery="Find all project-related emails from Q4 2026 including meetings, invoices, and updates"
      subQueries={subQueries}
      isSearching={isSearching}
      sources={sources}
      answer="Based on your Gmail and connected apps, I found 15 project-related emails from Q4 2026. Key findings include:

• 3 invoices totaling $7,500 (all paid)
• 8 meeting invites with 100% acceptance rate
• 4 project update emails with latest timeline changes
• 2 document attachments in Notion

Your project appears to be on track with all major milestones met. Would you like me to draft a summary email to the team?"
    />
  );
}

export default SearchExecutionPanel;
