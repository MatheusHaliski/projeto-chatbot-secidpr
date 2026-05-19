import { ProfileSectionKey, UserPostRecord } from '@/app/components/profile/types';
import ProfileWardrobeSection from '@/app/components/profile/ProfileWardrobeSection';
import ProfileUserInfoSection from '@/app/components/profile/ProfileUserInfoSection';
import ProfileSettingsSection from '@/app/components/profile/ProfileSettingsSection';
import ProfileMySchemesSection from '@/app/components/profile/ProfileMySchemesSection';
import ProfileSavedSchemesSection from '@/app/components/profile/ProfileSavedSchemesSection';
import ProfileMyPostsSection from '@/app/components/profile/ProfileMyPostsSection';

interface WardrobeItem {
  wardrobe_item_id: string;
  name: string;
  image_url: string;
  brand: string;
  piece_type: string;
  gender?: string;
}

interface SchemeItem {
  scheme_id: string;
  title: string;
  style: string;
  occasion: string;
  description?: string | null;
  cover_image_url?: string | null;
  visibility: 'public' | 'private';
  creation_mode?: 'manual' | 'ai';
  updated_at?: string;
}

interface ProfileSectionRendererProps {
  section: ProfileSectionKey;
  userId: string;
  username: string;
  displayName: string;
  email: string;
  canEdit: boolean;
  wardrobeItems: WardrobeItem[];
  schemes: SchemeItem[];
  posts: UserPostRecord[];
}

// SchemeItem is used by ProfileMySchemesSection only.
// ProfileSavedSchemesSection fetches its own data from the outfit_favorites collection.

export default function ProfileSectionRenderer({
  section,
  userId,
  username,
  displayName,
  email,
  canEdit,
  wardrobeItems,
  schemes,
  posts,
}: ProfileSectionRendererProps) {
  if (section === 'wardrobe') return <ProfileWardrobeSection items={wardrobeItems} />;
  if (section === 'user-info') return <ProfileUserInfoSection userId={userId} displayName={displayName} username={username} email={email} canEdit={canEdit} />;
  if (section === 'my-schemes') return <ProfileMySchemesSection userId={userId} schemes={schemes} />;
  if (section === 'saved-schemes') return <ProfileSavedSchemesSection userId={userId} />;
  if (section === 'my-posts') return <ProfileMyPostsSection posts={posts} />;
  return <ProfileSettingsSection />;
}
