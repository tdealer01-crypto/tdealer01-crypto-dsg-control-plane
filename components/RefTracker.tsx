'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function RefTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('ref');
    if (!code) return;

    // Persist the referral code in a cookie so signup/lead flows can attribute it
    document.cookie = `ref_code=${encodeURIComponent(code)};path=/;max-age=${60 * 60 * 24 * 30};SameSite=Lax`;

    fetch('/api/referrals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    }).catch(() => null);
  }, [searchParams]);

  return null;
}
