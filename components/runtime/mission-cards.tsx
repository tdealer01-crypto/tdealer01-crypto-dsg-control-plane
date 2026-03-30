import type { RuntimeSummaryCard } from '../../lib/runtime/dashboard-contract';

type MissionCardsProps = {
  summary: RuntimeSummaryCard;
};

export default function MissionCards({ summary }: MissionCardsProps) {
  const cards = [
    { label: 'Epoch', value: summary.truth_state?.epoch ?? '-' },
    { label: 'Sequence', value: summary.truth_state?.sequence ?? '-' },
    { label: 'Approvals Open', value: summary.approvals.open },
    { label: 'Effects Committed', value: summary.effects.committed },
    { label: 'Ledger Entries', value: summary.ledger.count },
    { label: 'Memory Writes', value: summary.memory.count },
    { label: 'Agents', value: summary.agents.length },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{String(card.value)}</p>
        </div>
      ))}
    </section>
  );
}
