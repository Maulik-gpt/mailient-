"use client";

import { useState } from "react";

export function AIVoiceInputDemo() {
  const [recordings, setRecordings] = useState<{ duration: number; timestamp: Date }[]>([]);

  const handleStop = (duration: number) => {
    setRecordings(prev => [...prev.slice(-4), { duration, timestamp: new Date() }]);
  };

  return (
    <div className="space-y-8">
        <div className="space-y-4">
          <div className="w-full py-4">
            <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-2">
              <button
                className="group w-16 h-16 rounded-xl flex items-center justify-center transition-colors bg-none hover:bg-black/10 dark:hover:bg-white/10"
                type="button"
                onClick={() => {
                  const newRecording = { duration: Math.floor(Math.random() * 60), timestamp: new Date() };
                  handleStop(newRecording.duration);
                }}
              >
                <div className="w-6 h-6 rounded-sm animate-spin bg-black dark:bg-white" style={{ animationDuration: "3s" }} />
              </button>
              
              <span className="font-mono text-sm transition-opacity duration-300 text-black/70 dark:text-white/70">
                00:23
              </span>
              
              <div className="h-4 w-64 flex items-center justify-center gap-0.5">
                {[...Array(48)].map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 rounded-full transition-all duration-300 bg-black/50 dark:bg-white/50 animate-pulse"
                    style={{
                      height: `${20 + Math.random() * 80}%`,
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                ))}
              </div>
              
              <p className="h-4 text-xs text-black/70 dark:text-white/70">
                Listening...
              </p>
            </div>
          </div>
      </div>
    </div>
  );
}
