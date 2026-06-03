import Link from 'next/link';

export default function HermesControlLink() {
  return (
    <Link
      href="/dashboard/hermes"
      className="fixed right-20 bottom-5 z-40 flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-200 shadow-lg backdrop-blur-sm transition-all hover:border-violet-400/60 hover:bg-violet-500/25"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
      Hermes Control
    </Link>
  );
}
