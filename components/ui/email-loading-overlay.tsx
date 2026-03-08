"use client";

import { useEffect, useState } from "react";
import { Lock, Shield } from "lucide-react";

interface EmailLoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function EmailLoadingOverlay({
  isVisible,
  message = "Loading your emails... This may take a few moments"
}: EmailLoadingOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [showExtendedMessage, setShowExtendedMessage] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setShowExtendedMessage(false);
      return;
    }

    // Show extended message after 30 seconds
    const extendedMessageTimeout = setTimeout(() => {
      setShowExtendedMessage(true);
    }, 30000);

    // Animate progress bar from 0 to 100% (complete when done)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev < 100) {
          // Slower, more controlled progress increase
          const increment = Math.random() * 3 + 1; // 1-4% increment
          return Math.min(prev + increment, 100);
        }
        return prev;
      });
    }, 300); // Slightly slower updates

    return () => {
      clearInterval(interval);
      clearTimeout(extendedMessageTimeout);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Main loading container */}
      <div className="relative w-full max-w-md mx-4 text-center">

        {/* Loading indicator */}
        <div className="mb-8">
          {/* Clean circle without pulse */}
          <div className="relative mx-auto mb-6">
            <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center mx-auto">
              <div className="h-8 w-8 rounded-full bg-white/20" />
            </div>
          </div>

          {/* Loading text with percentage */}
          <h2 className="text-white text-lg font-medium mb-2">
            Loading your emails [{Math.round(progress)}%]
          </h2>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden mx-auto w-64">
            <div
              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Security message */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 text-white/80 text-sm mb-2">
            <Lock className="w-4 h-4" />
            <span>End-to-end encrypted</span>
          </div>
        </div>

        {/* Bottom message */}
        <div className="text-white/60 text-sm">
          {!showExtendedMessage ? (
            "Don't close this window. Your messages are downloading."
          ) : (
            <div className="space-y-3">
              <p>Taking longer than expected? This might be due to rate limiting.</p>
              <p className="text-xs text-white/40">
                Circuit breaker protection is active. Please wait for completion.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
