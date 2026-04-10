'use client';

import { useTransition, useState } from 'react';
import { toggleLike } from '@/lib/actions';
import { useRouter } from 'next/navigation';

interface LikeButtonProps {
  postId: number;
  initialLikeCount: number;
  initialLiked: boolean;
  isLoggedIn: boolean;
}

export default function LikeButton({
  postId,
  initialLikeCount,
  initialLiked,
  isLoggedIn,
}: LikeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const router = useRouter();

  const handleClick = () => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));

    startTransition(async () => {
      const result = await toggleLike(postId);
      if (result?.error) {
        setLiked((prev) => !prev);
        setLikeCount((prev) => (liked ? prev + 1 : prev - 1));
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all
        ${
          liked
            ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100'
            : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
        }
        ${isPending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className="text-base">{liked ? '❤️' : '🤍'}</span>
      <span>{likeCount}</span>
    </button>
  );
}
