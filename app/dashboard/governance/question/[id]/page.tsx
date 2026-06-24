export const metadata = {
  title: 'Governance Question',
  description: 'Accenture 10Q governance question detail.',
};

export default function GovernanceQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Governance Question</h1>
      <p className="mt-2 text-sm text-slate-400">Question detail page (stub)</p>
    </div>
  );
}
