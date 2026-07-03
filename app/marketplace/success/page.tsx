import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Payment Successful — DSG Marketplace',
  description: 'Your payment has been processed successfully',
};

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function SuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const sessionId = params.session_id;

  return (
    <main className="min-h-screen bg-[#0B0B0F] text-[#F8FAFC] flex items-center justify-center">
      {/* Content */}
      <div className="max-w-md w-full px-6 text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgba(51,209,122,0.15)] border border-[rgba(51,209,122,0.35)]">
            <svg className="w-8 h-8 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-lg text-[#AAB3C5] mb-2">
          Thank you for your purchase. Your transaction has been completed successfully.
        </p>

        {sessionId && (
          <p className="text-sm text-[#AAB3C5] mb-6">
            Session ID: <span className="font-mono">{sessionId}</span>
          </p>
        )}

        {/* Next Steps */}
        <div className="mb-8 p-6 rounded-2xl border border-[rgba(247,220,120,0.16)] bg-[#14151C] text-left">
          <h2 className="font-semibold text-[#F7DC78] mb-3">What&apos;s next?</h2>
          <ul className="space-y-2 text-sm text-[#AAB3C5]">
            <li>✓ Check your email for receipt and product details</li>
            <li>✓ Access your product from the dashboard</li>
            <li>✓ Contact support if you have any questions</li>
          </ul>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link href="/marketplace">
            <Button variant="primary" className="w-full">
              Browse More Products
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary" className="w-full">
              View Dashboard
            </Button>
          </Link>
        </div>

        {/* Support Link */}
        <p className="mt-8 text-sm text-[#AAB3C5]">
          Need help?{' '}
          <Link href="/dashboard/support/faq" className="text-[#F7DC78] hover:text-[#D4AF37]">
            Contact Support
          </Link>
        </p>
      </div>
    </main>
  );
}
