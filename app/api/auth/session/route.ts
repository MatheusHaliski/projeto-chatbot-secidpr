import { NextRequest, NextResponse } from "next/server";
import {
    clearSessionCookie,
    createSessionToken,
    readSession,
    setSessionCookie,
} from "@/app/lib/serverSession";

export async function GET(request: NextRequest): Promise<Response> {
    const session = readSession(request);
    if (!session) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    const refreshed = createSessionToken({
        sub: session.sub,
        email: session.email,
    });

    const response = NextResponse.json({
        ok: true,
        profile: { email: session.email },
    });
    setSessionCookie(response, refreshed);
    return response;
}

export async function DELETE(): Promise<Response> {
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
}
