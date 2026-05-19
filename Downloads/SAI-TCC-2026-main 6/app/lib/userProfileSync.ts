import { FieldValue, type Firestore } from "firebase-admin/firestore";

const USER_COLLECTION = "sai-usercontrol";

export type SyncUserProfileInput = {
    uid: string;
    email: string;
    displayName?: string;
    provider: "password" | "google" | "facebook" | "unknown";
    role?: string;
    status?: string;
    db: Firestore;
};

export const syncUserProfileFromAuth = async ({
    uid,
    email,
    displayName,
    provider,
    role = "user",
    status = "active",
    db,
}: SyncUserProfileInput) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedDisplayName = (displayName ?? "").trim();
    const userRef = db.collection(USER_COLLECTION).doc(uid);

    await userRef.set(
        {
            uid,
            user_id: uid,
            email: normalizedEmail,
            displayName: normalizedDisplayName,
            name: normalizedDisplayName,
            provider,
            role,
            status,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
    );

    const snapshot = await userRef.get();
    return snapshot.data() ?? null;
};
