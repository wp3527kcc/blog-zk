'use client';

import { useActionState, useRef } from 'react';
import Link from 'next/link';
import { createPost } from '@/lib/actions';
import ImageUpload from '@/components/ImageUpload';

export default function NewPostPage() {
  const [state, action, isPending] = useActionState(createPost, null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // 图片上传成功后，将 ![图片](url) 插入光标位置
  const handleImageUpload = (url: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const insert = `![图片](${url})`;
    textarea.value =
      textarea.value.substring(0, start) +
      insert +
      textarea.value.substring(end);

    const newCursor = start + insert.length;
    textarea.selectionStart = newCursor;
    textarea.selectionEnd = newCursor;
    textarea.focus();
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← 返回首页
        </Link>
        <span className="text-gray-200">|</span>
        <h1 className="text-lg font-semibold text-gray-900">写新文章</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <form action={action} className="space-y-6">
          {state?.error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
              {state.error}
            </div>
          )}

          <div>
            <input
              name="title"
              type="text"
              required
              placeholder="文章标题..."
              maxLength={200}
              className="w-full text-2xl font-bold placeholder:text-gray-300 text-gray-900 border-none outline-none bg-transparent"
            />
          </div>

          <div className="border-t border-gray-50" />

          <div>
            <textarea
              ref={contentRef}
              name="content"
              required
              rows={18}
              placeholder={`在此写下你的内容...\n\n可以使用 ![图片描述](图片URL) 语法引用图片，或点击下方「插入图片」按钮上传。`}
              className="w-full text-gray-700 placeholder:text-gray-300 text-sm leading-relaxed border-none outline-none bg-transparent resize-none"
            />
          </div>

          <div className="flex items-start justify-between pt-4 border-t border-gray-50 gap-4">
            <div className="flex flex-col gap-3">
              <Link
                href="/"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                取消
              </Link>
              {/* <ImageUpload onUpload={handleImageUpload} disabled={isPending} /> */}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors shrink-0"
            >
              {isPending ? '发布中...' : '发布文章'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
