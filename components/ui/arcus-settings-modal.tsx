'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles, Loader2, Brain, FileText, Trash2, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface MemoryItem {
  id: string;
  content: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

interface ArcusSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveInstructions: (instructions: string, enabled: boolean) => void;
  onToggleMemory: (enabled: boolean) => void;
  initialInstructions?: string;
  initialInstructionsEnabled?: boolean;
  initialMemoryEnabled?: boolean;
}

type TabId = 'instructions' | 'memory';

// ════════════════════════════════════════════════════════════════════════════════
// TOGGLE SWITCH
// ════════════════════════════════════════════════════════════════════════════════

function ToggleSwitch({
  enabled,
  onToggle,
  label,
  description,
}: {
  enabled: boolean;
  onToggle: (val: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className="w-full flex items-center justify-between gap-4 group"
    >
      <div className="text-left">
        <span className="text-[13px] font-semibold text-black dark:text-white">{label}</span>
        {description && (
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0',
          enabled
            ? 'bg-black dark:bg-white'
            : 'bg-neutral-200 dark:bg-neutral-700'
        )}
      >
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          className={cn(
            'absolute top-[3px] w-[18px] h-[18px] rounded-full shadow-sm',
            enabled
              ? 'left-[22px] bg-white dark:bg-black'
              : 'left-[3px] bg-white dark:bg-neutral-300'
          )}
        />
      </div>
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MEMORY ITEM CARD
// ════════════════════════════════════════════════════════════════════════════════

function MemoryCard({
  memory,
  onDelete,
  isDeleting,
}: {
  memory: MemoryItem;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const formattedDate = memory.createdAt
    ? new Date(memory.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className="group flex items-start gap-3 px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/60 hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors"
    >
      <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 mt-2 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-neutral-700 dark:text-neutral-300 leading-relaxed break-words">
          {memory.content}
        </p>
        {formattedDate && (
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">{formattedDate}</p>
        )}
      </div>
      <button
        onClick={() => onDelete(memory.id)}
        disabled={isDeleting}
        className={cn(
          'p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 shrink-0',
          isDeleting
            ? 'cursor-not-allowed'
            : 'hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 dark:hover:text-red-400'
        )}
        aria-label="Delete memory"
      >
        {isDeleting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Trash2 className="w-3.5 h-3.5" />
        )}
      </button>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

export function ArcusSettingsModal({
  isOpen,
  onClose,
  onSaveInstructions,
  onToggleMemory,
  initialInstructions = '',
  initialInstructionsEnabled = true,
  initialMemoryEnabled = true,
}: ArcusSettingsModalProps) {
  // ── State ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('instructions');
  const [instructions, setInstructions] = useState(initialInstructions);
  const [instructionsEnabled, setInstructionsEnabled] = useState(initialInstructionsEnabled);
  const [memoryEnabled, setMemoryEnabled] = useState(initialMemoryEnabled);

  // Instructions
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState('');
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Memory
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [memoryError, setMemoryError] = useState('');

  // ── Sync with props ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setInstructions(initialInstructions);
      setInstructionsEnabled(initialInstructionsEnabled);
      setMemoryEnabled(initialMemoryEnabled);
      setEnhanceError('');
      setMemoryError('');
      setShowClearConfirm(false);
    }
  }, [isOpen, initialInstructions, initialInstructionsEnabled, initialMemoryEnabled]);

  // ── Load memories when tab switches or modal opens ───────────────────────────
  const loadMemories = useCallback(async () => {
    setIsLoadingMemories(true);
    setMemoryError('');
    try {
      const res = await fetch('/api/agent-talk/memory');
      if (!res.ok) throw new Error('Failed to load memories');
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (err: any) {
      setMemoryError(err.message || 'Failed to load memories');
      setMemories([]);
    } finally {
      setIsLoadingMemories(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'memory') {
      loadMemories();
    }
  }, [isOpen, activeTab, loadMemories]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleEnhance = async () => {
    const draft = instructions.trim();
    if (!draft) return;
    setIsEnhancing(true);
    setEnhanceError('');
    try {
      const res = await fetch('/api/agent-talk/personality/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft }),
      });
      const data = await res.json();
      if (!res.ok || !data.enhanced) throw new Error(data.error || 'Enhancement failed');
      setInstructions(data.enhanced);
      setTimeout(() => textareaRef.current?.focus(), 50);
    } catch (err: any) {
      setEnhanceError(err.message || 'Could not enhance. Try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSaveInstructions = async () => {
    setIsSavingInstructions(true);
    try {
      onSaveInstructions(instructions, instructionsEnabled);
    } finally {
      setIsSavingInstructions(false);
      onClose();
    }
  };

  const handleToggleMemory = async (enabled: boolean) => {
    setMemoryEnabled(enabled);
    try {
      await fetch('/api/agent-talk/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryEnabled: enabled }),
      });
      onToggleMemory(enabled);
    } catch {
      // Revert on failure
      setMemoryEnabled(!enabled);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    setDeletingMemoryId(id);
    try {
      const res = await fetch('/api/agent-talk/memory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryId: id }),
      });
      if (res.ok) {
        setMemories(prev => prev.filter(m => m.id !== id));
      }
    } catch {
      // silently fail — memory will remain
    } finally {
      setDeletingMemoryId(null);
    }
  };

  const handleClearAll = async () => {
    setIsClearingAll(true);
    try {
      const res = await fetch('/api/agent-talk/memory/clear', { method: 'POST' });
      if (res.ok) {
        setMemories([]);
        setShowClearConfirm(false);
      }
    } catch {
      // silently fail
    } finally {
      setIsClearingAll(false);
    }
  };

  if (!isOpen) return null;

  const tabs: { id: TabId; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'instructions', label: 'Instructions', icon: FileText },
    { id: 'memory', label: 'Memory', icon: Brain },
  ];

  const wordCount = instructions.trim() ? instructions.trim().split(/\s+/).length : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="relative w-[min(92vw,580px)] max-h-[85vh] shadow-2xl rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0e0e0e] flex flex-col overflow-hidden"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="text-lg font-bold tracking-tight text-black dark:text-white">
            Arcus Settings
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="px-6 pt-4">
          <div className="flex gap-0 border-b border-neutral-100 dark:border-neutral-800">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative flex items-center gap-2 px-4 pb-3 text-[13px] font-semibold transition-colors',
                    isActive
                      ? 'text-black dark:text-white'
                      : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.id === 'memory' && memories.length > 0 && (
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 tabular-nums">
                      {memories.length}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="arcus-settings-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-black dark:bg-white rounded-full"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Tab Content ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          <AnimatePresence mode="wait">
            {activeTab === 'instructions' ? (
              <motion.div
                key="instructions"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* Toggle */}
                <ToggleSwitch
                  enabled={instructionsEnabled}
                  onToggle={setInstructionsEnabled}
                  label="Enable Instructions"
                  description="When enabled, Arcus follows your custom instructions in every conversation."
                />

                {/* Textarea */}
                <div className={cn('relative transition-opacity', !instructionsEnabled && 'opacity-40 pointer-events-none')}>
                  <textarea
                    ref={textareaRef}
                    value={instructions}
                    onChange={(e) => { setInstructions(e.target.value); setEnhanceError(''); }}
                    placeholder="Tell Arcus how to behave, communicate, and respond..."
                    className="w-full min-h-[220px] p-4 pb-12 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-black dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 resize-none text-[14px] leading-relaxed"
                  />

                  {/* Bottom bar inside textarea */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    {enhanceError ? (
                      <span className="text-[11px] text-red-400">{enhanceError}</span>
                    ) : (
                      <span className="text-[11px] text-neutral-400 dark:text-neutral-600 tabular-nums">
                        {wordCount > 0 ? `${wordCount} words` : 'Write your instructions above'}
                      </span>
                    )}
                    <button
                      onClick={handleEnhance}
                      disabled={isEnhancing || !instructions.trim()}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                        instructions.trim() && !isEnhancing
                          ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-95'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                      )}
                    >
                      {isEnhancing ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Enhancing…</>
                      ) : (
                        <><Sparkles className="w-3 h-3" /> Enhance</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Hint */}
                <p className="text-[11px] text-neutral-400 dark:text-neutral-600 leading-relaxed">
                  Tip: Write a rough description and hit{' '}
                  <span className="font-semibold text-neutral-500 dark:text-neutral-400">Enhance</span>{' '}
                  — Arcus will expand it into a detailed professional instruction set.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="memory"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* Toggle */}
                <ToggleSwitch
                  enabled={memoryEnabled}
                  onToggle={handleToggleMemory}
                  label="Enable Memory"
                  description="When enabled, Arcus remembers context from your conversations to provide more personalized assistance."
                />

                {/* Memory List */}
                <div className={cn('transition-opacity', !memoryEnabled && 'opacity-40 pointer-events-none')}>
                  {isLoadingMemories ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                      <span className="text-[12px] text-neutral-400">Loading memories…</span>
                    </div>
                  ) : memoryError ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <AlertTriangle className="w-5 h-5 text-neutral-400" />
                      <span className="text-[12px] text-neutral-400">{memoryError}</span>
                      <button onClick={loadMemories} className="text-[12px] font-semibold text-black dark:text-white hover:underline">
                        Retry
                      </button>
                    </div>
                  ) : memories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <Brain className="w-8 h-8 text-neutral-200 dark:text-neutral-700" />
                      <p className="text-[13px] text-neutral-400 dark:text-neutral-500 text-center max-w-[280px]">
                        No memories yet. Arcus automatically remembers important context as you chat.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Header with clear all */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                          {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
                        </span>
                        {!showClearConfirm ? (
                          <button
                            onClick={() => setShowClearConfirm(true)}
                            className="text-[11px] font-semibold text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          >
                            Clear all
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-red-500">Delete all?</span>
                            <button
                              onClick={handleClearAll}
                              disabled={isClearingAll}
                              className="text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors"
                            >
                              {isClearingAll ? 'Clearing…' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setShowClearConfirm(false)}
                              className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Memory cards */}
                      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                        <AnimatePresence>
                          {memories.map((memory) => (
                            <MemoryCard
                              key={memory.id}
                              memory={memory}
                              onDelete={handleDeleteMemory}
                              isDeleting={deletingMemoryId === memory.id}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {activeTab === 'instructions' && (
          <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-3 bg-white dark:bg-[#0e0e0e]">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveInstructions}
              disabled={isSavingInstructions}
              className="px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center gap-2 active:scale-[0.97] bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
            >
              {isSavingInstructions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Save
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
