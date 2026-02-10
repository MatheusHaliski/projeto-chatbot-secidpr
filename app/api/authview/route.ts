import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
    void request;
    return NextResponse.json(
        { error: "Use /api/auth/verify for authentication." },
        { status: 410 }
    );
}
