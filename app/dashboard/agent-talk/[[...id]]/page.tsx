"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSession } from 'next-auth/react';
import ChatInterface from '../ChatInterface';
import { AgentLoading } from '@/components/ui/agent-loading';

export default function AgentTalkPage({ params }: { params: { id?: string[] } }) {
    const router = useRouter();
    const pathname = usePathname();
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
                    router.push('/auth/signin?callbackUrl=/dashboard/agent-talk');
                    return;
                }

                // Check onboarding status
                try {
                    // IMMEDIATE CHECK: If localStorage says we are done, don't redirect
                    if (localStorage.getItem('onboarding_completed') === 'true') {
                        setIsAuthenticated(true);
                        return;
                    }

                    const response = await fetch('/api/onboarding/status');
                    if (response.ok) {
                        const data = await response.json();
                        if (!data.completed) {
                            router.push('/onboarding');
                            return;
                        } else {
                            // Cache it
                            localStorage.setItem('onboarding_completed', 'true');
                        }
                    }
                } catch (error) {
                    console.error('Error checking onboarding status:', error);
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
        // Determine conversation ID from params or pathname
        // params.id will be an array for catch-all routes
        const urlConversationId = params.id?.[0] || null;

        if (urlConversationId &&
            (urlConversationId.startsWith('conv_') || /^[0-9a-f-]{36}$/.test(urlConversationId))) {
            setConversationId(urlConversationId);
        } else {
            // Fallback to pathname parsing if params are missing
            const pathParts = pathname.split('/');
            const lastPart = pathParts[pathParts.length - 1];
            if (lastPart && lastPart !== 'agent-talk' && (lastPart.startsWith('conv_') || /^[0-9a-f-]{36}$/.test(lastPart))) {
                setConversationId(lastPart);
            } else {
                setConversationId(null);
            }
        }
    }, [params.id, pathname]);

    const handleConversationSelect = (selectedConversationId: string) => {
        // Use router.replace or push to navigate. 
        // Since it's the same page component, it should be much smoother.
        router.push(`/dashboard/agent-talk/${selectedConversationId}`);
    };

    const handleNewChat = () => {
        router.push('/dashboard/agent-talk');
        setConversationId(null);
    };

    const handleConversationDelete = (deletedConversationId: string) => {
        if (conversationId === deletedConversationId) {
            setConversationId(null);
            router.push('/dashboard/agent-talk');
        }
    };

    if (!isAuthenticated) {
        return <AgentLoading />;
    }

    return (
        <div
            className="satoshi-agent-talk agent-talk-container"
            style={{
                fontFamily: 'Satoshi, sans-serif',
                background: 'white',
                minHeight: '100vh'
            }}
        >
            <style jsx>{`
        .agent-talk-container {
          animation: fadeToBlack 0.6s ease-in-out forwards;
        }
        
        @keyframes fadeToBlack {
          0% { background: white; }
          100% { background: linear-gradient(to bottom, #403e3e 0%, #000000 30%); }
        }
      `}</style>
            <ChatInterface
                initialConversationId={conversationId}
                onConversationSelect={handleConversationSelect}
                onNewChat={handleNewChat}
                onConversationDelete={handleConversationDelete}
            />
        </div>
    );
}
