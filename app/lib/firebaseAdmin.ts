import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

const getOrInitAdminApp = () => {
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
        });
    }

    return getApps()[0];
};

export const getAdminFirestore = () => {
    if (firestoreInstance) return firestoreInstance;

    const app = getOrInitAdminApp();
    firestoreInstance = getFirestore(app);
    return firestoreInstance;
};

export const getAdminAuth = () => {
    if (authInstance) return authInstance;

    const app = getOrInitAdminApp();
    authInstance = getAuth(app);
    return authInstance;
};
