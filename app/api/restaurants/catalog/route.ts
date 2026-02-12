import { NextRequest, NextResponse } from "next/server";

import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import type { Restaurant } from "@/app/gate/restaurantpagegate";

export async function GET(_request: NextRequest): Promise<Response> {
    try {
        const db = getAdminFirestore();
        const snapshot = await db
            .collection("restaurants")
            .select(
                "name",
                "photo",
                "photoPath",
                "imagePath",
                "storagePath",
                "categories",
                "category",
                "rating",
                "starsgiven",
                "country",
                "state",
                "city",
                "address",
                "street"
            )
            .get();

        const catalog = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Partial<Restaurant>),
        }));

        return NextResponse.json({ catalog });
    } catch (error) {
        console.error("[Restaurants Catalog API] load failed:", error);
        return NextResponse.json(
            { error: "Unable to load restaurant catalog." },
            { status: 500 }
        );
    }
}
