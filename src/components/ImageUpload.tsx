'use client';

import { useRef, useState } from 'react';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  disabled?: boolean;
}

export default function ImageUpload({ onUpload, disabled }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 客户端预校验（服务端还会再校验一次）
    if (file.size > 5 * 1024 * 1024) {
      setError(`图片大小不能超过 5MB，当前 ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    setError('');
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '上传失败');
        setPreview('');
      } else {
        onUpload(data.url as string);
      }
    } catch {
      setError('上传失败，请检查网络');
      setPreview('');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <>
            <span className="inline-block w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            上传中...
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
            插入图片
          </>
        )}
      </button>

      {/* 上传中预览缩略图 */}
      {preview && uploading && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="预览" className="h-8 w-8 object-cover rounded" />
          <span>正在上传...</span>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <p className="text-xs text-gray-300">支持 JPG / PNG / GIF / WebP，单张 ≤ 5MB</p>
    </div>
  );
}
