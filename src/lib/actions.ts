'use server';

import { sql } from './db';
import { signToken, setAuthCookie, clearAuthCookie, getUser } from './auth';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { ActionState, GetHomePostsPageParams, GetHomePostsPageResult, Post } from './types';
import { HOME_PAGE_SIZE } from './types';
import { createNotification, handleCommentMentions } from './notifications';
import { sendEmail, buildVerificationEmail, buildResetPasswordEmail } from './email';

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

  const users = await sql`SELECT id, username, email, password_hash, avatar_url, email_verified FROM users WHERE email = ${email}`;
  const user = users[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash as string))) {
    return { error: '邮箱或密码错误' };
  }

  if (!user.email_verified) {
    return {
      error: '请先验证邮箱',
      data: {
        email: user.email as string,
        unverified: true,
        userId: user.id as number,
      },
    };
  }

  const token = await signToken({
    userId: user.id as number,
    username: user.username as string,
    email: user.email as string,
    avatar_url: user.avatar_url as string,
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

  const crypto = await import('crypto');
  const verificationToken = crypto.randomBytes(32).toString('hex');

  let userId: number;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await sql`
      INSERT INTO users (username, email, password_hash, email_verification_token, email_verification_sent_at)
      VALUES (${username}, ${email}, ${passwordHash}, ${verificationToken}, NOW())
      RETURNING id
    `;
    userId = result[0].id as number;
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

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

  const { subject, html } = buildVerificationEmail({ username, verifyUrl });
  await sendEmail({ to: email, subject, html });

  redirect(`/register/success?email=${encodeURIComponent(email)}`);
}

export async function logout() {
  await clearAuthCookie();
  redirect('/login');
}

export async function resendVerificationEmail(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = (formData.get('email') as string)?.trim();
  const userIdStr = formData.get('userId') as string;
  const userId = userIdStr ? parseInt(userIdStr, 10) : null;

  if (!email) {
    return { error: '请提供邮箱地址' };
  }

  interface UserWithVerify {
    id: number;
    username: string;
    email: string;
    email_verified: boolean;
  }

  let user: UserWithVerify | null = null;

  if (userId) {
    const users = await sql`SELECT id, username, email, email_verified FROM users WHERE id = ${userId} AND email = ${email}`;
    user = (users[0] as UserWithVerify) || null;
  } else {
    const users = await sql`SELECT id, username, email, password_hash, avatar_url, email_verified FROM users WHERE email = ${email}`;
    user = (users[0] as UserWithVerify) || null;
  }

  if (!user) {
    return { error: '用户不存在' };
  }

  if (user.email_verified) {
    return { error: '邮箱已验证，请直接登录' };
  }

  const crypto = await import('crypto');
  const verificationToken = crypto.randomBytes(32).toString('hex');

  await sql`
    UPDATE users
    SET email_verification_token = ${verificationToken},
        email_verification_sent_at = NOW()
    WHERE id = ${user.id}
  `;

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

  const { subject, html } = buildVerificationEmail({
    username: user.username as string,
    verifyUrl,
  });
  await sendEmail({ to: email, subject, html });

  return { success: '验证邮件已重新发送，请查收' };
}

export async function verifyEmail(token: string): Promise<ActionState> {
  if (!token) {
    return { error: '验证令牌无效' };
  }

  const users = await sql`
    SELECT id, email, username, email_verification_sent_at
    FROM users
    WHERE email_verification_token = ${token}
  `;

  if (users.length === 0) {
    return { error: '验证链接已失效或不存在' };
  }

  const user = users[0];
  const sentAt = new Date(user.email_verification_sent_at as string);
  const now = new Date();
  const hoursDiff = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 5);

  if (hoursDiff > 24) {
    return { error: '验证链接已过期，请重新发送验证邮件', data: { expired: true } };
  }

  await sql`
    UPDATE users
    SET email_verified = TRUE,
        email_verification_token = NULL,
        email_verification_sent_at = NULL
    WHERE id = ${user.id}
  `;

  return { success: '邮箱验证成功', data: { email: user.email as string } };
}

// ─── Tag helpers ──────────────────────────────────────────────────────────────

function parseTagNames(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 10);
}

function toSlug(name: string): string {
  return name
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .slice(0, 60);
}

async function upsertTags(tagNames: string[]): Promise<number[]> {
  if (tagNames.length === 0) return [];
  const ids: number[] = [];
  for (const name of tagNames) {
    const slug = toSlug(name);
    const rows = await sql`
      INSERT INTO tags (name, slug)
      VALUES (${name}, ${slug})
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    ids.push(rows[0].id as number);
  }
  return ids;
}

async function syncPostTags(postId: number, tagIds: number[]): Promise<void> {
  await sql`DELETE FROM post_tags WHERE post_id = ${postId}`;
  for (const tagId of tagIds) {
    await sql`
      INSERT INTO post_tags (post_id, tag_id) VALUES (${postId}, ${tagId})
      ON CONFLICT DO NOTHING
    `;
  }
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
  const coverImage = (formData.get('cover_image') as string)?.trim() || null;
  const tagsRaw = (formData.get('tags') as string) ?? '';

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
    INSERT INTO posts (title, content, cover_image, author_id)
    VALUES (${title}, ${content}, ${coverImage}, ${user.userId})
    RETURNING id
  `;
  const post = result[0];

  const tagNames = parseTagNames(tagsRaw);
  const tagIds = await upsertTags(tagNames);
  await syncPostTags(post.id as number, tagIds);

  revalidatePath('/');
  redirect(`/posts/${post.id}`);
}

export async function updatePost(
  postId: number,
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: '请先登录' };

  const posts = await sql`SELECT author_id FROM posts WHERE id = ${postId}`;
  const existing = posts[0];
  if (!existing || (existing.author_id as number) !== user.userId) {
    return { error: '无权编辑此文章' };
  }

  const title = (formData.get('title') as string)?.trim();
  const content = (formData.get('content') as string)?.trim();
  const coverImage = (formData.get('cover_image') as string)?.trim() || null;
  const tagsRaw = (formData.get('tags') as string) ?? '';

  if (!title || !content) {
    return { error: '请填写标题和内容' };
  }
  if (title.length > 200) {
    return { error: '标题不能超过 200 个字符' };
  }
  if (content.length > 50000) {
    return { error: '内容不能超过 50000 个字符' };
  }

  await sql`
    UPDATE posts
    SET title = ${title}, content = ${content}, cover_image = ${coverImage}, updated_at = NOW()
    WHERE id = ${postId}
  `;

  const tagNames = parseTagNames(tagsRaw);
  const tagIds = await upsertTags(tagNames);
  await syncPostTags(postId, tagIds);

  revalidatePath('/');
  revalidatePath(`/posts/${postId}`);
  redirect(`/posts/${postId}`);
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

  const inserted = await sql`
    INSERT INTO comments (content, author_id, post_id)
    VALUES (${content}, ${user.userId}, ${postId})
    RETURNING id
  `;
  const commentId = inserted[0].id as number;

  const postInfo = await sql`SELECT title, author_id FROM posts WHERE id = ${postId}`;
  const post = postInfo[0];
  if (post) {
    const postAuthorId = post.author_id as number;
    const postTitle = post.title as string;

    if (postAuthorId !== user.userId) {
      await createNotification({
        userId: postAuthorId,
        actorId: user.userId,
        type: 'comment',
        postId,
        commentId,
        content,
      });
    }

    await handleCommentMentions({
      content,
      actorId: user.userId,
      actorUsername: user.username,
      postId,
      postTitle,
      commentId,
    });
  }

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

  const comments = await sql`SELECT post_id, author_id FROM comments WHERE id = ${commentId}`;
  if (!comments[0]) return { error: '评论不存在' };
  const postId = comments[0].post_id as number;
  const commentAuthorId = comments[0].author_id as number;

  const existing = await sql`
    SELECT id FROM comment_likes WHERE user_id = ${user.userId} AND comment_id = ${commentId}
  `;

  if (existing.length > 0) {
    await sql`DELETE FROM comment_likes WHERE user_id = ${user.userId} AND comment_id = ${commentId}`;
  } else {
    await sql`INSERT INTO comment_likes (user_id, comment_id) VALUES (${user.userId}, ${commentId})`;
    if (commentAuthorId !== user.userId) {
      await createNotification({
        userId: commentAuthorId,
        actorId: user.userId,
        type: 'comment_like',
        postId,
        commentId,
      });
    }
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
    const posts = await sql`SELECT author_id FROM posts WHERE id = ${postId}`;
    const authorId = posts[0]?.author_id as number | undefined;
    if (authorId && authorId !== user.userId) {
      await createNotification({
        userId: authorId,
        actorId: user.userId,
        type: 'like',
        postId,
      });
    }
  }

  revalidatePath(`/posts/${postId}`);
  revalidatePath('/');
  return null;
}

// ─── Follow Actions ───────────────────────────────────────────────────────────

export async function toggleFollow(targetUserId: number): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: '请先登录' };
  if (user.userId === targetUserId) return { error: '不能关注自己' };

  const target = await sql`SELECT id, username FROM users WHERE id = ${targetUserId}`;
  if (!target[0]) return { error: '用户不存在' };

  const existing = await sql`
    SELECT 1 FROM follows WHERE follower_id = ${user.userId} AND following_id = ${targetUserId}
  `;

  if (existing.length > 0) {
    await sql`
      DELETE FROM follows WHERE follower_id = ${user.userId} AND following_id = ${targetUserId}
    `;
  } else {
    await sql`
      INSERT INTO follows (follower_id, following_id) VALUES (${user.userId}, ${targetUserId})
      ON CONFLICT DO NOTHING
    `;
    await createNotification({
      userId: targetUserId,
      actorId: user.userId,
      type: 'follow',
    });
  }

  revalidatePath(`/users/${target[0].username}`);
  revalidatePath('/');
  return null;
}

// ─── Notification Actions ─────────────────────────────────────────────────────

export async function markAllNotificationsRead(_formData?: FormData): Promise<void> {
  const user = await getUser();
  if (!user) return;

  await sql`
    UPDATE notifications SET read_at = NOW()
    WHERE user_id = ${user.userId} AND read_at IS NULL
  `;
  revalidatePath('/notifications');
}

export async function markNotificationRead(notificationId: number): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: '请先登录' };

  await sql`
    UPDATE notifications SET read_at = NOW()
    WHERE id = ${notificationId} AND user_id = ${user.userId} AND read_at IS NULL
  `;
  revalidatePath('/notifications');
  return null;
}

export async function readNotificationAndGo(notificationId: number, href: string): Promise<void> {
  const user = await getUser();
  if (!user) redirect('/login');

  await sql`
    UPDATE notifications SET read_at = NOW()
    WHERE id = ${notificationId} AND user_id = ${user.userId} AND read_at IS NULL
  `;
  revalidatePath('/notifications');
  redirect(href);
}

export async function updateUsername(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: '请先登录' };

  const newUsername = (formData.get('username') as string)?.trim();
  if (!newUsername) return { error: '用户名不能为空' };
  if (newUsername.length < 2 || newUsername.length > 20)
    return { error: '用户名长度为 2-20 个字符' };
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(newUsername))
    return { error: '仅支持字母、数字、下划线或中文' };
  if (newUsername === user.username)
    return { error: '新用户名与当前相同' };

  try {
    await sql`UPDATE users SET username = ${newUsername} WHERE id = ${user.userId}`;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505')
      return { error: '该用户名已被使用' };
    return { error: '更新失败，请重试' };
  }

  const newToken = await signToken({ ...user, username: newUsername });
  await setAuthCookie(newToken);
  revalidatePath(`/users/${user.username}`);
  redirect(`/users/${newUsername}`);
}

export async function updateAvatar(url: string): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: '请先登录' };

  await sql`UPDATE users SET avatar_url = ${url} WHERE id = ${user.userId}`;

  const newToken = await signToken({ ...user, avatar_url: url });
  await setAuthCookie(newToken);

  revalidatePath(`/users/${user.username}`);
  return { success: '头像已更新' };
}

export async function changePassword(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: '请先登录' };

  const oldPassword = formData.get('oldPassword') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!oldPassword || !newPassword) {
    return { error: '请填写所有字段' };
  }
  if (newPassword.length < 6) {
    return { error: '新密码至少 6 位' };
  }
  if (oldPassword === newPassword) {
    return { error: '新密码与旧密码相同' };
  }

  const users = await sql`SELECT password_hash FROM users WHERE id = ${user.userId}`;
  const currentHash = users[0]?.password_hash as string | undefined;
  if (!currentHash || !(await bcrypt.compare(oldPassword, currentHash))) {
    return { error: '旧密码错误' };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${user.userId}`;

  const newToken = await signToken({ ...user });
  await setAuthCookie(newToken);

  return { success: '密码已修改' };
}

export async function sendPasswordReset(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = (formData.get('email') as string)?.trim();
  if (!email) return { error: '请填写邮箱地址' };

  const users = await sql`SELECT id, username FROM users WHERE email = ${email}`;
  const user = users[0];
  if (!user) {
    // 不暴露邮箱是否存在
    return { success: '如果该邮箱已注册，你将收到重置邮件' };
  }

  const crypto = await import('crypto');
  const token = crypto.randomBytes(32).toString('hex');

  await sql`
    UPDATE users
    SET password_reset_token = ${token}, password_reset_sent_at = NOW()
    WHERE id = ${user.id}
  `;

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const { subject, html } = buildResetPasswordEmail({
    username: user.username as string,
    resetUrl,
  });
  await sendEmail({ to: email, subject, html });

  return { success: '如果该邮箱已注册，你将收到重置邮件' };
}

export async function resetPassword(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const token = formData.get('token') as string;
  const password = formData.get('password') as string;

  if (!token) return { error: '重置链接无效' };
  if (!password) return { error: '请填写新密码' };
  if (password.length < 6) return { error: '密码至少 6 位' };

  const users = await sql`
    SELECT id, username, password_reset_sent_at FROM users
    WHERE password_reset_token = ${token}
  `;
  const user = users[0];
  if (!user) return { error: '重置链接已失效或不存在' };

  const sentAt = new Date(user.password_reset_sent_at as string);
  const hoursDiff = (Date.now() - sentAt.getTime()) / (1000 * 60 * 60);
  if (hoursDiff > 24) return { error: '重置链接已过期，请重新发送' };

  const passwordHash = await bcrypt.hash(password, 10);
  await sql`
    UPDATE users
    SET password_hash = ${passwordHash},
        password_reset_token = NULL,
        password_reset_sent_at = NULL
    WHERE id = ${user.id}
  `;

  return { success: '密码已重置，请使用新密码登录' };
}

// ─── Home Posts Pagination ────────────────────────────────────────────────────

export async function getHomePostsPage(
  params: GetHomePostsPageParams
): Promise<GetHomePostsPageResult> {
  const { q, tags = [], feed, page, pageSize = HOME_PAGE_SIZE } = params;
  const queryStr = q?.trim() ?? '';
  const selectedTags = tags.filter(Boolean);

  const user = await getUser();
  const isFollowingFeed = feed === 'following' && !!user;
  const userId = user?.userId ?? 0;

  const limit = pageSize + 1;
  const offset = (page - 1) * pageSize;

  const rows = await sql<Post[]>`
    SELECT
      p.id, p.title, p.content, p.cover_image, p.author_id, p.views,
      p.created_at, p.updated_at,
      u.username AS author_username,
      u.avatar_url AS author_avatar,
      COUNT(DISTINCT l.id)::int AS like_count,
      false AS liked_by_user,
      COALESCE(
        ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
        ARRAY[]::text[]
      ) AS tags
    FROM posts p
    JOIN users u ON p.author_id = u.id
    LEFT JOIN likes l ON p.id = l.post_id
    LEFT JOIN post_tags pt ON p.id = pt.post_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE 1 = 1
      ${queryStr
        ? sql`AND to_tsvector('simple', p.title || ' ' || p.content) @@ plainto_tsquery('simple', ${queryStr})`
        : sql``}
      ${selectedTags.length > 0
        ? sql`AND p.id IN (
            SELECT pt2.post_id FROM post_tags pt2
            JOIN tags tfilter ON pt2.tag_id = tfilter.id
            WHERE tfilter.name = ANY(${selectedTags})
          )`
        : sql``}
      ${isFollowingFeed
        ? sql`AND p.author_id IN (SELECT following_id FROM follows WHERE follower_id = ${userId})`
        : sql``}
    GROUP BY p.id, u.username, u.avatar_url
    ORDER BY p.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const hasMore = rows.length > pageSize;
  const posts = hasMore ? rows.slice(0, pageSize) : rows;

  return { posts, hasMore };
}
