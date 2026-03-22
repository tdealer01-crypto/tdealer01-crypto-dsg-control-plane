"use client";

type MatrixCell = {
  sequence: number;
  region_id: string;
  entropy: number;
  gate_result: string;
  state_hash: string;
  created_at: string;
  epoch: string;
  z3_proof_hash?: string | null;
  signature?: string | null;
};

type DeterminismRow = {
  sequence: number;
  ok: boolean;
  data: null | {
    sequence: number;
    region_count: number;
    unique_state_hashes: number;
    max_entropy: number;
    deterministic: boolean;
    gate_action: string;
  };
  error: string | null;
};

type Props = {
  sequences: number[];
  regions: string[];
  cells: MatrixCell[];
  determinism: DeterminismRow[];
};

function cellTone(entropy: number, gate: string) {
  if (gate === "BLOCK") return "bg-red-500/35 border-red-400/40";
  if (gate === "STABILIZE") return "bg-amber-400/35 border-amber-300/40";
  if (entropy >= 1.0) return "bg-red-500/25 border-red-400/30";
  if (entropy >= 0.75) return "bg-orange-400/25 border-orange-300/30";
  if (entropy >= 0.5) return "bg-yellow-300/25 border-yellow-200/30";
  if (entropy >= 0.25) return "bg-sky-400/20 border-sky-300/30";
  return "bg-emerald-400/20 border-emerald-300/30";
}

function badgeTone(deterministic: boolean, gateAction: string) {
  if (!deterministic || gateAction === "FREEZE") {
    return "border-red-400/40 bg-red-500/10 text-red-200";
  }
  return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
}

export function EntropyMatrix({ sequences, regions, cells, determinism }: Props) {
  const cellMap = new Map(cells.map((cell) => [`${cell.region_id}::${cell.sequence}`, cell]));
  const determinismMap = new Map(determinism.map((row) => [row.sequence, row]));

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div>
          <h2 className="text-xl font-semibold">Determinism Badges</h2>
          <p className="mt-1 text-sm text-slate-400">Sequence-level gate recommendation from DSG core.</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {sequences.map((sequence) => {
            const row = determinismMap.get(sequence);

            if (!row || !row.ok || !row.data) {
              return (
                <div key={sequence} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                  <div className="font-semibold">Seq {sequence}</div>
                  <div className="mt-1 text-slate-400">No determinism data</div>
                </div>
              );
            }

            return (
              <div key={sequence} className={`rounded-xl border px-4 py-3 text-sm ${badgeTone(row.data.deterministic, row.data.gate_action)}`}>
                <div className="font-semibold">Seq {sequence}</div>
                <div className="mt-1">{row.data.deterministic ? "Deterministic" : "Diverged"}</div>
                <div className="mt-1">Gate: {row.data.gate_action}</div>
                <div className="mt-1">Hashes: {row.data.unique_state_hashes}</div>
                <div className="mt-1">Max entropy: {row.data.max_entropy}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div>
          <h2 className="text-xl font-semibold">Entropy Matrix</h2>
          <p className="mt-1 text-sm text-slate-400">X = sequence, Y = region, cell color = entropy + gate result.</p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <div className="grid min-w-max gap-2" style={{ gridTemplateColumns: `180px repeat(${sequences.length}, minmax(88px, 1fr))` }}>
            <div className="sticky left-0 z-10 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm font-semibold text-slate-300">Region / Sequence</div>

            {sequences.map((sequence) => (
              <div key={`head-${sequence}`} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center text-sm font-semibold text-slate-300">
                {sequence}
              </div>
            ))}

            {regions.map((region) => (
              <RegionRow key={region} region={region} sequences={sequences} cellMap={cellMap} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function RegionRow({ region, sequences, cellMap }: { region: string; sequences: number[]; cellMap: Map<string, MatrixCell> }) {
  return (
    <>
      <div className="sticky left-0 z-10 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm font-medium text-slate-200">{region}</div>

      {sequences.map((sequence) => {
        const cell = cellMap.get(`${region}::${sequence}`);

        if (!cell) {
          return (
            <div key={`${region}-${sequence}`} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-center text-xs text-slate-500">-</div>
          );
        }

        return (
          <div
            key={`${region}-${sequence}`}
            className={`rounded-xl border p-3 text-center text-xs text-slate-100 ${cellTone(cell.entropy, cell.gate_result)}`}
            title={[
              `Region: ${cell.region_id}`,
              `Sequence: ${cell.sequence}`,
              `Entropy: ${cell.entropy}`,
              `Gate: ${cell.gate_result}`,
              `State hash: ${cell.state_hash}`,
              `Epoch: ${cell.epoch}`,
              `Created: ${cell.created_at}`,
            ].join("\n")}
          >
            <div className="font-semibold">{cell.entropy}</div>
            <div className="mt-1 opacity-90">{cell.gate_result}</div>
          </div>
        );
      })}
    </>
  );
}
