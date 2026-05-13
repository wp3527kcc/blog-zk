import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getUser } from '@/lib/auth';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

// 上传目录位于 public/uploads，Next.js 会将 public 目录下的文件作为静态资源提供
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(request: NextRequest) {
  // 鉴权：必须登录
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

  // 校验文件类型
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: '仅支持 JPG、PNG、GIF、WebP 格式' },
      { status: 400 }
    );
  }

  // 校验文件大小（≤ 5 MB）
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `图片大小不能超过 5MB，当前 ${(file.size / 1024 / 1024).toFixed(2)}MB` },
      { status: 400 }
    );
  }

  // 生成存储子目录：YYYY/MM
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const subDir = path.join(UPLOAD_DIR, String(year), month);
  const filename = `${randomUUID()}.${ext}`;
  const filePath = path.join(subDir, filename);

  // 写入本地文件系统
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    await mkdir(subDir, { recursive: true });
    await writeFile(filePath, buffer);
  } catch (err) {
    console.error('Local upload error:', err);
    return NextResponse.json({ error: '上传失败，请重试' }, { status: 500 });
  }

  // 返回可通过服务访问的 URL（/uploads/YYYY/MM/uuid.ext）
  const url = `/uploads/${year}/${month}/${filename}`;
  return NextResponse.json({ url });
}
