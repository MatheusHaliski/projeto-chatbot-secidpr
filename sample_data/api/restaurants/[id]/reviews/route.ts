import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import { parseRatingValue } from "@/app/gate/restaurantpagegate";

export const runtime = "nodejs";

type ReviewPayload = {
  rating?: number;
  text?: string;
  userEmail?: string;
  userDisplayName?: string;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
  }

  let body: ReviewPayload = {};
  try {
    body = (await request.json()) as ReviewPayload;
  } catch {
    body = {};
  }

  const ratingValue = parseRatingValue(body.rating ?? 0);
  const text = body.text?.trim() ?? "";
  const userEmail = body.userEmail?.trim() ?? "";
  const userDisplayName = body.userDisplayName?.trim() || userEmail || "Anonymous";

  if (!text) {
    return NextResponse.json(
      { error: "Please add your commentary." },
      { status: 400 }
    );
  }

  if (ratingValue < 0 || ratingValue > 5) {
    return NextResponse.json(
      { error: "Invalid rating value." },
      { status: 400 }
    );
  }

  try {
    const db = getAdminFirestore();
    const createdAt = new Date().toISOString();

    const payload = {
      createdAt,
      grade: ratingValue,
      rating: ratingValue,
      restaurantId: id,
      text,
      timestamp: FieldValue.serverTimestamp(),
      userDisplayName,
      userEmail: userEmail || null,
    };

    const docRef = await db.collection("review").add(payload);

    const reviewSnapshot = await db
      .collection("review")
      .where("restaurantId", "==", id)
      .get();

    const total = reviewSnapshot.docs.reduce((sum, docItem) => {
      const data = docItem.data() as { rating?: number; grade?: number };
      return sum + parseRatingValue(data.rating ?? data.grade ?? 0);
    }, 0);

    const nextAvg = reviewSnapshot.size
      ? Number((total / reviewSnapshot.size).toFixed(2))
      : 0;

    await db.collection("restaurants").doc(id).update({
      rating: nextAvg,
      starsgiven: nextAvg,
    });

    return NextResponse.json({
      review: {
        id: docRef.id,
        createdAt,
        grade: ratingValue,
        rating: ratingValue,
        restaurantId: id,
        text,
        userDisplayName,
        userEmail: userEmail || undefined,
      },
      rating: nextAvg,
    });
  } catch (error) {
    console.error("[Restaurant Reviews API] submit failed:", error);
    return NextResponse.json(
      { error: "Unable to submit commentary right now." },
      { status: 500 }
    );
  }
}
