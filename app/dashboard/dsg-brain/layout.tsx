import Link from 'next/link';

export default function DsgBrainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Breadcrumb */}
      <nav className="border-b border-slate-700 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/dashboard" className="text-slate-400 hover:text-white">
              Dashboard
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-white font-medium">DSG Brain</span>
          </div>
        </div>
      </nav>

      {children}
    </>
  );
}
