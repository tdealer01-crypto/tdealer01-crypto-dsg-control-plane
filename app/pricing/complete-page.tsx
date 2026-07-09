'use client';

import Link from 'next/link';

const pricingTiers = [
  {
    id: 'developer',
    name: 'Developer',
    description: 'For prototyping and small teams',
    price: 'Free',
    billingPeriod: 'none' as const,
    monthlyLimit: '1,000 records/mo',
    highlight: false,
    features: [
      '✓ DSG ONE Determinism Engine',
      '✓ Gap-free sequence generation',
      '✓ SHA-256 hash chain verification',
      '✓ Basic audit export (JSON)',
      '✓ Community support',
      '✗ Merkle tree proofs',
      '✗ SARIF export',
      '✗ Priority support',
      '✗ Custom SLAs',
    ],
    cta: 'Start Free',
    checkoutLink: '/signup?plan=developer',
  },
  {
    id: 'pro',
    name: 'Professional',
    description: 'For production deployments',
    price: '$199',
    billingPeriod: 'monthly' as const,
    monthlyLimit: '1,000,000 records/mo',
    highlight: true,
    features: [
      '✓ Everything in Developer',
      '✓ Unlimited sequence generations',
      '✓ Merkle tree audit proofs',
      '✓ SARIF format export',
      '✓ Multi-org support (5 orgs)',
      '✓ Email support (24h response)',
      '✓ Monthly compliance reports',
      '✗ Custom rate limits',
      '✗ Dedicated support',
    ],
    cta: 'Start 14-Day Trial',
    checkoutLink: '/checkout?plan=pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For mission-critical governance',
    price: 'Custom',
    billingPeriod: 'none' as const,
    monthlyLimit: 'Unlimited',
    highlight: false,
    features: [
      '✓ Everything in Professional',
      '✓ Unlimited organizations',
      '✓ Custom rate limits & SLAs',
      '✓ White-label options',
      '✓ Dedicated success manager',
      '✓ Priority support (1h response)',
      '✓ Custom compliance reporting',
      '✓ On-premises deployment',
      '✓ 99.99% uptime SLA',
    ],
    cta: 'Request Quote',
    checkoutLink: '/enterprise-contact',
  },
];

const features = [
  {
    category: 'Core Features',
    items: [
      { name: 'Deterministic Security Gateway', developer: true, pro: true, enterprise: true },
      { name: 'Gap-Free Sequence Generation', developer: true, pro: true, enterprise: true },
      { name: 'SHA-256 Hash Chain Verification', developer: true, pro: true, enterprise: true },
      { name: 'Merkle Tree Audit Proofs', developer: false, pro: true, enterprise: true },
      { name: 'SARIF Format Export', developer: false, pro: true, enterprise: true },
      { name: 'Replay Protection', developer: true, pro: true, enterprise: true },
    ],
  },
  {
    category: 'Compliance & Security',
    items: [
      { name: 'EU AI Act Evidence Pack', developer: true, pro: true, enterprise: true },
      { name: 'ISO 42001 Readiness', developer: true, pro: true, enterprise: true },
      { name: 'CCVS v1.2 Compliance Chain', developer: true, pro: true, enterprise: true },
      { name: 'Z3 Theorem Verification', developer: true, pro: true, enterprise: true },
      { name: 'Monthly Compliance Reports', developer: false, pro: true, enterprise: true },
      { name: 'Custom Compliance Reporting', developer: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Support & Operations',
    items: [
      { name: 'Community Support', developer: true, pro: false, enterprise: false },
      { name: 'Email Support (24h)', developer: false, pro: true, enterprise: false },
      { name: 'Priority Support (1h)', developer: false, pro: false, enterprise: true },
      { name: 'Dedicated Success Manager', developer: false, pro: false, enterprise: true },
      { name: 'SLA Guarantee', developer: false, pro: false, enterprise: '99.99%' },
    ],
  },
  {
    category: 'Scalability',
    items: [
      { name: 'Records/Month', developer: '1,000', pro: '1,000,000', enterprise: 'Unlimited' },
      { name: 'Concurrent Requests', developer: '100/sec', pro: '10,000/sec', enterprise: 'Custom' },
      { name: 'Organizations Supported', developer: '1', pro: '5', enterprise: 'Unlimited' },
      { name: 'API Rate Limits', developer: 'Standard', pro: 'Standard', enterprise: 'Custom' },
      { name: 'Data Retention', developer: '30 days', pro: '90 days', enterprise: 'Unlimited' },
    ],
  },
  {
    category: 'Deployment',
    items: [
      { name: 'Cloud Hosted', developer: true, pro: true, enterprise: true },
      { name: 'Multi-Region', developer: false, pro: true, enterprise: true },
      { name: 'On-Premises Option', developer: false, pro: false, enterprise: true },
      { name: 'Private VPC', developer: false, pro: false, enterprise: true },
      { name: 'White-Label', developer: false, pro: false, enterprise: true },
    ],
  },
];

const faqs = [
  {
    question: 'Can I start free and upgrade later?',
    answer: 'Yes! The Developer tier is completely free with no credit card required. You can upgrade to Professional or Enterprise at any time.',
  },
  {
    question: 'What happens if I exceed my monthly limit?',
    answer: 'We\'ll notify you at 80%, 90%, and 100% of your limit. We won\'t block requests, but you can upgrade or contact us to adjust your plan.',
  },
  {
    question: 'Do you offer annual billing discounts?',
    answer: 'Yes! Annual billing for Professional tier includes 20% discount. Contact us for Enterprise annual pricing.',
  },
  {
    question: 'What about data retention and backups?',
    answer: 'Developer: 30 days, Professional: 90 days, Enterprise: Unlimited. All tiers include daily automated backups.',
  },
  {
    question: 'Is there a free trial for Professional?',
    answer: 'Yes! We offer 14 days free access to Professional tier to evaluate the full feature set.',
  },
  {
    question: 'Can I migrate from Developer to Professional?',
    answer: 'Absolutely. All your data and configurations transfer automatically. No downtime.',
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
        {features.map((category) => (
          <div key={category.category} className="mb-12">
            <h3 className="text-xl font-bold text-slate-300 mb-6 uppercase tracking-wider text-xs">
              {category.category}
            </h3>
            <div className="border border-white/10 rounded-xl overflow-hidden">
              {category.items.map((item, index) => (
                <div
                  key={item.name}
                  className={`grid grid-cols-4 gap-4 p-4 ${
                    index % 2 === 0 ? 'bg-white/[0.02]' : 'bg-white/[0.01]'
                  } ${index !== category.items.length - 1 ? 'border-b border-white/10' : ''}`}
                >
                  <div className="font-medium text-slate-300">{item.name}</div>
                  <div className="text-center">
                    {item.developer === true ? (
                      <span className="text-emerald-400">✓</span>
                    ) : typeof item.developer === 'string' ? (
                      <span className="text-slate-400 text-sm">{item.developer}</span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>
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
          </div>
        ))}
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
