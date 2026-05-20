"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleQuestion, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

function WaitingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="flex items-center gap-2 px-4 pb-3"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" className="flex-shrink-0">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
          <motion.circle
            key={deg}
            cx={7 + 5 * Math.cos((deg * Math.PI) / 180)}
            cy={7 + 5 * Math.sin((deg * Math.PI) / 180)}
            r="1.2"
            fill="#EAB308"
            animate={{ opacity: [1, 0.15, 1] }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </svg>
      <span className="text-[11px] font-medium text-yellow-400/80">
        Waiting for you to proceed
      </span>
    </motion.div>
  );
}

export interface AskQuestion {
  text: string;
  options?: string[];
}

interface AskUserCardProps {
  questions: AskQuestion[];
  onSubmit: (answers: string[]) => void;
  onDismiss: () => void;
}

export function AskUserCard({ questions, onSubmit, onDismiss }: AskUserCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''));
  const [customInputs, setCustomInputs] = useState<boolean[]>(() => questions.map(() => false));

  const current = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const currentAnswer = answers[currentIndex];
  const isAnswered = currentAnswer.trim().length > 0;

  const selectOption = (opt: string) => {
    const next = [...answers];
    next[currentIndex] = opt;
    setAnswers(next);
    const ci = [...customInputs];
    ci[currentIndex] = false;
    setCustomInputs(ci);
  };

  const setCustom = () => {
    const ci = [...customInputs];
    ci[currentIndex] = true;
    setCustomInputs(ci);
    const next = [...answers];
    next[currentIndex] = '';
    setAnswers(next);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleSubmit = () => {
    const filled = answers.map((a, i) => a.trim() || `Skipped question ${i + 1}`);
    onSubmit(filled);
  };

  const OPTION_LABELS = ['A', 'B', 'C', 'D'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className="w-full max-w-[640px] mx-auto mb-3 rounded-[20px] bg-white/[0.05] backdrop-blur-xl border border-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.07)] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="w-4 h-4 text-arcus-fg-tertiary" />
          <span className="text-[12px] font-bold text-arcus-fg-secondary uppercase tracking-widest">Question</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            disabled={currentIndex === 0}
            className="p-1 rounded-lg text-arcus-fg-muted hover:text-arcus-fg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-bold text-arcus-fg-tertiary tabular-nums">
            {currentIndex + 1} of {questions.length}
          </span>
          <button
            onClick={handleNext}
            disabled={currentIndex === questions.length - 1}
            className="p-1 rounded-lg text-arcus-fg-muted hover:text-arcus-fg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Question body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="px-4 pt-4 pb-3"
        >
          {/* Question text */}
          <div className="flex items-start gap-3 mb-3">
            <span className="text-[13px] font-bold text-blue-400/80 tabular-nums mt-0.5 shrink-0">
              {currentIndex + 1}
            </span>
            <p className="text-[14px] font-semibold text-arcus-fg leading-snug">{current.text}</p>
          </div>

          {/* Options */}
          <div className="space-y-1.5">
            {(current.options ?? []).map((opt, i) => (
              <button
                key={opt}
                onClick={() => selectOption(opt)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150",
                  currentAnswer === opt && !customInputs[currentIndex]
                    ? "bg-blue-500/20 border border-blue-500/40 text-arcus-fg"
                    : "bg-white/[0.03] border border-white/[0.06] text-arcus-fg-secondary hover:bg-white/[0.06] hover:text-arcus-fg"
                )}
              >
                <span className={cn(
                  "w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center shrink-0 transition-colors",
                  currentAnswer === opt && !customInputs[currentIndex]
                    ? "bg-blue-500 text-white"
                    : "bg-white/[0.07] text-arcus-fg-muted"
                )}>
                  {OPTION_LABELS[i]}
                </span>
                <span className="text-[13px] font-medium">{opt}</span>
              </button>
            ))}

            {/* Custom text option */}
            <div
              className={cn(
                "w-full flex items-center gap-3 rounded-xl transition-all duration-150 overflow-hidden",
                customInputs[currentIndex]
                  ? "bg-blue-500/10 border border-blue-500/30"
                  : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]"
              )}
            >
              <span
                onClick={setCustom}
                className={cn(
                  "w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center shrink-0 ml-3 my-2.5 cursor-pointer transition-colors",
                  customInputs[currentIndex]
                    ? "bg-blue-500 text-white"
                    : "bg-white/[0.07] text-arcus-fg-muted"
                )}
              >
                {OPTION_LABELS[(current.options?.length ?? 0)]}
              </span>
              <input
                type="text"
                placeholder="Type your answer"
                value={customInputs[currentIndex] ? currentAnswer : ''}
                onFocus={setCustom}
                onChange={(e) => {
                  setCustom();
                  const next = [...answers];
                  next[currentIndex] = e.target.value;
                  setAnswers(next);
                }}
                className="flex-1 bg-transparent text-[13px] text-arcus-fg placeholder:text-arcus-fg-muted py-2.5 pr-3 focus:outline-none"
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/[0.06]">
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 text-[12px] font-medium text-arcus-fg-muted hover:text-arcus-fg-secondary transition-colors"
        >
          Skip
        </button>
        {!isLast ? (
          <button
            onClick={handleNext}
            disabled={!isAnswered}
            className={cn(
              "px-4 py-1.5 rounded-xl text-[12px] font-bold transition-all",
              isAnswered
                ? "bg-blue-500 hover:bg-blue-400 text-white"
                : "bg-white/[0.05] text-arcus-fg-muted cursor-not-allowed"
            )}
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[12px] font-bold bg-blue-500 hover:bg-blue-400 text-white transition-all"
          >
            <Send className="w-3 h-3" />
            Submit
          </button>
        )}
      </div>

      {/* Waiting indicator — shown until user submits */}
      <WaitingIndicator />
    </motion.div>
  );
}
