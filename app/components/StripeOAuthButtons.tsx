'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface StripeOAuthButtonsProps {
  isConnected?: boolean;
  accountName?: string;
}

export function StripeOAuthButtons({
  isConnected = false,
  accountName,
}: StripeOAuthButtonsProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const LIVE_OAUTH_URL = process.env.NEXT_PUBLIC_STRIPE_LIVE_OAUTH_URL;
  const SANDBOX_OAUTH_URL = process.env.NEXT_PUBLIC_STRIPE_SANDBOX_OAUTH_URL;

  if (!LIVE_OAUTH_URL || !SANDBOX_OAUTH_URL) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-700 text-sm font-medium">
          ❌ OAuth URLs not configured. Check environment variables.
        </p>
      </div>
    );
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Stripe account?')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/disconnect', {
        method: 'GET',
        headers: {
          // Adjust this based on your auth implementation
          'authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Disconnect failed');
      }

      // Reload to reflect changes
      router.refresh();
      window.location.reload();
    } catch (error) {
      console.error('Disconnect error:', error);
      alert(`Failed to disconnect: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-lg">
      {isConnected ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">
                ✓ Stripe Connected
              </p>
              {accountName && (
                <p className="text-xs text-gray-600 mt-1">{accountName}</p>
              )}
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <a href={LIVE_OAUTH_URL} target="_blank" rel="noopener noreferrer">
                Connect Live Stripe
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={SANDBOX_OAUTH_URL} target="_blank" rel="noopener noreferrer">
                Connect Sandbox Stripe
              </a>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
