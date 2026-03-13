'use client';

import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function ToggleSwitch({ checked, onChange, disabled = false, className = '' }: ToggleSwitchProps) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-10 items-center rounded-full transition-all duration-200 ease-in-out
        ${checked
          ? 'bg-[#1A1A1A] dark:bg-white'
          : 'bg-neutral-200 dark:bg-white/10'
        }
        ${disabled
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-pointer'
        }
        ${className}
      `}
    >
      <span
        className={`
          inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-200 ease-in-out
          ${checked
            ? 'translate-x-[18px] bg-white dark:bg-black'
            : 'translate-x-[2px] bg-white'
          }
        `}
      />
    </button>
  );
}
