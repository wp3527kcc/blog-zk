import Link from 'next/link';
import FollowButton from './FollowButton';

export interface UserListItem {
  id: number;
  username: string;
  avatar_url: string | null;
  is_following: boolean;
}

interface UserListProps {
  users: UserListItem[];
  currentUserId: number | null;
  isLoggedIn: boolean;
  emptyText?: string;
}

export default function UserList({
  users,
  currentUserId,
  isLoggedIn,
  emptyText = '暂无用户',
}: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
        <p className="text-gray-400 text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <div
          key={u.id}
          className="flex items-center justify-between gap-4 bg-white rounded-xl border border-gray-100 px-5 py-4 hover:border-blue-100 hover:shadow-sm transition-all"
        >
          <Link href={`/users/${u.username}`} className="flex items-center gap-3 min-w-0 group">
            {u.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={u.avatar_url}
                alt={u.username}
                className="w-9 h-9 rounded-full object-cover border border-gray-100 shrink-0"
              />
            ) : (
              <span className="w-9 h-9 rounded-full bg-linear-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {u.username[0].toUpperCase()}
              </span>
            )}
            <span className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors truncate">
              {u.username}
            </span>
          </Link>

          {isLoggedIn && currentUserId !== u.id && (
            <FollowButton
              targetUserId={u.id}
              initialFollowing={u.is_following}
              isLoggedIn={isLoggedIn}
            />
          )}
        </div>
      ))}
    </div>
  );
}
