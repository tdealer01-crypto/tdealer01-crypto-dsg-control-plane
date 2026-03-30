import { VerifyPanel } from '../../../components/runtime/verify-panel';
import { ReplayPanel } from '../../../components/runtime/replay-panel';
import { EffectInspector } from '../../../components/runtime/effect-inspector';

export default function LivePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-semibold">Live Runtime</h1>
        <p className="mt-2 text-slate-400">
          Verify ledger sequence integrity, replay deterministic state transitions, and inspect effect lineage.
        </p>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <VerifyPanel />
          <ReplayPanel />
          <EffectInspector />
        </div>
      </div>
    </main>
  );
}
