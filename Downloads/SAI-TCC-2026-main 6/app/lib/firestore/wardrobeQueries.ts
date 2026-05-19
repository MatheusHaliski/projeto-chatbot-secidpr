import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Firestore,
  QueryDocumentSnapshot,
  Timestamp,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore';

const COLLECTION = 'sai-wardrobeItems';
const DEFAULT_LIMIT = 24;

export type WardrobeItem = {
  id: string;
  userId: string;
  createdAt: Timestamp;
  piece_type: string;
  brand_id: string;
  market_id: string;
  gender: string;
  status: 'active' | 'processing' | 'archived';
};

export function buildUserWardrobeQuery(db: Firestore, userId: string, pageSize = DEFAULT_LIMIT) {
  return query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  );
}

export function buildUserWardrobePaginationQuery(
  db: Firestore,
  userId: string,
  lastDoc: QueryDocumentSnapshot,
  pageSize = DEFAULT_LIMIT,
) {
  return query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    startAfter(lastDoc),
    limit(pageSize),
  );
}

export function buildTypeFilterQuery(db: Firestore, userId: string, selectedType: string, pageSize = DEFAULT_LIMIT) {
  return query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    where('piece_type', '==', selectedType),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  );
}

export function buildBrandFilterQuery(db: Firestore, brandId: string, pageSize = DEFAULT_LIMIT) {
  return query(
    collection(db, COLLECTION),
    where('brand_id', '==', brandId),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  );
}

export function buildMarketGenderQuery(db: Firestore, marketId: string, gender: string, pageSize = DEFAULT_LIMIT) {
  return query(
    collection(db, COLLECTION),
    where('market_id', '==', marketId),
    where('gender', '==', gender),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  );
}

function mapWardrobeDoc(doc: QueryDocumentSnapshot): WardrobeItem {
  const data = doc.data() as Omit<WardrobeItem, 'id'>;
  return {
    id: doc.id,
    ...data,
  };
}

export function useUserWardrobe(db: Firestore, userId: string) {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot | null>(null);

  const baseQuery = useMemo(() => buildUserWardrobeQuery(db, userId), [db, userId]);

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const snapshot = await getDocs(baseQuery);
      const nextItems = snapshot.docs.map(mapWardrobeDoc);
      setItems(nextItems);
      lastDocRef.current = snapshot.docs.at(-1) ?? null;
      setHasMore(snapshot.docs.length === DEFAULT_LIMIT);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed_to_load_wardrobe');
    } finally {
      setIsLoading(false);
    }
  }, [baseQuery]);

  const loadMore = useCallback(async () => {
    if (!lastDocRef.current || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    try {
      const nextQuery = buildUserWardrobePaginationQuery(db, userId, lastDocRef.current);
      const snapshot = await getDocs(nextQuery);
      const nextItems = snapshot.docs.map(mapWardrobeDoc);
      setItems((prev) => [...prev, ...nextItems]);
      lastDocRef.current = snapshot.docs.at(-1) ?? lastDocRef.current;
      setHasMore(snapshot.docs.length === DEFAULT_LIMIT);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed_to_load_more_wardrobe');
    } finally {
      setIsLoadingMore(false);
    }
  }, [db, hasMore, isLoadingMore, userId]);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setHasMore(false);
      lastDocRef.current = null;
      return;
    }
    void loadInitial();
  }, [loadInitial, userId]);

  return {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    lastDoc: lastDocRef.current,
    loadInitial,
    loadMore,
  };
}
