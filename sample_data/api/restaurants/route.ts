import { NextRequest, NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import type { Restaurant } from "@/app/gate/restaurantpagegate";

export async function GET(request: NextRequest): Promise<Response> {
    try {
        const { searchParams } = new URL(request.url);
        const limitParam = Number(searchParams.get("limit") ?? "20");
        const limitValue = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 20;
        const cursor = searchParams.get("cursor");

        const db = getAdminFirestore();
        let query = db
            .collection("restaurants")
            .orderBy(FieldPath.documentId())
            .limit(limitValue);

        if (cursor) {
            query = query.startAfter(cursor);
        }

        const snapshot = await query.get();
        const restaurants = snapshot.docs.map((doc) => ({
            ...(doc.data() as Restaurant),
            id: doc.id,
        }));
        const lastDoc = snapshot.docs.at(-1);
        const nextCursor = snapshot.docs.length === limitValue ? lastDoc?.id ?? null : null;
        return NextResponse.json({ restaurants, nextCursor });
    } catch (error) {
        console.error("[Restaurants API] load failed:", error);
        return NextResponse.json(
            { error: "Unable to load restaurants." },
            { status: 500 }
        );
    }
}
