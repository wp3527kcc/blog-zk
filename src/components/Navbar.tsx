import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { logout } from '@/lib/actions';

export default async function Navbar() {
  const user = await getUser();

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
              <span className="text-sm text-gray-400 hidden sm:block">|</span>
              <span className="text-sm font-medium text-gray-700">
                {user.username}
              </span>
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
