import React from 'react';
import { cn } from '@/lib/utils';

interface ShineBorderProps {
  children: React.ReactNode;
  className?: string;
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  color?: string;
}

export function ShineBorder({
  children,
  className,
  borderRadius = 8,
  borderWidth = 1,
  duration = 4,
  color = 'rgb(59 130 246)', // Default blue-500
  ...props
}: ShineBorderProps) {
  return (
    <div
      style={
        {
          '--border-radius': `${borderRadius}px`,
          '--border-width': `${borderWidth}px`,
          '--duration': `${duration}s`,
          '--color': color,
        } as React.CSSProperties
      }
      className={cn(
        'relative inline-flex overflow-hidden rounded-[var(--border-radius)] p-[var(--border-width)] bg-white',
        className
      )}
      {...props}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `conic-gradient(from 0deg, transparent, var(--color) 30%, var(--color) 70%, transparent)`,
          animation: `spin var(--duration) linear infinite`,
          borderRadius: 'inherit',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'subtract',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
        }}
      />
      {children}
    </div>
  );
}
