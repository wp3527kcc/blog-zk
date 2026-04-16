'use client';

import { useActionState, useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { createPost } from '@/lib/actions';
import ImageUpload from '@/components/ImageUpload';

const DRAFT_KEY = 'blog:new-post-draft';

type Draft = { title: string; content: string; savedAt: string };
type SaveStatus = 'idle' | 'saving' | 'saved';

export default function NewPostPage() {
  const [state, action, isPending] = useActionState(createPost, null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  // ── 初始化：从 localStorage 恢复草稿 ──────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Draft;
      if (!draft.title && !draft.content) return;

      setTitle(draft.title ?? '');
      setContent(draft.content ?? '');
      if (draft.savedAt) setSavedAt(new Date(draft.savedAt));
      setShowDraftBanner(true);
    } catch {
      // localStorage 解析失败时静默忽略
    }
  }, []);

  // ── 防抖自动保存（1 秒无操作后写入 localStorage）──────────────────
  useEffect(() => {
    if (!title && !content) return;

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        const now = new Date();
        const draft: Draft = { title, content, savedAt: now.toISOString() };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setSavedAt(now);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('idle');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, content]);

  // ── 图片上传后插入光标位置 ─────────────────────────────────────────
  const handleImageUpload = (url: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const insert = `![图片](${url})`;
    const next = content.substring(0, start) + insert + content.substring(end);

    setContent(next);

    // 等待 React 更新 DOM 后恢复光标位置
    requestAnimationFrame(() => {
      textarea.selectionStart = start + insert.length;
      textarea.selectionEnd = start + insert.length;
      textarea.focus();
    });
  };

  // ── 发布时清除草稿 ────────────────────────────────────────────────
  const handleSubmit = () => {
    localStorage.removeItem(DRAFT_KEY);
    setShowDraftBanner(false);
  };

  // ── 手动丢弃草稿 ──────────────────────────────────────────────────
  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setTitle('');
    setContent('');
    setSaveStatus('idle');
    setSavedAt(null);
    setShowDraftBanner(false);
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      {/* 顶部栏：标题 + 保存状态 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← 返回首页
          </Link>
          <span className="text-gray-200">|</span>
          <h1 className="text-lg font-semibold text-gray-900">写新文章</h1>
        </div>

        {/* 自动保存状态指示器 */}
        <div className="text-xs text-gray-400 flex items-center gap-1.5 min-w-[120px] justify-end">
          {saveStatus === 'saving' && (
            <>
              <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              正在保存...
            </>
          )}
          {saveStatus === 'saved' && savedAt && (
            <>
              <svg
                className="w-3 h-3 text-green-400 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              草稿已保存 ·{' '}
              {savedAt.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </>
          )}
        </div>
      </div>

      {/* 草稿恢复提示条 */}
      {showDraftBanner && (
        <div className="mb-4 flex items-center justify-between bg-amber-50 border border-amber-100 text-amber-700 text-xs px-4 py-2.5 rounded-lg">
          <span>
            已恢复上次未发布的草稿
            {savedAt &&
              ` · 保存于 ${savedAt.toLocaleString('zh-CN', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}`}
          </span>
          <button
            type="button"
            onClick={discardDraft}
            className="ml-4 text-amber-500 hover:text-amber-700 underline underline-offset-2 shrink-0"
          >
            丢弃草稿
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <form action={action} onSubmit={handleSubmit} className="space-y-6">
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              value={content}
              onChange={(e) => setContent(e.target.value)}
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
              <ImageUpload onUpload={handleImageUpload} disabled={isPending} />
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
