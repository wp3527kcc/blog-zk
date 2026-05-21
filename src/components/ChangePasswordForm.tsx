'use client';

import { useActionState, useState } from 'react';
import { changePassword } from '@/lib/actions';

export default function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(changePassword, null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); }}
        className="text-sm text-gray-400 hover:text-blue-500 transition-colors"
      >
        修改密码
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <div>
        <input
          name="oldPassword"
          type="password"
          required
          minLength={6}
          placeholder="当前密码"
          disabled={isPending}
          autoFocus
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all disabled:opacity-60"
        />
      </div>
      <div>
        <input
          name="newPassword"
          type="password"
          required
          minLength={6}
          placeholder="新密码（至少 6 位）"
          disabled={isPending}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all disabled:opacity-60"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="text-xs text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          {isPending ? '保存中...' : '保存'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          取消
        </button>
      </div>
      {state?.error && (
        <p className="text-xs text-red-500">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-xs text-green-500">{state.success}</p>
      )}
    </form>
  );
}