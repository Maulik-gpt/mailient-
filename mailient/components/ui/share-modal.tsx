import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import {
  Copy,
  MessageCircle,
  Mail,
  Link,
  Twitter,
  Facebook,
  Instagram,
  Check,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postContent: string;
  postUser: {
    displayName: string;
    username: string;
  };
}

export const ShareModal: React.FC<ShareModalProps> = ({
  open,
  onOpenChange,
  postId,
  postContent,
  postUser,
}) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/post/${postId}`;

  const shareOptions = [
    {
      name: 'Copy Link',
      icon: Copy,
      action: async () => {
        try {
          await navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          toast.success('Link copied to clipboard!');
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          toast.error('Failed to copy link');
        }
      },
      color: 'text-gray-600 hover:text-gray-800',
    },
    {
      name: 'Twitter',
      icon: Twitter,
      action: () => {
        const text = `Check out this post by @${postUser.username}: "${postContent.substring(0, 100)}${postContent.length > 100 ? '...' : ''}"`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      },
      color: 'text-blue-500 hover:text-blue-600',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      action: () => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      },
      color: 'text-blue-600 hover:text-blue-700',
    },
    {
      name: 'Email',
      icon: Mail,
      action: () => {
        const subject = `Check out this post by ${postUser.displayName}`;
        const body = `Hi,\n\nI thought you might find this interesting:\n\n"${postContent}"\n\nRead more: ${shareUrl}\n\nBest,\n${postUser.displayName}`;
        const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      },
      color: 'text-gray-600 hover:text-gray-800',
    },
    {
      name: 'Messages',
      icon: MessageCircle,
      action: () => {
        if (navigator.share) {
          navigator.share({
            title: `Post by ${postUser.displayName}`,
            text: postContent,
            url: shareUrl,
          });
        } else {
          // Fallback for browsers that don't support Web Share API
          const url = `sms:?body=${encodeURIComponent(`${postContent} ${shareUrl}`)}`;
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      },
      color: 'text-green-600 hover:text-green-700',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ExternalLink className="w-5 h-5" />
            <span>Share Post</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Post Preview */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-semibold text-sm">{postUser.displayName}</span>
              <span className="text-xs text-gray-500">@{postUser.username}</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
              {postContent}
            </p>
          </div>

          {/* Share URL */}
          <div className="space-y-2">
            <Label htmlFor="share-url" className="text-sm font-medium">
              Share Link
            </Label>
            <div className="flex space-x-2">
              <Input
                id="share-url"
                value={shareUrl}
                readOnly
                className="flex-1 text-sm"
              />
              <Button
                onClick={shareOptions[0].action}
                variant="outline"
                size="sm"
                className="px-3"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Share via</Label>
            <div className="grid grid-cols-2 gap-3">
              {shareOptions.slice(1).map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.name}
                    onClick={option.action}
                    variant="outline"
                    className={`flex items-center space-x-2 h-12 ${option.color} border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{option.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Copy Link Button (Prominent) */}
          <Button
            onClick={shareOptions[0].action}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};