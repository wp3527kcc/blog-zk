import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { logout } from '@/lib/actions';
import { sql } from '@/lib/db';

export default async function Navbar() {
  const user = await getUser();

  let unreadCount = 0;
  if (user) {
    const rows = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM notifications
      WHERE user_id = ${user.userId} AND read_at IS NULL
    `;
    unreadCount = rows[0]?.count ?? 0;
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
      <nav className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"
        >
          ✍️ 博客
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/posts/new"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span className="text-base">+</span> 写文章
              </Link>
              <Link
                href="/notifications"
                aria-label="通知"
                className="relative inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-blue-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              <span className="text-sm text-gray-400 hidden sm:block">|</span>
              <Link
                href={`/users/${user.username}`}
                className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                {user.username}
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-sm text-gray-400 hover:text-red-500 transition-colors"
                >
                  退出
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
