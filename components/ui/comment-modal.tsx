import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { Textarea } from './textarea';
import { Heart, MessageCircle, Share, MoreHorizontal, Send, X } from 'lucide-react';

interface Comment {
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
  replies?: Comment[];
}

interface CommentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postUser: {
    avatar: string;
    username: string;
    displayName: string;
  };
  postContent: string;
  postTimestamp: string;
  initialComments: Comment[];
  onAddComment: (content: string, parentId?: string) => void;
  onLikeComment: (commentId: string) => void;
  currentUser: {
    avatar: string;
    displayName: string;
    username: string;
  };
}

export const CommentModal: React.FC<CommentModalProps> = ({
  open,
  onOpenChange,
  postId,
  postUser,
  postContent,
  postTimestamp,
  initialComments,
  onAddComment,
  onLikeComment,
  currentUser,
}) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      user: currentUser,
      content: newComment,
      timestamp: 'now',
      likes: 0,
      isLiked: false,
    };

    setComments(prev => [comment, ...prev]);
    onAddComment(newComment);
    setNewComment('');

    // Scroll to top to show new comment
    setTimeout(() => {
      scrollAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleAddReply = (parentId: string) => {
    if (!replyContent.trim()) return;

    const reply: Comment = {
      id: Date.now().toString(),
      user: currentUser,
      content: replyContent,
      timestamp: 'now',
      likes: 0,
      isLiked: false,
    };

    setComments(prev => prev.map(comment =>
      comment.id === parentId
        ? { ...comment, replies: [reply, ...(comment.replies || [])] }
        : comment
    ));

    onAddComment(replyContent, parentId);
    setReplyContent('');
    setReplyingTo(null);
  };

  const handleLikeComment = (commentId: string) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        const newIsLiked = !comment.isLiked;
        return {
          ...comment,
          isLiked: newIsLiked,
          likes: newIsLiked ? comment.likes + 1 : Math.max(0, comment.likes - 1)
        };
      }
      return comment;
    }));
    onLikeComment(commentId);
  };

  const CommentItem: React.FC<{ comment: Comment; isReply?: boolean }> = ({ comment, isReply = false }) => (
    <div className={`${isReply ? 'ml-8 mt-3' : 'mb-4'} border-b border-gray-200 dark:border-gray-700 pb-3`}>
      <div className="flex items-start space-x-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.user.avatar} alt={comment.user.displayName} />
          <AvatarFallback>{comment.user.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              {comment.user.displayName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              @{comment.user.username} · {comment.timestamp}
            </span>
          </div>
          <p className="text-sm text-gray-900 dark:text-white mb-2">{comment.content}</p>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLikeComment(comment.id)}
              className={`flex items-center space-x-1 text-xs ${
                comment.isLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Heart className={`w-3 h-3 ${comment.isLiked ? 'fill-current' : ''}`} />
              <span>{comment.likes}</span>
            </Button>
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400"
              >
                <MessageCircle className="w-3 h-3" />
                <span>Reply</span>
              </Button>
            )}
          </div>
          {replyingTo === comment.id && (
            <div className="mt-3 flex space-x-2">
              <Avatar className="w-6 h-6 flex-shrink-0">
                <AvatarImage src={currentUser.avatar} alt={currentUser.displayName} />
                <AvatarFallback>{currentUser.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <Textarea
                placeholder={`Reply to ${comment.user.displayName}...`}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="flex-1 text-sm resize-none"
                rows={2}
              />
              <div className="flex flex-col space-y-1">
                <Button
                  size="sm"
                  onClick={() => handleAddReply(comment.id)}
                  disabled={!replyContent.trim()}
                  className="h-8 px-3"
                >
                  <Send className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                  className="h-8 px-3"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
          {comment.replies?.map(reply => (
            <CommentItem key={reply.id} comment={reply} isReply />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        {/* Original Post Preview */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
          <div className="flex items-start space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={postUser.avatar} alt={postUser.displayName} />
              <AvatarFallback>{postUser.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {postUser.displayName}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  @{postUser.username} · {postTimestamp}
                </span>
              </div>
              <p className="text-gray-900 dark:text-white">{postContent}</p>
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div ref={scrollAreaRef} className="flex-1 overflow-y-auto pr-4 max-h-96">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            <div className="space-y-1">
              {comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>
          )}
        </div>

        {/* Add Comment */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <div className="flex items-start space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={currentUser.avatar} alt={currentUser.displayName} />
              <AvatarFallback>{currentUser.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex space-x-2">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 resize-none"
                rows={2}
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
