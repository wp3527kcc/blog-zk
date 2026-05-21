'use client';

import { useActionState, useState } from 'react';
import { updateUsername } from '@/lib/actions';

interface UsernameEditProps {
  initialUsername: string;
}

export default function UsernameEdit({ initialUsername }: UsernameEditProps) {
  const [editing, setEditing] = useState(false);
  const [state, action, isPending] = useActionState(updateUsername, null);

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-gray-900">{initialUsername}</h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-gray-300 hover:text-gray-500 transition-colors"
          aria-label="修改用户名"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          name="username"
          defaultValue={initialUsername}
          maxLength={20}
          minLength={2}
          required
          autoFocus
          disabled={isPending}
          className="text-xl font-bold text-gray-900 border-b-2 border-blue-400 outline-none bg-transparent w-44 px-0 disabled:opacity-60"
          placeholder="输入新用户名"
        />
        <button
          type="submit"
          disabled={isPending}
          className="text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors disabled:opacity-50"
        >
          {isPending ? '保存中...' : '保存'}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={isPending}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          取消
        </button>
      </div>
      {state?.error && (
        <p className="text-xs text-red-500">{state.error}</p>
      )}
      <p className="text-xs text-gray-300">2-20 个字符，支持字母/数字/下划线/中文</p>
    </form>
  );
}
