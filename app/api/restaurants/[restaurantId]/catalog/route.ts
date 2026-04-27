import { NextRequest, NextResponse } from "next/server";

import { getAdminFirestore } from "@/app/lib/firebaseAdmin";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ restaurantId: string }> }
): Promise<Response> {
    try {
        const { restaurantId } = await params;
        const snapshot = await getAdminFirestore()
            .collection("restaurants")
            .doc(restaurantId)
            .collection("catalog")
            .orderBy("title")
            .limit(200)
            .get();

        const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json({ items });
    } catch (error) {
        console.error("[Catalog API] unable to load catalog", error);
        return NextResponse.json({ error: "Unable to load catalog." }, { status: 500 });
    }
}
