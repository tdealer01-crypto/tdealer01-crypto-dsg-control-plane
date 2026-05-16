'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function RefTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('ref');
    if (!code) return;
    fetch('/api/referrals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    }).catch(() => null);
  }, [searchParams]);

  return null;
}
