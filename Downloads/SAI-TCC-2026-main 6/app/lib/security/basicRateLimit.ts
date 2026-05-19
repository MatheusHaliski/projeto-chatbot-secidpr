type BucketState = {
    count: number;
    resetAt: number;
};

type RateLimitResult = {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
};

const STORAGE_KEY = "__basic_rate_limit_store__";

const getStore = (): Map<string, BucketState> => {
    const scopedGlobal = globalThis as typeof globalThis & {
        [STORAGE_KEY]?: Map<string, BucketState>;
    };

    if (!scopedGlobal[STORAGE_KEY]) {
        scopedGlobal[STORAGE_KEY] = new Map<string, BucketState>();
    }

    return scopedGlobal[STORAGE_KEY];
};

export const resolveClientIp = (request: Request): string => {
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        const first = forwardedFor.split(",")[0]?.trim();
        if (first) return first;
    }

    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;

    return "unknown";
};

export const consumeRateLimit = ({
    namespace,
    key,
    maxRequests,
    windowMs,
}: {
    namespace: string;
    key: string;
    maxRequests: number;
    windowMs: number;
}): RateLimitResult => {
    const safeMaxRequests = Math.max(1, Math.floor(maxRequests));
    const safeWindowMs = Math.max(1_000, Math.floor(windowMs));
    const now = Date.now();
    const bucketKey = `${namespace}:${key}`;
    const store = getStore();

    const existing = store.get(bucketKey);
    if (!existing || existing.resetAt <= now) {
        store.set(bucketKey, { count: 1, resetAt: now + safeWindowMs });
        return {
            allowed: true,
            remaining: safeMaxRequests - 1,
            retryAfterSeconds: Math.ceil(safeWindowMs / 1000),
        };
    }

    if (existing.count >= safeMaxRequests) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        };
    }

    existing.count += 1;
    store.set(bucketKey, existing);

    return {
        allowed: true,
        remaining: safeMaxRequests - existing.count,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
};
