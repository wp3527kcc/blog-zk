'use client';

import { deleteComment } from '@/lib/actions';
import CommentLikeButton from './CommentLikeButton';
import type { Comment } from '@/lib/types';

interface CommentItemProps {
  comment: Comment;
  currentUserId: number | null;
  postAuthorId: number;
  isLoggedIn: boolean;
}

export default function CommentItem({
  comment,
  currentUserId,
  postAuthorId,
  isLoggedIn,
}: CommentItemProps) {
  const canDelete =
    currentUserId !== null &&
    (currentUserId === comment.author_id || currentUserId === postAuthorId);

  const handleDelete = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm('确定要删除这条评论吗？')) {
      e.preventDefault();
    }
  };

  return (
    <div className="flex gap-3 py-4">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
        {comment.author_username[0].toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700">{comment.author_username}</span>
            <span>·</span>
            <time dateTime={comment.created_at}>
              {new Date(comment.created_at).toLocaleDateString('zh-CN', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <CommentLikeButton
              commentId={comment.id}
              initialLikeCount={comment.like_count}
              initialLiked={comment.liked_by_user}
              isLoggedIn={isLoggedIn}
            />
            {canDelete && (
              <form onSubmit={handleDelete} action={deleteComment.bind(null, comment.id)}>
                <button
                  type="submit"
                  className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                >
                  删除
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      </div>
    </div>
  );
}
