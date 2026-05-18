import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DSG ONE Integrations — LangChain, AutoGen, CrewAI, OpenAI Agents, PydanticAI',
  description:
    'Add AI governance, audit trails, and action control to any agent framework. DSG ONE integrates with LangChain, AutoGen, CrewAI, OpenAI Agents SDK, and PydanticAI in under 5 minutes.',
};

const FRAMEWORKS = [
  {
    slug: 'langchain',
    name: 'LangChain',
    logo: '🦜',
    lang: 'Python / TypeScript',
    tagline: 'Gate every tool call in your LangChain agent with a one-line wrapper.',
    stars: '90k+',
  },
  {
    slug: 'langchain-js',
    name: 'LangChain.js',
    logo: '🦜',
    lang: 'TypeScript',
    tagline: 'Add audit-ready governance to LangChain.js agents with zero config.',
    stars: '90k+',
  },
  {
    slug: 'autogen',
    name: 'AutoGen',
    logo: '🤖',
    lang: 'Python',
    tagline: 'Wrap AutoGen multi-agent conversations with ALLOW / BLOCK / REVIEW gates.',
    stars: '35k+',
  },
  {
    slug: 'crewai',
    name: 'CrewAI',
    logo: '🚢',
    lang: 'Python',
    tagline: 'Control what your CrewAI crew can actually do before it does it.',
    stars: '25k+',
  },
  {
    slug: 'openai-agents',
    name: 'OpenAI Agents SDK',
    logo: '⚡',
    lang: 'Python',
    tagline: 'Intercept OpenAI Agents SDK tool calls and log every decision.',
    stars: 'Official SDK',
  },
  {
    slug: 'openai-agents-js',
    name: 'OpenAI Agents JS',
    logo: '⚡',
    lang: 'TypeScript',
    tagline: 'Governance layer for the OpenAI Agents JS SDK — inspect before execute.',
    stars: 'Official SDK',
  },
  {
    slug: 'pydantic-ai',
    name: 'PydanticAI',
    logo: '🔷',
    lang: 'Python',
    tagline: 'Type-safe agent governance with PydanticAI and DSG structured gates.',
    stars: '7k+',
  },
];

export default function IntegrationsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="px-6 py-20 text-center max-w-4xl mx-auto">
        <div className="inline-block bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-1 text-emerald-400 text-sm mb-6">
          5-minute setup · no infra required
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          AI Governance for Every Agent Framework
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Add ALLOW / BLOCK / REVIEW gates, audit trails, and policy enforcement to your existing
          agent stack. Works with any framework — no rewrites needed.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/try"
            className="bg-emerald-500 text-black px-8 py-3 rounded-lg font-bold hover:bg-emerald-400 transition"
          >
            Try Free — No Card Needed
          </Link>
          <Link
            href="/docs"
            className="border border-white/20 text-white px-8 py-3 rounded-lg hover:border-white/50 transition"
          >
            View Docs
          </Link>
        </div>
      </section>

      {/* Framework Grid */}
      <section className="px-6 pb-20 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-12 text-gray-200">
          Supported Frameworks
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FRAMEWORKS.map((fw) => (
            <Link
              key={fw.slug}
              href={`/integrations/${fw.slug}`}
              className="group bg-white/5 border border-white/10 rounded-xl p-6 hover:border-emerald-500/50 hover:bg-white/8 transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{fw.logo}</span>
                <div>
                  <h3 className="font-bold text-white group-hover:text-emerald-400 transition">
                    {fw.name}
                  </h3>
                  <span className="text-xs text-gray-500">{fw.lang}</span>
                </div>
                <span className="ml-auto text-xs text-gray-600 bg-white/5 rounded px-2 py-1">
                  {fw.stars}
                </span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{fw.tagline}</p>
              <div className="mt-4 text-emerald-500 text-sm font-medium group-hover:underline">
                View integration guide →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Why DSG */}
      <section className="px-6 py-16 bg-white/3 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">
            Why teams add DSG to their agent stack
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🛂',
                title: 'Gate before execution',
                body: 'Every tool call is inspected against your declared policy before it runs — ALLOW, BLOCK, or route to REVIEW.',
              },
              {
                icon: '📋',
                title: 'Tamper-proof audit trail',
                body: 'Hash-chained ledger logs every decision with evidence. Gaps in sequence numbers are automatically detected.',
              },
              {
                icon: '⚡',
                title: 'P99 < 50 ms',
                body: 'Gate decisions add under 50 ms to your agent loops. No polling, no queues — synchronous response every time.',
              },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to add governance to your agents?</h2>
        <p className="text-gray-400 mb-8">
          Start free. No credit card. Full audit trail from day one.
        </p>
        <Link
          href="/request-access"
          className="bg-emerald-500 text-black px-10 py-4 rounded-lg font-bold text-lg hover:bg-emerald-400 transition"
        >
          Start Free Trial →
        </Link>
      </section>
    </main>
  );
}
