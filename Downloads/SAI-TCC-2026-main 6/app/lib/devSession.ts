import { getLS, removeLS, setLS } from "@/app/lib/SafeStorage";

export const DEV_SESSION_TOKEN_KEY = "devAuthToken";
const DEV_SESSION_TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

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
        return { token: raw, expiresAt: Date.now() + DEV_SESSION_TOKEN_TTL_MS };
    }
};

export const getDevSessionToken = (): string => {
    const parsed = parseExpiringToken(getLS(DEV_SESSION_TOKEN_KEY));
    if (!parsed) return "";
    if (parsed.expiresAt <= Date.now()) {
        clearDevSessionToken();
        return "";
    }
    setLS(DEV_SESSION_TOKEN_KEY, JSON.stringify(parsed));
    return parsed.token;
};

export const setDevSessionToken = (token: string): void => {
    const payload: ExpiringToken = {
        token,
        expiresAt: Date.now() + DEV_SESSION_TOKEN_TTL_MS,
    };
    setLS(DEV_SESSION_TOKEN_KEY, JSON.stringify(payload));
};

export const clearDevSessionToken = (): void => {
    removeLS(DEV_SESSION_TOKEN_KEY);
};
