export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author_username: string;
  created_at: string;
  updated_at: string;
  like_count: number;
  liked_by_user: boolean;
}

export interface Comment {
  id: number;
  content: string;
  author_id: number;
  author_username: string;
  post_id: number;
  created_at: string;
  like_count: number;
  liked_by_user: boolean;
}

export interface JWTPayload {
  userId: number;
  username: string;
  email: string;
}

export type ActionState = {
  error?: string;
  success?: string;
} | null;
