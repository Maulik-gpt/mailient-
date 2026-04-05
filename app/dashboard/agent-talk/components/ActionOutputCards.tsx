/**
 * Canvas Action Output Cards
 * 
 * Displays action execution results in the canvas:
 * - Notion page created (with link)
 * - Calendar event scheduled (with link)
 * - Task list created (with IDs)
 * - Email sent (with confirmation)
 * - Generic action results
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  ExternalLink, 
  CheckCircle2, 
  FileText, 
  Calendar, 
  ListTodo,
  Mail,
  Database,
  ArrowRight
} from 'lucide-react';

interface ActionOutput {
  id: string;
  actionType: string;
  success: boolean;
  message: string;
  externalRefs?: {
    notionPageId?: string;
    notionPageUrl?: string;
    calendarEventId?: string;
    calendarEventUrl?: string;
    meetLink?: string;
    taskListId?: string;
    taskIds?: string[];
    emailMessageId?: string;
    threadId?: string;
    [key: string]: any;
  };
  metadata?: {
    durationMs?: number;
    createdAt?: string;
    [key: string]: any;
  };
}

interface ActionOutputCardsProps {
  outputs: ActionOutput[];
  onViewDetails?: (output: ActionOutput) => void;
}

const actionConfig: Record<string, { icon: any; label: string; color: string }> = {
  'notion_create_page': { icon: FileText, label: 'Notion Page Created', color: 'text-black dark:text-white' },
  'notion_append': { icon: FileText, label: 'Notion Updated', color: 'text-black dark:text-white' },
  'create_event': { icon: Calendar, label: 'Event Scheduled', color: 'text-blue-400' },
  'create_meeting_space': { icon: Calendar, label: 'Meet Space Created', color: 'text-purple-400' },
  'create_task': { icon: ListTodo, label: 'Task Created', color: 'text-green-400' },
  'create_task_list': { icon: ListTodo, label: 'Task List Created', color: 'text-green-400' },
  'send_email': { icon: Mail, label: 'Email Sent', color: 'text-red-400' },
  'save_draft': { icon: Mail, label: 'Draft Saved', color: 'text-neutral-600 dark:text-gray-400' },
  'query_database': { icon: Database, label: 'Database Queried', color: 'text-blue-400' }
};

export function ActionOutputCards({ outputs, onViewDetails }: ActionOutputCardsProps) {
  if (!outputs || outputs.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">
        Action Results
      </h4>
      
      <div className="grid gap-3">
        {outputs.map((output, index) => (
          <ActionCard 
            key={output.id} 
            output={output} 
            index={index}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  );
}

function ActionCard({ 
  output, 
  index,
  onViewDetails 
}: { 
  output: ActionOutput; 
  index: number;
  onViewDetails?: (output: ActionOutput) => void;
}) {
  const config = actionConfig[output.actionType] || { 
    icon: CheckCircle2, 
    label: output.actionType, 
    color: 'text-black dark:text-white' 
  };
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-[#1a1a1a] border border-neutral-200 dark:border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-lg bg-neutral-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h5 className="font-medium text-black dark:text-white">{config.label}</h5>
            {output.success && (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
          </div>
          
          <p className="text-sm text-neutral-600 dark:text-gray-400 mt-1">{output.message}</p>

          {/* External Links */}
          {output.externalRefs && (
            <div className="flex flex-wrap gap-2 mt-3">
              {output.externalRefs.notionPageUrl && (
                <a
                  href={output.externalRefs.notionPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 hover:bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10 
                           rounded-lg text-sm text-black dark:text-white transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in Notion
                </a>
              )}
              
              {output.externalRefs.calendarEventUrl && (
                <a
                  href={output.externalRefs.calendarEventUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 
                           rounded-lg text-sm text-blue-400 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  View Event
                </a>
              )}
              
              {output.externalRefs.meetLink && (
                <a
                  href={output.externalRefs.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 
                           rounded-lg text-sm text-purple-400 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Join Meet
                </a>
              )}
              
              {output.externalRefs.taskListId && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 
                               rounded-lg text-sm text-green-400">
                  <ListTodo className="w-3.5 h-3.5" />
                  {output.externalRefs.taskIds?.length || 0} tasks created
                </div>
              )}
              
              {output.externalRefs.emailMessageId && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-gray-800 
                               rounded-lg text-sm text-neutral-600 dark:text-gray-400">
                  <Mail className="w-3.5 h-3.5" />
                  Message ID: {output.externalRefs.emailMessageId.slice(-8)}
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          {output.metadata?.durationMs && (
            <p className="text-xs text-neutral-600 dark:text-gray-500 mt-2">
              Completed in {Math.round(output.metadata.durationMs / 1000)}s
              {output.metadata.createdAt && (
                <span className="ml-2">
                  at {new Date(output.metadata.createdAt).toLocaleTimeString()}
                </span>
              )}
            </p>
          )}
        </div>

        {/* View Details Button */}
        {onViewDetails && (
          <button
            onClick={() => onViewDetails(output)}
            className="p-2 hover:bg-neutral-100 dark:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowRight className="w-4 h-4 text-neutral-600 dark:text-gray-400" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default ActionOutputCards;
