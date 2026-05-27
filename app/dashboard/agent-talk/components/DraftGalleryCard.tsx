'use client';

/**
 * DraftGalleryCard — bulk draft approval per PART 8 #5.
 *
 * Rendered when 2+ drafts are produced in one chat turn. Shows a scrollable
 * list of preview rows (recipient + subject + body snippet) with checkboxes;
 * the user picks which to send, hits "Send selected", and confirms once.
 * Unselected drafts stay in Gmail Drafts (they're already saved by the
 * draft_reply / draft_cold_email tools when produced).
 *
 * Layout (matches spec):
 *   Header: "<N> drafts ready to review"        [X of N selected]
 *   [ ☐ Recipient  Subject ............... Body preview (first 80 chars) ... ]
 *   [ ☑ Recipient  Subject ............... Body preview .................... ]
 *   ...
 *   Footer: [Save all to drafts]       [Send selected (N)]
 *
 * Sending: sequential POSTs to /api/dashboard/agent-talk/send-email (same
 * route the single-draft modal uses). Each row goes idle → sending → sent
 * or → error with a small status icon. Toast on success/failure totals.
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Check, AlertCircle, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface DraftGalleryItem {
  /** Stable key for React + selection map (Gmail draft id is good) */
  id: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  threadId?: string;
  gmailDraftId?: string;
  voiceScore?: number;
}

interface DraftGalleryCardProps {
  drafts: DraftGalleryItem[];
  /** Called for each draft chosen to send. Should resolve on success, throw on failure. */
  onSendOne: (item: DraftGalleryItem) => Promise<void>;
  /** Called when user dismisses the gallery without sending. Drafts stay in Gmail Drafts. */
  onDismiss: () => void;
}

type RowStatus = 'idle' | 'sending' | 'sent' | 'error';

export function DraftGalleryCard({ drafts, onSendOne, onDismiss }: DraftGalleryCardProps) {
  // Default: all selected. Bulk draft creation is usually user-initiated
  // ("draft replies to all these emails"), so the most common path is
  // "send most of them" — defaulting to all-checked saves clicks.
  const [selected, setSelected] = useState<Set<string>>(() => new Set(drafts.map((d) => d.id)));
  const [statuses, setStatuses] = useState<Record<string, RowStatus>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const selectedCount = selected.size;
  const allSelected = selectedCount === drafts.length;
  const noneSelected = selectedCount === 0;

  const sentCount = useMemo(
    () => Object.values(statuses).filter((s) => s === 'sent').length,
    [statuses],
  );
  const errorCount = useMemo(
    () => Object.values(statuses).filter((s) => s === 'error').length,
    [statuses],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(drafts.map((d) => d.id)));
  };

  const handleSend = async () => {
    if (noneSelected || isSending) return;
    setIsSending(true);
    const ids = drafts.filter((d) => selected.has(d.id)).map((d) => d.id);
    let succeeded = 0;
    let failed = 0;
    for (const id of ids) {
      const item = drafts.find((d) => d.id === id);
      if (!item) continue;
      setStatuses((s) => ({ ...s, [id]: 'sending' }));
      try {
        await onSendOne(item);
        setStatuses((s) => ({ ...s, [id]: 'sent' }));
        succeeded++;
      } catch (err) {
        setStatuses((s) => ({ ...s, [id]: 'error' }));
        failed++;
      }
    }
    setIsSending(false);
    setShowConfirm(false);
    if (failed === 0) {
      toast.success(`Sent ${succeeded} email${succeeded === 1 ? '' : 's'}.`);
      // Auto-dismiss only if everything went out cleanly; otherwise keep
      // the gallery open so the user can see which rows failed.
      setTimeout(() => onDismiss(), 1800);
    } else {
      toast.error(`Sent ${succeeded} of ${ids.length} — ${failed} failed. Review errored rows below.`);
    }
  };

  const allDone = sentCount > 0 && sentCount + errorCount === selectedCount && !isSending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="mt-3 mb-1 bg-[#1A1A1A] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl relative"
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.025] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Mail className="w-4 h-4 text-white/55 flex-shrink-0" />
          <h3 className="text-[14px] font-bold text-white/90 truncate">
            {drafts.length} drafts ready to review
          </h3>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className="text-[11px] uppercase tracking-wider font-bold text-white/45 tabular-nums">
            {selectedCount} of {drafts.length} selected
          </span>
          <button
            onClick={toggleAll}
            className="text-[11px] uppercase tracking-wider font-bold text-white/45 hover:text-white/80 transition-colors"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>
      </div>

      {/* Scrollable preview list */}
      <div className="max-h-[420px] overflow-y-auto divide-y divide-white/[0.04]">
        {drafts.map((d) => {
          const isSelected = selected.has(d.id);
          const status = statuses[d.id] || 'idle';
          const snippet = d.body.replace(/\s+/g, ' ').trim().slice(0, 110);
          return (
            <label
              key={d.id}
              className={cn(
                'flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-colors',
                isSelected ? 'bg-white/[0.025]' : 'hover:bg-white/[0.015]',
                status === 'sent' && 'opacity-60',
                status === 'error' && 'bg-rose-500/[0.04]',
              )}
            >
              {/* Checkbox */}
              <div className="pt-0.5 flex-shrink-0">
                {status === 'sending' ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
                ) : status === 'sent' ? (
                  <div className="w-4 h-4 rounded-md bg-emerald-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                ) : status === 'error' ? (
                  <div className="w-4 h-4 rounded-md bg-rose-500/80 flex items-center justify-center">
                    <AlertCircle className="w-3 h-3 text-white" />
                  </div>
                ) : (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(d.id)}
                    disabled={isSending}
                    className="w-4 h-4 rounded-md border-white/20 bg-white/[0.04] text-emerald-500 focus:ring-emerald-500/40 focus:ring-1 cursor-pointer disabled:opacity-50"
                  />
                )}
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-[13.5px] font-bold text-white/90 truncate">{d.recipientName}</span>
                  {d.recipientEmail && (
                    <span className="text-[11px] text-white/40 font-mono truncate">&lt;{d.recipientEmail}&gt;</span>
                  )}
                  {typeof d.voiceScore === 'number' && (
                    <span
                      className={cn(
                        'ml-auto flex-shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums tracking-wide',
                        d.voiceScore >= 85
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : d.voiceScore >= 70
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-rose-500/15 text-rose-300',
                      )}
                    >
                      {d.voiceScore}
                    </span>
                  )}
                </div>
                <p className="text-[12.5px] text-white/65 truncate mt-0.5 font-medium">{d.subject}</p>
                <p className="text-[11.5px] text-white/35 truncate mt-0.5">{snippet}</p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-white/[0.06] bg-white/[0.025] flex items-center justify-between gap-3">
        {sentCount > 0 || errorCount > 0 ? (
          <div className="text-[11.5px] font-medium text-white/55">
            {sentCount > 0 && <span className="text-emerald-400/90">{sentCount} sent</span>}
            {sentCount > 0 && errorCount > 0 && <span className="text-white/30"> · </span>}
            {errorCount > 0 && <span className="text-rose-400/90">{errorCount} failed</span>}
          </div>
        ) : (
          <span className="text-[10.5px] uppercase tracking-widest font-bold text-white/35">Review and send</span>
        )}

        <div className="flex items-center gap-2.5">
          <button
            onClick={onDismiss}
            disabled={isSending}
            className="px-4 py-2 rounded-xl text-[12px] font-bold tracking-wide uppercase text-white/55 hover:text-white/85 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            {allDone ? 'Close' : 'Save all to drafts'}
          </button>
          {!allDone && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isSending || noneSelected}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-[12px] tracking-wide uppercase transition-all active:scale-95',
                isSending || noneSelected
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/25',
              )}
            >
              <Send className="w-3.5 h-3.5" />
              Send selected ({selectedCount})
            </button>
          )}
        </div>
      </div>

      {/* Inline confirm overlay — same pattern as DraftApprovalModal */}
      <AnimatePresence>
        {showConfirm && !isSending && !allDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-10 flex items-center justify-center px-6 backdrop-blur-md bg-black/60"
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="w-full max-w-md rounded-[20px] bg-[#1F1F1F] border border-white/12 shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-white/[0.06]">
                <p className="text-[10px] tracking-widest uppercase font-bold text-emerald-400/80 mb-2">Final confirmation</p>
                <p className="text-[15px] text-white/90 leading-snug">
                  Send <span className="font-semibold">{selectedCount}</span> email{selectedCount === 1 ? '' : 's'} now?
                </p>
                <p className="text-[12px] text-white/50 mt-1">This cannot be undone. Unselected drafts stay in your Gmail Drafts.</p>
              </div>
              <div className="px-6 py-4 flex items-center justify-end gap-2.5 bg-white/[0.02]">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-5 py-2.5 rounded-xl text-white/55 hover:text-white/85 hover:bg-white/5 font-bold text-[12px] tracking-wide uppercase transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[12px] tracking-wide uppercase bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
