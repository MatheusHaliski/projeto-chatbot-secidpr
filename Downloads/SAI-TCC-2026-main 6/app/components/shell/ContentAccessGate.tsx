'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ensureSharedAccessToken } from '@/app/lib/accessTokenShare';

interface ContentAccessGateProps {
  children: ReactNode;
}

export default function ContentAccessGate({ children }: ContentAccessGateProps) {
  const router = useRouter();
  const hasAccess = Boolean(ensureSharedAccessToken());

  useEffect(() => {
    if (!hasAccess) {
      router.replace('/authview');
    }
  }, [hasAccess, router]);

  if (!hasAccess) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
        Checking access...
      </div>
    );
  }

  return <>{children}</>;
}
