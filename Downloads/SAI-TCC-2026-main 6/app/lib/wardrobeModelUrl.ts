export interface WardrobeModelUrlFields {
  model_3d_url?: string | null;
  model_branded_3d_url?: string | null;
  model_base_3d_url?: string | null;
}

function isRenderableHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function normalizeUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('file://')) return null;
  return isRenderableHttpUrl(trimmed) ? trimmed : null;
}

export function resolveWardrobeModelUrl(item: WardrobeModelUrlFields): string | null {
  return (
    normalizeUrl(item.model_3d_url)
    ?? normalizeUrl(item.model_branded_3d_url)
    ?? normalizeUrl(item.model_base_3d_url)
    ?? null
  );
}

export function resolveWardrobeModelCandidateUrls(item: WardrobeModelUrlFields): string[] {
  const candidates = [
    normalizeUrl(item.model_3d_url),
    normalizeUrl(item.model_branded_3d_url),
    normalizeUrl(item.model_base_3d_url),
  ].filter((url): url is string => Boolean(url));

  return [...new Set(candidates)];
}
