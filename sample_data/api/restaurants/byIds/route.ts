import { NextRequest, NextResponse } from "next/server";

import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import type { Restaurant } from "@/app/gate/restaurantpagegate";

type ByIdsPayload = {
    ids?: string[];
};

export async function POST(request: NextRequest): Promise<Response> {
    try {
        const payload = (await request.json()) as ByIdsPayload;
        const ids = Array.isArray(payload?.ids)
            ? payload.ids.map((id) => String(id)).filter(Boolean)
            : [];

        if (!ids.length) {
            return NextResponse.json({ restaurants: [] });
        }

        const db = getAdminFirestore();
        const refs = ids.map((id) => db.collection("restaurants").doc(id));
        const snapshots = await db.getAll(...refs);

        const restaurants = snapshots
            .filter((snap) => snap.exists)
            .map((snap) => ({
                resid: snap.id,
                ...(snap.data() as Restaurant),
            }));

        return NextResponse.json({ restaurants });
    } catch (error) {
        console.error("[Restaurants ByIds API] load failed:", error);
        return NextResponse.json(
            { error: "Unable to load restaurant details." },
            { status: 500 }
        );
    }
}
