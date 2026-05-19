export type ProfileSectionKey =
  | 'wardrobe'
  | 'user-info'
  | 'my-schemes'
  | 'saved-schemes'
  | 'my-posts'
  | 'settings';

export type SocialPlatform = 'instagram' | 'facebook' | 'x' | 'internal';

export interface OutfitPreviewData {
  id: string;
  title: string;
  styleLine: string;
  description?: string;
  heroImageUrl: string;
  brands: string[];
  badges: string[];
  visibility: 'public' | 'private';
  generationMode?: 'manual' | 'ai';
  updatedAt?: string;
  isFavorite?: boolean;
  status?: 'draft' | 'ready' | 'exported' | 'published';
}

export interface UserPostRecord {
  post_id: string;
  user_id: string;
  outfit_id: string;
  scheme_id?: string;
  title: string;
  caption: string;
  platforms: SocialPlatform[];
  primary_platform: SocialPlatform;
  status: 'draft' | 'ready' | 'exported' | 'published' | 'failed';
  preview_image_url: string;
  export_image_url?: string;
  visibility: 'public' | 'private';
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface OutfitExportRecord {
  export_id: string;
  user_id: string;
  outfit_id: string;
  scheme_id?: string;
  platform: SocialPlatform;
  format: 'square' | 'portrait' | 'story';
  export_mode: 'image_only' | 'image_with_caption';
  caption: string;
  asset_url: string;
  thumbnail_url: string;
  status: 'queued' | 'ready' | 'downloaded' | 'published' | 'failed';
  created_at: string;
  updated_at: string;
  error_message?: string;
}
