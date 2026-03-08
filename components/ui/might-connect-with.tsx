"use client";

import { useState, useEffect } from 'react';
import { Check, Frown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { addNotification } from '@/lib/notifications';
import { InviteShareModal } from './invite-share-modal';

interface Profile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio?: string;
  isVerified?: boolean;
}

interface MightConnectWithProps {
  profiles: Profile[];
  compact?: boolean;
  hasRealContacts?: boolean;
  currentUsername?: string;
}

export function MightConnectWith({ profiles, compact = false, hasRealContacts = true, currentUsername = 'user' }: MightConnectWithProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [displayProfiles] = useState(compact ? profiles.slice(0, 3) : profiles);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  // Get username from session if not provided
  const username = currentUsername || session?.user?.name || (session?.user?.email ? session.user.email.split('@')[0] : 'user');

  // Load following state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mailient_following');
      if (stored) {
        try {
          const followingArray = JSON.parse(stored) as string[];
          const followingSet = new Set(followingArray);
          setFollowing(followingSet);
        } catch (error) {
          console.error('Error loading following state:', error);
        }
      }
    }
  }, []);

  const handleFollow = (profile: Profile) => {
    const profileId = profile.id;
    const wasFollowing = following.has(profileId);
    
    // Create notification before state update to prevent duplicates
    if (wasFollowing) {
      // Create notification when unfollowing
      addNotification({
        type: 'follow',
        user: {
          name: profile.name,
          username: profile.username,
          avatar: profile.avatar,
          verified: profile.isVerified,
        },
        content: `You have unfollowed ${profile.name}`,
        timestamp: 'just now',
      });
    } else {
      // Create notification when following
      addNotification({
        type: 'follow',
        user: {
          name: profile.name,
          username: profile.username,
          avatar: profile.avatar,
          verified: profile.isVerified,
        },
        content: `You have successfully followed ${profile.name}`,
        timestamp: 'just now',
      });
    }
    
    setFollowing(prev => {
      const newSet = new Set(prev);
      if (wasFollowing) {
        newSet.delete(profileId);
      } else {
        newSet.add(profileId);
      }
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('mailient_following', JSON.stringify(Array.from(newSet)));
      }
      
      return newSet;
    });
  };

  // If no real contacts, show placeholder state
  if (!hasRealContacts) {
    return (
      <>
        <div className="bg-black border border-[#2f3336] rounded-2xl">
          <div className="p-4 border-b border-[#2f3336]">
            <h2 className="text-white font-bold text-xl">Might Connect With</h2>
          </div>
          
          <div className="p-6 flex flex-col items-center justify-center text-center space-y-4">
            {/* Placeholder Message */}
            <div className="space-y-2">
              <p className="text-white text-[15px]">No contacts found…</p>
              <Frown className="w-8 h-8 text-[#8b98a5] mx-auto" />
            </div>
            
            {/* Invite Button */}
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-full font-bold text-[15px] transition-colors hover:opacity-90 border"
              style={{ 
                backgroundColor: '#1c1c1c', 
                color: '#fafafa',
                borderColor: '#787878'
              }}
            >
              Invite
            </button>
          </div>
        </div>
        
        <InviteShareModal 
          open={isInviteModalOpen} 
          onOpenChange={setIsInviteModalOpen}
          username={username}
        />
      </>
    );
  }

  return (
    <>
      <div className="bg-black border border-[#2f3336] rounded-2xl">
        <div className="p-4 border-b border-[#2f3336]">
          <h2 className="text-white font-bold text-xl">Might Connect With</h2>
        </div>
        
        <div className="divide-y divide-[#2f3336]">
          {displayProfiles.map((profile) => {
            const isFollowing = following.has(profile.id);
            
            return (
              <div 
                key={profile.id} 
                className="p-4 hover:bg-[#16181c] transition-colors cursor-pointer"
                onClick={() => router.push(`/aether/${profile.username}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="w-12 h-12 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-white font-bold text-[15px] truncate">
                          {profile.name}
                        </span>
                        {profile.isVerified && (
                          <div className="w-5 h-5 rounded-full bg-[#1d9bf0] flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="text-[#8b98a5] text-[15px] truncate">
                        @{profile.username}
                      </div>
                      {profile.bio && !compact && (
                        <div className="text-[#8b98a5] text-[15px] mt-1 overflow-hidden" style={{ 
                          display: '-webkit-box', 
                          WebkitLineClamp: 2, 
                          WebkitBoxOrient: 'vertical' 
                        }}>
                          {profile.bio}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollow(profile);
                    }}
                    className={`px-4 py-1.5 rounded-full font-bold text-[15px] transition-all duration-200 flex-shrink-0 relative overflow-hidden group ${
                      isFollowing
                        ? ''
                        : 'hover:bg-[#e6e6e6]'
                    }`}
                    style={isFollowing 
                      ? { 
                          backgroundColor: '#2b2b2b', 
                          color: '#fafafa',
                          border: '1px solid #474747'
                        }
                      : { 
                          backgroundColor: '#fafafa', 
                          color: '#000'
                        }
                    }
                  >
                    <span className={`transition-opacity duration-200 ${isFollowing ? 'group-hover:opacity-0' : ''}`}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </span>
                    {isFollowing && (
                      <span 
                        className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 opacity-0 group-hover:opacity-100"
                        style={{ backgroundColor: '#fafafa', color: '#000' }}
                      >
                        Unfollow
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {compact && profiles.length > 3 && (
          <div className="p-4 border-t border-[#2f3336]">
            <button
              onClick={() => router.push('/i/connect_people')}
              className="text-[#1d9bf0] hover:underline text-[15px] w-full text-left"
            >
              Show more
            </button>
          </div>
        )}
      </div>
    </>
  );
}

