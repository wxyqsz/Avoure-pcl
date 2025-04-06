export interface Article {
  featured: unknown;
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  category: 'fashion' | 'beauty' | 'lifestyle';
  gender?: 'men' | 'women';
  image: string;
  date: string;
  author: string;
  likes?: number;
  comments?: number;
  views?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  bio?: string;
}

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  article_id: string;
  user?: User;
}

export interface ArticleMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}