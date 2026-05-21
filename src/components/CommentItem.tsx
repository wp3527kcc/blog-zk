'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { deleteComment } from '@/lib/actions';
import CommentLikeButton from './CommentLikeButton';
import type { Comment } from '@/lib/types';

const MENTION_RE = /@([a-zA-Z0-9_\u4e00-\u9fa5]{2,20})/g;

function renderWithMentions(content: string) {
  const parts: Array<{ type: 'text' | 'mention'; value: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = MENTION_RE.exec(content)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: content.slice(last, m.index) });
    parts.push({ type: 'mention', value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push({ type: 'text', value: content.slice(last) });

  return parts.map((p, i) =>
    p.type === 'mention' ? (
      <Link
        key={i}
        href={`/users/${p.value}`}
        className="text-blue-500 hover:text-blue-600 hover:underline font-medium"
      >
        @{p.value}
      </Link>
    ) : (
      <Fragment key={i}>{p.value}</Fragment>
    )
  );
}

interface CommentItemProps {
  comment: Comment;
  currentUserId: number | null;
  postAuthorId: number;
  isLoggedIn: boolean;
  onMention?: (username: string) => void;
}

export default function CommentItem({
  comment,
  currentUserId,
  postAuthorId,
  isLoggedIn,
  onMention,
}: CommentItemProps) {
  const canDelete =
    currentUserId !== null &&
    (currentUserId === comment.author_id || currentUserId === postAuthorId);

  const canMention =
    isLoggedIn &&
    !!onMention &&
    currentUserId !== null &&
    currentUserId !== comment.author_id;

  const handleDelete = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm('确定要删除这条评论吗？')) {
      e.preventDefault();
    }
  };

  return (
    <div className="flex gap-3 py-4">
      <div className="w-7 h-7 rounded-full shrink-0 mt-0.5 overflow-hidden">
        {comment.author_avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={comment.author_avatar}
            alt={comment.author_username}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="w-full h-full rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
            {comment.author_username[0].toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {canMention ? (
              <button
                type="button"
                onClick={() => onMention!(comment.author_username)}
                className="group/name font-medium text-gray-700 hover:text-blue-400 transition-colors"
                title={`点击 @${comment.author_username}`}
              >
                <span className="hidden group-hover/name:inline">@</span>
                {comment.author_username}
              </button>
            ) : (
              <Link
                href={`/users/${comment.author_username}`}
                className="font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                {comment.author_username}
              </Link>
            )}
            <span>·</span>
            <time dateTime={new Date(comment.created_at).toISOString()}>
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

        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap wrap-break-word">
          {renderWithMentions(comment.content)}
        </p>
      </div>
    </div>
  );
}
