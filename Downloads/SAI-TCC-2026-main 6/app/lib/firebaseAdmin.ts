import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let firestoreInstance: Firestore | null = null;

export const getAdminFirestore = () => {
    if (firestoreInstance) return firestoreInstance;

    const projectId = process.env.NEXT_FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.NEXT_FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.NEXT_FIREBASE_ADMIN_PRIVATE_KEY?.replace(
        /\\n/g,
        "\n"
    );

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error("Server authentication is not configured.");
    }

    if (!getApps().length) {
        initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey,
            }),
            storageBucket:
                process.env.NEXT_FIREBASE_ADMIN_STORAGE_BUCKET ??
                process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
    }

    firestoreInstance = getFirestore();
    const databaseId = process.env.NEXT_FIREBASE_DATABASE_ID || 'newsaidb';
    firestoreInstance.settings({ databaseId });

    return firestoreInstance;
};

export const adminDb = new Proxy({} as Firestore, {
    get(_target, property, receiver) {
        return Reflect.get(getAdminFirestore() as object, property, receiver);
    },
});

export const getAdminStorageBucket = () => {
    getAdminFirestore();
    const app = getApp();
    const bucket = getStorage(app).bucket();
    if (!bucket.name) {
        throw new Error("Storage bucket is not configured.");
    }
    return bucket;
};
