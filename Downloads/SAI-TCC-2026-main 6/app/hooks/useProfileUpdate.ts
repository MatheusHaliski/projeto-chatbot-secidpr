'use client';

import { useState } from 'react';

interface Payload {
  userId: string;
  displayName: string;
  username: string;
  email: string;
  bio: string;
  avatarUrl?: string;
}

interface ProfileResponse {
  name?: string;
  username?: string;
  email?: string;
  bio?: string;
  photo_url?: string;
}

export function useProfileUpdate() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = async (payload: Payload): Promise<ProfileResponse | null> => {
    setSaving(true);
    setError(null);
    const response = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Unable to update profile.' }));
      setError(data.error || 'Unable to update profile.');
      return null;
    }

    const data = (await response.json().catch(() => null)) as { profile?: ProfileResponse } | null;
    return data?.profile ?? null;
  };

  return { saving, error, updateProfile };
}
