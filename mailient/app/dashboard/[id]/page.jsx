"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import EmailDetail from '../components/email-detail';
import { toast } from 'sonner';

export default function EmailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const messageId = params.id;

  const [fullMessageContent, setFullMessageContent] = useState(null);
  const [messageLoading, setMessageLoading] = useState(false);

  // Fetch email list to find the email data
  const { data: emailsData, isLoading: emailsLoading } = useQuery({
    queryKey: ['emails'],
    queryFn: async () => {
      const response = await fetch('/api/gmail/emails');
      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }
      const data = await response.json();
      return data.emails || [];
    },
  });

  // Find the current email from the list
  const email = emailsData?.find(e => e.id === messageId);

  // Fetch full message content
  useEffect(() => {
    if (messageId) {
      setMessageLoading(true);
      fetch(`/api/gmail/messages/${messageId}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch message');
          }
          return response.json();
        })
        .then(data => {
          // Extract HTML content from the message
          const htmlContent = data.payload?.parts?.find(part => part.mimeType === 'text/html')?.body?.data ||
                            data.payload?.body?.data;

          if (htmlContent) {
            // Decode base64 content
            const decodedContent = atob(htmlContent.replace(/-/g, '+').replace(/_/g, '/'));
            setFullMessageContent(decodedContent);
          }
        })
        .catch(error => {
          console.error('Error fetching message:', error);
          toast.error('Failed to load message content');
        })
        .finally(() => {
          setMessageLoading(false);
        });
    }
  }, [messageId]);

  const handleClose = () => {
    router.push('/dashboard');
  };

  const handleStarToggle = async (id) => {
    try {
      const response = await fetch(`/api/gmail/messages/${id}/star`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to toggle star');
      }
      toast.success('Star toggled');
      // Invalidate queries to refresh data
      // queryClient.invalidateQueries({ queryKey: ['emails'] });
    } catch (error) {
      console.error('Error toggling star:', error);
      toast.error('Failed to toggle star');
    }
  };

  const handleArchive = async (ids) => {
    try {
      for (const id of ids) {
        const response = await fetch(`/api/gmail/messages/${id}/archive`, {
          method: 'POST',
        });
        if (!response.ok) {
          throw new Error('Failed to archive message');
        }
      }
      toast.success('Messages archived');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error archiving messages:', error);
      toast.error('Failed to archive messages');
    }
  };

  const handleDelete = async (ids) => {
    try {
      for (const id of ids) {
        const response = await fetch(`/api/gmail/messages/${id}/delete`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error('Failed to delete message');
        }
      }
      toast.success('Messages deleted');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting messages:', error);
      toast.error('Failed to delete messages');
    }
  };

  const handleReply = (email) => {
    toast.info('Reply functionality coming soon');
  };

  const handleReplyAll = (email) => {
    toast.info('Reply All functionality coming soon');
  };

  const handleForward = (email) => {
    toast.info('Forward functionality coming soon');
  };

  if (emailsLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading email...</p>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Email not found</p>
          <button
            onClick={handleClose}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Inbox
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EmailDetail
        email={email}
        thread={null}
        onClose={handleClose}
        onStarToggle={handleStarToggle}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onReply={handleReply}
        onReplyAll={handleReplyAll}
        onForward={handleForward}
        isLoading={false}
        fullMessageContent={fullMessageContent}
        messageLoading={messageLoading}
      />
    </div>
  );
}