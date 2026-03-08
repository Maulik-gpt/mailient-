"use client";

import { X, Clock, Loader2, Trash2, Check, CheckSquare, Square } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface ChatHistoryItem {
  id: string;
  user_id: string;
  conversation_id: string;
  user_message: string;
  agent_response: string;
  message_order: number;
  is_initial_message: boolean;
  created_at: string;
  initialMessagePreview?: string;
  lastMessageDate?: string;
  source?: string;
}

interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationSelect?: (conversationId: string) => void;
  onConversationDelete?: (conversationId: string) => void;
}

export function ChatHistoryModal({ isOpen, onClose, onConversationSelect, onConversationDelete }: ChatHistoryModalProps) {
   const [history, setHistory] = useState<ChatHistoryItem[]>([]);
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; item: ChatHistoryItem | null }>({
     isOpen: false,
     item: null
   });
   const [isDeleting, setIsDeleting] = useState(false);

   // Multi-selection state
   const [isSelectionMode, setIsSelectionMode] = useState(false);
   const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
   const [selectAll, setSelectAll] = useState(false);
   const [selectionTimeout, setSelectionTimeout] = useState<NodeJS.Timeout | null>(null);
   const longPressTimer = useRef<NodeJS.Timeout | null>(null);
   const longPressItem = useRef<ChatHistoryItem | null>(null);

  useEffect(() => {
    if (isOpen) {
      console.log('ChatHistoryModal opened, fetching history...');
      fetchHistory();
      // Reset selection state when modal opens
      exitSelectionMode();
    }
  }, [isOpen]);

  // Exit selection mode on timeout
  useEffect(() => {
    if (isSelectionMode) {
      const timeout = setTimeout(() => {
        exitSelectionMode();
      }, 30000); // 30 seconds
      setSelectionTimeout(timeout);
      return () => clearTimeout(timeout);
    }
  }, [isSelectionMode]);

  // Handle back navigation to exit selection mode
  useEffect(() => {
    const handlePopState = () => {
      if (isSelectionMode) {
        exitSelectionMode();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isSelectionMode]);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching chat history from API...');
      const response = await fetch('/api/agent-talk/history?limit=50&offset=0');
      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Failed to fetch history: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      setHistory(data.history || []);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to group conversations by date
  const groupConversationsByDate = (conversations: ChatHistoryItem[]) => {
    const groups: { [key: string]: ChatHistoryItem[] } = {};

    conversations.forEach((conversation) => {
      const date = new Date(conversation.created_at);
      const today = new Date();

      let dateKey: string;
      const isToday = date.toDateString() === today.toDateString();

      if (isToday) {
        dateKey = 'Today';
      } else {
        // For other dates, use the day name
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        dateKey = dayNames[date.getDay()];
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(conversation);
    });

    return groups;
  };

  const getChatTitle = (userMessage: string) => {
    // Extract a meaningful title from the first few words of the user message
    const words = userMessage.split(' ').slice(0, 4).join(' ');
    return words.length > 30 ? words.substring(0, 30) + '...' : words;
  };

  // Load conversations from localStorage on component mount
 useEffect(() => {
   if (isOpen) {
     loadConversationsFromStorage();
   }
 }, [isOpen]);

 const loadConversationsFromStorage = () => {
   const conversationsMap: {[key: string]: ChatHistoryItem} = {};

   // Load all conversations from localStorage
   for (let i = 0; i < localStorage.length; i++) {
     const key = localStorage.key(i);
     if (key && key.startsWith('conversation_')) {
       try {
         const conversationData = JSON.parse(localStorage.getItem(key) || '{}');
         if (conversationData.id && conversationData.title && conversationData.messages) {
           // Get the first user message as the preview
           const firstUserMessage = conversationData.messages.find((msg: any) => msg.type === 'user');
           const userMessage = firstUserMessage ? firstUserMessage.content : conversationData.title;

           conversationsMap[conversationData.id] = {
             id: conversationData.id,
             conversation_id: conversationData.id,
             user_id: '', // Not stored in localStorage, will be empty
             user_message: userMessage,
             agent_response: '', // Not needed for display
             message_order: 0,
             is_initial_message: true,
             created_at: conversationData.lastUpdated,
             initialMessagePreview: userMessage.length > 100
               ? userMessage.substring(0, 100) + '...'
               : userMessage,
             lastMessageDate: conversationData.lastUpdated,
             source: 'localStorage' // Mark as localStorage data
           };
         }
       } catch (error) {
         console.error('Error parsing conversation data:', error);
       }
     }
   }

   // Convert to array and sort by last updated
   const conversationsList = Object.values(conversationsMap).sort((a, b) =>
     new Date(b.lastMessageDate || b.created_at).getTime() - new Date(a.lastMessageDate || a.created_at).getTime()
   );

   console.log('Loaded conversations from localStorage:', conversationsList.map(conv => ({
     id: conv.id,
     title: conv.user_message,
     source: conv.source
   })));

   // If we have localStorage conversations, merge them with existing history
   if (conversationsList.length > 0) {
     setHistory(prev => {
       // Create a map of existing conversations by ID to avoid duplicates
       const existingMap = new Map(prev.map(item => [item.conversation_id || item.id, item]));

       // Add localStorage conversations that don't already exist
       conversationsList.forEach(localItem => {
         const existingItem = existingMap.get(localItem.conversation_id || localItem.id);
         if (!existingItem) {
           existingMap.set(localItem.conversation_id || localItem.id, localItem);
         }
       });

       // Convert back to array and sort by date
       const merged = Array.from(existingMap.values()).sort((a, b) =>
         new Date(b.lastMessageDate || b.created_at).getTime() - new Date(a.lastMessageDate || a.created_at).getTime()
       );

       console.log('Merged conversations:', merged.map(conv => ({
         id: conv.id,
         title: conv.user_message,
         source: conv.source
       })));

       return merged;
     });
   }
 };

  const handleDeleteClick = (e: React.MouseEvent, item: ChatHistoryItem) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, item });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.item) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/agent-talk/history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: deleteConfirm.item.conversation_id || deleteConfirm.item.id,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete conversation';
        let errorCode = 'UNKNOWN_ERROR';

        console.error('DELETE request failed with status:', response.status, response.statusText);

        // Log the raw response text for debugging
        let rawResponseText;
        try {
          rawResponseText = await response.text();
          console.error('Raw error response text:', rawResponseText);
        } catch (textError) {
          console.error('Failed to get response text:', textError);
          rawResponseText = 'UNABLE_TO_READ';
        }

        try {
          const errorData = JSON.parse(rawResponseText || '{}');
          console.error('Parsed error data:', errorData);
          errorMessage = errorData.error || errorMessage;
          errorCode = errorData.code || errorCode;
          console.error('Final errorCode after parsing:', errorCode);
          console.error('Final errorMessage after parsing:', errorMessage);
        } catch (parseError) {
          console.error('Failed to parse error response JSON:', parseError);
          // If we can't parse the error response, use the status text
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
          console.error('Fallback errorMessage:', errorMessage);
        }

        // Show specific guidance based on error code
        console.error('Checking error code for specific handling:', errorCode);
        if (errorCode === 'AUTH_REQUIRED' || response.status === 401) {
          errorMessage += ' (Please make sure you are signed in)';
          console.error('Applied AUTH_REQUIRED handling');
        } else if (errorCode === 'MISSING_CONVERSATION_ID') {
          errorMessage = 'Invalid conversation ID';
          console.error('Applied MISSING_CONVERSATION_ID handling');
        } else if (errorCode === 'DATABASE_CONNECTION_ERROR') {
          errorMessage = 'Database connection failed. Please check your Supabase configuration.';
          console.error('Applied DATABASE_CONNECTION_ERROR handling');
        } else if (errorCode === 'DATABASE_ERROR') {
          errorMessage = 'Database error occurred. Please try again later.';
          console.error('Applied DATABASE_ERROR handling');
        } else {
          console.error('No specific error code handling applied, errorCode:', errorCode);
        }

        console.error('About to throw error with message:', errorMessage);
        throw new Error(errorMessage);
      }

      // Remove the deleted item from the local state
       setHistory(prev => prev.filter(item =>
         item.conversation_id !== (deleteConfirm.item!.conversation_id || deleteConfirm.item!.id) &&
         item.id !== deleteConfirm.item!.id
       ));

       // Notify parent component that conversation was deleted
       const deletedConversationId = deleteConfirm.item!.conversation_id || deleteConfirm.item!.id;
       onConversationDelete?.(deletedConversationId);

       setDeleteConfirm({ isOpen: false, item: null });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete conversation');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, item: null });
  };

  // Selection mode functions
  const enterSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedItems(new Set());
    setSelectAll(false);
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedItems(new Set());
    setSelectAll(false);
    if (selectionTimeout) {
      clearTimeout(selectionTimeout);
      setSelectionTimeout(null);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
    setSelectAll(newSelected.size === history.length);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
      setSelectAll(false);
    } else {
      const allIds = history.map(item => item.id);
      setSelectedItems(new Set(allIds));
      setSelectAll(true);
    }
  };

  const handleLongPressStart = (item: ChatHistoryItem) => {
    longPressItem.current = item;
    longPressTimer.current = setTimeout(() => {
      enterSelectionMode();
      toggleItemSelection(item.id);
    }, 2000); // 2 seconds
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleItemClick = (item: ChatHistoryItem) => {
    if (isSelectionMode) {
      toggleItemSelection(item.id);
    } else {
      onConversationSelect?.(item.conversation_id || item.id);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedItems.size === 0) return;
    setDeleteConfirm({ isOpen: true, item: null });
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedItems.size === 0) return;

    setIsDeleting(true);
    setError(null);

    try {
      const conversationIds = Array.from(selectedItems);
      const deletePromises = conversationIds.map(conversationId =>
        fetch('/api/agent-talk/history', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId,
          }),
        })
      );

      const results = await Promise.allSettled(deletePromises);
      const failedDeletes = results.filter(result => result.status === 'rejected');

      if (failedDeletes.length > 0) {
        throw new Error(`Failed to delete ${failedDeletes.length} conversations`);
      }

      // Remove deleted items from local state
       setHistory(prev => prev.filter(item => !selectedItems.has(item.id)));

       // Notify parent component for each deleted conversation
       selectedItems.forEach(conversationId => {
         onConversationDelete?.(conversationId);
       });

       exitSelectionMode();
       setDeleteConfirm({ isOpen: false, item: null });
    } catch (error) {
      console.error('Error deleting selected conversations:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete selected conversations');
    } finally {
      setIsDeleting(false);
    }
  };

  const chatGroups = groupConversationsByDate(history);

  return (
    <div className="h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
      {/* Selection Mode Header */}
      {isSelectionMode && (
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-[#0f0f0f]/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors"
            >
              {selectAll ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
              <span className="text-sm font-medium">Select All</span>
            </button>
            <span className="text-gray-400 text-sm">
              {selectedItems.size} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteSelected}
              disabled={selectedItems.size === 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
            <button
              onClick={exitSelectionMode}
              className="px-3 py-1.5 text-gray-300 hover:text-white hover:bg-gray-800 text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="flex items-center gap-3 text-white/60">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading conversations...</span>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="text-red-400 text-sm mb-2">Error loading conversations</div>
            <div className="text-white/60 text-sm">{error}</div>
            <button
              onClick={fetchHistory}
              className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-center text-white/60">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <div className="text-sm font-medium mb-1">No conversations yet</div>
            <div className="text-xs">Start a conversation to see your history here</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {Object.entries(chatGroups)
              .sort(([a], [b]) => {
                // Sort by date: Today first, then day names
                if (a === 'Today') return -1;
                if (b === 'Today') return 1;

                // For day names, sort by recency (Monday = most recent, Sunday = oldest)
                const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                return dayOrder.indexOf(b) - dayOrder.indexOf(a);
              })
              .map(([dateGroup, chats]) => (
                <div key={dateGroup}>
                  <div className="text-white text-sm font-medium mb-3 px-2 font-sans">
                    {dateGroup}
                  </div>
                  <div className="space-y-2">
                    {chats.map((item) => (
                      <div
                        key={item.id}
                        onMouseDown={() => !isSelectionMode && handleLongPressStart(item)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onTouchStart={() => !isSelectionMode && handleLongPressStart(item)}
                        onTouchEnd={handleLongPressEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(item);
                        }}
                        className={`group rounded-lg p-3 border transition-all duration-300 cursor-pointer ${
                          isSelectionMode
                            ? selectedItems.has(item.id)
                              ? 'bg-blue-600/20 border-blue-500/50 ring-1 ring-blue-500/30'
                              : 'bg-[#0f0f0f] border-gray-700/50 hover:border-gray-600/50 hover:bg-[#1a1a1a]'
                            : 'bg-[#0f0f0f] border-gray-700/50 hover:border-gray-600/50 hover:bg-[#1a1a1a]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {isSelectionMode ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItemSelection(item.id);
                              }}
                              className="w-5 h-5 rounded border-2 border-gray-400 flex items-center justify-center flex-shrink-0 mt-1 hover:border-blue-400 transition-colors"
                            >
                              {selectedItems.has(item.id) && <Check className="w-3 h-3 text-blue-400" />}
                            </button>
                          ) : (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-white text-sm font-medium truncate font-sans">
                                {getChatTitle(item.user_message)}
                              </h3>
                              <div className="flex items-center gap-2">
                                 {!isSelectionMode && (
                                   <button
                                     onClick={(e) => handleDeleteClick(e, item)}
                                     className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-800 rounded flex-shrink-0"
                                     title="Delete conversation"
                                   >
                                     <Trash2 className="w-3 h-3 text-[#bab8b8] hover:text-red-400" />
                                   </button>
                                 )}
                               </div>
                            </div>
                            <p className="text-gray-400 text-xs truncate font-sans">
                              {item.initialMessagePreview || item.user_message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.isOpen && (deleteConfirm.item || selectedItems.size > 0) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleDeleteCancel}>
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-6 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white text-lg font-medium mb-4">
              {deleteConfirm.item ? 'Delete Conversation' : 'Delete Selected Conversations'}
            </h3>
            <p className="text-gray-300 text-sm mb-2">
              Are you sure you want to delete {deleteConfirm.item ? 'this conversation' : `${selectedItems.size} selected conversations`}?
              This action cannot be undone.
            </p>
            {deleteConfirm.item && (
              <div className="text-gray-400 text-xs mb-6 truncate">
                &ldquo;{getChatTitle(deleteConfirm.item.user_message)}&rdquo;
              </div>
            )}
            {!deleteConfirm.item && selectedItems.size > 0 && (
              <div className="text-gray-400 text-xs mb-6">
                {selectedItems.size} conversation{selectedItems.size !== 1 ? 's' : ''} selected
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteConfirm.item ? handleDeleteConfirm : handleBulkDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}