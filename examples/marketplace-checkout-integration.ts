/**
 * Marketplace Checkout Integration Example
 *
 * This example demonstrates how to integrate the POST /api/marketplace/seller-checkout
 * endpoint into a client application (React, Next.js, etc.).
 *
 * The endpoint handles:
 * 1. Z3 deterministic fee calculation
 * 2. Stripe Checkout Session creation with Stripe Connect transfer
 * 3. Transaction record storage in seller_transactions table
 * 4. Error handling and validation
 */

// ============================================================================
// 1. TypeScript Type Definitions
// ============================================================================

interface SellerCheckoutRequest {
  seller_id: string;
  product_name: string;
  amount_cents: number;
  customer_email: string;
}

interface SellerCheckoutResponse {
  checkout_url: string;
  session_id: string;
  z3_verification: string;
}

interface SellerCheckoutError {
  error: string;
  message?: string;
  details?: string[];
}

// ============================================================================
// 2. Client-Side Example (React/Next.js)
// ============================================================================

/**
 * Hook to initiate seller checkout
 */
export async function useSellerCheckout(
  apiBaseUrl: string = process.env.NEXT_PUBLIC_API_URL || '',
) {
  const initiateCheckout = async (
    request: SellerCheckoutRequest,
  ): Promise<{ success: boolean; data?: SellerCheckoutResponse; error?: SellerCheckoutError }> => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/marketplace/seller-checkout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        },
      );

      if (!response.ok) {
        const error: SellerCheckoutError = await response.json();
        return { success: false, error };
      }

      const data: SellerCheckoutResponse = await response.json();
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: {
          error: 'network_error',
          message: err instanceof Error ? err.message : 'Network request failed',
        },
      };
    }
  };

  return { initiateCheckout };
}

// ============================================================================
// 3. React Component Example
// ============================================================================

/**
 * Example React component for initiating seller checkout
 * (Uses Next.js App Router syntax)
 */
export function SellerCheckoutButton({
  sellerId,
  productName,
  priceUSD,
  customerEmail,
  onSuccess,
  onError,
}: {
  sellerId: string;
  productName: string;
  priceUSD: number;
  customerEmail: string;
  onSuccess: (checkout: SellerCheckoutResponse) => void;
  onError: (error: SellerCheckoutError) => void;
}) {
  const [loading, setLoading] = React.useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const amountCents = Math.round(priceUSD * 100);

      const { initiateCheckout } = useSellerCheckout();
      const { success, data, error } = await initiateCheckout({
        seller_id: sellerId,
        product_name: productName,
        amount_cents: amountCents,
        customer_email: customerEmail,
      });

      if (success && data) {
        // Log the Z3 verification for audit trail
        console.log('Checkout created:', {
          session_id: data.session_id,
          z3_verification: data.z3_verification,
        });

        // Redirect to Stripe Checkout
        window.location.href = data.checkout_url;
        onSuccess(data);
      } else if (error) {
        console.error('Checkout failed:', error);
        onError(error);
      }
    } catch (err) {
      onError({
        error: 'unknown_error',
        message: err instanceof Error ? err.message : 'Unknown error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="px-4 py-2 bg-blue-500 text-white rounded"
    >
      {loading ? 'Processing...' : `Buy for $${priceUSD.toFixed(2)}`}
    </button>
  );
}

// ============================================================================
// 4. Backend Integration Example (Node.js / Express)
// ============================================================================

/**
 * Example backend helper to call the checkout endpoint and handle response
 */
export async function createSellerCheckout(
  request: SellerCheckoutRequest,
  apiBaseUrl: string,
) {
  const response = await fetch(`${apiBaseUrl}/api/marketplace/seller-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Checkout failed: ${error.error} — ${error.message || error.details?.join(', ')}`,
    );
  }

  return (await response.json()) as SellerCheckoutResponse;
}

// ============================================================================
// 5. Z3 Verification Validation (Optional Client-Side Audit)
// ============================================================================

/**
 * Validate the Z3 verification string returned from the endpoint.
 * This allows clients to audit the fee calculation independently.
 */
export function validateZ3Verification(
  z3Verification: string,
  amountCents: number,
  feePercentage: number,
): boolean {
  // Parse the verification string
  // Format: "Z3 verified: platform_fee_cents (X) + seller_payout_cents (Y) = amount_cents (Z)"
  const match = z3Verification.match(
    /Z3 verified: platform_fee_cents \((\d+)\) \+ seller_payout_cents \((\d+)\) = amount_cents \((\d+)\)/,
  );

  if (!match) {
    console.warn('Invalid Z3 verification format');
    return false;
  }

  const [, platformFeeStr, sellerPayoutStr, totalStr] = match;
  const platformFee = Number(platformFeeStr);
  const sellerPayout = Number(sellerPayoutStr);
  const total = Number(totalStr);

  // Verify the invariant: platform_fee + seller_payout = amount_cents
  const isValid =
    platformFee + sellerPayout === amountCents && total === amountCents;

  if (!isValid) {
    console.error('Z3 invariant violated:', {
      platformFee,
      sellerPayout,
      total,
      expected: amountCents,
    });
  }

  // Verify fee percentage matches expectation (approximately)
  const calculatedFee = Math.round((amountCents * feePercentage) / 100);
  if (Math.abs(platformFee - calculatedFee) > 1) {
    console.warn('Fee percentage mismatch:', {
      actual: platformFee,
      expected: calculatedFee,
    });
  }

  return isValid;
}

// ============================================================================
// 6. Error Handling Helper
// ============================================================================

/**
 * User-friendly error messages for common checkout errors
 */
export function getCheckoutErrorMessage(error: SellerCheckoutError): string {
  switch (error.error) {
    case 'validation_failed':
      return `Invalid input: ${error.details?.join(', ') || 'Please check your information'}`;
    case 'seller_not_found':
      return 'Seller not found. Please contact support.';
    case 'seller_not_connected':
      return 'Seller has not set up payment processing. Please try again later.';
    case 'stripe_error':
      return 'Payment processing error. Please try again.';
    case 'database_error':
      return 'System error. Please try again later.';
    case 'stripe_not_configured':
      return 'Payment processing is not available. Please contact support.';
    case 'network_error':
      return 'Network error. Please check your connection and try again.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

// ============================================================================
// 7. Usage Example
// ============================================================================

/**
 * Complete example of using the checkout flow in a page/component
 */
async function exampleUsage() {
  const sellerId = '550e8400-e29b-41d4-a716-446655440000';
  const productName = 'DSG Pro Template';
  const priceUSD = 100.0;
  const customerEmail = 'customer@example.com';

  try {
    // Create checkout
    const checkout = await createSellerCheckout(
      {
        seller_id: sellerId,
        product_name: productName,
        amount_cents: Math.round(priceUSD * 100),
        customer_email: customerEmail,
      },
      process.env.API_BASE_URL || 'https://tdealer01-crypto-dsg-control-plane.vercel.app',
    );

    // Validate Z3 verification (optional but recommended for audit)
    const isValid = validateZ3Verification(
      checkout.z3_verification,
      Math.round(priceUSD * 100),
      10, // assumes 10% fee, adjust based on seller fee_percentage
    );

    if (!isValid) {
      console.error('Z3 verification failed — do not proceed with checkout');
      return;
    }

    console.log('Checkout created:', {
      session_id: checkout.session_id,
      checkout_url: checkout.checkout_url,
      z3_verification: checkout.z3_verification,
    });

    // Redirect to Stripe Checkout
    // window.location.href = checkout.checkout_url;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Checkout error:', message);
  }
}

// ============================================================================
// 8. Webhook Handler Example (for success_url redirect)
// ============================================================================

/**
 * Handle the success redirect from Stripe Checkout
 * This runs on /marketplace/success page
 */
export function handleCheckoutSuccess(
  sessionId: string,
  onSuccess: (sessionId: string) => void,
) {
  console.log('Payment successful:', sessionId);

  // The seller_transactions table should be updated by Stripe webhook
  // within seconds. Here you can:
  // 1. Poll the server for transaction status
  // 2. Display success message
  // 3. Update UI with order details

  onSuccess(sessionId);
}

export default {
  SellerCheckoutButton,
  createSellerCheckout,
  validateZ3Verification,
  getCheckoutErrorMessage,
  handleCheckoutSuccess,
};
