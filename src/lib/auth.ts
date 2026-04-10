import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { redis } from './redis';
import type { JWTPayload } from './types';

const COOKIE_NAME = 'auth-token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds
export const SESSION_PREFIX = 'session:';

// 生成随机 session token，将用户信息存入 Redis
export async function signToken(payload: JWTPayload): Promise<string> {
  const token = randomUUID();
  await redis.set(`${SESSION_PREFIX}${token}`, payload, { ex: SESSION_TTL });
  return token;
}

// 从 Redis 查询 session，返回用户信息
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const data = await redis.get<JWTPayload>(`${SESSION_PREFIX}${token}`);
    return data ?? null;
  } catch {
    return null;
  }
}

export async function getUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

// 退出时同时从 Redis 删除 session，实现服务端立即失效
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await redis.del(`${SESSION_PREFIX}${token}`);
  }
  cookieStore.delete(COOKIE_NAME);
}
