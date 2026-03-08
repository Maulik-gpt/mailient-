"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Bookmark } from 'lucide-react';
import { Post } from '@/components/ui/post';
import { Button } from '@/components/ui/button';

interface BookmarkedPost {
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
  isBookmarked: boolean;
  bookmarkedAt?: string;
}

export default function BookmarksPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [bookmarkedPosts, setBookmarkedPosts] = useState<BookmarkedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  // Check authentication and fetch user profile
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchUserProfile();
      fetchBookmarks();
    }
  }, [status, router]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/profile/user');
      if (response.ok) {
        const data = await response.json();
        setUsername(data.username || null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchBookmarks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/bookmarks');
      if (response.ok) {
        const data = await response.json();
        // Transform bookmarks data to post format
        const posts = (data.bookmarks || []).map((bookmark: any) => ({
          ...bookmark.post_data,
          id: bookmark.post_id,
          isBookmarked: true,
          bookmarkedAt: bookmark.created_at,
        }));
        setBookmarkedPosts(posts);
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnbookmark = async (postId: string) => {
    try {
      const response = await fetch('/api/bookmarks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });

      if (response.ok) {
        setBookmarkedPosts(prev => prev.filter(post => post.id !== postId));
      }
    } catch (error) {
      console.error('Error unbookmarking post:', error);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header - X/Twitter Style */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center h-14 gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-900 rounded-full transition-colors duration-200"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-white" />
              <h1 className="text-xl font-bold text-white">Bookmarks</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Username Section */}
      {username && (
        <div className="max-w-2xl mx-auto px-4 py-3 border-b border-gray-800/50">
          <p className="text-sm text-gray-500">@{username}</p>
        </div>
      )}

      {/* Content - X/Twitter Style Feed */}
      <div className="max-w-2xl mx-auto">
        {bookmarkedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-24 h-24 rounded-full bg-gray-900 flex items-center justify-center mb-6 border border-gray-800">
              <Bookmark className="w-12 h-12 text-gray-600" />
            </div>
            <h2 className="text-3xl font-bold mb-3 text-white">Save posts for later</h2>
            <p className="text-gray-500 mb-8 max-w-sm text-base leading-relaxed">
              Bookmark posts to easily find them again in the future.
            </p>
            <Button
              onClick={() => router.push('/home-feed')}
              className="bg-white text-black hover:bg-gray-100 font-semibold px-6 py-3 rounded-full transition-all duration-200 hover:scale-105"
            >
              Explore Feed
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50 border-x border-gray-800/30 min-h-screen">
            {bookmarkedPosts.map((post) => (
              <div 
                key={post.id} 
                className="hover:bg-gray-900/30 transition-colors duration-150 border-b border-gray-800/30"
              >
                <Post
                  {...post}
                  isBookmarked={true}
                  onBookmark={() => handleUnbookmark(post.id)}
                  onLike={() => console.log('Like post:', post.id)}
                  onComment={() => console.log('Comment on post:', post.id)}
                  onShare={() => console.log('Share post:', post.id)}
                  onMore={() => console.log('More options for post:', post.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

