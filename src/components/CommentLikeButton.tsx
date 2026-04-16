'use client';

import { useTransition, useState } from 'react';
import { toggleCommentLike } from '@/lib/actions';
import { useRouter } from 'next/navigation';

interface CommentLikeButtonProps {
  commentId: number;
  initialLikeCount: number;
  initialLiked: boolean;
  isLoggedIn: boolean;
}

export default function CommentLikeButton({
  commentId,
  initialLikeCount,
  initialLiked,
  isLoggedIn,
}: CommentLikeButtonProps) {
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
      const result = await toggleCommentLike(commentId);
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
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all
        ${
          liked
            ? 'bg-red-50 text-red-400 border border-red-100 hover:bg-red-100'
            : 'bg-gray-50 text-gray-400 border border-gray-100 hover:bg-gray-100'
        }
        ${isPending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className="text-xs">{liked ? '❤️' : '🤍'}</span>
      {likeCount > 0 && <span>{likeCount}</span>}
    </button>
  );
}
