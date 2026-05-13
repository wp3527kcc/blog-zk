import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { markAllNotificationsRead, readNotificationAndGo } from '@/lib/actions';
import type { Notification } from '@/lib/types';

export const dynamic = 'force-dynamic';

const TYPE_TEXT: Record<Notification['type'], string> = {
  mention: '在评论中提到了你',
  follow: '关注了你',
  comment: '评论了你的文章',
  like: '点赞了你的文章',
  comment_like: '点赞了你的评论',
};

const TYPE_ICON: Record<Notification['type'], string> = {
  mention: '@',
  follow: '+',
  comment: '💬',
  like: '❤',
  comment_like: '❤',
};

function notificationLink(n: Notification): string {
  if (n.type === 'follow' && n.actor_username) return `/users/${n.actor_username}`;
  if (n.post_id) return `/posts/${n.post_id}`;
  return '/notifications';
}

export default async function NotificationsPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const notifications = await sql<Notification[]>`
    SELECT
      n.id, n.user_id, n.actor_id, n.type, n.post_id, n.comment_id,
      n.content, n.read_at, n.created_at,
      a.username AS actor_username,
      p.title AS post_title
    FROM notifications n
    LEFT JOIN users a ON n.actor_id = a.id
    LEFT JOIN posts p ON n.post_id = p.id
    WHERE n.user_id = ${user.userId}
    ORDER BY n.created_at DESC
    LIMIT 100
  `;

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">通知中心</h1>
          <p className="text-sm text-gray-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} 条未读` : '暂无未读通知'}
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
            >
              全部标为已读
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-4">🔔</div>
          <p className="text-gray-400">暂时还没有通知</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {notifications.map((n, idx) => {
            const isUnread = !n.read_at;
            const href = notificationLink(n);
            const action = readNotificationAndGo.bind(null, n.id, href);
            return (
              <form
                key={n.id}
                action={action}
                className={`${idx > 0 ? 'border-t border-gray-50' : ''}`}
              >
                <button
                  type="submit"
                  className={`w-full text-left block p-4 transition-colors ${
                    isUnread ? 'bg-blue-50/40 hover:bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                  <div
                    className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                      n.type === 'mention'
                        ? 'bg-purple-100 text-purple-600'
                        : n.type === 'follow'
                          ? 'bg-blue-100 text-blue-600'
                          : n.type === 'comment'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-500'
                    }`}
                  >
                    {TYPE_ICON[n.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      <span className="font-semibold text-gray-900">
                        {n.actor_username ?? '某用户'}
                      </span>
                      <span className="ml-1 text-gray-500">{TYPE_TEXT[n.type]}</span>
                      {n.post_title && (
                        <>
                          {' '}
                          <span className="text-gray-700">《{n.post_title}》</span>
                        </>
                      )}
                    </p>
                    {n.content && (n.type === 'mention' || n.type === 'comment') && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        “{n.content}”
                      </p>
                    )}
                    <time className="text-xs text-gray-300 mt-1 block">
                      {new Date(n.created_at).toLocaleString('zh-CN', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                  {isUnread && (
                    <div className="shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-3" />
                  )}
                  </div>
                </button>
              </form>
            );
          })}
        </div>
      )}
    </main>
  );
}
