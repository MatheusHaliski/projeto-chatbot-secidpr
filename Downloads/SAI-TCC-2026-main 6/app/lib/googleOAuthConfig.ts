export const GOOGLE_CLIENT_ID_ERROR_MESSAGE = "Missing or invalid GOOGLE_CLIENT_ID";

const GOOGLE_CLIENT_ID_PATTERN = /^[0-9]+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i;

export type GoogleOAuthDiagnostics = {
  googleClientIdPresent: boolean;
  clientIdLength: number;
  environment: "development" | "production";
  resolvedSource: "GOOGLE_CLIENT_ID" | "NEXT_PUBLIC_GOOGLE_CLIENT_ID" | "missing";
  serverClientIdMasked: string;
  publicClientIdMasked: string;
  idsMatch: boolean;
};

export function maskClientId(value: string): string {
  if (!value) return "";
  if (value.length <= 12) return `${value.slice(0, 2)}***${value.slice(-2)}`;
  return `${value.slice(0, 6)}***${value.slice(-6)}`;
}

export function isValidGoogleClientId(value: string): boolean {
  return GOOGLE_CLIENT_ID_PATTERN.test(value.trim());
}

export function getResolvedGoogleClientId(): {
  clientId: string;
  source: GoogleOAuthDiagnostics["resolvedSource"];
} {
  const serverClientId = (process.env.GOOGLE_CLIENT_ID ?? "").trim();
  const publicClientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim();

  if (serverClientId) {
    return { clientId: serverClientId, source: "GOOGLE_CLIENT_ID" };
  }

  if (publicClientId) {
    return { clientId: publicClientId, source: "NEXT_PUBLIC_GOOGLE_CLIENT_ID" };
  }

  return { clientId: "", source: "missing" };
}

export function assertValidGoogleClientId(): string {
  const { clientId } = getResolvedGoogleClientId();
  if (!isValidGoogleClientId(clientId)) {
    throw new Error(GOOGLE_CLIENT_ID_ERROR_MESSAGE);
  }
  return clientId;
}

export function getGoogleOAuthDiagnostics(): GoogleOAuthDiagnostics {
  const serverClientId = (process.env.GOOGLE_CLIENT_ID ?? "").trim();
  const publicClientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim();
  const { clientId, source } = getResolvedGoogleClientId();

  return {
    googleClientIdPresent: Boolean(clientId),
    clientIdLength: clientId.length,
    environment: process.env.NODE_ENV === "production" ? "production" : "development",
    resolvedSource: source,
    serverClientIdMasked: maskClientId(serverClientId),
    publicClientIdMasked: maskClientId(publicClientId),
    idsMatch: Boolean(serverClientId && publicClientId && serverClientId === publicClientId),
  };
}
