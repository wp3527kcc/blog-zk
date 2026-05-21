'use client';

import { useSearchParams } from 'next/navigation';
import { useActionState } from 'react';
import Link from 'next/link';
import { resendVerificationEmail } from '@/lib/actions';

export default function RegisterSuccessPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const initialState = email ? { email } : null;
  const [state, action, isPending] = useActionState(
    resendVerificationEmail,
    initialState
  );

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            验证邮件已发送
          </h1>
          <p className="text-gray-500">
            我们已向 <span className="font-medium text-gray-700">{email}</span>{' '}
            发送了验证邮件
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-blue-600 text-sm font-medium">1</span>
              </div>
              <p className="text-sm text-gray-600">
                登录你的邮箱，查找来自 Blog ZK 的验证邮件
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-blue-600 text-sm font-medium">2</span>
              </div>
              <p className="text-sm text-gray-600">
                点击邮件中的「验证邮箱」按钮完成验证
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-blue-600 text-sm font-medium">3</span>
              </div>
              <p className="text-sm text-gray-600">
                验证成功后即可登录使用全部功能
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 mt-6 pt-6">
            <p className="text-sm text-gray-500 mb-4">
              没有收到邮件？请检查垃圾邮件文件夹，或点击下方按钮重新发送
            </p>

            <form action={action}>
              <input type="hidden" name="email" value={email} />
              <button
                type="submit"
                disabled={isPending || !!state?.success}
                className="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-gray-700 font-medium py-2.5 rounded-lg transition-colors text-sm"
              >
                {isPending
                  ? '发送中...'
                  : state?.success
                  ? '已重新发送'
                  : '重新发送验证邮件'}
              </button>
            </form>

            {state?.error && (
              <p className="text-red-600 text-sm mt-3">{state.error}</p>
            )}
            {state?.success && (
              <p className="text-green-600 text-sm mt-3">{state.success}</p>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-400 mt-6">
          已完成验证？{' '}
          <Link href="/login" className="text-blue-500 hover:underline">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}
