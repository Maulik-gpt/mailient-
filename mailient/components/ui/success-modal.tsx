"use client";

import { useEffect, useState } from 'react';
import { ShineBorder } from './shine-border';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export function SuccessModal({ isOpen, onClose, message }: SuccessModalProps) {
  const [showGraffiti, setShowGraffiti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowGraffiti(true);
      const timer = setTimeout(() => {
        setShowGraffiti(false);
        onClose();
      }, 3000); // Close after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <ShineBorder>
        <div className="relative p-8 w-96 bg-black/90 rounded-lg shadow-2xl text-center">
          <div className="relative overflow-hidden">
            <h2 className={`text-2xl font-bold text-white transition-all duration-1000 ${showGraffiti ? 'animate-pulse' : ''}`}>
              {message}
            </h2>
            {showGraffiti && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-yellow-400 via-red-500 to-purple-500 opacity-20 animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl font-bold text-white/10 animate-bounce">
                  ✓
                </div>
              </div>
            )}
          </div>
          <p className="mt-4 text-white/80">Integration enabled successfully!</p>
        </div>
      </ShineBorder>
    </div>
  );
}