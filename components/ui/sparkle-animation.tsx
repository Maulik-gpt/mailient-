import React, { useEffect, useState } from 'react';

interface SparkleAnimationProps {
  isActive: boolean;
  onComplete: () => void;
  emoji: string;
  position: { x: number; y: number };
}

export const SparkleAnimation: React.FC<SparkleAnimationProps> = ({
  isActive,
  onComplete,
  emoji,
  position,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 300); // Allow fade out animation
      }, 700); // Show for 700ms, total duration ~1s

      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="relative">
        {/* Main emoji */}
        <div
          className="text-lg animate-bounce"
          style={{
            animation: 'sparkleEmoji 0.7s ease-out forwards',
          }}
        >
          {emoji}
        </div>

        {/* Sparkles around the emoji */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 rounded-full"
            style={{
              animation: `sparkleParticle 0.7s ease-out forwards`,
              animationDelay: `${i * 0.05}s`,
              left: `${15 + Math.cos((i * Math.PI * 2) / 6) * 20}px`,
              top: `${15 + Math.sin((i * Math.PI * 2) / 6) * 20}px`,
            }}
          />
        ))}

        {/* Additional sparkle effects */}
        {[...Array(3)].map((_, i) => (
          <div
            key={`big-${i}`}
            className="absolute w-0.5 h-0.5 bg-white rounded-full shadow-lg"
            style={{
              animation: `sparkleBig 0.7s ease-out forwards`,
              animationDelay: `${0.2 + i * 0.1}s`,
              left: `${12 + Math.cos((i * Math.PI) / 2) * 25}px`,
              top: `${12 + Math.sin((i * Math.PI) / 2) * 25}px`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes sparkleEmoji {
          0% {
            opacity: 0;
            transform: scale(0.5) rotate(-180deg);
          }
          20% {
            opacity: 1;
            transform: scale(1.2) rotate(-90deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.5) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: scale(0.8) rotate(180deg);
          }
        }

        @keyframes sparkleParticle {
          0% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          20% {
            opacity: 1;
            transform: scale(1.5) rotate(90deg);
          }
          60% {
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
          100% {
            opacity: 0;
            transform: scale(0) rotate(360deg);
          }
        }

        @keyframes sparkleBig {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          30% {
            opacity: 1;
            transform: scale(2);
          }
          100% {
            opacity: 0;
            transform: scale(0);
          }
        }
      `}</style>
    </div>
  );
};
