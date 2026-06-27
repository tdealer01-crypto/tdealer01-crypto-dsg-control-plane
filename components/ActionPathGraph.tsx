import React from "react";
import { GateStatus, StatusBadge } from "./StatusBadge";

type ActionPathNode = {
  id: string;
  title: string;
  subtitle: string;
};

type ActionPathGraphProps = {
  actor: ActionPathNode;
  action: ActionPathNode;
  policies: ActionPathNode[];
  gateResult: GateStatus;
  finalDecision: string;
  demoLabel?: string;
};

export function ActionPathGraph({ actor, action, policies, gateResult, finalDecision, demoLabel }: ActionPathGraphProps) {
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900/90 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">Action path graph</h3>
        {demoLabel ? <span className="text-xs text-slate-300">Demo data: {demoLabel}</span> : null}
      </div>
      <div className="grid grid-cols-1 gap-2 text-xs text-slate-200 md:grid-cols-4">
        <Node label="Actor" node={actor} />
        <Node label="Requested action" node={action} />
        <div className="rounded border border-slate-700 p-2">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">Policy checks</p>
          <ul className="space-y-1">
            {policies.map((policy) => (
              <li key={policy.id}>{policy.title}: {policy.subtitle}</li>
            ))}
          </ul>
        </div>
        <div className="rounded border border-slate-700 p-2">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">Gate outcome</p>
          <StatusBadge status={gateResult} explanation={`Final decision: ${finalDecision}`} />
        </div>
      </div>
    </section>
  );
}

function Node({ label, node }: { label: string; node: ActionPathNode }) {
  return (
    <div className="rounded border border-slate-700 p-2">
      <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p>{node.title}</p>
      <p className="text-slate-400">{node.subtitle}</p>
    </div>
  );
}
