'use client';

export function AppPreviewPanel({ previewUrl }: { previewUrl?: string | null }) {
  return (
    <section className="rounded-2xl border border-[#C8A24D] bg-[#071326] p-3 text-[#F5F7FA] shadow-[0_0_36px_rgba(200,162,77,0.22)]">
      <div className="mb-3">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#E0B95B]">Preview Environment</p>
        <h2 className="text-lg font-black">Application Preview</h2>
        <p className="text-xs text-[#D7D9DE]">Visual proof area for the generated app.</p>
      </div>
      <div className="rounded-[1.5rem] border border-[#C8A24D]/80 bg-[#F6F0E1] p-2">
        <div className="min-h-[360px] rounded-[1rem] border border-[#0C2340]/40 bg-[#0C2340] p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#D9363E]">{previewUrl ? 'Preview attached' : 'Preview not available yet'}</p>
          <h3 className="mt-2 text-xl font-black">Generated Application</h3>
          <p className="mt-2 text-sm leading-6 text-[#D7D9DE]">Create a pull request or attach a preview URL to display the generated app here.</p>
        </div>
      </div>
    </section>
  );
}
