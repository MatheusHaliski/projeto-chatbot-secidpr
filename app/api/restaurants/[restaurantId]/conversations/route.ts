import { NextRequest, NextResponse } from "next/server";

import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import type { ConversationRecord } from "@/app/lib/hubModels";
import { getSlaDueAt, inferIntent } from "@/app/lib/triage";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ restaurantId: string }> }
): Promise<Response> {
    try {
        const { restaurantId } = await params;
        const status = request.nextUrl.searchParams.get("status");

        let query: FirebaseFirestore.Query = getAdminFirestore()
            .collection("restaurants")
            .doc(restaurantId)
            .collection("conversations");

        if (status) {
            query = query.where("status", "==", status);
        }

        const snapshot = await query.orderBy("updatedAt", "desc").limit(100).get();

        const conversations = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<ConversationRecord, "id">),
        }));

        return NextResponse.json({ conversations });
    } catch (error) {
        console.error("[Conversations API] unable to load", error);
        return NextResponse.json({ error: "Unable to load conversations." }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ restaurantId: string }> }
): Promise<Response> {
    try {
        const { restaurantId } = await params;
        const payload = (await request.json()) as {
            clientUid: string;
            message: string;
            channel?: ConversationRecord["channel"];
            priority?: ConversationRecord["priority"];
        };

        if (!payload.clientUid || !payload.message) {
            return NextResponse.json(
                { error: "clientUid and message are required." },
                { status: 400 }
            );
        }

        const createdAt = Date.now();
        const intent = inferIntent(payload.message);

        const conversation: Omit<ConversationRecord, "id"> = {
            restaurantId,
            clientUid: payload.clientUid,
            intent,
            status: "new",
            priority: payload.priority ?? "normal",
            assignedToUid: null,
            channel: payload.channel ?? "in_app",
            lastMessage: payload.message,
            createdAt,
            updatedAt: createdAt,
            dueAt: getSlaDueAt(intent, createdAt),
        };

        const docRef = await getAdminFirestore()
            .collection("restaurants")
            .doc(restaurantId)
            .collection("conversations")
            .add(conversation);

        return NextResponse.json({ ok: true, id: docRef.id, conversation });
    } catch (error) {
        console.error("[Conversations API] unable to create", error);
        return NextResponse.json({ error: "Unable to create conversation." }, { status: 500 });
    }
}
