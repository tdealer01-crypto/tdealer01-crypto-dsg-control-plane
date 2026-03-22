const plans = [
  {
    name: "Trial",
    price: "Free",
    subtitle: "สำหรับการทดลอง flow แรก",
    features: [
      "1 agent",
      "1,000 executions / month",
      "DSG dashboard access",
      "Basic workflow testing",
    ],
    cta: "Start Trial",
    href: "/login",
  },
  {
    name: "Pro",
    price: "$99/mo",
    subtitle: "สำหรับ solo founder และทีมเล็ก",
    features: [
      "5 agents",
      "10,000 executions included",
      "Stripe billing flow",
      "Supabase + webhook integration",
    ],
    cta: "Choose Pro",
    href: "https://buy.stripe.com/7sYbJ2ddC4Dh7AffuE3gk00",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$299/mo",
    subtitle: "สำหรับทีมที่เริ่มใช้งานจริง",
    features: [
      "25 agents",
      "100,000 executions included",
      "Production workflow support",
      "Multi-user operations",
    ],
    cta: "Choose Business",
    href: "https://buy.stripe.com/fZu00k5La7Pt2fVaak3gk01",
  },
  {
    name: "Enterprise",
    price: "Custom",
    subtitle: "สำหรับองค์กรและงานกำกับดูแลจริง",
    features: [
      "Custom quotas",
      "SSO / WorkOS",
      "Policy approvals",
      "Audit exports + custom onboarding",
    ],
    cta: "Contact Sales",
    href: "mailto:t.dealer01@dsg.pics?subject=DSG%20Enterprise%20Quote",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.25em] text-emerald-400">
            Pricing
          </p>
          <h1 className="mb-6 text-4xl font-bold md:text-6xl">
            DSG Control Plane Pricing
          </h1>
          <p className="text-lg text-slate-300">
            Choose the plan that matches your team, execution volume, and
            governance needs.
          </p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={[
                "rounded-2xl border p-6 shadow-lg",
                plan.highlighted
                  ? "border-emerald-400 bg-slate-900"
                  : "border-slate-800 bg-slate-900/70",
              ].join(" ")}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold">{plan.name}</h2>
                <p className="mt-2 text-3xl font-semibold">{plan.price}</p>
                <p className="mt-2 text-sm text-slate-400">{plan.subtitle}</p>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <a
                href={plan.href}
                className={[
                  "mt-8 inline-block w-full rounded-xl px-4 py-3 text-center font-semibold",
                  plan.highlighted
                    ? "bg-emerald-500 text-black"
                    : "border border-slate-700 text-white",
                ].join(" ")}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
          <p className="font-semibold text-white">Overage</p>
          <ul className="mt-3 space-y-2">
            <li>• Trial is limited to evaluation usage only</li>
            <li>• Pro and Business overages should be priced per execution</li>
            <li>• Enterprise plans use custom limits and onboarding</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
