import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getUser } from '@/lib/auth';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: '未选择文件' }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: '仅支持 JPG、PNG、GIF、WebP 格式' },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `图片大小不能超过 5MB，当前 ${(file.size / 1024 / 1024).toFixed(2)}MB` },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const pathname = `uploads/${year}/${month}/${crypto.randomUUID()}.${ext}`;

    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type,
    });
    console.log('blob', blob);

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error('[upload] Vercel Blob error:', err);
    return NextResponse.json({ error: '上传失败，请重试' }, { status: 500 });
  }
}
