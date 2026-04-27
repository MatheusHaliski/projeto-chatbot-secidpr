import { NextRequest, NextResponse } from "next/server";

import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import type { CustomerRecord } from "@/app/lib/hubModels";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ restaurantId: string }> }
): Promise<Response> {
    try {
        const { restaurantId } = await params;
        const loyaltyTier = request.nextUrl.searchParams.get("loyaltyTier");
        const db = getAdminFirestore();

        let query: FirebaseFirestore.Query = db
            .collection("restaurants")
            .doc(restaurantId)
            .collection("customers");

        if (loyaltyTier) {
            query = query.where("loyaltyTier", "==", loyaltyTier);
        }

        const snapshot = await query.orderBy("totalSpend", "desc").limit(100).get();
        const customers = snapshot.docs.map((doc) => ({
            uid: doc.id,
            ...(doc.data() as Omit<CustomerRecord, "uid">),
        }));

        return NextResponse.json({ customers });
    } catch (error) {
        console.error("[Customers API] unable to load customers", error);
        return NextResponse.json({ error: "Unable to load customers." }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ restaurantId: string }> }
): Promise<Response> {
    try {
        const { restaurantId } = await params;
        const payload = (await request.json()) as Partial<CustomerRecord> & { uid: string };

        if (!payload.uid) {
            return NextResponse.json({ error: "uid is required." }, { status: 400 });
        }

        const customer: CustomerRecord = {
            uid: payload.uid,
            displayName: payload.displayName,
            email: payload.email,
            phone: payload.phone,
            loyaltyTier: payload.loyaltyTier ?? "Bronze",
            totalOrders: payload.totalOrders ?? 0,
            totalSpend: payload.totalSpend ?? 0,
            tags: payload.tags ?? [],
            lastVisitAt: payload.lastVisitAt,
        };

        await getAdminFirestore()
            .collection("restaurants")
            .doc(restaurantId)
            .collection("customers")
            .doc(customer.uid)
            .set(customer, { merge: true });

        return NextResponse.json({ ok: true, customer });
    } catch (error) {
        console.error("[Customers API] unable to upsert customer", error);
        return NextResponse.json({ error: "Unable to save customer." }, { status: 500 });
    }
}
