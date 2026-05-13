'use server';

import { sql } from './db';
import { signToken, setAuthCookie, clearAuthCookie, getUser } from './auth';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { ActionState } from './types';
import { createNotification, handleCommentMentions } from './notifications';

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
