import React, { useState, useEffect, useCallback } from 'react';
import { Post } from './post';
import { Button } from './button';
import { RefreshCw, Plus } from 'lucide-react';
import { ComposePostDialog } from './compose-post-dialog';
import { ThemeToggle } from './theme-toggle';

interface PostData {
  id: string;
  user: {
    avatar: string;
    username: string;
    displayName: string;
  };
  timestamp: string;
  content: string;
  media?: {
    type: 'image' | 'video';
    url: string;
    alt?: string;
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  isLiked?: boolean;
  isBookmarked?: boolean;
}

interface FeedProps {
  posts: PostData[];
  onLoadMore?: () => void;
  onRefresh?: () => void;
  onCompose?: () => void;
  onPostSubmit?: (content: string, media?: File) => void;
  onBookmark?: (postId: string, postData: any) => void;
  hasMore?: boolean;
  isLoading?: boolean;
  isRefreshing?: boolean;
  user?: {
    avatar: string;
    displayName: string;
    username: string;
  };
}

export const Feed: React.FC<FeedProps> = ({
  posts,
  onLoadMore,
  onRefresh,
  onBookmark,
  onCompose,
  onPostSubmit,
  hasMore = true,
  isLoading = false,
  isRefreshing = false,
  user,
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Listen for compose dialog open event
  React.useEffect(() => {
    const handleOpenCompose = () => setIsComposeOpen(true);
    window.addEventListener('openComposeDialog', handleOpenCompose);
    return () => window.removeEventListener('openComposeDialog', handleOpenCompose);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY);
      setPullDistance(distance);
      setIsPulling(distance > 50);
    }
  }, [startY]);

  const handleTouchEnd = useCallback(() => {
    if (isPulling && onRefresh) {
      onRefresh();
    }
    setIsPulling(false);
    setPullDistance(0);
    setStartY(0);
  }, [isPulling, onRefresh]);

  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop
      >= document.documentElement.offsetHeight - 1000 &&
      hasMore &&
      !isLoading &&
      onLoadMore
    ) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className="bg-black">
      {/* Pull to Refresh Indicator */}
      {(isPulling || isRefreshing) && (
        <div className="flex justify-center py-4 bg-black border-b border-[#525252]">
          <RefreshCw className={`w-6 h-6 text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} />
        </div>
      )}

      {/* Feed Content */}
      <div
        className="max-w-2xl mx-auto py-4 px-3 sm:px-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {posts.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No posts yet. Be the first to share something!</p>
          </div>
        ) : (
          posts.map((post) => (
            <Post
              key={post.id}
              {...post}
              onLike={() => console.log('Like post:', post.id)}
              onComment={() => console.log('Comment on post:', post.id)}
              onShare={() => console.log('Share post:', post.id)}
              onBookmark={() => onBookmark?.(post.id, post)}
              onMore={() => console.log('More options for post:', post.id)}
            />
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        )}

        {/* Load More Button (fallback) */}
        {!isLoading && hasMore && onLoadMore && (
          <div className="text-center py-8">
            <Button
              onClick={onLoadMore}
              variant="outline"
              className="text-blue-500 border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              Load More Posts
            </Button>
          </div>
        )}

        {/* Compose Dialog */}
        <ComposePostDialog
          open={isComposeOpen}
          onOpenChange={setIsComposeOpen}
          onSubmit={onPostSubmit || (() => {})}
          user={user}
        />
      </div>
    </div>
  );
};
