import Link from 'next/link';
import { sql } from '@/lib/db';
import { getUser } from '@/lib/auth';
import type { Tag } from '@/lib/types';
import { HOME_PAGE_SIZE } from '@/lib/types';
import { getHomePostsPage } from '@/lib/actions';
import HomePostList from '@/components/HomePostList';

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams: Promise<{ q?: string; tags?: string; feed?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const user = await getUser();
  const { q, tags: tagsParam, feed } = await searchParams;
  const isFollowingFeed = feed === 'following' && !!user;

  const allTags = await sql<Tag[]>`SELECT id, name, slug FROM tags ORDER BY name`;

  const queryStr = q?.trim() ?? '';
  const selectedTags = tagsParam
    ? tagsParam.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const { posts: initialPosts, hasMore: initialHasMore } = await getHomePostsPage({
    q: queryStr,
    tags: selectedTags,
    feed,
    page: 1,
    pageSize: HOME_PAGE_SIZE,
  });

  const isFiltered = !!(queryStr || selectedTags.length > 0);

  const buildUrl = (
    overrides: Partial<{ q: string; feed: string }>,
    toggleTag?: string,
    clearTags?: boolean,
  ) => {
    const params = new URLSearchParams();
    const finalQ = overrides.q !== undefined ? overrides.q : queryStr;
    const finalFeed = overrides.feed !== undefined ? overrides.feed : (isFollowingFeed ? 'following' : '');

    let finalTags = selectedTags;
    if (clearTags) {
      finalTags = [];
    } else if (toggleTag !== undefined) {
      finalTags = selectedTags.includes(toggleTag)
        ? selectedTags.filter((t) => t !== toggleTag)
        : [...selectedTags, toggleTag];
    }

    if (finalQ) params.set('q', finalQ);
    if (finalTags.length > 0) params.set('tags', finalTags.join(','));
    if (finalFeed) params.set('feed', finalFeed);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  };

  const buildTagUrl = (tagName: string) => buildUrl({}, tagName);

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isFollowingFeed ? '关注的人' : '最新文章'}
          </h1>
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
        {selectedTags.length > 0 && <input type="hidden" name="tags" value={selectedTags.join(',')} />}
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
            href={buildUrl({}, undefined, true)}
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedTags.length === 0
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            全部
          </Link>
          {allTags.map((t: Tag) => {
            const active = selectedTags.includes(t.name);
            return (
              <Link
                key={t.id}
                href={buildUrl({}, t.name)}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                #{t.name}
                {active && (
                  <span className="ml-0.5 text-white/80 leading-none">×</span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {isFiltered && (
        <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
          <span>
            {queryStr && `搜索「${queryStr}」`}
            {queryStr && selectedTags.length > 0 && ' · '}
            {selectedTags.length > 0 && `标签「${selectedTags.join('、')}」`}
          </span>
          <Link href={buildUrl({ q: '' }, undefined, true)} className="text-blue-500 hover:underline text-xs">
            清除筛选
          </Link>
        </div>
      )}

      {initialPosts.length === 0 ? (
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
        <HomePostList
          initialPosts={initialPosts}
          initialHasMore={initialHasMore}
          q={queryStr || undefined}
          tags={selectedTags}
          feed={feed}
          selectedTags={selectedTags}
        />
      )}
    </main>
  );
}
