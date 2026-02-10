import {
    applicationDefault,
    cert,
    getApp,
    getApps,
    initializeApp,
    type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let firestoreInstance: Firestore | null = null;

const getServiceAccountConfig = () => {
    const projectId = process.env.NEXT_FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.NEXT_FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.NEXT_FIREBASE_ADMIN_PRIVATE_KEY?.replace(
        /\\n/g,
        "\n"
    );

    if (!projectId || !clientEmail || !privateKey) return null;
    return { projectId, clientEmail, privateKey };
};

export const getAdminApp = (): App => {
    if (getApps().length) return getApp();

    const serviceAccount = getServiceAccountConfig();
    if (serviceAccount) {
        return initializeApp({
            credential: cert(serviceAccount),
        });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
        throw new Error("Server authentication is not configured.");
    }

    return initializeApp({
        credential: applicationDefault(),
        projectId,
    });
};

export const getAdminFirestore = () => {
    if (firestoreInstance) return firestoreInstance;

    const app = getAdminApp();
    firestoreInstance = getFirestore(app);
    return firestoreInstance;
};
