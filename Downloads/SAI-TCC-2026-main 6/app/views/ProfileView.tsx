'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ProfileSummaryCard from '@/app/components/cards/ProfileSummaryCard';
import PageHeader from '@/app/components/shell/PageHeader';
import { getAuthSessionProfile } from '@/app/lib/authSession';
import { getServerSession } from '@/app/lib/clientSession';
import ProfileContextMenu from '@/app/components/profile/ProfileContextMenu';
import ProfileSectionRenderer from '@/app/components/profile/ProfileSectionRenderer';
import { ProfileSectionKey, UserPostRecord } from '@/app/components/profile/types';

const ALLOWED_SECTIONS: ProfileSectionKey[] = ['wardrobe', 'user-info', 'my-schemes', 'saved-schemes', 'my-posts', 'settings'];

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

interface PublicProfile {
  name?: string;
  username?: string;
  email?: string;
  bio?: string;
  photo_url?: string;
}

const parseSectionFromQuery = (value: string | null): ProfileSectionKey => {
  if (!value) return 'wardrobe';
  const normalized = value.trim().toLowerCase() as ProfileSectionKey;
  return ALLOWED_SECTIONS.includes(normalized) ? normalized : 'wardrobe';
};

export default function ProfileView() {
  const authProfile = getAuthSessionProfile();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const pathSegments = pathname.split('/').filter(Boolean);
  const publicUserFromPath = pathSegments[0] === 'profile' && pathSegments[1] && pathSegments[1] !== 'settings' ? pathSegments[1] : '';

  const [authUserId, setAuthUserId] = useState(authProfile.user_id?.trim() || '');
  const [userId, setUserId] = useState(publicUserFromPath || authProfile.user_id?.trim() || '');
  const [viewedProfile, setViewedProfile] = useState<PublicProfile>({
    name: authProfile.name?.trim() || '',
    email: authProfile.email?.trim() || '',
  });
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [schemes, setSchemes] = useState<SchemeItem[]>([]);
  const [posts, setPosts] = useState<UserPostRecord[]>([]);

  const isOwnerView = Boolean(authUserId) && Boolean(userId) && authUserId === userId;
  const forcedPublicSection = publicUserFromPath && !isOwnerView ? 'user-info' : null;
  const selectedSection = forcedPublicSection ?? (pathname.endsWith('/settings') ? 'settings' : parseSectionFromQuery(searchParams.get('section')));
  const allowedSections: ProfileSectionKey[] = isOwnerView || !publicUserFromPath
    ? ALLOWED_SECTIONS
    : ['user-info'];

  useEffect(() => {
    const loadProfileHubData = async () => {
      const localProfile = getAuthSessionProfile();
      let resolvedAuthUserId = localProfile.user_id?.trim() || '';

      if (!resolvedAuthUserId) {
        const serverProfile = await getServerSession();
        resolvedAuthUserId = serverProfile?.user_id?.trim() || '';
      }

      const resolvedViewedUserId = publicUserFromPath || resolvedAuthUserId;
      setAuthUserId(resolvedAuthUserId);
      setUserId(resolvedViewedUserId);

      if (!resolvedViewedUserId) {
        setWardrobeItems([]);
        setSchemes([]);
        setPosts([]);
        setViewedProfile({});
        return;
      }

      const profileResponse = await fetch(`/api/users/me?userId=${encodeURIComponent(resolvedViewedUserId)}`);
      const profileData = (await profileResponse.json().catch(() => null)) as { profile?: PublicProfile } | null;
      const loadedProfile = profileData?.profile ?? {};
      setViewedProfile(loadedProfile);

      if (resolvedViewedUserId !== resolvedAuthUserId) {
        setWardrobeItems([]);
        setSchemes([]);
        setPosts([]);
        return;
      }

      const [wardrobeResponse, schemesResponse, postsResponse] = await Promise.all([
        fetch(`/api/wardrobe-items/user/${resolvedViewedUserId}?status=active&limit=24`),
        fetch(`/api/schemes/user/${resolvedViewedUserId}`),
        fetch(`/api/user-posts?user_id=${encodeURIComponent(resolvedViewedUserId)}`),
      ]);

      const wardrobeData = await wardrobeResponse.json().catch(() => ({ items: [] }));
      const schemesData = await schemesResponse.json().catch(() => []);
      const postsData = await postsResponse.json().catch(() => []);

      const normalizedWardrobeItems = Array.isArray((wardrobeData as { items?: unknown })?.items)
        ? ((wardrobeData as { items: WardrobeItem[] }).items)
        : [];
      setWardrobeItems(normalizedWardrobeItems);
      setSchemes(Array.isArray(schemesData) ? (schemesData as SchemeItem[]) : []);
      setPosts(Array.isArray(postsData) ? (postsData as UserPostRecord[]) : []);
    };

    loadProfileHubData().catch(() => {
      setWardrobeItems([]);
      setSchemes([]);
      setPosts([]);
    });
  }, [publicUserFromPath]);

  const publicEmailFallback = 'not-available@user.local';
  const ownerEmail = viewedProfile.email?.trim() || authProfile.email?.trim() || publicEmailFallback;
  const publicEmail = viewedProfile.email?.trim() || publicEmailFallback;
  const email = isOwnerView ? ownerEmail : publicEmail;

  const ownerUsername = viewedProfile.username?.trim() || viewedProfile.name?.trim() || ownerEmail.split('@')[0] || 'user';
  const publicUsername = viewedProfile.username?.trim() || viewedProfile.name?.trim() || 'user';
  const username = isOwnerView ? ownerUsername : publicUsername;
  const displayName = viewedProfile.name?.trim() || username;
  const bio = viewedProfile.bio?.trim() || `@${username}`;

  const updateSection = (section: ProfileSectionKey) => {
    const normalized = allowedSections.includes(section) ? section : allowedSections[0];
    const query = new URLSearchParams(searchParams.toString());
    query.set('section', normalized);
    router.replace(`${pathname}?${query.toString()}`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <ProfileContextMenu selectedSection={selectedSection} onSelectSection={updateSection} allowedSections={allowedSections} />

      <div className="space-y-6">
        <PageHeader title={isOwnerView ? 'Profile' : `Creator Profile`} subtitle={isOwnerView ? 'Premium creator hub for wardrobe, schemes, publishing, and account controls.' : 'Public creator profile view.'} />

        <ProfileSummaryCard
          username={username}
          displayName={displayName}
          bio={bio}
          loginEmail={email}
          loginStatus={isOwnerView ? 'Authenticated' : 'Public Profile'}
          authSource="sai-usercontrol"
        />

        <ProfileSectionRenderer
          section={selectedSection}
          userId={userId}
          username={username}
          displayName={displayName}
          email={email}
          canEdit={isOwnerView}
          wardrobeItems={wardrobeItems}
          schemes={schemes}
          posts={posts}
        />
      </div>
    </div>
  );
}
