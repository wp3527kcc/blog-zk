export interface User {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  cover_image?: string;
  author_id: number;
  author_username: string;
  author_avatar?: string | null;
  created_at: string;
  updated_at: string;
  like_count: number;
  liked_by_user: boolean;
  tags: string[];
  views: number;
}

export interface Comment {
  id: number;
  content: string;
  author_id: number;
  author_username: string;
  author_avatar: string | null;
  post_id: number;
  created_at: string;
  like_count: number;
  liked_by_user: boolean;
}

export interface JWTPayload {
  userId: number;
  username: string;
  email: string;
  avatar_url?: string;
}

export type ActionState = {
  error?: string;
  success?: string;
  data?: Record<string, unknown>;
} | null;

export type NotificationType = 'mention' | 'follow' | 'comment' | 'like' | 'comment_like';

export interface Notification {
  id: number;
  user_id: number;
  actor_id: number | null;
  actor_username: string | null;
  type: NotificationType;
  post_id: number | null;
  post_title: string | null;
  comment_id: number | null;
  content: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Follow {
  follower_id: number;
  following_id: number;
  created_at: string;
}

// ─── Home Posts Pagination ────────────────────────────────────────────────────

export const HOME_PAGE_SIZE = 5;

export interface GetHomePostsPageParams {
  q?: string;
  tags?: string[];
  feed?: string;
  page: number;
  pageSize?: number;
}

export interface GetHomePostsPageResult {
  posts: Post[];
  hasMore: boolean;
}
