import { NextResponse } from 'next/server';

const MESHY_BASE_URL = 'https://api.meshy.ai/openapi/v1';

function isAllowedMeshyAsset(url: URL) {
  return url.protocol === 'https:' && (url.hostname === 'assets.meshy.ai' || url.hostname.endsWith('.meshy.ai'));
}

// Extract Meshy task ID from CDN URL path:
// https://assets.meshy.ai/<userId>/tasks/<taskId>/output/model.glb
function extractMeshyTaskId(url: URL): string | null {
  const match = url.pathname.match(/\/tasks\/([^/]+)\//);
  return match ? match[1] : null;
}

async function fetchFreshMeshyUrl(taskId: string, assetUrl: URL): Promise<string | null> {
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) {
    console.error('[model-proxy] MESHY_API_KEY is not set');
    return null;
  }
  const apiEndpoint = `${MESHY_BASE_URL}/image-to-3d/${taskId}`;
  const res = await fetch(apiEndpoint, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[model-proxy] Meshy API returned ${res.status} for task ${taskId}: ${body}`);
    return null;
  }
  const data = (await res.json()) as {
    model_urls?: { glb?: string };
    thumbnail_url?: string;
    preview_url?: string;
  };
  const isPreview = /\.(png|jpg|jpeg|webp)$/i.test(assetUrl.pathname);
  const freshUrl = isPreview
    ? (data.thumbnail_url ?? data.preview_url ?? null)
    : (data.model_urls?.glb ?? null);
  if (!freshUrl) {
    console.error(`[model-proxy] Meshy API response missing URL for task ${taskId} (isPreview=${isPreview}):`, JSON.stringify(data));
  }
  return freshUrl;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawAssetUrl = String(url.searchParams.get('url') ?? '').trim();
  if (!rawAssetUrl) {
    return NextResponse.json({ error: 'Missing url query parameter.' }, { status: 400 });
  }

  let parsedAssetUrl: URL;
  try {
    parsedAssetUrl = new URL(rawAssetUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid asset URL.' }, { status: 400 });
  }

  if (!isAllowedMeshyAsset(parsedAssetUrl)) {
    return NextResponse.json({ error: 'Only Meshy asset URLs are allowed.' }, { status: 403 });
  }

  let assetUrl = parsedAssetUrl.toString();
  let response = await fetch(assetUrl, { method: 'GET', cache: 'no-store' });

  // Signed CDN URLs expire — refresh via Meshy API on 403.
  if (response.status === 403) {
    const taskId = extractMeshyTaskId(parsedAssetUrl);
    if (taskId) {
      const freshUrl = await fetchFreshMeshyUrl(taskId, parsedAssetUrl);
      if (freshUrl) {
        assetUrl = freshUrl;
        response = await fetch(assetUrl, { method: 'GET', cache: 'no-store' });
      }
    }
  }

  if (!response.ok) {
    return NextResponse.json({ error: 'Failed to fetch model asset.' }, { status: response.status });
  }

  const body = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') ?? 'model/gltf-binary';

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
