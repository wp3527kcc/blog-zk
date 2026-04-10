'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { login } from '@/lib/actions';

export default function LoginPage() {
  const [state, action, isPending] = useActionState(login, null);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">欢迎回来</h1>
          <p className="text-gray-400 text-sm mt-1">登录以继续写作</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form action={action} className="space-y-4">
            {state?.error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
                {state.error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                邮箱
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors mt-2"
            >
              {isPending ? '登录中...' : '登录'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          还没有账号？{' '}
          <Link href="/register" className="text-blue-500 hover:underline">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}
