import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Support Tickets — DSG Dashboard',
  description: 'Manage your support tickets and requests',
};

// TODO: Replace with real data once support_tickets migration is applied
const mockTickets = [
  {
    id: 'ticket_001',
    title: 'Product not loading',
    description: 'The application fails to load after login',
    status: 'in_progress',
    priority: 'high',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ticket_002',
    title: 'Need support with integration',
    description: 'Having trouble integrating the API',
    status: 'pending',
    priority: 'normal',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ticket_003',
    title: 'Pricing inquiry',
    description: 'Questions about enterprise plan',
    status: 'resolved',
    priority: 'low',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  resolved: 'bg-green-500/20 text-green-300 border-green-500/30',
  closed: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-blue-300',
  normal: 'text-gray-300',
  high: 'text-orange-300',
  urgent: 'text-red-300',
};

export default function TicketsPage() {
  const tickets = mockTickets;
  const pendingCount = tickets.filter((t) => t.status === 'pending').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;

  return (
    <main className="min-h-screen bg-[#0B0B0F] text-[#F8FAFC]">
      {/* Header */}
      <div className="border-b border-[rgba(247,220,120,0.16)] bg-[#14151C]/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">Support Tickets</h1>
            <p className="mt-1 text-sm text-[#AAB3C5]">Manage your support requests and escalations</p>
          </div>
          <Link href="/dashboard/support/tickets/create">
            <button className="rounded-lg bg-emerald-500/20 px-4 py-2 font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors">Create Ticket</button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg border border-[rgba(247,220,120,0.16)] bg-[#14151C] p-4">
            <p className="text-sm text-[#AAB3C5]">Total Tickets</p>
            <p className="mt-2 text-3xl font-bold">{tickets.length}</p>
          </div>
          <div className="rounded-lg border border-[rgba(247,220,120,0.16)] bg-[#14151C] p-4">
            <p className="text-sm text-[#AAB3C5]">In Progress</p>
            <p className="mt-2 text-3xl font-bold text-blue-300">{inProgressCount}</p>
          </div>
          <div className="rounded-lg border border-[rgba(247,220,120,0.16)] bg-[#14151C] p-4">
            <p className="text-sm text-[#AAB3C5]">Pending</p>
            <p className="mt-2 text-3xl font-bold text-yellow-300">{pendingCount}</p>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="rounded-2xl border border-[rgba(247,220,120,0.16)] bg-[#14151C] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[rgba(247,220,120,0.16)] bg-[rgba(247,220,120,0.05)]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-widest text-[#AAB3C5]">
                    Title
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-widest text-[#AAB3C5]">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-widest text-[#AAB3C5]">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-widest text-[#AAB3C5]">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-widest text-[#AAB3C5]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(247,220,120,0.16)]">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-[rgba(247,220,120,0.05)] transition-colors">
                    <td className="px-6 py-4 text-sm">
                      <div>
                        <p className="font-semibold">{ticket.title}</p>
                        <p className="text-xs text-[#AAB3C5] mt-1">{ticket.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[ticket.status]}`}
                      >
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={PRIORITY_COLORS[ticket.priority]}>
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#AAB3C5]">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link href={`/dashboard/support/tickets/${ticket.id}`}>
                        <button className="text-emerald-300 hover:text-emerald-200 transition-colors font-medium">View</button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tickets.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-[#AAB3C5]">No support tickets yet.</p>
              <Link href="/dashboard/support/tickets/create" className="mt-4 inline-block">
                <button className="rounded-lg bg-emerald-500/20 px-4 py-2 font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors">Create your first ticket</button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
