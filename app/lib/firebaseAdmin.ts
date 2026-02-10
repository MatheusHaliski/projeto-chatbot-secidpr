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

const parsePrivateKey = (rawPrivateKey?: string) => {
    if (!rawPrivateKey) return null;

    const normalized = rawPrivateKey
        .trim()
        .replace(/^['\"]|['\"]$/g, "")
        .replace(/\\n/g, "\n");

    if (normalized.includes("BEGIN PRIVATE KEY")) {
        return normalized;
    }

    try {
        const decoded = Buffer.from(normalized, "base64").toString("utf8").trim();
        if (decoded.includes("BEGIN PRIVATE KEY")) {
            return decoded;
        }
    } catch {
        // noop: when key isn't base64-encoded we keep the normalized value.
    }

    return normalized;
};

const getServiceAccountConfig = () => {
    const projectId = process.env.NEXT_FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.NEXT_FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = parsePrivateKey(process.env.NEXT_FIREBASE_ADMIN_PRIVATE_KEY);

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
