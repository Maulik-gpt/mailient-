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
          ? 'bg-[#8a8888]'
          : 'bg-gray-500'
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
            ? 'translate-x-4'
            : 'translate-x-0.5'
          }
        `}
      />
    </button>
  );
}
