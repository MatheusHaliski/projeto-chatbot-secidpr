"use client";

import { getFirestore, type Firestore } from "firebase/firestore/lite";
import { firebaseAuthGate } from "@/app/gate/firebaseClient"; // ajuste se necessário

let _db: Firestore | null = null;

export function getDb(): Firestore | null {
    // blindagem extra (caso algum import rode no server por acidente)
    if (typeof window === "undefined") return null;

    if (_db) return _db;

    const { firebaseApp, hasFirebaseConfig } = firebaseAuthGate();
    if (!firebaseApp || !hasFirebaseConfig) return null;

    _db = getFirestore(firebaseApp);
    return _db;
}
export function getDbOrThrow(): Firestore {
    const db = getDb();
    if (!db) {
        throw new Error("Firestore unavailable: firebase app not configured or running outside client.");
    }
    return db;
}
