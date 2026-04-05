/**
 * Next Action Controls Component
 * 
 * Shows available next actions in the canvas:
 * - Suggested follow-up actions
 * - Quick action buttons
 * - Context-aware recommendations
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Sparkles,
  Calendar,
  FileText,
  Mail,
  ListTodo,
  Plus
} from 'lucide-react';

interface NextAction {
  id: string;
  type: string;
  label: string;
  description?: string;
  icon?: string;
  priority: 'high' | 'medium' | 'low';
  metadata?: {
    estimatedTime?: string;
    requiresApproval?: boolean;
    [key: string]: any;
  };
}

interface NextActionControlsProps {
  actions: NextAction[];
  onExecute: (actionId: string, payload?: any) => void;
  disabled?: boolean;
}

const iconMap: Record<string, any> = {
  calendar: Calendar,
  notion: FileText,
  email: Mail,
  tasks: ListTodo,
  default: ArrowRight
};

export function NextActionControls({ actions, onExecute, disabled }: NextActionControlsProps) {
  if (!actions || actions.length === 0) return null;

  // Sort by priority
  const sorted = [...actions].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const highPriority = sorted.filter(a => a.priority === 'high');
  const others = sorted.filter(a => a.priority !== 'high');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-yellow-400" />
        <h4 className="text-sm font-semibold text-black/80 dark:text-white/80">Suggested Next Actions</h4>
      </div>

      {/* High Priority Actions */}
      {highPriority.length > 0 && (
        <div className="space-y-2">
          {highPriority.map((action, index) => (
            <HighPriorityCard
              key={action.id}
              action={action}
              index={index}
              onExecute={onExecute}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Other Actions */}
      {others.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {others.map((action, index) => (
            <ActionButton
              key={action.id}
              action={action}
              index={index}
              onExecute={onExecute}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HighPriorityCard({ 
  action, 
  index, 
  onExecute, 
  disabled 
}: { 
  action: NextAction; 
  index: number;
  onExecute: (id: string, payload?: any) => void;
  disabled?: boolean;
}) {
  const Icon = iconMap[action.icon || 'default'] || ArrowRight;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 
                 rounded-xl p-4 hover:border-blue-500/50 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h5 className="font-medium text-black dark:text-white">{action.label}</h5>
            <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">
              Recommended
            </span>
          </div>
          
          {action.description && (
            <p className="text-sm text-neutral-600 dark:text-gray-400 mt-1">{action.description}</p>
          )}
          
          {action.metadata && (
            <div className="flex items-center gap-3 mt-2 text-xs text-neutral-600 dark:text-gray-500">
              {action.metadata.estimatedTime && (
                <span>~{action.metadata.estimatedTime}</span>
              )}
              {action.metadata.requiresApproval && (
                <span className="text-orange-400">Requires approval</span>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => onExecute(action.id)}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 
                     disabled:bg-neutral-100 dark:bg-gray-800 disabled:text-gray-600 text-black dark:text-white rounded-lg 
                     text-sm font-medium transition-colors"
        >
          Execute
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function ActionButton({ 
  action, 
  index, 
  onExecute, 
  disabled 
}: { 
  action: NextAction; 
  index: number;
  onExecute: (id: string, payload?: any) => void;
  disabled?: boolean;
}) {
  const Icon = iconMap[action.icon || 'default'] || ArrowRight;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onExecute(action.id)}
      disabled={disabled}
      className="flex items-center gap-2 p-3 bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 hover:bg-black/[0.05] dark:bg-black/[0.05] dark:bg-white/10 
                 disabled:bg-neutral-100 dark:bg-gray-800/50 disabled:text-gray-600
                 border border-neutral-200 dark:border-white/10 hover:border-neutral-300 dark:border-white/20
                 rounded-lg text-left transition-all group"
    >
      <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-gray-800 flex items-center justify-center">
        <Icon className="w-4 h-4 text-neutral-600 dark:text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-black dark:text-white truncate">{action.label}</p>
        {action.description && (
          <p className="text-xs text-neutral-600 dark:text-gray-500 truncate">{action.description}</p>
        )}
      </div>
      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-black dark:text-white transition-colors" />
    </motion.button>
  );
}

export default NextActionControls;
