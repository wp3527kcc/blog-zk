'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Post } from '@/lib/types';
import { HOME_PAGE_SIZE } from '@/lib/types';
import { getHomePostsPage } from '@/lib/actions';
import PostCard from '@/components/PostCard';

interface HomePostListProps {
  initialPosts: Post[];
  initialHasMore: boolean;
  q?: string;
  tags: string[];
  feed?: string;
  selectedTags: string[];
}

export default function HomePostList({
  initialPosts,
  initialHasMore,
  q,
  tags,
  feed,
  selectedTags,
}: HomePostListProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadNextPage = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const result = await getHomePostsPage({
        q,
        tags,
        feed,
        page: nextPage,
        pageSize: HOME_PAGE_SIZE,
      });
      setPosts((prev) => [...prev, ...result.posts]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore, page, q, tags, feed]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextPage();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNextPage]);

  if (posts.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            q={q}
            selectedTags={selectedTags}
            feed={feed}
          />
        ))}
      </div>

      <div ref={sentinelRef} className="h-1" />

      {loading && (
        <div className="py-6 flex justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <p className="py-8 text-center text-sm text-gray-400">没有更多文章了</p>
      )}
    </>
  );
}
