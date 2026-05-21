"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, resendVerificationEmail } from "@/lib/actions";

export default function LoginPage() {
  const [loginState, loginAction, isLoginPending] = useActionState(login, null);
  const [resendState, resendAction, isResendPending] = useActionState(
    resendVerificationEmail,
    null,
  );

  const isUnverified = !!loginState?.data?.unverified;
  const pendingEmail = loginState?.data?.email as string | undefined;
  const pendingUserId = loginState?.data?.userId as number | undefined;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">欢迎回来</h1>
          <p className="text-gray-400 text-sm mt-1">登录以继续写作</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form action={loginAction} className="space-y-4">
            {loginState?.error && !isUnverified && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
                {loginState.error}
              </div>
            )}

            {isUnverified && (
              <div className="bg-yellow-50 text-yellow-700 text-sm px-4 py-3 rounded-lg border border-yellow-100">
                <p className="font-medium mb-1">{loginState.error}</p>
                <p className="text-xs opacity-80">
                  请先验证邮箱后再登录，或点击下方按钮重新发送验证邮件
                </p>
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
                defaultValue={pendingEmail || ""}
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

            <div className="flex justify-end -mt-2">
              <Link
                href="/reset-password"
                className="text-xs text-gray-400 hover:text-blue-500 transition-colors"
              >
                忘记密码？
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoginPending}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors mt-2"
            >
              {isLoginPending ? "登录中..." : "登录"}
            </button>
          </form>

          {isUnverified && pendingEmail && pendingUserId && (
            <div className="border-t border-gray-100 mt-6 pt-6">
              <form action={resendAction} className="space-y-3">
                <input type="hidden" name="email" value={pendingEmail} />
                <input type="hidden" name="userId" value={pendingUserId} />
                <button
                  type="submit"
                  disabled={isResendPending || !!resendState?.success}
                  className="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-gray-700 font-medium py-2.5 rounded-lg transition-colors text-sm"
                >
                  {isResendPending
                    ? "发送中..."
                    : resendState?.success
                      ? "已重新发送"
                      : "重新发送验证邮件"}
                </button>
                {resendState?.error && (
                  <p className="text-red-600 text-xs text-center">
                    {resendState.error}
                  </p>
                )}
                {resendState?.success && (
                  <p className="text-green-600 text-xs text-center">
                    {resendState.success}
                  </p>
                )}
              </form>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          还没有账号？{" "}
          <Link href="/register" className="text-blue-500 hover:underline">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}
