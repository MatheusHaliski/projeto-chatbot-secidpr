import { NextRequest, NextResponse } from "next/server";

import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import type { ConversationStatus } from "@/app/lib/hubModels";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ restaurantId: string; conversationId: string }> }
): Promise<Response> {
    try {
        const { restaurantId, conversationId } = await params;
        const payload = (await request.json()) as {
            assignedToUid?: string | null;
            status?: ConversationStatus;
            lastMessage?: string;
        };

        const updates: Record<string, unknown> = {
            updatedAt: Date.now(),
        };

        if (typeof payload.assignedToUid !== "undefined") {
            updates.assignedToUid = payload.assignedToUid;
            updates.status = payload.assignedToUid ? "assigned" : "new";
        }

        if (payload.status) {
            updates.status = payload.status;
        }

        if (payload.lastMessage) {
            updates.lastMessage = payload.lastMessage;
        }

        await getAdminFirestore()
            .collection("restaurants")
            .doc(restaurantId)
            .collection("conversations")
            .doc(conversationId)
            .set(updates, { merge: true });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[Conversation API] unable to patch", error);
        return NextResponse.json({ error: "Unable to update conversation." }, { status: 500 });
    }
}
