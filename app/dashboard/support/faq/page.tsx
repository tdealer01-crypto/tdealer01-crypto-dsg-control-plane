import { Metadata } from 'next';
import { FAQSearch } from '@/components/FAQSearch';

export const metadata: Metadata = {
  title: 'FAQ — DSG Support',
  description: 'Frequently asked questions and answers',
};

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0F] text-[#F8FAFC]">
      {/* Header */}
      <div className="border-b border-[rgba(247,220,120,0.16)] bg-[#14151C]/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">Frequently Asked Questions</h1>
            <p className="mt-1 text-sm text-[#AAB3C5]">Find answers to common questions</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        <FAQSearch />
      </div>
    </main>
  );
}
