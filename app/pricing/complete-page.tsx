'use client';

type PricingTier = {
  id: string;
  name: string;
  description: string;
  price: string;
  billingPeriod: 'none' | 'monthly' | 'yearly';
  monthlyLimit: string;
  highlight: boolean;
  features: string[];
  cta: string;
  checkoutLink: string;
};

const pricingTiers: PricingTier[] = [
  {
    id: 'pro',
    name: 'Pro',
    description: 'For small teams and projects',
    price: '$99',
    billingPeriod: 'monthly' as const,
    monthlyLimit: '10,000 executions/mo',
    highlight: false,
    features: [
      '✓ DSG ONE Determinism Engine',
      '✓ Gap-free sequence generation',
      '✓ SHA-256 hash chain verification',
      '✓ Basic audit export (JSON)',
      '✓ Email support (24h response)',
      '✓ Monthly compliance reports',
      '✗ Merkle tree proofs',
      '✗ SARIF export',
      '✗ Dedicated support',
    ],
    cta: 'Start 14-Day Trial',
    checkoutLink: '/checkout?plan=pro',
  },
  {
    id: 'business',
    name: 'Business',
    description: 'For production deployments',
    price: '$199',
    billingPeriod: 'monthly' as const,
    monthlyLimit: '1,000,000 executions/mo',
    highlight: true,
    features: [
      '✓ Everything in Pro',
      '✓ Unlimited sequence generations',
      '✓ Merkle tree audit proofs',
      '✓ SARIF format export',
      '✓ Multi-org support (unlimited orgs)',
      '✓ Email support (24h response)',
      '✓ Monthly compliance reports',
      '✓ Custom rate limits',
      '✗ Dedicated support',
    ],
    cta: 'Start 14-Day Trial',
    checkoutLink: '/checkout?plan=business',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For mission-critical governance',
    price: '$499',
    billingPeriod: 'monthly' as const,
    monthlyLimit: 'Unlimited',
    highlight: false,
    features: [
      '✓ Everything in Business',
      '✓ Unlimited organizations & executions',
      '✓ Custom rate limits & SLAs',
      '✓ White-label options',
      '✓ Dedicated success manager',
      '✓ Priority support (1h response)',
      '✓ Custom compliance reporting',
      '✓ On-premises deployment',
      '✓ 99.99% uptime SLA',
    ],
    cta: 'Start 30-Day Trial',
    checkoutLink: '/checkout?plan=enterprise',
  },
];

type FeatureItem = {
  name: string;
  pro: boolean | string;
  business: boolean | string;
  enterprise: boolean | string;
};

type FeatureCategory = {
  category: string;
  items: FeatureItem[];
};

const features: FeatureCategory[] = [
  {
    category: 'Core Features',
    items: [
      { name: 'Deterministic Security Gateway', pro: true, business: true, enterprise: true },
      { name: 'Gap-Free Sequence Generation', pro: true, business: true, enterprise: true },
      { name: 'SHA-256 Hash Chain Verification', pro: true, business: true, enterprise: true },
      { name: 'Merkle Tree Audit Proofs', pro: false, business: true, enterprise: true },
      { name: 'SARIF Format Export', pro: false, business: true, enterprise: true },
      { name: 'Replay Protection', pro: true, business: true, enterprise: true },
    ],
  },
  {
    category: 'Compliance & Security',
    items: [
      { name: 'EU AI Act Evidence Pack', pro: true, business: true, enterprise: true },
      { name: 'ISO 42001 Readiness', pro: true, business: true, enterprise: true },
      { name: 'CCVS v1.2 Compliance Chain', pro: true, business: true, enterprise: true },
      { name: 'Z3 Theorem Verification', pro: true, business: true, enterprise: true },
      { name: 'Monthly Compliance Reports', pro: true, business: true, enterprise: true },
      { name: 'Custom Compliance Reporting', pro: false, business: false, enterprise: true },
    ],
  },
  {
    category: 'Support & Operations',
    items: [
      { name: 'Email Support (24h)', pro: true, business: true, enterprise: true },
      { name: 'Priority Support (1h)', pro: false, business: false, enterprise: true },
      { name: 'Dedicated Success Manager', pro: false, business: false, enterprise: true },
      { name: 'SLA Guarantee', pro: false, business: false, enterprise: '99.99%' },
    ],
  },
  {
    category: 'Scalability',
    items: [
      { name: 'Executions/Month', pro: '10,000', business: '1,000,000', enterprise: 'Unlimited' },
      { name: 'Concurrent Requests', pro: '100/sec', business: '10,000/sec', enterprise: 'Custom' },
      { name: 'Organizations Supported', pro: '1', business: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'API Rate Limits', pro: 'Standard', business: 'Custom', enterprise: 'Custom' },
      { name: 'Data Retention', pro: '90 days', business: 'Unlimited', enterprise: 'Unlimited' },
    ],
  },
  {
    category: 'Deployment',
    items: [
      { name: 'Cloud Hosted', pro: true, business: true, enterprise: true },
      { name: 'Multi-Region', pro: false, business: true, enterprise: true },
      { name: 'On-Premises Option', pro: false, business: false, enterprise: true },
      { name: 'Private VPC', pro: false, business: false, enterprise: true },
      { name: 'White-Label', pro: false, business: false, enterprise: true },
    ],
  },
];

type FAQ = {
  question: string;
  answer: string;
};

const faqs: FAQ[] = [
  {
    question: 'Do you offer a free trial?',
    answer: 'Yes! Pro and Business tiers include 14 days free trial. Enterprise tier includes 30 days free trial. No credit card required to start.',
  },
  {
    question: 'What happens if I exceed my monthly limit?',
    answer: 'We\'ll notify you at 80%, 90%, and 100% of your limit. We won\'t block requests, but you can upgrade or contact us to adjust your plan.',
  },
  {
    question: 'Do you offer annual billing discounts?',
    answer: 'Yes! Annual billing includes 20% discount on all tiers. Contact us for custom enterprise pricing.',
  },
  {
    question: 'What about data retention and backups?',
    answer: 'Pro: 90 days, Business: Unlimited, Enterprise: Unlimited. All tiers include daily automated backups and point-in-time recovery.',
  },
  {
    question: 'Can I upgrade or downgrade anytime?',
    answer: 'Yes! You can upgrade or downgrade your plan anytime. Changes take effect at your next billing cycle.',
  },
  {
    question: 'What about MCP API subscriptions?',
    answer: 'Separate from these plans, we offer MCP API subscriptions at ฿490/month (approximately $14 USD) with 10,000 calls/month for integrating with external services.',
  },
  {
    question: 'Do you offer Skills Bundles?',
    answer: 'Yes! We offer specialized Skills Bundles for Finance, Development, Compliance, and Operations domains. Contact sales for bundle pricing and features.',
  },
];

function PricingCard({ tier }: { tier: typeof pricingTiers[0] }) {
  return (
    <div className={`relative rounded-2xl border transition-all duration-300 ${
      tier.highlight
        ? 'border-emerald-400/50 bg-emerald-400/10 ring-2 ring-emerald-400/30 transform scale-105'
        : 'border-white/10 bg-white/[0.05] hover:border-white/20'
    }`}>
      {tier.highlight && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-slate-950 text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
            Most Popular
          </span>
        </div>
      )}

      <div className="p-8">
        <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
        <p className="text-slate-400 text-sm mb-6">{tier.description}</p>

        <div className="mb-6">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-white">{tier.price}</span>
            {tier.billingPeriod !== 'none' && (
              <span className="text-slate-400">/{tier.billingPeriod === 'monthly' ? 'month' : 'year'}</span>
            )}
          </div>
          <p className="text-sm text-slate-400">{tier.monthlyLimit}</p>
        </div>

        <a
          href={tier.checkoutLink}
          className={`w-full inline-block text-center px-6 py-3 rounded-xl font-bold transition mb-8 ${
            tier.highlight
              ? 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300'
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
          }`}
        >
          {tier.cta}
        </a>

        <div className="space-y-3 border-t border-white/10 pt-8">
          {tier.features.map((feature) => (
            <div key={feature} className="flex items-start gap-3 text-sm">
              <span className={feature.includes('✓') ? 'text-emerald-400' : 'text-slate-500'}>
                {feature.includes('✓') ? '✓' : '✗'}
              </span>
              <span className={feature.includes('✓') ? 'text-slate-200' : 'text-slate-500'}>
                {feature.replace('✓ ', '').replace('✗ ', '')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CompletePricingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-emerald-400 text-xs uppercase tracking-widest font-bold">Transparent Pricing</p>
        <h1 className="text-5xl md:text-6xl font-bold mt-4 mb-6">Plans for every scale</h1>
        <p className="text-xl text-slate-300 max-w-3xl">
          From free prototyping to enterprise governance. No hidden fees, cancel anytime.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-8">
          {pricingTiers.map((tier) => (
            <PricingCard key={tier.id} tier={tier} />
          ))}
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="text-4xl font-bold mb-12">Feature Comparison</h2>
        <div className="border border-white/10 rounded-xl overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-white/[0.05] border-b border-white/10 font-bold">
            <div className="text-slate-300">Feature</div>
            <div className="text-center text-slate-300">Pro</div>
            <div className="text-center text-slate-300">Business</div>
            <div className="text-center text-slate-300">Enterprise</div>
          </div>
          {/* Feature rows */}
          {features.map((category, categoryIndex) => (
            <div key={category.category}>
              {categoryIndex > 0 && <div className="border-t border-white/10" />}
              <div className="bg-white/[0.03] p-4 font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-white/10">
                {category.category}
              </div>
              {category.items.map((item, itemIndex) => (
                <div
                  key={item.name}
                  className={`grid grid-cols-4 gap-4 p-4 ${
                    itemIndex % 2 === 0 ? 'bg-white/[0.02]' : 'bg-white/[0.01]'
                  } ${itemIndex !== category.items.length - 1 ? 'border-b border-white/10' : ''}`}
                >
                  <div className="font-medium text-slate-300">{item.name}</div>
                  <div className="text-center">
                    {item.pro === true ? (
                      <span className="text-emerald-400">✓</span>
                    ) : typeof item.pro === 'string' ? (
                      <span className="text-slate-400 text-sm">{item.pro}</span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>
                  <div className="text-center">
                    {item.business === true ? (
                      <span className="text-emerald-400">✓</span>
                    ) : typeof item.business === 'string' ? (
                      <span className="text-slate-400 text-sm">{item.business}</span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>
                  <div className="text-center">
                    {item.enterprise === true ? (
                      <span className="text-emerald-400">✓</span>
                    ) : typeof item.enterprise === 'string' ? (
                      <span className="text-slate-400 text-sm">{item.enterprise}</span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="text-4xl font-bold mb-12">Frequently Asked Questions</h2>
        <div className="grid md:grid-cols-2 gap-8">
          {faqs.map((faq) => (
            <div key={faq.question} className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
              <h3 className="font-bold text-white mb-3">{faq.question}</h3>
              <p className="text-slate-400 text-sm">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="border border-emerald-400/30 bg-emerald-400/5 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-4">Still have questions?</h2>
          <p className="text-slate-300 mb-8">Our team is ready to help you find the perfect plan for your needs.</p>
          <div className="flex flex-wrap gap-4">
            <a
              href="/contact"
              className="bg-emerald-400 text-slate-950 px-6 py-3 rounded-xl font-bold hover:bg-emerald-300 transition"
            >
              Contact Sales
            </a>
            <a
              href="/demo"
              className="border border-emerald-400/40 text-emerald-300 px-6 py-3 rounded-xl font-bold hover:border-emerald-400 transition"
            >
              Try Demo
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
