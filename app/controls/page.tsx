import Link from "next/link";
import { listGatewayControlTemplates } from "../../lib/gateway/control-templates";

function primaryActionFor(template: ReturnType<typeof listGatewayControlTemplates>[number]) {
  if (template.category === "approval" || template.requiresApproval) {
    return { href: "/approvals?orgId=org-smoke", label: "Open approval queue" };
  }

  if (template.id === "signed-evidence-bundle" || template.category === "evidence") {
    return { href: "/evidence-pack", label: "Open evidence pack" };
  }

  if (template.category === "deployment") {
    return { href: "https://github.com/marketplace/actions/dsg-secure-deploy-gate", label: "Open deploy gate" };
  }

  if (template.category === "runtime") {
    return { href: "/gateway/monitor?orgId=org-smoke", label: "Open monitor flow" };
  }

  return { href: "/ai-compliance", label: "Open AI compliance" };
}

export default function ControlsPage() {
  const templates = listGatewayControlTemplates();
  const implemented = templates.filter((template) => template.status === "implemented").length;
  const planned = templates.filter((template) => template.status === "planned").length;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Control Template Library</p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
            Reusable AI action governance controls
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            DSG control templates help compliance teams and consultants operationalize deterministic gates, evidence requirements, approval rules, customer key custody, deploy gating, and signed evidence workflows.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/ai-compliance" className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-black">Back to AI compliance</Link>
            <Link href="/api/gateway/controls/templates" className="rounded-xl border border-cyan-300/50 px-5 py-3 font-bold text-cyan-100">Open templates JSON</Link>
            <Link href="/approvals?orgId=org-smoke" className="rounded-xl border border-cyan-300/50 px-5 py-3 font-bold text-cyan-100">Open approval queue</Link>
            <Link href="/evidence-pack" className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-200">View evidence pack</Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total controls</p>
            <p className="mt-2 text-3xl font-bold text-white">{templates.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Implemented</p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">{implemented}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Planned</p>
            <p className="mt-2 text-3xl font-bold text-amber-300">{planned}</p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
          <h2 className="text-xl font-bold text-cyan-100">Action map</h2>
          <p className="mt-2 leading-7 text-slate-300">
            Each card below is actionable. Use the buttons to open the related queue, evidence page, deploy gate, monitor flow, or raw JSON template export.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {templates.map((template) => {
            const primaryAction = primaryActionFor(template);

            return (
              <article key={template.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-white">{template.name}</h2>
                  <span className={template.status === "implemented" ? "rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-bold text-emerald-300" : "rounded-full bg-amber-400/10 px-3 py-1 text-sm font-bold text-amber-300"}>
                    {template.status}
                  </span>
                </div>
                <p className="mt-3 leading-7 text-slate-300">{template.description}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-sm text-slate-400">Category</p>
                    <p className="mt-1 font-semibold text-cyan-100">{template.category}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-sm text-slate-400">Recommended mode</p>
                    <p className="mt-1 font-semibold text-cyan-100">{template.recommendedMode}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-sm text-slate-400">Default risk</p>
                    <p className="mt-1 font-semibold text-cyan-100">{template.defaultRisk}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-sm text-slate-400">Approval required</p>
                    <p className="mt-1 font-semibold text-cyan-100">{template.requiresApproval ? "yes" : "no"}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-semibold text-slate-300">Required evidence</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {template.requiredEvidence.map((item) => (
                      <span key={item} className="rounded-full border border-cyan-400/20 bg-slate-950 px-3 py-1 text-sm text-cyan-100">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-800 pt-5">
                  <Link href={primaryAction.href} className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-black">
                    {primaryAction.label}
                  </Link>
                  <Link href="/api/gateway/controls/templates" className="rounded-xl border border-cyan-300/40 px-4 py-2 text-sm font-bold text-cyan-100">
                    Open JSON
                  </Link>
                  <Link href="/ai-compliance" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200">
                    Compliance guide
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6">
          <h2 className="text-2xl font-bold">Boundary</h2>
          <p className="mt-3 leading-7 text-slate-300">
            DSG control templates support governance workflow adoption. They are not certification claims by themselves and do not guarantee compliance without proper implementation, review, and operating controls.
          </p>
        </section>
      </div>
    </main>
  );
}
