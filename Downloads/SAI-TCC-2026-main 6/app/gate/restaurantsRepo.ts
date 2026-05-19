"use client";

import { collection, getDocs, type DocumentData } from "firebase/firestore/lite";
import { getDb } from "./getDb";

export async function listRestaurants(): Promise<(DocumentData & { id: string })[]> {
    const db = getDb();
    if (!db) throw new Error("Firestore is not configured.");

    const snapshot = await getDocs(collection(db, "restaurants"));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}
