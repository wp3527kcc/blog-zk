'use server';

import { sql } from './db';
import { signToken, setAuthCookie, clearAuthCookie, getUser } from './auth';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { ActionState } from './types';

// ─── Auth Actions ─────────────────────────────────────────────────────────────

export async function login(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: '请填写所有字段' };
  }

  const users = await sql`SELECT * FROM users WHERE email = ${email}`;
  const user = users[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash as string))) {
    return { error: '邮箱或密码错误' };
  }

  const token = await signToken({
    userId: user.id as number,
    username: user.username as string,
    email: user.email as string,
  });

  await setAuthCookie(token);
  redirect('/');
}

export async function register(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const username = (formData.get('username') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;

  if (!username || !email || !password) {
    return { error: '请填写所有字段' };
  }
  if (username.length < 2 || username.length > 20) {
    return { error: '用户名长度为 2-20 个字符' };
  }
  if (password.length < 6) {
    return { error: '密码至少 6 位' };
  }

  let user: Record<string, unknown>;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await sql`
      INSERT INTO users (username, email, password_hash)
      VALUES (${username}, ${email}, ${passwordHash})
      RETURNING id, username, email
    `;
    user = result[0] as Record<string, unknown>;
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      err.code === '23505'
    ) {
      return { error: '用户名或邮箱已被注册' };
    }
    return { error: '注册失败，请重试' };
  }

  const token = await signToken({
    userId: user.id as number,
    username: user.username as string,
    email: user.email as string,
  });

  await setAuthCookie(token);
  redirect('/');
}

export async function logout() {
  await clearAuthCookie();
  redirect('/login');
}

// ─── Post Actions ─────────────────────────────────────────────────────────────

export async function createPost(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: '请先登录' };

  const title = (formData.get('title') as string)?.trim();
  const content = (formData.get('content') as string)?.trim();

  if (!title || !content) {
    return { error: '请填写标题和内容' };
  }
  if (title.length > 200) {
    return { error: '标题不能超过 200 个字符' };
  }
  if (content.length > 50000) {
    return { error: '内容不能超过 50000 个字符' };
  }

  const result = await sql`
    INSERT INTO posts (title, content, author_id)
    VALUES (${title}, ${content}, ${user.userId})
    RETURNING id
  `;
  const post = result[0];

  revalidatePath('/');
  redirect(`/posts/${post.id}`);
}

export async function deletePost(postId: number, _formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) redirect('/login');

  const posts = await sql`SELECT author_id FROM posts WHERE id = ${postId}`;
  const post = posts[0];

  if (!post || (post.author_id as number) !== user.userId) {
    redirect('/');
  }

  await sql`DELETE FROM posts WHERE id = ${postId}`;

  revalidatePath('/');
  redirect('/');
}

// ─── Comment Actions ──────────────────────────────────────────────────────────

export async function createComment(
  postId: number,
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: '请先登录' };

  const content = (formData.get('content') as string)?.trim();

  if (!content) {
    return { error: '评论内容不能为空' };
  }
  if (content.length > 1000) {
    return { error: '评论不能超过 1000 个字符' };
  }

  await sql`
    INSERT INTO comments (content, author_id, post_id)
    VALUES (${content}, ${user.userId}, ${postId})
  `;

  revalidatePath(`/posts/${postId}`);
  return { success: '评论成功' };
}

export async function deleteComment(commentId: number, _formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) redirect('/login');

  const comments = await sql`
    SELECT c.author_id, c.post_id, p.author_id AS post_author_id
    FROM comments c
    JOIN posts p ON c.post_id = p.id
    WHERE c.id = ${commentId}
  `;
  const comment = comments[0];

  if (!comment) redirect('/');

  const isCommentAuthor = (comment.author_id as number) === user.userId;
  const isPostAuthor = (comment.post_author_id as number) === user.userId;

  if (!isCommentAuthor && !isPostAuthor) redirect('/');

  const postId = comment.post_id as number;
  await sql`DELETE FROM comments WHERE id = ${commentId}`;

  revalidatePath(`/posts/${postId}`);
  redirect(`/posts/${postId}`);
}

export async function toggleCommentLike(commentId: number): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: '请先登录' };

  const comments = await sql`SELECT post_id FROM comments WHERE id = ${commentId}`;
  if (!comments[0]) return { error: '评论不存在' };
  const postId = comments[0].post_id as number;

  const existing = await sql`
    SELECT id FROM comment_likes WHERE user_id = ${user.userId} AND comment_id = ${commentId}
  `;

  if (existing.length > 0) {
    await sql`DELETE FROM comment_likes WHERE user_id = ${user.userId} AND comment_id = ${commentId}`;
  } else {
    await sql`INSERT INTO comment_likes (user_id, comment_id) VALUES (${user.userId}, ${commentId})`;
  }

  revalidatePath(`/posts/${postId}`);
  return null;
}

// ─── Like Actions ─────────────────────────────────────────────────────────────

export async function toggleLike(postId: number): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: '请先登录' };

  const existing = await sql`
    SELECT id FROM likes WHERE user_id = ${user.userId} AND post_id = ${postId}
  `;

  if (existing.length > 0) {
    await sql`DELETE FROM likes WHERE user_id = ${user.userId} AND post_id = ${postId}`;
  } else {
    await sql`INSERT INTO likes (user_id, post_id) VALUES (${user.userId}, ${postId})`;
  }

  revalidatePath(`/posts/${postId}`);
  revalidatePath('/');
  return null;
}
