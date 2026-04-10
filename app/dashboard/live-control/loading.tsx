export default function LiveControlLoading() {
  return (
    <main className="min-h-screen bg-[#0d0e11] px-6 py-10 text-[#f7f6f9]">
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-16 bg-slate-800" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="h-72 bg-slate-800 md:col-span-8" />
          <div className="h-72 bg-slate-800 md:col-span-4" />
          <div className="h-96 bg-slate-800 md:col-span-12" />
        </div>
      </div>
    </main>
  );
}
