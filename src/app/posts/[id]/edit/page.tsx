'use client';

import { useActionState, useRef, useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updatePost } from '@/lib/actions';
import ImageUpload from '@/components/ImageUpload';
import MarkdownContent from '@/components/MarkdownContent';

interface EditPageProps {
  params: Promise<{ id: string }>;
}

interface PostData {
  id: number;
  title: string;
  content: string;
  cover_image: string | null;
  tags: string[];
}

export default function EditPostPage({ params }: EditPageProps) {
  const { id } = use(params);
  const postId = parseInt(id, 10);
  const router = useRouter();

  const boundAction = updatePost.bind(null, postId);
  const [state, action, isPending] = useActionState(boundAction, null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [tags, setTags] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (isNaN(postId)) {
      setNotFound(true);
      return;
    }
    fetch(`/api/posts/${postId}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json() as Promise<PostData>;
      })
      .then((data) => {
        setTitle(data.title);
        setContent(data.content);
        setCoverImage(data.cover_image ?? '');
        setTags((data.tags ?? []).join(', '));
        setLoaded(true);
      })
      .catch(() => {
        setNotFound(true);
      });
  }, [postId]);

  const handleImageUpload = (url: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const insert = `![图片](${url})`;
    const next = content.substring(0, start) + insert + content.substring(end);
    setContent(next);

    requestAnimationFrame(() => {
      textarea.selectionStart = start + insert.length;
      textarea.selectionEnd = start + insert.length;
      textarea.focus();
    });
  };

  if (notFound) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-400">文章不存在或无权编辑</p>
        <Link href="/" className="text-blue-500 hover:underline text-sm mt-4 inline-block">
          返回首页
        </Link>
      </main>
    );
  }

  if (!loaded) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8 text-center">
        <span className="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className={showPreview ? 'max-w-7xl mx-auto px-4 py-8' : 'max-w-3xl mx-auto px-4 py-8'}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← 返回
          </button>
          <span className="text-gray-200">|</span>
          <h1 className="text-lg font-semibold text-gray-900">编辑文章</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
            showPreview
              ? 'bg-blue-50 border-blue-200 text-blue-600'
              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          {showPreview ? '关闭预览' : '实时预览'}
        </button>
      </div>

      <form action={action}>
        {state?.error && (
          <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
            {state.error}
          </div>
        )}

        <div className={showPreview ? 'grid grid-cols-2 gap-6' : ''}>
          {/* 编辑区 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
            {showPreview && (
              <div className="flex items-center gap-2 text-xs text-gray-400 -mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                编辑
              </div>
            )}

            <div>
              {coverImage ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImage}
                    alt="封面图"
                    className="w-full h-40 object-cover rounded-xl border border-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => setCoverImage('')}
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-500 hover:text-red-500 rounded-full p-1 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <ImageUpload onUpload={(url) => setCoverImage(url)} disabled={isPending} label="上传封面图" />
              )}
              <input type="hidden" name="cover_image" value={coverImage} />
            </div>

            <div className="border-t border-gray-50" />

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

            <input
              name="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="标签（用逗号分隔，如：技术, Next.js, 前端）"
              className="w-full text-sm text-gray-600 placeholder:text-gray-300 border-none outline-none bg-transparent"
            />

            <div className="border-t border-gray-50" />

            <textarea
              ref={contentRef}
              name="content"
              required
              rows={showPreview ? 22 : 18}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="在此写下你的内容..."
              className="w-full text-gray-700 placeholder:text-gray-300 text-sm leading-relaxed border-none outline-none bg-transparent resize-none"
            />

            <div className="flex items-start justify-between pt-4 border-t border-gray-50 gap-4">
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors text-left"
                >
                  取消
                </button>
                <ImageUpload onUpload={handleImageUpload} disabled={isPending} label="插入图片" />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors shrink-0"
              >
                {isPending ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>

          {/* 预览区 */}
          {showPreview && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 overflow-y-auto">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                预览
              </div>

              {coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverImage}
                  alt="封面图"
                  className="w-full h-40 object-cover rounded-xl border border-gray-100 mb-6"
                />
              )}

              {title ? (
                <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">{title}</h1>
              ) : (
                <p className="text-2xl text-gray-200 mb-4">文章标题...</p>
              )}

              {tags && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-50 mb-6" />

              {content ? (
                <MarkdownContent content={content} />
              ) : (
                <p className="text-gray-300 text-sm">在左侧输入内容，这里将实时显示渲染效果...</p>
              )}
            </div>
          )}
        </div>
      </form>
    </main>
  );
}
