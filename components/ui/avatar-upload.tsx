"use client";

import { useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Camera, Upload, X, Loader2 } from "lucide-react";

interface AvatarUploadProps {
  currentAvatar?: string | null;
  onAvatarChange: (avatarUrl: string) => void;
  size?: 'sm' | 'md' | 'lg';
  showRemoveButton?: boolean;
}

export default function AvatarUpload({
  currentAvatar,
  onAvatarChange,
  size = 'md',
  showRemoveButton = true
}: AvatarUploadProps) {
  const { data: session } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload avatar');
      }

      const data = await response.json();
      onAvatarChange(data.avatar_url);
    } catch (err) {
      console.error('Avatar upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  }, [onAvatarChange]);

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleRemoveAvatar = useCallback(async () => {
    if (!currentAvatar || !showRemoveButton) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove avatar');
      }

      onAvatarChange('');
    } catch (err) {
      console.error('Avatar removal error:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove avatar');
    } finally {
      setIsUploading(false);
    }
  }, [currentAvatar, onAvatarChange, showRemoveButton]);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-4 satoshi-avatar-upload" style={{ fontFamily: "'Satoshi', ui-sans-serif, system-ui, sans-serif" }}>
      {/* Avatar Display/Upload Area */}
      <div
        className={`
          relative ${sizeClasses[size]} rounded-full bg-[#1A1A1A] border-2 border-dashed
          ${isDragOver ? 'border-blue-500 bg-blue-500/10' : 'border-[#444444]'}
          ${isUploading ? 'cursor-not-allowed' : 'cursor-pointer'}
          transition-all duration-200 overflow-hidden
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={!isUploading ? openFileDialog : undefined}
        role="button"
        tabIndex={0}
        aria-label={currentAvatar ? 'Change avatar' : 'Upload avatar'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFileDialog();
          }
        }}
      >
        {currentAvatar ? (
          <img
            src={currentAvatar}
            alt="Current avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            {isUploading ? (
              <Loader2 className={`${iconSizes[size]} animate-spin`} />
            ) : (
              <Camera className={iconSizes[size]} />
            )}
          </div>
        )}

        {/* Upload Overlay */}
        {!isUploading && (
          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <Upload className={`${iconSizes[size]} text-white`} />
          </div>
        )}

        {/* Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className={`${iconSizes[size]} text-white animate-spin`} />
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileInput}
        className="hidden"
        aria-label="Select avatar image"
      />

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={openFileDialog}
          disabled={isUploading}
          className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {currentAvatar ? 'Change' : 'Upload'}
        </button>

        {currentAvatar && showRemoveButton && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            disabled={isUploading}
            className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Remove
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-gray-400">
        <p>Click to upload or drag and drop</p>
        <p>JPEG, PNG, GIF, WebP up to 5MB</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs text-gray-400 hover:text-white mt-1"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}