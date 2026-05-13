import Link from 'next/link';
import { sql } from '@/lib/db';
import { getUser } from '@/lib/auth';
import type { Post, Tag } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams: Promise<{ q?: string; tag?: string; feed?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const user = await getUser();
  const { q, tag, feed } = await searchParams;
  const isFollowingFeed = feed === 'following' && !!user;

  const allTags = await sql<Tag[]>`SELECT id, name, slug FROM tags ORDER BY name`;

  const queryStr = q?.trim() ?? '';
  const tagStr = tag?.trim() ?? '';
  const userId = user?.userId ?? 0;

  const posts = await sql<Post[]>`
    SELECT
      p.id, p.title, p.content, p.cover_image, p.author_id, p.views,
      p.created_at, p.updated_at,
      u.username AS author_username,
      COUNT(DISTINCT l.id)::int AS like_count,
      false AS liked_by_user,
      COALESCE(
        ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
        ARRAY[]::text[]
      ) AS tags
    FROM posts p
    JOIN users u ON p.author_id = u.id
    LEFT JOIN likes l ON p.id = l.post_id
    LEFT JOIN post_tags pt ON p.id = pt.post_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE 1 = 1
      ${queryStr
        ? sql`AND to_tsvector('simple', p.title || ' ' || p.content) @@ plainto_tsquery('simple', ${queryStr})`
        : sql``}
      ${tagStr
        ? sql`AND p.id IN (
            SELECT pt2.post_id FROM post_tags pt2
            JOIN tags tfilter ON pt2.tag_id = tfilter.id
            WHERE tfilter.name = ${tagStr}
          )`
        : sql``}
      ${isFollowingFeed
        ? sql`AND p.author_id IN (SELECT following_id FROM follows WHERE follower_id = ${userId})`
        : sql``}
    GROUP BY p.id, u.username
    ORDER BY p.created_at DESC
  `;

  const isFiltered = !!(queryStr || tagStr);

  const buildUrl = (overrides: Partial<{ q: string; tag: string; feed: string }>) => {
    const params = new URLSearchParams();
    const finalQ = overrides.q !== undefined ? overrides.q : queryStr;
    const finalTag = overrides.tag !== undefined ? overrides.tag : tagStr;
    const finalFeed = overrides.feed !== undefined ? overrides.feed : (isFollowingFeed ? 'following' : '');
    if (finalQ) params.set('q', finalQ);
    if (finalTag) params.set('tag', finalTag);
    if (finalFeed) params.set('feed', finalFeed);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isFollowingFeed ? '关注的人' : '最新文章'}
          </h1>
          {!isFiltered && (
            <p className="text-sm text-gray-400 mt-1">共 {posts.length} 篇</p>
          )}
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

      {/* Feed 切换 */}
      {user && (
        <div className="flex items-center gap-1 mb-4 border-b border-gray-100">
          <Link
            href={buildUrl({ feed: '' })}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              !isFollowingFeed
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            全部
          </Link>
          <Link
            href={buildUrl({ feed: 'following' })}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              isFollowingFeed
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            关注
          </Link>
        </div>
      )}

      {/* 搜索框 */}
      <form method="GET" className="mb-4">
        {tag && <input type="hidden" name="tag" value={tag} />}
        {isFollowingFeed && <input type="hidden" name="feed" value="following" />}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            name="q"
            type="search"
            defaultValue={q ?? ''}
            placeholder="搜索文章..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition-all"
          />
        </div>
      </form>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href={buildUrl({ tag: '' })}
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !tag
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            全部
          </Link>
          {allTags.map((t: Tag) => (
            <Link
              key={t.id}
              href={buildUrl({ tag: t.name })}
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                tag === t.name
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              #{t.name}
            </Link>
          ))}
        </div>
      )}

      {isFiltered && (
        <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
          <span>
            {queryStr && `搜索「${queryStr}」`}
            {queryStr && tagStr && ' · '}
            {tagStr && `标签「${tagStr}」`}
            {' '}· 共 {posts.length} 篇
          </span>
          <Link href={buildUrl({ q: '', tag: '' })} className="text-blue-500 hover:underline text-xs">
            清除筛选
          </Link>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📝</div>
          <p className="text-gray-400 text-lg">
            {isFollowingFeed
              ? '关注的人还没有发布文章'
              : isFiltered
                ? '没有找到相关文章'
                : '还没有任何文章'}
          </p>
          {isFollowingFeed && (
            <Link href={buildUrl({ feed: '' })} className="inline-block mt-4 text-blue-500 hover:underline">
              查看全部文章
            </Link>
          )}
          {!isFollowingFeed && !isFiltered && user && (
            <Link
              href="/posts/new"
              className="inline-block mt-4 text-blue-500 hover:underline"
            >
              发布第一篇文章
            </Link>
          )}
          {!isFollowingFeed && !isFiltered && !user && (
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
          {posts.map((post: Post) => (
            <article
              key={post.id}
              className="group bg-white rounded-xl border border-gray-100 hover:border-blue-100 hover:shadow-sm transition-all overflow-hidden"
            >
              <div className="flex gap-4 p-6">
                <div className="flex-1 min-w-0">
                  <Link href={`/posts/${post.id}`}>
                    <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
                      {post.title}
                    </h2>
                  </Link>
                  <p className="text-gray-500 text-sm line-clamp-2 mb-3 leading-relaxed">
                    {post.content.replace(/!\[[^\]]*\]\([^)]+\)/g, '').replace(/[#*`>\-_~|]/g, '').trim()}
                  </p>

                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {post.tags.map((t: string) => (
                        <Link
                          key={t}
                          href={`/?tag=${encodeURIComponent(t)}`}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
                        >
                          #{t}
                        </Link>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/users/${post.author_username}`}
                        className="font-medium text-gray-600 hover:text-blue-500 transition-colors"
                      >
                        {post.author_username}
                      </Link>
                      <span>·</span>
                      <time dateTime={post.created_at}>
                        {new Date(post.created_at).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </time>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                        {post.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>❤️</span>
                        {post.like_count}
                      </span>
                    </div>
                  </div>
                </div>

                {post.cover_image && (
                  <Link href={`/posts/${post.id}`} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="w-28 h-20 object-cover rounded-lg border border-gray-100"
                    />
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
