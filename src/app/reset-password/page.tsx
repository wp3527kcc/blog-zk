'use client';

import { useActionState, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { sendPasswordReset, resetPassword } from '@/lib/actions';

function SendEmailForm() {
  const [state, action, isPending] = useActionState(sendPasswordReset, null);

  if (state?.success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">邮件已发送</h1>
        <p className="text-sm text-gray-500">{state.success}</p>
        <Link href="/login" className="inline-block mt-6 text-sm text-blue-500 hover:underline">
          返回登录
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 mb-2">忘记密码</h1>
      <p className="text-sm text-gray-400 mb-6">输入注册邮箱，我们将发送重置链接</p>

      <form action={action} className="space-y-4">
        {state?.error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
            {state.error}
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
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
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {isPending ? '发送中...' : '发送重置邮件'}
        </button>
      </form>
    </>
  );
}

function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, isPending] = useActionState(resetPassword, null);

  if (state?.success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">密码已重置</h1>
        <p className="text-sm text-gray-500 mb-6">{state.success}</p>
        <Link
          href="/login"
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          前往登录
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 mb-2">设置新密码</h1>
      <p className="text-sm text-gray-400 mb-6">请输入你的新密码</p>

      <form action={action} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        {state?.error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            新密码
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="至少 6 位"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {isPending ? '重置中...' : '重置密码'}
        </button>
      </form>
    </>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        {token ? <ResetPasswordForm token={token} /> : <SendEmailForm />}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-gray-400 text-sm">加载中...</div>}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}