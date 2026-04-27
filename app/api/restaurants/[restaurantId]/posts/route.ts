import { NextRequest, NextResponse } from "next/server";

import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import type { SocialPostRecord } from "@/app/lib/hubModels";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ restaurantId: string }> }
): Promise<Response> {
    try {
        const { restaurantId } = await params;
        const snapshot = await getAdminFirestore()
            .collection("restaurants")
            .doc(restaurantId)
            .collection("posts")
            .orderBy("createdAt", "desc")
            .limit(50)
            .get();

        const posts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<SocialPostRecord, "id">),
        }));

        return NextResponse.json({ posts });
    } catch (error) {
        console.error("[Posts API] unable to load posts", error);
        return NextResponse.json({ error: "Unable to load posts." }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ restaurantId: string }> }
): Promise<Response> {
    try {
        const { restaurantId } = await params;
        const payload = (await request.json()) as Partial<SocialPostRecord>;

        if (!payload.authorUid || !payload.body || !payload.type || !payload.category) {
            return NextResponse.json(
                { error: "authorUid, body, type and category are required." },
                { status: 400 }
            );
        }

        const now = Date.now();
        const post: SocialPostRecord = {
            restaurantId,
            authorUid: payload.authorUid,
            type: payload.type,
            category: payload.category,
            body: payload.body,
            mediaUrl: payload.mediaUrl,
            pollOptions: payload.pollOptions,
            shoppableCta: payload.shoppableCta,
            createdAt: now,
            updatedAt: now,
        };

        const doc = await getAdminFirestore()
            .collection("restaurants")
            .doc(restaurantId)
            .collection("posts")
            .add(post);

        return NextResponse.json({ ok: true, id: doc.id, post });
    } catch (error) {
        console.error("[Posts API] unable to create post", error);
        return NextResponse.json({ error: "Unable to create post." }, { status: 500 });
    }
}
