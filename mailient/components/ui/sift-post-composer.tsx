"use client";

import React, { useState } from 'react';
import { Button } from './button';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { Send, X } from 'lucide-react';

interface SiftPostComposerProps {
  user?: {
    avatar: string;
    displayName: string;
    username: string;
  };
  onSubmit: (content: string) => void;
  onCancel?: () => void;
}

export const SiftPostComposer: React.FC<SiftPostComposerProps> = ({
  user,
  onSubmit,
  onCancel
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const characterCount = content.length;
  const maxCharacters = 300;
  const remainingCharacters = maxCharacters - characterCount;

  const handleSubmit = async () => {
    if (!content.trim() || characterCount > maxCharacters) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
    } catch (error) {
      console.error('Failed to submit post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-neutral-900/20 border border-neutral-800/50 rounded-xl p-4 mb-6 backdrop-blur-sm">
      <div className="flex space-x-4">
        <Avatar className="w-10 h-10 flex-shrink-0 border border-neutral-800">
          <AvatarImage src={user?.avatar} alt={user?.displayName} />
          <AvatarFallback className="bg-neutral-800 text-neutral-400">{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-[#fafafa] text-sm">{user?.displayName || 'You'}</p>
              <p className="text-xs text-neutral-500">@{user?.username || 'username'}</p>
            </div>
          </div>

          <div className="relative">
            <textarea
              placeholder="What did you execute today?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-[#fafafa] placeholder-neutral-500 resize-none overflow-hidden min-h-[80px] max-h-[160px] text-sm focus:outline-none focus:ring-0 border-none p-0"
              maxLength={maxCharacters}
              rows={3}
            />

            {/* Character counter */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-neutral-800/50">
              <div className="text-xs text-neutral-500 font-medium">
                {remainingCharacters} characters remaining
              </div>
              <div className="flex space-x-2">
                {onCancel && (
                  <Button
                    onClick={onCancel}
                    variant="ghost"
                    size="sm"
                    className="text-neutral-400 hover:text-[#fafafa] hover:bg-neutral-800 px-3 py-1 h-8 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={!content.trim() || characterCount > maxCharacters || isSubmitting}
                  className={`px-4 py-1 h-8 text-sm font-medium rounded-lg transition-all ${content.trim() && characterCount <= maxCharacters
                      ? 'bg-[#fafafa] text-black hover:bg-neutral-200 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center space-x-2">
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                      <span>Posting...</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-2">
                      <Send className="w-3.5 h-3.5" />
                      <span>Post</span>
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Character limit warning */}
            {characterCount > maxCharacters * 0.9 && (
              <div className={`text-xs mt-1 transition-colors ${characterCount > maxCharacters ? 'text-red-400' : 'text-yellow-400'
                }`}>
                {characterCount > maxCharacters
                  ? `Character limit exceeded by ${characterCount - maxCharacters}`
                  : `Approaching character limit (${remainingCharacters} left)`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};