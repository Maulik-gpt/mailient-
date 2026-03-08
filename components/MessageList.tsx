'use client';

import React from 'react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
}

interface MessageListProps {
  messages: Message[];
  isTyping?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isTyping = false }) => {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((message) => (
          <div key={message.id} className="flex gap-4">
            {message.role === 'assistant' && (
              <div className="flex-shrink-0">
                <div className="bg-white rounded-full p-2 w-10 h-10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}

            <div className={`flex-1 ${message.role === 'user' ? 'flex justify-end' : ''}`}>
              <div className={`rounded-2xl p-6 ${
                message.role === 'assistant'
                  ? 'bg-muted max-w-3xl'
                  : 'bg-primary max-w-2xl'
              }`}>
                <div className="text-foreground">
                  {message.content}
                </div>
                <div className={`text-sm mt-2 ${
                  message.role === 'assistant' ? 'text-muted-foreground' : 'text-primary-foreground/80'
                }`}>
                  {message.timestamp?.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  }) || 'Just now'}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="bg-white rounded-full p-2 w-10 h-10 flex items-center justify-center">
                <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <div className="bg-muted rounded-2xl p-6">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageList;