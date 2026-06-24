import { Metadata } from 'next';
import Link from 'next/link';
import { CreateTicketForm } from './CreateTicketForm';

export const metadata: Metadata = {
  title: 'Create Support Ticket — DSG Dashboard',
  description: 'Submit a new support ticket for repairs or assistance',
};

export default function CreateTicketPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0F] text-[#F8FAFC]">
      {/* Header */}
      <div className="border-b border-[rgba(247,220,120,0.16)] bg-[#14151C]/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/dashboard/support/tickets" className="text-sm text-[#AAB3C5] hover:text-[#F8FAFC]">
              ← Back to Tickets
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-6 py-16">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold leading-tight">Create Support Ticket</h1>
          <p className="mt-4 text-lg text-[#AAB3C5]">
            Report an issue or request repair assistance. Our team will review and respond within 24 hours.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-[rgba(247,220,120,0.16)] bg-[#14151C] p-8">
          <CreateTicketForm />
        </div>

        {/* Help Section */}
        <div className="mt-16 rounded-2xl border border-[rgba(247,220,120,0.16)] bg-[#14151C] p-6">
          <h2 className="text-lg font-semibold text-[#F7DC78]">Tips for creating helpful tickets</h2>
          <ul className="mt-4 space-y-3 text-sm text-[#AAB3C5]">
            <li>✓ Use a clear, descriptive title</li>
            <li>✓ Include steps to reproduce the issue</li>
            <li>✓ Mention what you expected vs what actually happened</li>
            <li>✓ Set the priority level appropriately</li>
            <li>✓ Attach screenshots or error messages if relevant</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
