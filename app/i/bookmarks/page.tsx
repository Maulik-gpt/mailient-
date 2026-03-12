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

import { HomeFeedSidebar } from '@/components/ui/home-feed-sidebar';
import { cn } from '@/lib/utils';

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
      <div className="min-h-screen bg-[#F9F8F6] dark:bg-[#0c0c0c] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="flex bg-[#F9F8F6] dark:bg-[#0c0c0c] min-h-screen">
      <HomeFeedSidebar />
      
      <div className="flex-1 ml-64 min-h-screen relative overflow-hidden">
        <div className="mt-2.5 mr-2.5 mb-2.5 bg-white dark:bg-[#111111] rounded-[2.5rem] min-h-[calc(100vh-20px)] border border-[#EBE9E2] dark:border-white/[0.05] shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-none overflow-y-auto custom-scrollbar">
          <div className="max-w-5xl mx-auto px-10 py-12">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <Bookmark className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-[#1A1A1A] dark:text-white">Bookmarks</h1>
                  <p className="text-sm text-[#666666] dark:text-neutral-500">Saved items and references</p>
                </div>
              </div>
            </div>

            {/* Content Container */}
            <div className="space-y-6">
              {bookmarkedPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-[2rem] bg-[#F9F8F6] dark:bg-white/5 flex items-center justify-center mb-6 border border-[#EBE9E2] dark:border-white/10">
                    <Bookmark className="w-8 h-8 text-[#666666] dark:text-neutral-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-white mb-2">No bookmarks yet</h2>
                  <p className="text-[#666666] dark:text-neutral-500 max-w-sm mb-8">
                    Save important posts and AI insights to find them here later.
                  </p>
                  <Button
                    onClick={() => router.push('/home-feed')}
                    className="bg-[#1A1A1A] dark:bg-white text-white dark:text-black hover:opacity-90 px-8 py-6 rounded-2xl transition-all"
                  >
                    Go to Feed
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {bookmarkedPosts.map((post) => (
                    <div 
                      key={post.id} 
                      className="bg-[#F9F8F6]/30 dark:bg-white/[0.02] border border-[#EBE9E2] dark:border-white/5 rounded-3xl p-1 overflow-hidden"
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
        </div>
      </div>
    </div>
  );
}

