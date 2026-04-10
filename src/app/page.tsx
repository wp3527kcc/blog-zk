import Link from 'next/link';
import { sql } from '@/lib/db';
import { getUser } from '@/lib/auth';
import type { Post } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getUser();

  const posts = await sql<Post[]>`
    SELECT
      p.id, p.title, p.content, p.author_id,
      p.created_at, p.updated_at,
      u.username AS author_username,
      COUNT(l.id)::int AS like_count,
      false AS liked_by_user
    FROM posts p
    JOIN users u ON p.author_id = u.id
    LEFT JOIN likes l ON p.id = l.post_id
    GROUP BY p.id, u.username
    ORDER BY p.created_at DESC
  `;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">最新文章</h1>
          <p className="text-sm text-gray-400 mt-1">共 {posts.length} 篇</p>
        </div>
        {user && (
          <Link
            href="/posts/new"
            className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <span>+</span> 写文章
          </Link>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📝</div>
          <p className="text-gray-400 text-lg">还没有任何文章</p>
          {user ? (
            <Link
              href="/posts/new"
              className="inline-block mt-4 text-blue-500 hover:underline"
            >
              发布第一篇文章
            </Link>
          ) : (
            <p className="mt-2 text-sm text-gray-400">
              <Link href="/register" className="text-blue-500 hover:underline">
                注册
              </Link>{' '}
              后开始写作
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {(posts as Post[]).map((post) => (
            <article
              key={post.id}
              className="group bg-white rounded-xl border border-gray-100 p-6 hover:border-blue-100 hover:shadow-sm transition-all"
            >
              <Link href={`/posts/${post.id}`}>
                <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
                  {post.title}
                </h2>
              </Link>
              <p className="text-gray-500 text-sm line-clamp-2 mb-4 leading-relaxed">
                {post.content.replace(/!\[[^\]]*\]\([^)]+\)/g, '[图片]')}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600">
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
                <div className="flex items-center gap-1 text-gray-400">
                  <span>❤️</span>
                  <span>{post.like_count}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
