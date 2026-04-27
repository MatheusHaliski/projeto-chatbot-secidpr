import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { getAdminFirestore } from "@/app/lib/firebaseAdmin";

const verifyWebhookHmac = (rawBody: string, receivedHmac: string | null): boolean => {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!secret || !receivedHmac) return false;

    const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");

    const expected = Buffer.from(digest);
    const incoming = Buffer.from(receivedHmac);
    if (expected.length !== incoming.length) {
        return false;
    }

    return crypto.timingSafeEqual(expected, incoming);
};

export async function POST(request: NextRequest): Promise<Response> {
    const rawBody = await request.text();
    const hmac = request.headers.get("x-shopify-hmac-sha256");

    if (!verifyWebhookHmac(rawBody, hmac)) {
        return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }

    const topic = request.headers.get("x-shopify-topic") ?? "unknown";
    const shopDomain = request.headers.get("x-shopify-shop-domain") ?? "unknown";
    const restaurantId = request.nextUrl.searchParams.get("restaurantId") ?? "default";

    try {
        const payload = JSON.parse(rawBody) as Record<string, unknown>;
        const eventId = request.headers.get("x-shopify-webhook-id") ?? crypto.randomUUID();

        await getAdminFirestore()
            .collection("restaurants")
            .doc(restaurantId)
            .collection("integrations")
            .doc("shopify")
            .collection("events")
            .doc(eventId)
            .set({
                topic,
                shopDomain,
                payload,
                receivedAt: Date.now(),
            });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[Shopify Webhook] unable to process", error);
        return NextResponse.json({ error: "Unable to process webhook." }, { status: 500 });
    }
}
