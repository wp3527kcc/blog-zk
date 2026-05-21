'use client';

import { useState, useTransition } from 'react';
import { toggleFollow } from '@/lib/actions';

interface FollowButtonProps {
  targetUserId: number;
  initialFollowing: boolean;
  initialFollowerCount?: number;
  isLoggedIn: boolean;
}

export default function FollowButton({
  targetUserId,
  initialFollowing,
  initialFollowerCount,
  isLoggedIn,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialFollowerCount ?? null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (!isLoggedIn) {
      setError('请先登录');
      return;
    }
    setError('');

    const optimisticFollowing = !following;
    setFollowing(optimisticFollowing);
    setCount((c) => c !== null ? c + (optimisticFollowing ? 1 : -1) : null);

    startTransition(async () => {
      const result = await toggleFollow(targetUserId);
      if (result?.error) {
        setFollowing((v) => !v);
        setCount((c) => c !== null ? c + (optimisticFollowing ? -1 : 1) : null);
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg border transition-colors disabled:opacity-60 ${
          following
            ? 'bg-white border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-500'
            : 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {following ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            已关注
          </>
        ) : (
          <>+ 关注</>
        )}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
      {count !== null && (
        <span className="text-xs text-gray-400">{count} 关注者</span>
      )}
    </div>
  );
}
