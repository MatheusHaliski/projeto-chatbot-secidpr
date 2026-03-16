import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

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
        });
    }

    firestoreInstance = getFirestore();
    return firestoreInstance;
};