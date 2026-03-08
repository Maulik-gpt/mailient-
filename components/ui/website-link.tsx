"use client";

import React, { useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { isValidUrlStrict, getDomainFromUrl } from '@/lib/url-utils';

interface WebsiteLinkProps {
  url: string | null | undefined;
  className?: string;
  showIcon?: boolean;
  maxLength?: number;
  variant?: 'default' | 'compact' | 'minimal';
  showExternalIcon?: boolean;
}

export function WebsiteLink({
  url,
  className = '',
  showIcon = true,
  maxLength = 30,
  variant = 'default',
  showExternalIcon = true
}: WebsiteLinkProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (!url || url.trim() === '') {
    return (
      <span className={`text-gray-500 ${className}`}>
        {variant === 'minimal' ? '—' : 'Not set'}
      </span>
    );
  }

  // Validate and normalize URL
  let validUrl: string;
  try {
    // Must have protocol for valid URL
    const urlString = url.trim();
    if (!urlString.match(/^https?:\/\//i)) {
      validUrl = `https://${urlString}`;
    } else {
      validUrl = urlString;
    }
    new URL(validUrl); // Validate the URL
  } catch {
    // If URL is invalid, display as plain text
    return (
      <span className={`text-red-400 ${className}`} title="Invalid URL">
        {variant === 'minimal' ? 'Invalid' : url}
      </span>
    );
  }

  // Extract domain for display
  const getDisplayUrl = () => {
    try {
      const urlObj = new URL(validUrl);
      const domain = urlObj.hostname.replace(/^www\./, '');

      if (variant === 'compact') {
        return domain.length > maxLength ? `${domain.substring(0, maxLength)}...` : domain;
      } else if (variant === 'minimal') {
        return domain.length > maxLength ? `${domain.substring(0, maxLength)}...` : domain;
      }

      // For default variant, show domain only (like Twitter)
          return domain;
    } catch {
      return url;
    }
  };

  const displayText = getDisplayUrl();

  const baseClasses = {
    default: 'text-blue-400 hover:text-blue-300 transition-colors underline decoration-blue-400/50 hover:decoration-blue-300',
    compact: 'text-blue-400 hover:text-blue-300 transition-colors underline decoration-blue-400/50 hover:decoration-blue-300',
    minimal: 'text-gray-400 hover:text-blue-400 transition-colors hover:underline'
  };

  const iconSizes = {
    default: 'w-4 h-4',
    compact: 'w-3 h-3',
    minimal: 'w-3 h-3'
  };

  return (
    <a
      href={validUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 ${baseClasses[variant]} ${className}`}
      title={validUrl}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showIcon && (
        <Globe className={`${iconSizes[variant]} flex-shrink-0`} />
      )}
      <span className="truncate">
        {displayText}
      </span>
      {showIcon && showExternalIcon && (
        <ExternalLink className={`${iconSizes[variant]} flex-shrink-0 opacity-60`} />
      )}
    </a>
  );
}
