"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

export type FirebaseGate = {
    firebaseApp: FirebaseApp | null;
    hasFirebaseConfig: boolean;
};

export function firebaseAuthGate(): FirebaseGate {
    // blindagem extra (caso algum import aconteça fora do client)
    if (typeof window === "undefined") {
        return { firebaseApp: null, hasFirebaseConfig: false };
    }

    const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
    };

    const hasFirebaseConfig = Boolean(
        firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId
    );

    const firebaseApp =
        getApps().length > 0
            ? getApps()[0]!
            : hasFirebaseConfig
                ? initializeApp(firebaseConfig)
                : null;

    return { firebaseApp, hasFirebaseConfig };
}
