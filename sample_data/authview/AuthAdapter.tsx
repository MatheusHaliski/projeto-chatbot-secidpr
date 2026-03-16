import type { User as FirebaseUser } from "firebase/auth";

export type AuthUser = {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
};

export const adaptUser = (
    user: FirebaseUser | null | undefined
): AuthUser | null => {
    if (!user) return null;
    return {
        uid: user.uid ?? "",
        displayName: user.displayName ?? "",
        email: user.email ?? "",
        photoURL: user.photoURL ?? "",
    };
};

export const getUserId = (user: AuthUser | null | undefined) => user?.uid ?? "";

export const getUserDisplayName = (user: AuthUser | null | undefined) =>
    user?.displayName ?? "";

export const getUserEmail = (user: AuthUser | null | undefined) =>
    user?.email ?? "";

export const getUserPhotoUrl = (user: AuthUser | null | undefined) =>
    user?.photoURL ?? "";

export const getUserLabel = (
    user: AuthUser | null | undefined,
    fallback = "User"
) => {
    const name = getUserDisplayName(user);
    if (name) return name;
    const email = getUserEmail(user);
    if (email) return email;
    return fallback;
};