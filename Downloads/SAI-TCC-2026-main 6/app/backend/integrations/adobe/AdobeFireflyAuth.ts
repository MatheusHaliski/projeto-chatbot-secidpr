const TOKEN_ENDPOINT = 'https://ims-na1.adobelogin.com/ims/token/v3';

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;
let inflightTokenRequest: Promise<string> | null = null;

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing configuration: ${name}`);
  }
  return value;
}

async function requestAccessToken(): Promise<string> {
  const clientId = getRequiredEnv('ADOBE_FIREFLY_CLIENT_ID');
  const clientSecret = getRequiredEnv('ADOBE_FIREFLY_CLIENT_SECRET');
  const scopes = getRequiredEnv('ADOBE_FIREFLY_SCOPES');

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: scopes,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const payload = (await response.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error_description?: string }
    | null;

  if (!response.ok || !payload?.access_token) {
    const message = payload?.error_description || 'Unable to acquire Adobe token.';
    throw new Error(message);
  }

  const now = Date.now();
  const expiresInMs = Math.max(60, Number(payload.expires_in ?? 300)) * 1000;
  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: now + expiresInMs - 60_000,
  };

  return payload.access_token;
}

export async function getValidAdobeAccessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  if (!inflightTokenRequest) {
    inflightTokenRequest = requestAccessToken().finally(() => {
      inflightTokenRequest = null;
    });
  }

  return inflightTokenRequest;
}
