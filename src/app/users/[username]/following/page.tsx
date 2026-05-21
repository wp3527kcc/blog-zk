import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { getUser } from '@/lib/auth';
import UserList from '@/components/UserList';
import type { UserListItem } from '@/components/UserList';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function FollowingPage({ params }: PageProps) {
  const { username } = await params;
  const currentUser = await getUser();

  const profileRows = await sql<{ id: number; username: string }[]>`
    SELECT id, username FROM users WHERE username = ${username}
  `;
  const profile = profileRows[0];
  if (!profile) notFound();

  const currentUserId = currentUser?.userId ?? 0;

  const following = await sql<UserListItem[]>`
    SELECT
      u.id,
      u.username,
      u.avatar_url,
      EXISTS(
        SELECT 1 FROM follows
        WHERE follower_id = ${currentUserId} AND following_id = u.id
      ) AS is_following
    FROM follows f
    JOIN users u ON f.following_id = u.id
    WHERE f.follower_id = ${profile.id}
    ORDER BY f.created_at DESC
  `;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/users/${username}`}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← {username}
        </Link>
        <span className="text-gray-200">/</span>
        <h1 className="text-base font-semibold text-gray-900">
          关注中
          <span className="ml-2 text-sm font-normal text-gray-400">{following.length}</span>
        </h1>
      </div>

      <UserList
        users={following}
        currentUserId={currentUser?.userId ?? null}
        isLoggedIn={!!currentUser}
        emptyText="还没有关注任何人"
      />
    </main>
  );
}
