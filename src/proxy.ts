import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';

// proxy.ts 中直接创建 Redis 实例，避免 singleton 模块跨运行时问题
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const SESSION_PREFIX = 'session:';
const PROTECTED_PAGES = ['/posts/new'];

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return false;
  try {
    const session = await redis.get(`${SESSION_PREFIX}${token}`);
    return session !== null;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PROTECTED_PAGES.some((p) => pathname.startsWith(p))) {
    if (!(await isAuthenticated(request))) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/posts/new'],
};
