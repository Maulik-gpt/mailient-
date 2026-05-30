'use client';

/**
 * DraftApprovalModal — full-screen overlay modal per PART 8 #3.
 *
 * Renders when a single email draft is ready for approval. Layout matches the
 * spec exactly:
 *   - dark semi-transparent backdrop dimming everything behind
 *   - centered card with rounded corners and a soft fade/scale entrance
 *   - "Here's the draft to <Name>" header + To/Subject summary
 *   - email body as clean formatted text (line breaks preserved, no code block)
 *   - "Good to send?" speech bubble
 *   - three action buttons: Send Now (green) / Edit Draft / Save to Drafts
 *
 * Send Now → inline confirm overlay ON THE SAME modal (not a separate popup):
 *   "Sending to <Name> at <email>. This cannot be undone."
 *   [Cancel] [Confirm Send]
 *
 * Edit Draft → transforms the body into an editable view (rich-text upgrade
 * comes in PART 8 #4; for now this defers to the parent's onEdit callback
 * or falls back to an inline textarea so this commit is self-contained).
 *
 * Escape key closes without sending. Click outside the card closes without
 * sending. Save to Drafts closes without sending — the draft is already
 * persisted in Gmail Drafts by the draft_reply / draft_cold_email tool.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Edit3, Save, AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RichTextEditor } from './RichTextEditor';

/**
 * Render a draft body that may contain light markdown (bold, italic,
 * links, list bullets, paragraph breaks) as safe HTML. We:
 *   1. Escape every HTML special char in the source first (XSS-safe)
 *   2. Re-apply a tiny whitelist of conversions
 *
 * Intentionally MORE LIMITED than ReactMarkdown — emails don't need
 * headings, tables, code fences. Keeps the output looking like a real
 * email body, not a doc.
 */
function renderDraftMarkdown(raw: string): string {
  if (!raw) return '';
  // Step 1: escape everything
  let s = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Step 2: inline markdown — order matters (links before bold so URLs in
  // brackets aren't treated as italics)
  // [text](url)  →  <a href="url">text</a>
  s = s.replace(
    /\[([^\]]+)\]\(((?:https?|mailto):[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline decoration-blue-400/40 underline-offset-2 hover:decoration-blue-400 transition-colors">$1</a>',
  );
  // **bold** (must come before *italic*)
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
  // _italic_ or *italic* (single character)
  s = s.replace(/(?<![*\w])\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');
  s = s.replace(/(?<![_\w])_([^_\n]+?)_(?!_)/g, '<em>$1</em>');
  // `code`
  s = s.replace(/`([^`\n]+?)`/g, '<code class="px-1 py-0.5 rounded bg-white/10 text-[12px] font-mono">$1</code>');

  // Step 3: block-level — split paragraphs by blank lines, normalize bullets
  const paragraphs = s.split(/\n\s*\n/);
  const rendered = paragraphs
    .map(para => {
      const lines = para.split('\n').map(l => l.trimEnd());
      // Detect a list: every non-empty line starts with -, *, or N. / N)
      const isList = lines.length > 0 && lines.every(l => !l.trim() || /^\s*([-*]|\d+[.)])\s+/.test(l));
      if (isList && lines.some(l => l.trim())) {
        const isOrdered = lines.some(l => /^\s*\d+[.)]/.test(l));
        const items = lines
          .map(l => l.replace(/^\s*([-*]|\d+[.)])\s+/, ''))
          .filter(l => l.length > 0)
          .map(l => `<li>${l}</li>`)
          .join('');
        return isOrdered
          ? `<ol class="list-decimal pl-5 my-2 space-y-1">${items}</ol>`
          : `<ul class="list-disc pl-5 my-2 space-y-1">${items}</ul>`;
      }
      // Plain paragraph: single newlines become <br>
      return `<p class="mb-3 last:mb-0">${lines.join('<br>')}</p>`;
    })
    .join('');

  return rendered;
}

export interface DraftApprovalData {
  content: string;
  recipientName: string;
  recipientEmail: string;
  senderName?: string;
  subject: string;
  threadId?: string;
  gmailDraftId?: string;
  /** 0-100 voice-match score from reviewDraft */
  voiceScore?: number;
  /** One-line critique surfaced under the score badge when score < 70 */
  voiceCritique?: string;
}

interface DraftApprovalModalProps {
  isVisible: boolean;
  draftData: DraftApprovalData | null;
  onSendReply: (payload: {
    content: string;
    recipientEmail: string;
    subject: string;
    threadId?: string;
    gmailDraftId?: string;
  }) => Promise<void>;
  onDismiss: () => void;
}

type ViewMode = 'preview' | 'editing';

export function DraftApprovalModal({
  isVisible,
  draftData,
  onSendReply,
  onDismiss,
}: DraftApprovalModalProps) {
  const [editedContent, setEditedContent] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [showConfirmOverlay, setShowConfirmOverlay] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Sync edited content when a new draft arrives
  useEffect(() => {
    if (draftData?.content) {
      setEditedContent(draftData.content);
      setViewMode('preview');
      setShowConfirmOverlay(false);
      setSendSuccess(false);
    }
  }, [draftData]);

  // Escape closes without sending
  useEffect(() => {
    if (!isVisible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showConfirmOverlay) {
        setShowConfirmOverlay(false);
      } else {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isVisible, showConfirmOverlay, onDismiss]);

  if (!draftData) return null;

  const handleSendNow = () => setShowConfirmOverlay(true);

  // PART 40 — fire-and-forget feedback signal so the next draft to this
  // recipient inherits the lesson. Never blocks the user-facing flow; a
  // failed POST is logged and ignored. Only called from the explicit
  // sent / edited-and-sent / cancelled paths — not from Escape/backdrop
  // (those carry too much noise from accidental clicks).
  const reportDraftFeedback = (action: 'sent' | 'edited_and_sent' | 'cancelled') => {
    if (!draftData?.recipientEmail) return;
    const originalBody = draftData.content || '';
    const finalBody = action === 'cancelled' ? undefined : editedContent;
    try {
      fetch('/api/arcus/learn/draft-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: draftData.recipientEmail,
          recipientName: draftData.recipientName,
          subject: draftData.subject,
          originalBody,
          finalBody,
          action,
        }),
        keepalive: true,
      }).catch(() => { /* learning is non-critical — never break the send flow */ });
    } catch { /* swallow synchronous fetch errors too */ }
  };

  const handleConfirmSend = async () => {
    if (!draftData.recipientEmail) {
      toast.error('Missing recipient email');
      return;
    }
    setIsSending(true);
    try {
      await onSendReply({
        content: editedContent,
        recipientEmail: draftData.recipientEmail,
        subject: draftData.subject,
        threadId: draftData.threadId,
        gmailDraftId: draftData.gmailDraftId,
      });
      setSendSuccess(true);
      toast.success('Email sent!');
      // PART 40 — capture the learning signal AFTER successful send.
      // 'sent' vs 'edited_and_sent' is decided by whether the user touched
      // the body before confirming. The endpoint dedups trivial whitespace-
      // only diffs back to 'sent'.
      const wasEdited = editedContent.trim() !== (draftData.content || '').trim();
      reportDraftFeedback(wasEdited ? 'edited_and_sent' : 'sent');
      // Auto-dismiss after the success state shows briefly
      setTimeout(() => onDismiss(), 1400);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send');
      setIsSending(false);
      setShowConfirmOverlay(false);
    }
  };

  // PART 40 — explicit-cancellation handler. Bound to the X button and the
  // Save to Drafts button (both are "the user looked at this draft and chose
  // not to send it as-is"). Escape and backdrop click still go through bare
  // onDismiss without feedback — too noisy.
  const handleExplicitDismiss = () => {
    reportDraftFeedback('cancelled');
    onDismiss();
  };

  // Click-outside-to-dismiss: only on the backdrop element itself, not bubbled
  // events from inside the card. Disabled while the confirm overlay is up so a
  // misclick can't accidentally close mid-flight.
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !showConfirmOverlay && !isSending) {
      onDismiss();
    }
  };

  // Body — preserve line breaks and paragraph spacing as clean rendered text.
  // PART 31 fix: when the LLM emits markdown (**bold**, [link](url), bullets),
  // we now render it as HTML so the user sees a proper email preview instead
  // of `**asterisks**` and `[brackets](https://...)` shown literally.
  const rawBody = editedContent || draftData.content || '';
  const bodyHtml = renderDraftMarkdown(rawBody);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={handleBackdropClick}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-8 backdrop-blur-md bg-black/60"
        >
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-2xl max-h-[85vh] bg-[#1A1A1A] border border-white/10 rounded-[24px] shadow-2xl overflow-hidden flex flex-col"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-0.5">
                  Draft ready
                </p>
                <h3 className="text-[16px] font-bold text-white/90 truncate">
                  Here's the draft to {draftData.recipientName || 'recipient'}
                </h3>
              </div>
              <button
                onClick={handleExplicitDismiss}
                disabled={isSending}
                className="p-2 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recipient / Subject / Voice strip */}
            <div className="px-6 py-3 border-b border-white/[0.04] flex flex-col gap-1.5 bg-white/[0.015] text-[12.5px]">
              <div className="flex items-baseline gap-3">
                <span className="text-white/35 font-bold uppercase tracking-wider text-[10px] w-14 shrink-0">To</span>
                <span className="text-white/85 font-medium truncate">
                  {draftData.recipientName}
                  {draftData.recipientEmail && (
                    <span className="text-white/40 font-mono text-[11px]"> &lt;{draftData.recipientEmail}&gt;</span>
                  )}
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-white/35 font-bold uppercase tracking-wider text-[10px] w-14 shrink-0">Subject</span>
                <span className="text-white/75 truncate">{draftData.subject || '(no subject)'}</span>
              </div>
              {typeof draftData.voiceScore === 'number' && (
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-white/35 font-bold uppercase tracking-wider text-[10px] w-14 shrink-0">Voice</span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded-md font-bold text-[11px] tracking-wide tabular-nums',
                          draftData.voiceScore >= 85
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                            : draftData.voiceScore >= 70
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/25',
                        )}
                      >
                        {draftData.voiceScore}/100
                      </span>
                      <span className="text-white/55 text-[11px]">
                        {draftData.voiceScore >= 85
                          ? 'Sounds like you.'
                          : draftData.voiceScore >= 70
                            ? 'Mostly matches your voice.'
                            : 'May not match your voice — review before sending.'}
                      </span>
                    </div>
                    {draftData.voiceScore < 70 && draftData.voiceCritique && (
                      <span className="text-rose-300/70 text-[11px] leading-snug">{draftData.voiceCritique}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Body — clean formatted preview OR rich-text editor (PART 8 #4) */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {viewMode === 'editing' ? (
                <RichTextEditor
                  value={editedContent}
                  onChange={(plain) => setEditedContent(plain)}
                />
              ) : rawBody ? (
                <div
                  className="text-white/90 text-[14px] leading-[1.7] font-sans selection:bg-blue-500/30 draft-body-preview"
                  // We rendered to HTML server-safely via renderDraftMarkdown
                  // (escapes user input then re-applies a small whitelist).
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              ) : (
                <div className="text-white/30 italic text-[14px]">(empty draft)</div>
              )}
            </div>

            {/* "Good to send?" speech bubble + 3-button footer */}
            <div className="px-6 pb-5 pt-2 border-t border-white/[0.04] bg-white/[0.015]">
              <div className="mb-3 inline-flex items-center px-3.5 py-2 bg-white/[0.06] border border-white/[0.08] rounded-[18px] rounded-bl-md text-[13px] text-white/80">
                Good to send?
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={handleSendNow}
                  disabled={isSending || sendSuccess}
                  className={cn(
                    'group flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[12.5px] tracking-wide uppercase transition-all active:scale-95',
                    isSending || sendSuccess
                      ? 'bg-white/5 text-white/30 cursor-not-allowed'
                      : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/25',
                  )}
                >
                  {sendSuccess ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                  {sendSuccess ? 'Sent' : 'Send Now'}
                </button>
                <button
                  onClick={() => setViewMode((v) => (v === 'editing' ? 'preview' : 'editing'))}
                  disabled={isSending || sendSuccess}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[12.5px] tracking-wide uppercase transition-all active:scale-95',
                    viewMode === 'editing'
                      ? 'bg-white text-black hover:bg-zinc-200'
                      : 'border border-white/10 text-white/75 hover:text-white hover:bg-white/5 hover:border-white/20',
                    (isSending || sendSuccess) && 'opacity-30 pointer-events-none',
                  )}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {viewMode === 'editing' ? 'Done Editing' : 'Edit Draft'}
                </button>
                <button
                  onClick={handleExplicitDismiss}
                  disabled={isSending || sendSuccess}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[12.5px] tracking-wide uppercase text-white/50 hover:text-white/80 hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save to Drafts
                </button>
              </div>
            </div>

            {/* Inline confirm overlay — covers the modal body, not a separate popup */}
            <AnimatePresence>
              {showConfirmOverlay && !sendSuccess && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 z-10 flex items-center justify-center px-6 backdrop-blur-md bg-black/55"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                    className="w-full max-w-md rounded-[20px] bg-[#1F1F1F] border border-white/12 shadow-2xl overflow-hidden"
                  >
                    <div className="px-6 py-5 border-b border-white/[0.06] flex items-start gap-3">
                      <AlertTriangle className="w-4.5 h-4.5 text-amber-400/90 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[14.5px] text-white/90 leading-snug">
                          Sending to <span className="font-semibold">{draftData.recipientName}</span>
                          {draftData.recipientEmail && (
                            <span className="font-mono text-[12px] text-white/55"> &lt;{draftData.recipientEmail}&gt;</span>
                          )}
                          .
                        </p>
                        <p className="text-[12px] text-white/50 mt-1">This cannot be undone.</p>
                      </div>
                    </div>
                    <div className="px-6 py-4 flex items-center justify-end gap-2.5 bg-white/[0.02]">
                      <button
                        onClick={() => setShowConfirmOverlay(false)}
                        disabled={isSending}
                        className="px-5 py-2.5 rounded-xl text-white/55 hover:text-white/85 hover:bg-white/5 font-bold text-[12px] tracking-wide uppercase transition-colors disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmSend}
                        disabled={isSending}
                        className={cn(
                          'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[12px] tracking-wide uppercase transition-all active:scale-95',
                          isSending
                            ? 'bg-emerald-500/40 text-white/70 cursor-not-allowed'
                            : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/30',
                        )}
                      >
                        {isSending ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Sending…
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Confirm Send
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
