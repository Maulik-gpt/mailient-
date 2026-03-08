"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ChatInterface from '../ChatInterface';

export default function ConversationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    // Extract conversation ID from URL path
    const pathParts = pathname.split('/');
    const urlConversationId = pathParts[pathParts.length - 1];

    // Check if it's a valid conversation ID format (supports both conv_ format and UUID format)
    if (urlConversationId &&
        (urlConversationId.startsWith('conv_') || /^[0-9a-f-]{36}$/.test(urlConversationId))) {
      setConversationId(urlConversationId);
    } else {
      setConversationId(null);
    }
  }, [pathname]);

  const handleConversationSelect = (selectedConversationId: string) => {
    // Update URL to include conversation ID
    router.push(`/dashboard/agent-talk/${selectedConversationId}`);
  };

  const handleNewChat = () => {
    // Navigate back to base agent-talk page for new chat
    router.push('/dashboard/agent-talk');
    setConversationId(null);
  };

  const handleConversationDelete = (deletedConversationId: string) => {
    // If the current conversation was deleted, navigate back to base agent-talk page
    if (conversationId === deletedConversationId) {
      router.push('/dashboard/agent-talk');
      setConversationId(null);
    }
  };

  return (
    <div className="satoshi-agent-talk" style={{ fontFamily: 'Satoshi, sans-serif' }}>
      <ChatInterface
        initialConversationId={conversationId}
        onConversationSelect={handleConversationSelect}
        onNewChat={handleNewChat}
        onConversationDelete={handleConversationDelete}
      />
    </div>
  );
}