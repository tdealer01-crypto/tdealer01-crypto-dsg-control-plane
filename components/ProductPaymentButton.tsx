'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface ProductPaymentProps {
  productId: string;
  productName: string;
  price: number;
  onSuccess?: () => void;
}

export function ProductPaymentButton({ productId, productName, price, onSuccess }: ProductPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckout = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/marketplace/products/${productId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start checkout');
      }

      const data = await response.json();

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Checkout failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[rgba(225,6,0,0.15)] border border-[rgba(225,6,0,0.35)] text-red-200 text-sm">
          {error}
        </div>
      )}

      <Button
        onClick={handleCheckout}
        disabled={isLoading}
        variant="primary"
        size="lg"
        className="w-full"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          <>Buy Now — ${price.toFixed(2)}</>
        )}
      </Button>
    </div>
  );
}
