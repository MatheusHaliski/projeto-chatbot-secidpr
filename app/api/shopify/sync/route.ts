import { NextRequest, NextResponse } from "next/server";

import { getAdminFirestore } from "@/app/lib/firebaseAdmin";

export async function POST(request: NextRequest): Promise<Response> {
    try {
        const payload = (await request.json()) as {
            restaurantId: string;
            fullSync?: boolean;
            requestedByUid?: string;
        };

        if (!payload.restaurantId) {
            return NextResponse.json({ error: "restaurantId is required." }, { status: 400 });
        }

        const syncJob = {
            type: payload.fullSync ? "full" : "incremental",
            status: "queued",
            requestedByUid: payload.requestedByUid ?? null,
            createdAt: Date.now(),
        };

        const ref = await getAdminFirestore()
            .collection("restaurants")
            .doc(payload.restaurantId)
            .collection("integrations")
            .doc("shopify")
            .collection("syncJobs")
            .add(syncJob);

        return NextResponse.json({ ok: true, syncJobId: ref.id, syncJob });
    } catch (error) {
        console.error("[Shopify Sync] unable to enqueue sync", error);
        return NextResponse.json({ error: "Unable to queue Shopify sync." }, { status: 500 });
    }
}
