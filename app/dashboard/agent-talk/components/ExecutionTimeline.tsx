/**
 * Canvas Execution Timeline Component
 * 
 * Shows live execution progress with:
 * - Timeline of completed/pending/failed steps
 * - Real-time progress updates
 * - Duration tracking
 * - Visual step connectors
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle,
  Loader2,
  Play,
  Pause
} from 'lucide-react';

interface ExecutionStep {
  id: string;
  order: number;
  kind: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

interface ExecutionTimelineProps {
  steps: ExecutionStep[];
  currentStepId?: string;
  overallProgress: number;
  estimatedTimeRemaining?: number; // seconds
  runStatus: 'initializing' | 'thinking' | 'searching' | 'synthesizing' | 'approval' | 'executing' | 'completed' | 'failed';
}

const statusConfig = {
  pending: { icon: Circle, color: 'text-gray-500', bg: 'bg-gray-800', label: 'Pending' },
  running: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Running', animate: true },
  completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/20', label: 'Completed' },
  failed: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/20', label: 'Failed' },
  blocked: { icon: Pause, color: 'text-yellow-500', bg: 'bg-yellow-500/20', label: 'Blocked' },
  skipped: { icon: Play, color: 'text-gray-400', bg: 'bg-gray-700', label: 'Skipped' }
};

export function ExecutionTimeline({ 
  steps, 
  currentStepId,
  overallProgress,
  estimatedTimeRemaining,
  runStatus 
}: ExecutionTimelineProps) {
  const formatDuration = (ms?: number) => {
    if (!ms) return '--';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  const formatTimeRemaining = (seconds?: number) => {
    if (!seconds) return '';
    if (seconds < 60) return `~${Math.round(seconds)}s remaining`;
    return `~${Math.round(seconds / 60)}m remaining`;
  };

  return (
    <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Execution Timeline</h3>
            <p className="text-sm text-gray-400">
              {steps.filter(s => s.status === 'completed').length} of {steps.length} steps completed
              {estimatedTimeRemaining && (
                <span className="ml-2 text-blue-400">
                  {formatTimeRemaining(estimatedTimeRemaining)}
                </span>
              )}
            </p>
          </div>
        </div>
        
        {/* Overall Progress */}
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
            />
          </div>
          <span className="text-sm font-medium text-white w-10 text-right">
            {Math.round(overallProgress)}%
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-800" />

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const config = statusConfig[step.status];
            const Icon = config.icon;
            const isCurrent = step.id === currentStepId;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative flex items-start gap-4 p-3 rounded-lg transition-colors ${
                  isCurrent ? 'bg-blue-500/10 border border-blue-500/30' : 'hover:bg-gray-800/50'
                }`}
              >
                {/* Status Icon */}
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${config.bg}`}>
                  <Icon className={`w-4 h-4 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{step.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                      {isCurrent && (
                        <span className="text-xs text-blue-400 animate-pulse">Current</span>
                      )}
                    </div>
                    
                    {/* Duration */}
                    {step.durationMs && (
                      <span className="text-xs text-gray-500 font-mono">
                        {formatDuration(step.durationMs)}
                      </span>
                    )}
                  </div>

                  {/* Error Message */}
                  {step.error && (
                    <p className="text-sm text-red-400 mt-1">{step.error}</p>
                  )}

                  {/* Timestamps */}
                  {(step.startedAt || step.completedAt) && (
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      {step.startedAt && (
                        <span>Started: {new Date(step.startedAt).toLocaleTimeString()}</span>
                      )}
                      {step.completedAt && (
                        <span>Completed: {new Date(step.completedAt).toLocaleTimeString()}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Step Number */}
                <div className="text-xs text-gray-600 font-mono">
                  {String(step.order).padStart(2, '0')}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ExecutionTimeline;
