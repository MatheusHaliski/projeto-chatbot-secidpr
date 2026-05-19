'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import SectionBlock from '@/app/components/shared/SectionBlock';
import { useProfileUpdate } from '@/app/hooks/useProfileUpdate';
import { getAuthSessionProfile, setAuthSessionProfile } from '@/app/lib/authSession';

interface ProfileUserInfoSectionProps {
  userId: string;
  displayName: string;
  username: string;
  email: string;
  canEdit: boolean;
}

export default function ProfileUserInfoSection({ userId, displayName, username, email, canEdit }: ProfileUserInfoSectionProps) {
  const defaultBio = 'Fashion-tech creator focused on premium essentials and elevated streetwear.';
  const defaultForm = {
    displayName,
    username,
    email,
    bio: defaultBio,
    avatarUrl: '',
  };

  const [initial, setInitial] = useState(defaultForm);
  const [form, setForm] = useState(defaultForm);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { saving, error, updateProfile } = useProfileUpdate();

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const inputClassName = 'w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/45';

  const onAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !canEdit) return;
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, avatarUrl: typeof reader.result === 'string' ? reader.result : prev.avatarUrl }));
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const loadCurrentUser = async () => {
      if (!userId) return;
      setLoadingProfile(true);
      try {
        const response = await fetch(`/api/users/me?userId=${encodeURIComponent(userId)}`);
        if (!response.ok) return;
        const data = (await response.json().catch(() => null)) as { profile?: { name?: string; username?: string; email?: string; bio?: string; photo_url?: string } } | null;
        const profile = data?.profile;
        if (!profile) return;
        const loaded = {
          displayName: profile.name?.trim() || displayName,
          username: profile.username?.trim() || username,
          email: profile.email?.trim() || email,
          bio: profile.bio?.trim() || defaultBio,
          avatarUrl: profile.photo_url?.trim() || '',
        };
        setInitial(loaded);
        setForm(loaded);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadCurrentUser().catch(() => {
      setLoadingProfile(false);
    });
  }, [defaultBio, displayName, email, userId, username]);

  return (
    <SectionBlock
      title="User Info"
      subtitle={canEdit ? 'Edit your profile identity and public creator metadata.' : 'Public creator profile metadata.'}
    >
      <article className="mt-4 overflow-hidden rounded-3xl border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.25)]" style={{ backgroundColor: 'var(--user-surface-solid, #ea580c)' }}>
        <div className="relative h-56 w-full border-b border-white/20 bg-black/20">
          {form.avatarUrl ? (
            <Image src={form.avatarUrl} alt={`${form.displayName || form.username} profile`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 60vw" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25),rgba(0,0,0,0.35))]">
              <span className="inline-flex h-24 w-24 items-center justify-center rounded-full border border-white/40 bg-white/15 text-4xl font-semibold text-white">
                {(form.displayName || form.username || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="border-b border-white/20 bg-black/15 px-5 py-3">
          <p className="text-lg font-semibold text-white drop-shadow">{form.displayName || 'Unnamed User'}</p>
          <p className="text-sm text-white/85">@{form.username || 'username'}</p>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-2">
          <label className="rounded-xl border border-white/25 bg-white/10 p-3 text-xs text-white/80">Display name
            <input disabled={!canEdit} className={`${inputClassName} mt-2 disabled:cursor-not-allowed disabled:opacity-80`} value={form.displayName} onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))} />
          </label>

          <label className="rounded-xl border border-white/25 bg-white/10 p-3 text-xs text-white/80">Username
            <input disabled={!canEdit} className={`${inputClassName} mt-2 disabled:cursor-not-allowed disabled:opacity-80`} value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} />
          </label>

          <label className="rounded-xl border border-white/25 bg-white/10 p-3 text-xs text-white/80">Email
            <input disabled={!canEdit} className={`${inputClassName} mt-2 disabled:cursor-not-allowed disabled:opacity-80`} value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          </label>

          <label className="rounded-xl border border-white/25 bg-white/10 p-3 text-xs text-white/80">Upload photo
            <input disabled={!canEdit} type="file" accept="image/*" onChange={onAvatarUpload} className={`${inputClassName} mt-2 disabled:cursor-not-allowed disabled:opacity-80 file:mr-3 file:rounded-md file:border-0 file:bg-white/20 file:px-2 file:py-1 file:text-xs file:text-white`} />
          </label>

          <label className="rounded-xl border border-white/25 bg-white/10 p-3 text-xs text-white/80 md:col-span-2">Bio
            <textarea disabled={!canEdit} rows={3} className={`${inputClassName} mt-2 disabled:cursor-not-allowed disabled:opacity-80`} value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} />
          </label>
        </div>
      </article>

      {canEdit ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl border border-violet-300/70 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!dirty || saving || !userId}
            onClick={async () => {
              const profile = await updateProfile({ userId, ...form });
              if (!profile) {
                setToast('Unable to save profile.');
                return;
              }

              const synced = {
                displayName: profile.name?.trim() || form.displayName,
                username: profile.username?.trim() || form.username,
                email: profile.email?.trim() || form.email,
                bio: profile.bio?.trim() || form.bio,
                avatarUrl: profile.photo_url?.trim() || form.avatarUrl,
              };

              setInitial(synced);
              setForm(synced);

              const authProfile = getAuthSessionProfile();
              setAuthSessionProfile({
                ...authProfile,
                name: synced.displayName,
                email: synced.email,
                photo_url: synced.avatarUrl,
              });

              setToast('Profile updated successfully.');
            }}
          >
            {saving ? 'Saving...' : loadingProfile ? 'Loading...' : 'Save Changes'}
          </button>
          <button type="button" className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm" disabled={!dirty || saving} onClick={() => setForm(initial)}>
            Cancel
          </button>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs text-white/80">
          You are viewing this creator profile in read-only mode.
        </p>
      )}

      {toast ? <p className="mt-3 text-xs text-cyan-200">{toast}</p> : null}
      {error ? <p className="mt-1 text-xs text-rose-200">{error}</p> : null}
    </SectionBlock>
  );
}
