'use client';

import { useRef, useState, useTransition } from 'react';
import { updateAvatar } from '@/lib/actions';
import AvatarCropModal from './AvatarCropModal';

interface AvatarUploadProps {
  username: string;
  avatarUrl?: string | null;
  size?: number;
}

export default function AvatarUpload({ username, avatarUrl, size = 64 }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = username[0].toUpperCase();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('图片不能超过 5MB');
      return;
    }

    setError('');
    setCropFile(file);

    // Reset input so same file can be selected again
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleCropComplete = async (croppedFile: File) => {
    setCropFile(null);
    setUploading(true);

    const localPreview = URL.createObjectURL(croppedFile);
    setPreview(localPreview);

    try {
      const formData = new FormData();
      formData.append('file', croppedFile);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '上传失败');
        setPreview(avatarUrl ?? null);
        return;
      }

      startTransition(async () => {
        const result = await updateAvatar(data.url as string);
        if (result?.error) {
          setError(result.error);
          setPreview(avatarUrl ?? null);
        }
      });
    } catch {
      setError('上传失败，请检查网络');
      setPreview(avatarUrl ?? null);
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    setCropFile(null);
  };

  const isLoading = uploading || isPending;

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          style={{ width: size, height: size }}
          aria-label="更换头像"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={username}
              className="w-full h-full rounded-full object-cover border-2 border-white shadow-sm"
            />
          ) : (
            <span
              className="w-full h-full rounded-full bg-linear-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold select-none"
              style={{ fontSize: size * 0.375 }}
            >
              {initials}
            </span>
          )}

          {/* 悬停遮罩 */}
          <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity flex flex-col items-center justify-center gap-0.5 pointer-events-none">
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-white text-[10px] font-medium leading-none">更换</span>
              </>
            )}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLoading}
        />

        {error && <p className="text-xs text-red-500 text-center max-w-[120px]">{error}</p>}
      </div>

      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          onCropComplete={handleCropComplete}
          onClose={handleCropCancel}
        />
      )}
    </>
  );
}