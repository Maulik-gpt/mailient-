'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { type ShortcutAction } from '../hooks/useKeyboardShortcuts';

interface Props {
  open: boolean;
  onClose: () => void;
  shortcuts: ShortcutAction[];
}

export function ShortcutsModal({ open, onClose, shortcuts }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-[201] pointer-events-none px-4"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="pointer-events-auto w-full max-w-md bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <span className="text-[13px] font-semibold text-white tracking-tight">Keyboard Shortcuts</span>
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-1 max-h-[60vh] overflow-y-auto">
                {shortcuts.map((sc, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors">
                    <span className="text-[12px] text-white/60">{sc.description}</span>
                    <kbd className="text-[11px] font-mono bg-white/[0.07] border border-white/10 text-white/80 px-2 py-0.5 rounded-md tracking-wide">
                      {sc.label}
                    </kbd>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-white/[0.06]">
                <p className="text-[10px] text-white/25 text-center">Press Esc or click outside to close</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
