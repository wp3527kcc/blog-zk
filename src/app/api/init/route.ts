import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db';

export async function GET() {
  try {
    await initDb();
    return NextResponse.json({ success: true, message: '数据库初始化成功' });
  } catch (error) {
    console.error('DB init error:', error);
    return NextResponse.json(
      { success: false, message: '初始化失败', error: String(error) },
      { status: 500 }
    );
  }
}
