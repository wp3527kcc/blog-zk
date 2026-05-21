import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { sql } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { redis } from '@/lib/redis';
import LikeButton from '@/components/LikeButton';
import DeleteButton from '@/components/DeleteButton';
import CommentSection from '@/components/CommentSection';
import MarkdownContent from '@/components/MarkdownContent';
import type { Post, Comment } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function trackView(postId: number, userId: number | null): Promise<void> {
  try {
    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : headersList.get('x-real-ip') ?? 'unknown';
    const identifier = userId ? `u:${userId}` : `ip:${ip}`;
    const key = `view:${postId}:${identifier}`;

    const isNew = await redis.set(key, 1, { ex: 3600, nx: true });
    if (isNew) {
      await sql`UPDATE posts SET views = views + 1 WHERE id = ${postId}`;
    }
  } catch {
    // 阅读量计数失败不影响页面渲染
  }
}

export default async function PostDetailPage({ params }: PageProps) {
  const { id } = await params;
  const postId = parseInt(id, 10);

  if (isNaN(postId)) notFound();

  const user = await getUser();

  const posts = await sql<Post[]>`
    SELECT
      p.id, p.title, p.content, p.cover_image, p.author_id, p.views,
      p.created_at, p.updated_at,
      u.username AS author_username,
      u.avatar_url AS author_avatar,
      COUNT(DISTINCT l.id)::int AS like_count,
      COALESCE(
        MAX(CASE WHEN l.user_id = ${user?.userId ?? 0} THEN 1 ELSE 0 END)::boolean,
        false
      ) AS liked_by_user,
      COALESCE(
        ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
        ARRAY[]::text[]
      ) AS tags
    FROM posts p
    JOIN users u ON p.author_id = u.id
    LEFT JOIN likes l ON p.id = l.post_id
    LEFT JOIN post_tags pt ON p.id = pt.post_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE p.id = ${postId}
    GROUP BY p.id, u.username, u.avatar_url
  `;

  const post = posts[0];
  if (!post) notFound();

  await trackView(postId, user?.userId ?? null);

  const isAuthor = user?.userId === post.author_id;

  const comments = await sql<Comment[]>`
    SELECT
      c.id, c.content, c.author_id, c.post_id, c.created_at,
      u.username AS author_username,
      u.avatar_url AS author_avatar,
      COUNT(cl.id)::int AS like_count,
      COALESCE(
        MAX(CASE WHEN cl.user_id = ${user?.userId ?? 0} THEN 1 ELSE 0 END)::boolean,
        false
      ) AS liked_by_user
    FROM comments c
    JOIN users u ON c.author_id = u.id
    LEFT JOIN comment_likes cl ON c.id = cl.comment_id
    WHERE c.post_id = ${postId}
    GROUP BY c.id, u.username, u.avatar_url
    ORDER BY c.created_at ASC
  `;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← 返回首页
        </Link>
      </div>

      <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {post.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-64 object-cover"
          />
        )}

        <div className="p-8 pb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {post.tags.map((tag: string) => (
                <Link
                  key={tag}
                  href={`/?tag=${encodeURIComponent(tag)}`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-gray-400 pb-6 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Link
                href={`/users/${post.author_username}`}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-7 h-7 rounded-full shrink-0 overflow-hidden">
                  {post.author_avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.author_avatar}
                      alt={post.author_username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-full h-full rounded-full bg-linear-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {post.author_username[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="font-medium text-gray-700">
                  {post.author_username}
                </span>
              </Link>
              <span>·</span>
              <time dateTime={new Date(post.created_at).toISOString()}>
                {new Date(post.created_at).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              <span>·</span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                {post.views}
              </span>
            </div>
            {isAuthor && (
              <div className="flex items-center gap-3">
                <Link
                  href={`/posts/${post.id}/edit`}
                  className="text-sm text-gray-400 hover:text-blue-500 transition-colors"
                >
                  编辑
                </Link>
                <DeleteButton postId={post.id} />
              </div>
            )}
          </div>
        </div>

        <div className="px-8 pb-8">
          <MarkdownContent content={post.content} />
        </div>

        <div className="px-8 py-6 border-t border-gray-50 flex items-center justify-between">
          <LikeButton
            postId={post.id}
            initialLikeCount={post.like_count}
            initialLiked={post.liked_by_user}
            isLoggedIn={!!user}
          />
          {!user && (
            <p className="text-sm text-gray-400">
              <Link href="/login" className="text-blue-500 hover:underline">
                登录
              </Link>{' '}
              后可以点赞
            </p>
          )}
        </div>
      </article>

      <CommentSection
        postId={post.id}
        postAuthorId={post.author_id}
        comments={comments}
        currentUserId={user?.userId ?? null}
        isLoggedIn={!!user}
      />
    </main>
  );
}
