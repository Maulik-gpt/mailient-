import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Button } from './button';
import { Textarea } from './textarea';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { Image, Video, X } from 'lucide-react';

interface ComposePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (content: string, media?: File) => void;
  user?: {
    avatar: string;
    displayName: string;
    username: string;
  };
}

export const ComposePostDialog: React.FC<ComposePostDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  user,
}) => {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMedia(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveMedia = () => {
    setMedia(null);
    setMediaPreview(null);
  };

  const handleSubmit = async () => {
    if (!content.trim() && !media) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content, media || undefined);
      setContent('');
      setMedia(null);
      setMediaPreview(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const characterCount = content.length;
  const maxCharacters = 280;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user?.avatar} alt={user?.displayName} />
              <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{user?.displayName || 'User'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">@{user?.username || 'username'}</p>
            </div>
          </div>

          {/* Content Input */}
          <Textarea
            placeholder="What's happening?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none border-none shadow-none focus:ring-0 text-lg"
            maxLength={maxCharacters}
          />

          {/* Media Preview */}
          {mediaPreview && (
            <div className="relative">
              {media?.type.startsWith('image/') ? (
                <img
                  src={mediaPreview}
                  alt="Media preview"
                  className="w-full max-h-64 object-cover rounded-lg"
                />
              ) : (
                <video
                  src={mediaPreview}
                  controls
                  className="w-full max-h-64 rounded-lg"
                />
              )}
              <Button
                onClick={handleRemoveMedia}
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white border-none"
                aria-label="Remove media"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <label htmlFor="media-upload" className="cursor-pointer">
                <Button variant="ghost" size="sm" asChild>
                  <span>
                    <Image className="w-4 h-4 text-blue-500" />
                  </span>
                </Button>
              </label>
              <input
                id="media-upload"
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaSelect}
                className="hidden"
                aria-label="Upload media"
              />

              <label htmlFor="video-upload" className="cursor-pointer">
                <Button variant="ghost" size="sm" asChild>
                  <span>
                    <Video className="w-4 h-4 text-blue-500" />
                  </span>
                </Button>
              </label>
              <input
                id="video-upload"
                type="file"
                accept="video/*"
                onChange={handleMediaSelect}
                className="hidden"
                aria-label="Upload video"
              />
            </div>

            <div className="flex items-center space-x-4">
              <span className={`text-sm ${characterCount > maxCharacters * 0.9 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                {characterCount}/{maxCharacters}
              </span>
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() && !media || isSubmitting || characterCount > maxCharacters}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6"
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
