"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSession } from 'next-auth/react';
import ChatInterface from '../ChatInterface';
import { AgentLoading } from '@/components/ui/agent-loading';

export default function AgentTalkPage() {
    const router = useRouter();
    const params = useParams();
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Set page title
    useEffect(() => {
        document.title = 'Arcus / Mailient';
    }, []);

    // Check authentication and onboarding status on component mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const session = await getSession();
                if (!session) {
                    // Redirect to sign-in page if not authenticated
                    router.push('/auth/signin?callbackUrl=/dashboard/agent-talk');
                    return;
                }

                // Check onboarding status
                try {
                    const response = await fetch('/api/onboarding/status');
                    if (response.ok) {
                        const data = await response.json();
                        if (!data.completed) {
                            // Onboarding not completed, redirect to onboarding
                            router.push('/onboarding');
                            return;
                        }
                    }
                } catch (error) {
                    console.error('Error checking onboarding status:', error);
                    // On error, redirect to onboarding to be safe
                    router.push('/onboarding');
                    return;
                }

                setIsAuthenticated(true);
            } catch (error) {
                console.error('Authentication check failed:', error);
                router.push('/auth/signin?callbackUrl=/dashboard/agent-talk');
            }
        };

        checkAuth();
    }, [router]);

    useEffect(() => {
        // Extract conversation ID from params
        const id = params?.id;
        const urlConversationId = Array.isArray(id) ? id[0] : id;

        // Check if it's a valid conversation ID format (supports both conv_ format and UUID format)
        if (urlConversationId &&
            (urlConversationId.startsWith('conv_') || /^[0-9a-f-]{36}$/.test(urlConversationId))) {
            setConversationId(urlConversationId);
            console.log('Loading conversation from URL:', urlConversationId);
        } else {
            setConversationId(null);
            console.log('No conversation ID in URL - starting fresh chat');
        }
    }, [params]);

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
        // If the current conversation was deleted, ensure we're on the base page
        if (conversationId === deletedConversationId) {
            router.push('/dashboard/agent-talk');
            setConversationId(null);
        }
    };

    // Don't render anything if not authenticated
    if (!isAuthenticated) {
        return <AgentLoading />;
    }

    return (
        <div
            className="satoshi-agent-talk agent-talk-container bg-[#262626]"
            style={{
                fontFamily: 'Satoshi, sans-serif',
                minHeight: '100vh'
            }}
        >
            <ChatInterface
                initialConversationId={conversationId}
                onConversationSelect={handleConversationSelect}
                onNewChat={handleNewChat}
                onConversationDelete={handleConversationDelete}
            />
        </div>
    );
}
