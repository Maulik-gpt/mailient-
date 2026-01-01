'use client';

import React, { useState, useEffect } from 'react';
import ConnectGmailButton from '../ConnectGmailButton';

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

interface EmailSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmails: (emails: Email[]) => void;
}

export function EmailSelectionModal({ isOpen, onClose, onSelectEmails }: EmailSelectionModalProps) {
   const [emails, setEmails] = useState<Email[]>([]);
   const [loading, setLoading] = useState(false);
   const [loadingMore, setLoadingMore] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [selectedEmails, setSelectedEmails] = useState<Email[]>([]);
   const [hasMore, setHasMore] = useState(false);
   const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  const fetchEmails = async (isLoadMore = false) => {
     if (isLoadMore) {
       setLoadingMore(true);
     } else {
       setLoading(true);
       setSelectedEmails([]); // Reset selected emails on initial load
       setNextPageToken(null);
       setHasMore(false);
     }
     setError(null);

     try {
       const maxResults = isLoadMore ? 50 : 30;
       const pageTokenParam = isLoadMore ? `&pageToken=${nextPageToken}` : '';
       const response = await fetch(`/api/gmail/emails?maxResults=${maxResults}${pageTokenParam}`, {
         credentials: 'include',
         headers: {
           'Content-Type': 'application/json',
         },
       });
       if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         if (response.status === 401) {
           throw new Error('Authentication required. Please log in and connect your Gmail account to access emails.');
         } else if (response.status === 429) {
           throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
         } else {
           throw new Error(errorData.error || 'Failed to fetch emails. Please try again.');
         }
       }
       const data = await response.json();

       if (isLoadMore) {
         setEmails(prev => [...prev, ...(data.emails || [])]);
       } else {
         setEmails(data.emails || []);
       }

       setNextPageToken(data.nextPageToken || null);
       setHasMore(!!data.nextPageToken);
     } catch (err) {
       console.error('EmailSelectionModal: Error fetching emails:', err);
       const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching emails.';
       console.error('EmailSelectionModal: Setting error message:', errorMessage);
       setError(errorMessage);
     } finally {
       setLoading(false);
       setLoadingMore(false);
     }
   };

  const loadMoreEmails = () => {
     if (hasMore && !loadingMore && !loading) {
       fetchEmails(true);
     }
   };

  useEffect(() => {
    console.log('EmailSelectionModal: Modal state changed:', { isOpen });
    if (isOpen) {
      console.log('EmailSelectionModal: Opening modal and fetching emails');
      fetchEmails();
    } else {
      console.log('EmailSelectionModal: Modal closed');
    }
  }, [isOpen]);

  const handleSelect = () => {
    if (selectedEmails.length > 0) {
      console.log('EmailSelectionModal: Selecting emails:', selectedEmails.map(e => e.id));
      onSelectEmails(selectedEmails);
      onClose();
    }
  };

  if (!isOpen) {
    console.log('EmailSelectionModal: Modal not open, returning null');
    return null;
  }

  console.log('EmailSelectionModal: Rendering modal - isOpen is true');
  console.log('EmailSelectionModal: Modal props:', { isOpen, onClose: !!onClose, onSelectEmails: !!onSelectEmails });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          console.log('EmailSelectionModal: Backdrop clicked, closing modal');
          onClose();
        }}
      />

      {/* Modal */}
      <div className="relative p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl bg-[#1a1a1a] rounded-[2rem] border border-[#2a2a2a]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Select Your Email</h2>
          <button
            onClick={() => {
              console.log('EmailSelectionModal: Close button clicked');
              onClose();
            }}
            className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-white/70 text-sm">Loading your emails. This may take 2-3 minutes.</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <div className="text-red-400 mb-6 text-lg font-medium">{error}</div>
              <div className="flex flex-col items-center gap-4">
                {error.includes('Authentication required') && (
                  <div className="mb-4">
                    <ConnectGmailButton />
                  </div>
                )}
                <button
                  onClick={() => {
                    console.log('EmailSelectionModal: Retry button clicked');
                    fetchEmails();
                  }}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => {
                    console.log('EmailSelectionModal: Email toggled:', email.id);
                    setSelectedEmails(prev => {
                      const isSelected = prev.some(e => e.id === email.id);
                      if (isSelected) {
                        return prev.filter(e => e.id !== email.id);
                      } else {
                        return [...prev, email];
                      }
                    });
                  }}
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedEmails.some(e => e.id === email.id)
                      ? 'bg-blue-500/20 border border-blue-500'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{email.subject}</h3>
                      <p className="text-white/60 text-sm truncate">{email.from}</p>
                      <p className="text-white/40 text-xs mt-1">
                        {new Date(email.date).toLocaleDateString()}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedEmails.some(e => e.id === email.id)}
                      onChange={() => {}} // Handled by onClick
                      className="ml-2 mt-1"
                    />
                  </div>
                  <p className="text-white/50 text-sm mt-2 line-clamp-2">{email.snippet}</p>
                </div>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMoreEmails}
                    disabled={loadingMore || loading}
                    className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      loadingMore || loading
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {loadingMore ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Loading...
                      </div>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              console.log('EmailSelectionModal: Select button clicked');
              handleSelect();
            }}
            disabled={selectedEmails.length === 0}
            className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
              selectedEmails.length > 0
                ? 'bg-white text-black hover:bg-gray-100'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Select Emails ({selectedEmails.length})
          </button>
        </div>
      </div>
    </div>
  );
}