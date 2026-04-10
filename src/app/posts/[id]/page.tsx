import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { getUser } from '@/lib/auth';
import LikeButton from '@/components/LikeButton';
import DeleteButton from '@/components/DeleteButton';
import type { Post } from '@/lib/types';

// 将内容中的 ![alt](url) 解析为 <img>，其余文本保留换行
function PostContent({ content }: { content: string }) {
  const IMG_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const parts: { type: 'text' | 'image'; value: string; alt?: string }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = IMG_RE.exec(content)) !== null) {
    if (m.index > last) {
      parts.push({ type: 'text', value: content.slice(last, m.index) });
    }
    parts.push({ type: 'image', alt: m[1], value: m[2] });
    last = m.index + m[0].length;
  }
  if (last < content.length) {
    parts.push({ type: 'text', value: content.slice(last) });
  }

  return (
    <>
      {parts.map((part, i) =>
        part.type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={part.value}
            alt={part.alt ?? '图片'}
            className="max-w-full rounded-lg my-4 border border-gray-100"
            loading="lazy"
          />
        ) : (
          <span key={i} className="whitespace-pre-wrap">
            {part.value}
          </span>
        )
      )}
    </>
  );
}

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PostDetailPage({ params }: PageProps) {
  const { id } = await params;
  const postId = parseInt(id, 10);

  if (isNaN(postId)) notFound();

  const user = await getUser();

  const posts = await sql<Post[]>`
    SELECT
      p.id, p.title, p.content, p.author_id,
      p.created_at, p.updated_at,
      u.username AS author_username,
      COUNT(l.id)::int AS like_count,
      COALESCE(
        MAX(CASE WHEN l.user_id = ${user?.userId ?? 0} THEN 1 ELSE 0 END)::boolean,
        false
      ) AS liked_by_user
    FROM posts p
    JOIN users u ON p.author_id = u.id
    LEFT JOIN likes l ON p.id = l.post_id
    WHERE p.id = ${postId}
    GROUP BY p.id, u.username
  `;

  const post = posts[0];
  if (!post) notFound();

  const isAuthor = user?.userId === post.author_id;

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
        <div className="p-8 pb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>

          <div className="flex items-center justify-between text-sm text-gray-400 pb-6 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {post.author_username[0].toUpperCase()}
              </div>
              <span className="font-medium text-gray-700">
                {post.author_username}
              </span>
              <span>·</span>
              <time dateTime={post.created_at}>
                {new Date(post.created_at).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </div>
            {isAuthor && <DeleteButton postId={post.id} />}
          </div>
        </div>

        <div className="px-8 pb-8">
          <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed text-sm">
            <PostContent content={post.content} />
          </div>
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
    </main>
  );
}
