import React, { useState, useRef } from 'react';
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CommentModal } from './comment-modal';
import { ShareModal } from './share-modal';
import { EmojiReactions } from './emoji-reactions';
import { SparkleAnimation } from './sparkle-animation';

interface PostProps {
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
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
  onMore?: () => void;
  comments?: Array<{
    id: string;
    user: {
      avatar: string;
      username: string;
      displayName: string;
    };
    content: string;
    timestamp: string;
    likes: number;
    isLiked?: boolean;
    replies?: any[];
  }>;
  currentUser?: {
    avatar: string;
    displayName: string;
    username: string;
  };
}

export const Post: React.FC<PostProps> = ({
  id,
  user,
  timestamp,
  content,
  media,
  engagement,
  isLiked = false,
  isBookmarked = false,
  onLike,
  onComment,
  onShare,
  onBookmark,
  onMore,
  comments = [],
  currentUser,
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEmojiReactionsOpen, setIsEmojiReactionsOpen] = useState(false);
  const [emojiReactionPosition, setEmojiReactionPosition] = useState({ top: 0, left: 0 });
  const [localEngagement, setLocalEngagement] = useState(engagement);
  const [localIsLiked, setLocalIsLiked] = useState(isLiked);
  const [localIsBookmarked, setLocalIsBookmarked] = useState(isBookmarked);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [isSelected, setIsSelected] = useState(false);
  const likeButtonRef = useRef<HTMLButtonElement>(null);
  const [sparkleAnimation, setSparkleAnimation] = useState<{
    isActive: boolean;
    emoji: string;
    position: { x: number; y: number };
  }>({ isActive: false, emoji: '', position: { x: 0, y: 0 } });
  
  const handlePostClick = () => {
    setIsSelected(true);
    setTimeout(() => setIsSelected(false), 200);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;

    // Only allow left swipe (negative diff) for actions
    if (diff < 0) {
      setSwipeOffset(Math.max(diff, -120)); // Max swipe distance
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;

    setIsSwiping(false);

    // If swiped far enough, trigger action
    if (swipeOffset < -60) {
      handleBookmark();
    }

    // Reset swipe offset
    setSwipeOffset(0);
  };

  const handleLike = () => {
    if (likeButtonRef.current) {
      const rect = likeButtonRef.current.getBoundingClientRect();
      setEmojiReactionPosition({
        top: rect.top + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX,
      });
      setIsEmojiReactionsOpen(true);
    }
  };

  const handleEmojiReaction = (emoji: string) => {
    setSelectedReaction(emoji);
    setLocalIsLiked(true);
    setLocalEngagement(prev => ({
      ...prev,
      likes: prev.likes + 1
    }));
    onLike?.();
    
    // Trigger sparkle animation
    if (likeButtonRef.current) {
      const rect = likeButtonRef.current.getBoundingClientRect();
      setSparkleAnimation({
        isActive: true,
        emoji: emoji,
        position: {
          x: rect.left + rect.width / 2 + window.scrollX,
          y: rect.top + window.scrollY
        }
      });
    }
    
    // Here you would send the emoji reaction to the API
    console.log('Reacted with emoji:', emoji, 'on post:', id);
  };

  const handleComment = () => {
    setIsCommentModalOpen(true);
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleBookmark = () => {
    setLocalIsBookmarked(!localIsBookmarked);
    onBookmark?.();
  };

  const handleAddComment = (commentContent: string, parentId?: string) => {
    // Optimistically update comment count
    setLocalEngagement(prev => ({
      ...prev,
      comments: prev.comments + 1
    }));
    // Here you would typically send to API
    console.log('Adding comment:', commentContent, 'to post:', id, 'parent:', parentId);
  };

  const handleLikeComment = (commentId: string) => {
    // Here you would typically send to API
    console.log('Liking comment:', commentId, 'on post:', id);
  };


  const renderPost = () => (
    <article
      className={`bg-black rounded-lg shadow-sm border p-3 sm:p-4 mb-3 max-w-4xl mr-4 relative overflow-hidden transition-all duration-200 ${
        isSelected ? 'border-[#2a2a2a]' : 'border-[#525252]'
      }`}
      onClick={handlePostClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateX(${swipeOffset}px)`,
        transition: isSwiping ? 'none' : 'transform 0.3s ease-out, border-color 0.2s ease-out',
      }}
      role="article"
      aria-label={`Post by ${user.displayName}`}
    >
      {/* Swipe Action Indicator */}
      {swipeOffset < 0 && (
        <div className="absolute right-0 top-0 h-full w-20 bg-blue-500 flex items-center justify-center text-white font-semibold">
          <Bookmark className="w-6 h-6" />
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
            <AvatarImage src={user.avatar} alt={user.displayName} />
            <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">{user.displayName}</p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">@{user.username} · {timestamp}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onMore} aria-label="More options">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="text-gray-900 dark:text-white whitespace-pre-wrap text-sm sm:text-base leading-relaxed" role="text">{content}</p>
      </div>

      {/* Media */}
      {media && (
        <div className="mb-3 rounded-lg overflow-hidden">
          {media.type === 'image' ? (
            <img
              src={media.url}
              alt={media.alt || 'Post media'}
              className="w-full h-auto max-h-64 sm:max-h-96 object-cover"
              loading="lazy"
            />
          ) : (
            <video
              src={media.url}
              controls
              className="w-full h-auto max-h-64 sm:max-h-96"
              preload="metadata"
              aria-label="Post video"
            />
          )}
        </div>
      )}

      {/* Engagement */}
      <div className="flex items-center justify-between pt-3 border-t border-[#525252]">
        <div className="flex items-center space-x-4 sm:space-x-6">
          <Button
            ref={likeButtonRef}
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`flex items-center space-x-1 text-xs sm:text-sm transition-colors ${
              selectedReaction ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
            }`}
            aria-label="React to post"
          >
            {selectedReaction ? (
              <span className="text-lg">{selectedReaction}</span>
            ) : (
              <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleComment}
            className="flex items-center space-x-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors"
            aria-label="Comment on post"
          >
            <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="flex items-center space-x-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-green-500 transition-colors"
            aria-label="Share post"
          >
            <Share className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBookmark}
          className={`flex items-center space-x-1 text-xs sm:text-sm ${localIsBookmarked ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'} transition-colors`}
          aria-label={`${localIsBookmarked ? 'Remove bookmark' : 'Bookmark'} post`}
        >
          <Bookmark className={`w-3 h-3 sm:w-4 sm:h-4 ${localIsBookmarked ? 'fill-current' : ''}`} />
        </Button>
      </div>
    </article>
  );

  const handleSparkleComplete = () => {
    setSparkleAnimation(prev => ({ ...prev, isActive: false }));
  };

  return (
    <>
      {renderPost()}

      {/* Comment Modal */}
      {currentUser && isCommentModalOpen && (
        <CommentModal
          open={isCommentModalOpen}
          onOpenChange={setIsCommentModalOpen}
          postId={id}
          postUser={user}
          postContent={content}
          postTimestamp={timestamp}
          initialComments={comments}
          onAddComment={handleAddComment}
          onLikeComment={handleLikeComment}
          currentUser={currentUser}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        postId={id}
        postContent={content}
        postUser={user}
      />

      {/* Emoji Reactions */}
      <EmojiReactions
        isOpen={isEmojiReactionsOpen}
        onClose={() => setIsEmojiReactionsOpen(false)}
        onReact={handleEmojiReaction}
        position={emojiReactionPosition}
      />

      {/* Sparkle Animation */}
      <SparkleAnimation
        isActive={sparkleAnimation.isActive}
        onComplete={handleSparkleComplete}
        emoji={sparkleAnimation.emoji}
        position={sparkleAnimation.position}
      />
    </>
  );
};