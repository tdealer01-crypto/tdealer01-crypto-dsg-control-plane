import type { RuntimeSummaryCard } from '../../lib/runtime/dashboard-contract';

export function MissionCards({
  summary,
}: {
  summary: RuntimeSummaryCard | null;
}) {
  const cards = [
    {
      label: 'Epoch',
      value: summary?.truth_state?.epoch ?? '-',
      tone: 'text-cyan-300',
    },
    {
      label: 'Sequence',
      value: summary?.truth_state?.sequence ?? '-',
      tone: 'text-white',
    },
    {
      label: 'Open Approvals',
      value: summary?.approvals?.open ?? 0,
      tone: 'text-amber-300',
    },
    {
      label: 'Used Approvals',
      value: summary?.approvals?.used ?? 0,
      tone: 'text-emerald-300',
    },
    {
      label: 'Committed Effects',
      value: summary?.effects?.committed ?? 0,
      tone: 'text-violet-300',
    },
    {
      label: 'Ledger Items',
      value: summary?.ledger?.count ?? 0,
      tone: 'text-sky-300',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl"
        >
          <div className="text-xs uppercase tracking-[0.22em] text-neutral-500">
            {card.label}
          </div>
          <div className={`mt-3 text-3xl font-semibold ${card.tone}`}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}
