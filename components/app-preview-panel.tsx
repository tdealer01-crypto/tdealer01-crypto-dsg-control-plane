'use client';

export function AppPreviewPanel({ previewUrl }: { previewUrl?: string | null }) {
  const nodes = ['Input', 'Policy', 'Runtime', 'Data', 'Audit'];
  return (
    <section className="rounded-2xl border border-[#C8A24D] bg-[#071326] p-3 text-[#F5F7FA] shadow-[0_0_36px_rgba(200,162,77,0.22)]">
      <div className="mb-3">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#E0B95B]">Preview Environment</p>
        <h2 className="text-lg font-black">Application Preview</h2>
        <p className="text-xs text-[#D7D9DE]">Enterprise preview shell based on the DSG Architect mobile pattern.</p>
      </div>
      <div className="rounded-[1.5rem] border border-[#C8A24D]/80 bg-[#F6F0E1] p-2">
        <div className="min-h-[420px] rounded-[1rem] border border-[#0C2340]/40 bg-[#0C2340] p-4">
          <div className="mb-4 rounded-xl border border-[#C8A24D]/40 bg-[#071326] p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#D9363E]">{previewUrl ? 'Preview attached' : 'Preview not available yet'}</p>
            <h3 className="mt-2 text-xl font-black">Generated Application</h3>
            <p className="mt-1 text-sm leading-6 text-[#D7D9DE]">Create a pull request or attach a preview URL to display a live app here.</p>
          </div>
          <div className="rounded-xl border border-[#C8A24D]/40 bg-[#071326] p-3">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#E0B95B]">System Architecture Preview</p>
            <div className="grid grid-cols-2 gap-2">
              {nodes.map((node, index) => (
                <div key={node} className="rounded-xl border border-[#C8A24D]/30 bg-[#0C2340] p-3">
                  <div className="mb-2 h-2 w-2 rounded-full bg-[#D9363E] shadow-[0_0_12px_rgba(217,54,62,0.8)]" />
                  <p className="text-sm font-black">{node}</p>
                  <p className="mt-1 text-[11px] text-[#D7D9DE]">Layer {index + 1}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-black">
            <div className="rounded-xl border border-[#C8A24D]/30 bg-[#071326] p-2 text-[#E0B95B]">Governed</div>
            <div className="rounded-xl border border-[#D9363E]/40 bg-[#071326] p-2 text-[#ff9ca3]">Risk Gated</div>
            <div className="rounded-xl border border-[#C8A24D]/30 bg-[#071326] p-2 text-[#E0B95B]">Audited</div>
          </div>
        </div>
      </div>
    </section>
  );
}
