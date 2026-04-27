import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { getAdminFirestore } from "@/app/lib/firebaseAdmin";

export async function POST(request: NextRequest): Promise<Response> {
    try {
        const payload = (await request.json()) as {
            restaurantId: string;
            customerUid: string;
            conversationId?: string;
            lineItems: Array<{ variantId: string; quantity: number }>;
            idempotencyKey?: string;
        };

        if (!payload.restaurantId || !payload.customerUid || !payload.lineItems?.length) {
            return NextResponse.json(
                { error: "restaurantId, customerUid and lineItems are required." },
                { status: 400 }
            );
        }

        const idempotencyKey = payload.idempotencyKey ?? crypto.randomUUID();
        const idempotencyDoc = getAdminFirestore()
            .collection("restaurants")
            .doc(payload.restaurantId)
            .collection("idempotency")
            .doc(idempotencyKey);

        const existing = await idempotencyDoc.get();
        if (existing.exists) {
            return NextResponse.json({ ok: true, duplicate: true, orderId: existing.data()?.orderId });
        }

        const orderRecord = {
            customerUid: payload.customerUid,
            conversationId: payload.conversationId ?? null,
            lineItems: payload.lineItems,
            source: "social_post",
            status: "pending_checkout",
            createdAt: Date.now(),
            shopify: {
                checkoutUrl: process.env.SHOPIFY_CHECKOUT_URL ?? null,
            },
        };

        const orderRef = await getAdminFirestore()
            .collection("restaurants")
            .doc(payload.restaurantId)
            .collection("orders")
            .add(orderRecord);

        await idempotencyDoc.set({
            orderId: orderRef.id,
            createdAt: Date.now(),
        });

        return NextResponse.json({
            ok: true,
            orderId: orderRef.id,
            checkoutUrl: orderRecord.shopify.checkoutUrl,
            idempotencyKey,
        });
    } catch (error) {
        console.error("[Create Order] unable to create order", error);
        return NextResponse.json({ error: "Unable to create order." }, { status: 500 });
    }
}
