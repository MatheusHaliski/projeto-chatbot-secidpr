import { getLS, removeLS, setLS } from "@/app/lib/SafeStorage";

export const AUTH_SESSION_TOKEN_KEY = "restaurantcards_auth_token";
export const AUTH_SESSION_PROFILE_KEY = "restaurantcards_auth_profile";
const AUTH_SESSION_TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

type ExpiringToken = {
    token: string;
    expiresAt: number;
};

const parseExpiringToken = (raw: string | null): ExpiringToken | null => {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as ExpiringToken;
        if (!parsed?.token || typeof parsed.expiresAt !== "number") return null;
        return parsed;
    } catch {
        return { token: raw, expiresAt: Date.now() + AUTH_SESSION_TOKEN_TTL_MS };
    }
};

export type AuthSessionProfile = {
    email?: string;
};

export const getAuthSessionToken = (): string => {
    const parsed = parseExpiringToken(getLS(AUTH_SESSION_TOKEN_KEY));
    if (!parsed) return "";
    if (parsed.expiresAt <= Date.now()) {
        clearAuthSessionToken();
        return "";
    }
    setLS(AUTH_SESSION_TOKEN_KEY, JSON.stringify(parsed));
    return parsed.token;
};

export const setAuthSessionToken = (token: string): void => {
    const payload: ExpiringToken = {
        token,
        expiresAt: Date.now() + AUTH_SESSION_TOKEN_TTL_MS,
    };
    setLS(AUTH_SESSION_TOKEN_KEY, JSON.stringify(payload));
};

export const clearAuthSessionToken = (): void => {
    removeLS(AUTH_SESSION_TOKEN_KEY);
};

export const getAuthSessionProfile = (): AuthSessionProfile => {
    const raw = getLS(AUTH_SESSION_PROFILE_KEY);
    if (!raw) return {};
    try {
        return JSON.parse(raw) as AuthSessionProfile;
    } catch {
        return {};
    }
};

export const setAuthSessionProfile = (profile: AuthSessionProfile): void => {
    setLS(AUTH_SESSION_PROFILE_KEY, JSON.stringify(profile));
};

export const clearAuthSessionProfile = (): void => {
    removeLS(AUTH_SESSION_PROFILE_KEY);
};
