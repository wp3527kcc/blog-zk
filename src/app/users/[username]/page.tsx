import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { getUser } from '@/lib/auth';
import FollowButton from '@/components/FollowButton';
import AvatarUpload from '@/components/AvatarUpload';
import UsernameEdit from '@/components/UsernameEdit';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import type { Post } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ username: string }>;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

interface UserStats {
  post_count: number;
  total_likes: number;
  total_views: number;
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const currentUser = await getUser();

  const users = await sql<UserProfile[]>`
    SELECT id, username, email, avatar_url, created_at FROM users WHERE username = ${username}
  `;
  const profile = users[0];
  if (!profile) notFound();

  const statsRows = await sql<UserStats[]>`
    SELECT
      COUNT(p.id)::int AS post_count,
      COALESCE(SUM(p.views), 0)::int AS total_views,
      COALESCE((SELECT COUNT(*) FROM likes l WHERE l.post_id IN (SELECT id FROM posts WHERE author_id = ${profile.id})), 0)::int AS total_likes
    FROM posts p
    WHERE p.author_id = ${profile.id}
  `;
  const stats = statsRows[0] ?? { post_count: 0, total_likes: 0, total_views: 0 };

  const followRows = await sql<{ followers: number; following: number; is_following: boolean }[]>`
    SELECT
      (SELECT COUNT(*) FROM follows WHERE following_id = ${profile.id})::int AS followers,
      (SELECT COUNT(*) FROM follows WHERE follower_id = ${profile.id})::int AS following,
      EXISTS(
        SELECT 1 FROM follows
        WHERE follower_id = ${currentUser?.userId ?? 0} AND following_id = ${profile.id}
      ) AS is_following
  `;
  const followStats = followRows[0] ?? { followers: 0, following: 0, is_following: false };

  const posts = await sql<Post[]>`
    SELECT
      p.id, p.title, p.content, p.cover_image, p.author_id, p.views,
      p.created_at, p.updated_at,
      u.username AS author_username,
      COUNT(DISTINCT l.id)::int AS like_count,
      COALESCE(
        MAX(CASE WHEN l.user_id = ${currentUser?.userId ?? 0} THEN 1 ELSE 0 END)::boolean,
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
    WHERE p.author_id = ${profile.id}
    GROUP BY p.id, u.username
    ORDER BY p.created_at DESC
  `;

  const isOwnProfile = currentUser?.userId === profile.id;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* 个人信息卡片 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-8">
        <div className="flex items-start gap-6">
          {/* 头像区域 */}
          <div className="shrink-0">
            {isOwnProfile ? (
              <AvatarUpload
                username={profile.username}
                avatarUrl={profile.avatar_url}
                size={64}
              />
            ) : profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-linear-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                {profile.username[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              {isOwnProfile ? (
                <UsernameEdit initialUsername={profile.username} />
              ) : (
                <h1 className="text-xl font-bold text-gray-900">{profile.username}</h1>
              )}
              {isOwnProfile && (
                <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">这是你</span>
              )}
            </div>
            <p className="text-sm text-gray-400 mb-4">
              加入于 {new Date(profile.created_at).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
              })}
            </p>

            {/* 统计数据 */}
            <div className="flex items-center gap-6 flex-wrap">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{stats.post_count}</div>
                <div className="text-xs text-gray-400 mt-0.5">文章</div>
              </div>
              <div className="w-px h-8 bg-gray-100" />
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{stats.total_views}</div>
                <div className="text-xs text-gray-400 mt-0.5">总阅读</div>
              </div>
              <div className="w-px h-8 bg-gray-100" />
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{stats.total_likes}</div>
                <div className="text-xs text-gray-400 mt-0.5">获赞</div>
              </div>
              <div className="w-px h-8 bg-gray-100" />
              <Link href={`/users/${profile.username}/followers`} className="text-center group">
                <div className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{followStats.followers}</div>
                <div className="text-xs text-gray-400 mt-0.5 group-hover:text-blue-500 transition-colors">关注者</div>
              </Link>
              <div className="w-px h-8 bg-gray-100" />
              <Link href={`/users/${profile.username}/following`} className="text-center group">
                <div className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{followStats.following}</div>
                <div className="text-xs text-gray-400 mt-0.5 group-hover:text-blue-500 transition-colors">关注中</div>
              </Link>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            {isOwnProfile ? (
              <>
                <Link
                  href="/posts/new"
                  className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  <span>+</span> 写文章
                </Link>
                <ChangePasswordForm />
              </>
            ) : (
              <FollowButton
                targetUserId={profile.id}
                initialFollowing={followStats.is_following}
                initialFollowerCount={followStats.followers}
                isLoggedIn={!!currentUser}
              />
            )}
          </div>
        </div>
      </div>

      {/* 文章列表 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          全部文章
          <span className="ml-2 text-sm font-normal text-gray-400">({posts.length})</span>
        </h2>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-400">还没有发布任何文章</p>
          {isOwnProfile && (
            <Link href="/posts/new" className="text-blue-500 hover:underline text-sm mt-3 inline-block">
              发布第一篇文章
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="group bg-white rounded-xl border border-gray-100 hover:border-blue-100 hover:shadow-sm transition-all overflow-hidden"
            >
              <div className="flex gap-4 p-6">
                <div className="flex-1 min-w-0">
                  <Link href={`/posts/${post.id}`}>
                    <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="text-gray-500 text-sm line-clamp-2 mb-3 leading-relaxed">
                    {post.content.replace(/!\[[^\]]*\]\([^)]+\)/g, '').replace(/[#*`>\-_~|]/g, '').trim()}
                  </p>

                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {post.tags.map((t) => (
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
                    <time dateTime={new Date(post.created_at).toISOString()}>
                      {new Date(post.created_at).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                    <div className="flex items-center gap-3">
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
                      className="w-24 h-16 object-cover rounded-lg border border-gray-100"
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
