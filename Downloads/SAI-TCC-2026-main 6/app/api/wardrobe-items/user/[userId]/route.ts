import { WardrobeController } from '@/app/backend/controllers/WardrobeController';
import { ServiceError } from '@/app/backend/services/errors';
import { getApps } from 'firebase-admin/app';
import { NextResponse } from 'next/server';

const wardrobeController = new WardrobeController();
const WARDROBE_ITEMS_COLLECTION = 'sai-wardrobeItems';
const INDEX_URL_REGEX = /(https:\/\/console\.firebase\.google\.com\/[^\s]+)/i;

type ParsedRequestParams = {
  userId: string;
  status: 'active' | 'processing' | 'archived';
  limit: number;
  pieceType?: string;
  cursorCreatedAt?: string;
};

function parseRequest(request: Request, userIdParam: string): ParsedRequestParams {
  const { searchParams } = new URL(request.url);
  const requestedStatus = searchParams.get('status');
  const status = requestedStatus === 'processing' || requestedStatus === 'archived' ? requestedStatus : 'active';
  const requestedLimit = Number(searchParams.get('limit') ?? 24);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, Math.floor(requestedLimit))) : 24;

  return {
    userId: String(userIdParam ?? '').trim(),
    status,
    limit,
    pieceType: searchParams.get('piece_type') ?? undefined,
    cursorCreatedAt: searchParams.get('cursor') ?? undefined,
  };
}

function extractIndexUrl(message?: string): string | null {
  if (!message) return null;
  const match = message.match(INDEX_URL_REGEX);
  return match?.[1] ?? null;
}

function isFirestoreMissingIndexError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: unknown; message?: unknown };
  const code = typeof maybeError.code === 'number' ? maybeError.code : null;
  const message = typeof maybeError.message === 'string' ? maybeError.message.toLowerCase() : '';
  return code === 9 || message.includes('failed-precondition') || message.includes('requires an index');
}

function normalizeError(error: unknown) {
  if (error instanceof ServiceError) {
    return {
      status: error.statusCode,
      payload: { ok: false, errorCode: 'SERVICE_ERROR', message: error.message },
    };
  }

  const maybeError = error as { code?: unknown; message?: unknown; stack?: unknown } | null;
  const rawCode = maybeError && 'code' in maybeError ? maybeError.code : undefined;
  const errorCode = typeof rawCode === 'string' || typeof rawCode === 'number' ? String(rawCode) : 'INTERNAL_ERROR';
  const message = typeof maybeError?.message === 'string' && maybeError.message.trim().length > 0
    ? maybeError.message
    : 'Unexpected server error while loading wardrobe items.';
  const indexUrl = extractIndexUrl(message);
  const isDev = process.env.NODE_ENV !== 'production';

  if (isFirestoreMissingIndexError(error) && isDev) {
    return {
      status: 500,
      payload: {
        ok: false,
        errorCode: 'FIRESTORE_MISSING_INDEX',
        message: 'Firestore requires a composite index for this query.',
        indexUrl,
        requiredCompositeIndex: {
          collection: WARDROBE_ITEMS_COLLECTION,
          fields: ['userId Ascending', 'status Ascending', 'createdAt Descending'],
        },
      },
    };
  }

  return {
    status: 500,
    payload: { ok: false, errorCode, message },
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const parsed = parseRequest(request, userId);

    console.info('[wardrobe-items/user] incoming request', {
      userId: parsed.userId,
      status: parsed.status,
      limit: parsed.limit,
      pieceType: parsed.pieceType ?? null,
      cursorCreatedAt: parsed.cursorCreatedAt ?? null,
      firebaseAdminInitialized: getApps().length > 0,
      firestoreCollection: WARDROBE_ITEMS_COLLECTION,
      queryFieldsUsed: [
        'where(userId == userId)',
        'where(status == status)',
        'orderBy(createdAt desc)',
        `limit(${parsed.limit})`,
      ],
    });

    const data = await wardrobeController.listByUser(parsed.userId, {
      status: parsed.status,
      piece_type: parsed.pieceType,
      cursorCreatedAt: parsed.cursorCreatedAt,
      limit: parsed.limit,
    });
    return NextResponse.json(data);
  } catch (error) {
    const normalized = normalizeError(error);
    const maybeError = error as { code?: unknown; message?: unknown; stack?: unknown } | null;
    const errorCode = typeof maybeError?.code === 'string' || typeof maybeError?.code === 'number'
      ? String(maybeError.code)
      : 'INTERNAL_ERROR';
    const errorMessage = typeof maybeError?.message === 'string' ? maybeError.message : 'Unknown error';
    const errorStack = typeof maybeError?.stack === 'string' ? maybeError.stack : null;
    const indexUrl = extractIndexUrl(errorMessage);

    console.error('[wardrobe-items/user] request failed', {
      errorCode,
      message: errorMessage,
      stack: errorStack,
      isFirestoreMissingIndexError: isFirestoreMissingIndexError(error),
      indexUrl,
      firebaseAdminInitialized: getApps().length > 0,
      firestoreCollection: WARDROBE_ITEMS_COLLECTION,
    });

    return NextResponse.json(normalized.payload, { status: normalized.status });
  }
}
