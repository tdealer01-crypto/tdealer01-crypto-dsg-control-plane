import { Metadata } from 'next';
import { TicketDetail } from './TicketDetail';

export const metadata: Metadata = {
  title: 'Support Ticket — DSG Dashboard',
  description: 'View and manage your support ticket',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TicketPage({ params }: Props) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-[#0B0B0F] text-[#F8FAFC]">
      {/* Header */}
      <div className="border-b border-[rgba(247,220,120,0.16)] bg-[#14151C]/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-bold">Support Ticket</h1>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        <TicketDetail ticketId={id} />
      </div>
    </main>
  );
}
