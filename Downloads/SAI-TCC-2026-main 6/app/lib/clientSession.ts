export type SessionProfile = {
    user_id?: string;
    email?: string;
};

export const getServerSession = async (): Promise<SessionProfile | null> => {
    const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as {
        ok?: boolean;
        profile?: SessionProfile;
    };
    if (!payload.ok) return null;
    return payload.profile ?? null;
};

export const clearServerSession = async (): Promise<void> => {
    await fetch("/api/auth/session", {
        method: "DELETE",
        credentials: "include",
    });
};
