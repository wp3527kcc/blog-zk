import Link from 'next/link';
import type { Post } from '@/lib/types';

interface PostCardProps {
  post: Post;
  q?: string;
  selectedTags?: string[];
  feed?: string;
}

function buildTagToggleUrl(tagName: string, q?: string, selectedTags: string[] = [], feed?: string) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  const newTags = selectedTags.includes(tagName)
    ? selectedTags.filter((t) => t !== tagName)
    : [...selectedTags, tagName];
  if (newTags.length > 0) params.set('tags', newTags.join(','));
  if (feed) params.set('feed', feed);
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export default function PostCard({ post, q, selectedTags = [], feed }: PostCardProps) {
  return (
    <article className="group bg-white rounded-xl border border-gray-100 hover:border-blue-100 hover:shadow-sm transition-all overflow-hidden">
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
                  href={buildTagToggleUrl(t, q, selectedTags, feed)}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs transition-colors ${
                    selectedTags.includes(t)
                      ? 'bg-blue-50 text-blue-500'
                      : 'bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-500'
                  }`}
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
                className="flex items-center gap-1.5 font-medium text-gray-600 hover:text-blue-500 transition-colors"
              >
                <div className="w-5 h-5 rounded-full shrink-0 overflow-hidden">
                  {post.author_avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.author_avatar}
                      alt={post.author_username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-full h-full rounded-full bg-linear-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold">
                      {post.author_username[0].toUpperCase()}
                    </span>
                  )}
                </div>
                {post.author_username}
              </Link>
              <span>·</span>
              <time dateTime={new Date(post.created_at).toISOString()}>
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
  );
}
