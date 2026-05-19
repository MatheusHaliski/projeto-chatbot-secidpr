'use client';

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

type DiscoverySearchContextValue = {
  query: string;
  debouncedQuery: string;
  setQuery: (value: string) => void;
};

const DiscoverySearchContext = createContext<DiscoverySearchContextValue | null>(null);

export function DiscoverySearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const value = useMemo(
    () => ({ query, debouncedQuery, setQuery }),
    [query, debouncedQuery],
  );

  return <DiscoverySearchContext.Provider value={value}>{children}</DiscoverySearchContext.Provider>;
}

export function useDiscoverySearch() {
  const context = useContext(DiscoverySearchContext);
  if (!context) {
    return {
      query: '',
      debouncedQuery: '',
      setQuery: () => {},
    } satisfies DiscoverySearchContextValue;
  }

  return context;
}
