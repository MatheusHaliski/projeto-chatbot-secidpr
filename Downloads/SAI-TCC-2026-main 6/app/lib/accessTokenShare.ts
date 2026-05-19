import { getLS, removeLS, setLS } from '@/app/lib/SafeStorage';
import { getAuthSessionProfile, getAuthSessionToken, type AuthSessionProfile } from '@/app/lib/authSession';

export const STYLISTAI_ACCESS_TOKEN_KEY = 'stylistai_content_access_token';
export const STYLISTAI_ACCESS_DATA_KEY = 'stylistai_content_access_data';

type SharedAccessData = {
  token: string;
  profile?: AuthSessionProfile;
};

export const getSharedAccessToken = (): string => {
  return getLS(STYLISTAI_ACCESS_TOKEN_KEY) ?? '';
};

export const setSharedAccessToken = (token: string): void => {
  if (!token) return;
  setLS(STYLISTAI_ACCESS_TOKEN_KEY, token);
};

export const getSharedAccessData = (): SharedAccessData | null => {
  const raw = getLS(STYLISTAI_ACCESS_DATA_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SharedAccessData;
    if (!parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const setSharedAccessData = (data: SharedAccessData): void => {
  if (!data?.token) return;
  setLS(STYLISTAI_ACCESS_DATA_KEY, JSON.stringify(data));
  setSharedAccessToken(data.token);
};

export const clearSharedAccessToken = (): void => {
  removeLS(STYLISTAI_ACCESS_TOKEN_KEY);
  removeLS(STYLISTAI_ACCESS_DATA_KEY);
};

export const resolveAnyAccessToken = (): string => {
  return getSharedAccessData()?.token || getSharedAccessToken() || getAuthSessionToken();
};

export const ensureSharedAccessToken = (): string => {
  const resolved = resolveAnyAccessToken();
  if (resolved) {
    setSharedAccessData({
      token: resolved,
      profile: getSharedAccessData()?.profile ?? getAuthSessionProfile(),
    });
  }
  return resolved;
};
