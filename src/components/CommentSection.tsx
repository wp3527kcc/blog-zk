'use client';

import { useActionState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { createComment } from '@/lib/actions';
import CommentItem from './CommentItem';
import type { Comment } from '@/lib/types';

interface CommentSectionProps {
  postId: number;
  postAuthorId: number;
  comments: Comment[];
  currentUserId: number | null;
  isLoggedIn: boolean;
}

export default function CommentSection({
  postId,
  postAuthorId,
  comments,
  currentUserId,
  isLoggedIn,
}: CommentSectionProps) {
  const createCommentWithPost = createComment.bind(null, postId);
  const [state, action, isPending] = useActionState(createCommentWithPost, null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state?.success && textareaRef.current) {
      textareaRef.current.value = '';
    }
  }, [state]);

  return (
    <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-8 py-5 border-b border-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">
          评论
          {comments.length > 0 && (
            <span className="ml-2 text-gray-400 font-normal">{comments.length}</span>
          )}
        </h2>
      </div>

      {/* 评论输入区 */}
      <div className="px-8 py-5 border-b border-gray-50">
        {isLoggedIn ? (
          <form action={action} className="space-y-3">
            {state?.error && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                {state.error}
              </p>
            )}
            <textarea
              ref={textareaRef}
              name="content"
              required
              rows={3}
              maxLength={1000}
              placeholder="写下你的评论..."
              className="w-full text-sm text-gray-700 placeholder:text-gray-300 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-gray-200 focus:ring-2 focus:ring-gray-50 resize-none leading-relaxed transition-all"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {isPending ? '发布中...' : '发布评论'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-400">
            <Link href="/login" className="text-blue-500 hover:underline">
              登录
            </Link>{' '}
            后可以发表评论
          </p>
        )}
      </div>

      {/* 评论列表 */}
      <div className="px-8">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">暂无评论，快来抢沙发吧</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                postAuthorId={postAuthorId}
                isLoggedIn={isLoggedIn}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
