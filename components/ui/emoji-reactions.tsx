import React, { useState } from 'react';
import { Button } from './button';

interface EmojiReactionsProps {
  isOpen: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  position: { top: number; left: number };
}

const REACTIONS = ['❤️', '👍', '🙏', '✅', '😂', '✨', '🔥', '😊', '💯', '🎉'];

export const EmojiReactions: React.FC<EmojiReactionsProps> = ({
  isOpen,
  onClose,
  onReact,
  position,
}) => {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmojiClick = (emoji: string) => {
    setSelectedEmoji(emoji);
    onReact(emoji);
    setTimeout(() => {
      onClose();
      setSelectedEmoji(null);
    }, 150);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Emoji Reactions Tab */}
      <div
        className="fixed z-50 bg-[#383838] rounded-2xl px-3 py-2 shadow-lg border border-gray-600"
        style={{
          top: position.top - 70,
          left: position.left + 260,
          transform: 'translateX(-50%)',
        }}
      >
        <div className="flex items-center space-x-1">
          {REACTIONS.map((emoji, index) => (
            <button
              key={index}
              onClick={() => handleEmojiClick(emoji)}
              className={`text-2xl p-1 rounded-lg transition-all duration-150 hover:bg-white/10 hover:scale-110 ${
                selectedEmoji === emoji ? 'bg-white/20 scale-110' : ''
              }`}
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Pointer */}
        <div
          className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#383838]"
          style={{ marginTop: '-1px' }}
        />
      </div>
    </>
  );
};
