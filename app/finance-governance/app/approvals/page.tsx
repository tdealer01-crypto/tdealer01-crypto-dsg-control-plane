const approvals = [
  {
    id: 'APR-1001',
    vendor: 'Northwind Supply',
    amount: 'US$14,250',
    status: 'Needs approver',
    risk: 'Threshold exceeded',
  },
  {
    id: 'APR-1002',
    vendor: 'Contoso Services',
    amount: 'US$2,480',
    status: 'Exception open',
    risk: 'Missing document',
  },
  {
    id: 'APR-1003',
    vendor: 'Blue Ocean Partners',
    amount: 'US$31,900',
    status: 'Compliance review',
    risk: 'High-risk vendor',
  },
];

export default function FinanceGovernanceApprovalsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Approval queue</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Pending finance approvals</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          This queue is the skeleton for role-aware approvals, filtering, and action handling across governed finance workflows.
        </p>
      </div>

      <div className="mt-10 overflow-x-auto rounded-[1.75rem] border border-white/10 bg-white/5">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              <th className="px-5 py-4 font-semibold">Approval ID</th>
              <th className="px-5 py-4 font-semibold">Vendor</th>
              <th className="px-5 py-4 font-semibold">Amount</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Risk / note</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((item) => (
              <tr key={item.id} className="border-t border-white/10 align-top">
                <td className="px-5 py-4 font-semibold text-white">{item.id}</td>
                <td className="px-5 py-4 text-slate-200">{item.vendor}</td>
                <td className="px-5 py-4 text-slate-200">{item.amount}</td>
                <td className="px-5 py-4 text-emerald-100">{item.status}</td>
                <td className="px-5 py-4 text-slate-300">{item.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
