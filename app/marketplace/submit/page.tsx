import { Metadata } from 'next';
import Link from 'next/link';
import { SubmitForm } from './SubmitForm';

export const metadata: Metadata = {
  title: 'Submit Product — DSG Marketplace',
  description: 'Submit your product to the DSG ONE marketplace',
};

export default function SubmitProductPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0F] text-[#F8FAFC]">
      {/* Header */}
      <div className="border-b border-[rgba(247,220,120,0.16)] bg-[#14151C]/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/marketplace" className="text-lg font-bold tracking-tight">
            ← Back to Marketplace
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-16">
        {/* Hero */}
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#F7DC78]">
            Marketplace
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
            Submit Your Product
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#AAB3C5]">
            Share your product with thousands of potential customers. Fill out the form below and our team will review it within 24 hours.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-[rgba(247,220,120,0.16)] bg-[#14151C] p-8">
          <SubmitForm />
        </div>

        {/* Guidelines */}
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-[rgba(247,220,120,0.16)] bg-[#14151C] p-6">
            <h3 className="text-lg font-semibold text-[#F7DC78]">Product Guidelines</h3>
            <ul className="mt-4 space-y-2 text-sm text-[#AAB3C5]">
              <li>✓ Product must be unique and provide real value</li>
              <li>✓ Name should be clear and descriptive</li>
              <li>✓ Description should explain key features and benefits</li>
              <li>✓ Image should be professional and representative</li>
              <li>✓ Price should be competitive within your category</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[rgba(247,220,120,0.16)] bg-[#14151C] p-6">
            <h3 className="text-lg font-semibold text-[#F7DC78]">Review Process</h3>
            <ul className="mt-4 space-y-2 text-sm text-[#AAB3C5]">
              <li>📋 Submission received and logged</li>
              <li>🔍 Content review for quality and compliance</li>
              <li>✅ Approval notification via email</li>
              <li>🚀 Product goes live on the marketplace</li>
              <li>📊 Track sales and analytics</li>
            </ul>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 rounded-2xl border border-[rgba(247,220,120,0.16)] bg-[#14151C] p-8">
          <h2 className="text-2xl font-bold text-[#F8FAFC]">Frequently Asked Questions</h2>
          
          <div className="mt-8 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-[#F7DC78]">How long does review take?</h3>
              <p className="mt-2 text-sm text-[#AAB3C5]">
                Most submissions are reviewed within 24 hours. You&apos;ll receive an email notification once your product is approved or if we need additional information.
              </p>
            </div>

            <div className="border-t border-[rgba(247,220,120,0.16)] pt-6">
              <h3 className="text-base font-semibold text-[#F7DC78]">Can I edit my product after submission?</h3>
              <p className="mt-2 text-sm text-[#AAB3C5]">
                Yes! Once approved, you can edit your product details, update the image, or adjust the price at any time from your seller dashboard.
              </p>
            </div>

            <div className="border-t border-[rgba(247,220,120,0.16)] pt-6">
              <h3 className="text-base font-semibold text-[#F7DC78]">Is there a listing fee?</h3>
              <p className="mt-2 text-sm text-[#AAB3C5]">
                No, submitting and listing your product is completely free. We only take a small commission on sales made through the marketplace.
              </p>
            </div>

            <div className="border-t border-[rgba(247,220,120,0.16)] pt-6">
              <h3 className="text-base font-semibold text-[#F7DC78]">What image formats are accepted?</h3>
              <p className="mt-2 text-sm text-[#AAB3C5]">
                We accept JPEG and PNG images up to 5MB in size. We recommend using high-quality images for best presentation on the marketplace.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
