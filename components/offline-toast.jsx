"use client";

import { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/use-online-status';
import { WifiOff, AlertCircle } from 'lucide-react';

export function OfflineToast() {
  const isOnline = useOnlineStatus();
  const [showToast, setShowToast] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowToast(true);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      // Delay hiding to allow exit animation
      const timer = setTimeout(() => setShowToast(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!showToast) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <div
        className={`
          offline-toast
          max-w-sm mx-4
          bg-white
          text-black
          satoshi-app
          rounded-2xl
          shadow-2xl
          border border-gray-200
          backdrop-blur-sm
          overflow-hidden
          transform
          transition-all
          duration-300
          ease-out
          ${isAnimating ? 'animate-bounce-in' : 'animate-bounce-out'}
          pointer-events-auto
        `}
      >
        {/* Cute top border decoration */}
        <div className="h-1 bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300"></div>
        
        {/* Toast content container */}
        <div className="p-6">
          {/* Icon and title row */}
          <div className="flex items-start space-x-4">
            {/* Animated icon */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                  <WifiOff className="w-6 h-6 text-orange-600 animate-pulse" />
                </div>
                {/* Cute bounce effect for icon */}
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full"></div>
              </div>
            </div>

            {/* Text content */}
            <div className="flex-1 text-left">
              <div className="font-semibold text-black text-base mb-1">
                📱 You're offline!
              </div>
              <div className="text-gray-600 text-sm leading-relaxed">
                No internet connection. Please check your network settings and try again.
              </div>
            </div>
          </div>

          {/* Cute animated dots */}
          <div className="flex items-center justify-center space-x-1 mt-4 pt-3 border-t border-gray-100">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>

          {/* Cute status indicator */}
          <div className="flex items-center justify-center mt-3">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <AlertCircle className="w-3 h-3" />
              <span className="font-medium">Checking connection...</span>
            </div>
          </div>
        </div>

        {/* Bottom gradient decoration */}
        <div className="h-1 bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300"></div>
      </div>
    </div>
  );
}