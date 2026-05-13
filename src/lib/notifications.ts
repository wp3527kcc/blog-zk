import 'server-only';
import { sql } from './db';
import { sendEmail, buildMentionEmail } from './email';
import type { NotificationType } from './types';

const MENTION_RE = /@([a-zA-Z0-9_\u4e00-\u9fa5]{2,20})/g;

export function extractMentions(content: string): string[] {
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = MENTION_RE.exec(content)) !== null) {
    set.add(m[1]);
  }
  return Array.from(set);
}

interface CreateNotificationParams {
  userId: number;
  actorId: number | null;
  type: NotificationType;
  postId?: number | null;
  commentId?: number | null;
  content?: string | null;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const { userId, actorId, type, postId = null, commentId = null, content = null } = params;
  if (actorId === userId) return;
  await sql`
    INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id, content)
    VALUES (${userId}, ${actorId}, ${type}, ${postId}, ${commentId}, ${content})
  `;
}

interface HandleMentionsParams {
  content: string;
  actorId: number;
  actorUsername: string;
  postId: number;
  postTitle: string;
  commentId: number;
}

export async function handleCommentMentions(params: HandleMentionsParams): Promise<void> {
  const { content, actorId, actorUsername, postId, postTitle, commentId } = params;
  const usernames = extractMentions(content);
  if (usernames.length === 0) return;

  const mentionedUsers = await sql<{ id: number; username: string; email: string }[]>`
    SELECT id, username, email FROM users
    WHERE username = ANY(${usernames}::text[])
  `;

  if (mentionedUsers.length === 0) return;

  const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';
  const postUrl = `${baseUrl}/posts/${postId}`;

  for (const user of mentionedUsers) {
    if (user.id === actorId) continue;

    await createNotification({
      userId: user.id,
      actorId,
      type: 'mention',
      postId,
      commentId,
      content,
    });

    const { subject, html } = buildMentionEmail({
      mentionedUsername: user.username,
      actorUsername,
      postTitle,
      commentContent: content,
      postUrl,
    });
    sendEmail({ to: user.email, subject, html }).catch((err) => {
      console.error('[notifications] sendEmail error:', err);
    });
  }
}
