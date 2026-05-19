import { NextResponse } from "next/server";
import { getGoogleOAuthDiagnostics } from "@/app/lib/googleOAuthConfig";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const diagnostics = getGoogleOAuthDiagnostics();

  return NextResponse.json({
    googleClientIdPresent: diagnostics.googleClientIdPresent,
    clientIdLength: diagnostics.clientIdLength,
    environment: diagnostics.environment,
  });
}
