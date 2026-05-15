'use client';

import React, { useState, useMemo } from 'react';
import { Search, Star, ArrowRight, Zap, BarChart2, MessageSquare, ShoppingCart, Settings, FileText, GitBranch, ClipboardList, BookOpen, Briefcase, Receipt } from 'lucide-react';

type Template = {
  slug: string;
  name: string;
  description: string;
  category: 'SaaS' | 'Dashboard' | 'AI/Chat' | 'E-commerce' | 'Internal Tools';
  stack: string[];
  stars: number;
  popular?: boolean;
  icon: React.ReactNode;
};

const CATEGORY_COLORS: Record<string, string> = {
  SaaS: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
  Dashboard: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  'AI/Chat': 'border-violet-500/40 bg-violet-500/10 text-violet-300',
  'E-commerce': 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  'Internal Tools': 'border-slate-500/40 bg-slate-500/10 text-slate-300',
};

const CATEGORIES = ['All', 'SaaS', 'Dashboard', 'AI/Chat', 'E-commerce', 'Internal Tools'] as const;

const TEMPLATES: Template[] = [
  {
    slug: 'saas-starter',
    name: 'SaaS Starter',
    description: 'Full-stack SaaS boilerplate with billing, auth, and a ready-made dashboard.',
    category: 'SaaS',
    stack: ['Next.js', 'Supabase', 'Stripe'],
    stars: 2_840,
    popular: true,
    icon: <Zap className="h-5 w-5" />,
  },
  {
    slug: 'ai-chatbot',
    name: 'AI Chatbot',
    description: 'Streaming AI chat with persistent memory, conversation history, and multi-model support.',
    category: 'AI/Chat',
    stack: ['Next.js', 'Vercel AI SDK', 'Redis'],
    stars: 1_930,
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    slug: 'analytics-dashboard',
    name: 'Analytics Dashboard',
    description: 'Interactive analytics UI with charts, dimension filters, and CSV export.',
    category: 'Dashboard',
    stack: ['Next.js', 'Recharts', 'Postgres'],
    stars: 1_420,
    icon: <BarChart2 className="h-5 w-5" />,
  },
  {
    slug: 'crm-lite',
    name: 'CRM Lite',
    description: 'Lightweight CRM with contact management, deal pipeline, and activity notes.',
    category: 'Internal Tools',
    stack: ['Next.js', 'Supabase', 'Tailwind'],
    stars: 980,
    icon: <Briefcase className="h-5 w-5" />,
  },
  {
    slug: 'ecommerce-store',
    name: 'E-commerce Store',
    description: 'Full storefront with product catalog, cart, checkout, and Stripe payments.',
    category: 'E-commerce',
    stack: ['Next.js', 'Stripe', 'Sanity'],
    stars: 2_110,
    popular: true,
    icon: <ShoppingCart className="h-5 w-5" />,
  },
  {
    slug: 'internal-admin',
    name: 'Internal Admin',
    description: 'CRUD admin panel with server-side search, pagination, and role-based access.',
    category: 'Internal Tools',
    stack: ['Next.js', 'Prisma', 'Postgres'],
    stars: 760,
    icon: <Settings className="h-5 w-5" />,
  },
  {
    slug: 'document-ai',
    name: 'Document AI',
    description: 'Upload documents, extract structured data, and generate AI-powered summaries.',
    category: 'AI/Chat',
    stack: ['Next.js', 'LangChain', 'Pinecone'],
    stars: 1_650,
    icon: <FileText className="h-5 w-5" />,
  },
  {
    slug: 'workflow-automator',
    name: 'Workflow Automator',
    description: 'Visual workflow builder with triggers, conditions, and multi-step action chains.',
    category: 'Internal Tools',
    stack: ['Next.js', 'Temporal', 'Redis'],
    stars: 870,
    icon: <GitBranch className="h-5 w-5" />,
  },
  {
    slug: 'feedback-collector',
    name: 'Feedback Collector',
    description: 'Custom feedback forms, response inbox, tagging, and built-in analytics.',
    category: 'SaaS',
    stack: ['Next.js', 'Supabase', 'Resend'],
    stars: 610,
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    slug: 'team-wiki',
    name: 'Team Wiki',
    description: 'Collaborative documentation with full-text search and page versioning.',
    category: 'Internal Tools',
    stack: ['Next.js', 'MDX', 'Postgres'],
    stars: 730,
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    slug: 'job-board',
    name: 'Job Board',
    description: 'Post job listings, collect applications, and manage candidate status.',
    category: 'SaaS',
    stack: ['Next.js', 'Supabase', 'Resend'],
    stars: 540,
    icon: <Briefcase className="h-5 w-5" />,
  },
  {
    slug: 'invoice-generator',
    name: 'Invoice Generator',
    description: 'Create PDF invoices, send by email, and collect payments via Stripe.',
    category: 'SaaS',
    stack: ['Next.js', 'Stripe', 'Resend'],
    stars: 890,
    icon: <Receipt className="h-5 w-5" />,
  },
];

function formatStars(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default function TemplatesPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>('All');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return TEMPLATES.filter((t) => {
      const matchesCategory = activeCategory === 'All' || t.category === activeCategory;
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.stack.some((s) => s.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <section className="rounded-3xl border border-indigo-500/20 bg-indigo-500/10 p-6 shadow-2xl shadow-indigo-950/30 md:p-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">
            <Zap className="h-3.5 w-3.5" /> App Templates
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-5xl">App Templates</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
            Start building faster with production-ready templates. Pick one, customise it, and ship.
          </p>
        </section>

        {/* Search + filter */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${
                  activeCategory === cat
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-slate-500">
          {filtered.length} template{filtered.length !== 1 ? 's' : ''}{activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900 py-24 text-center">
            <Search className="mb-4 h-10 w-10 text-slate-600" />
            <p className="text-lg font-bold text-slate-300">No templates found</p>
            <p className="mt-1 text-sm text-slate-500">Try a different search term or category.</p>
            <button
              onClick={() => { setSearch(''); setActiveCategory('All'); }}
              className="mt-6 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-500"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((template) => (
              <div
                key={template.slug}
                className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-slate-700"
              >
                {/* Icon + badges */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-300">
                    {template.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    {template.popular && (
                      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                        Popular
                      </span>
                    )}
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CATEGORY_COLORS[template.category]}`}>
                      {template.category}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-black text-slate-100">{template.name}</h3>
                <p className="mt-1 flex-1 text-sm leading-6 text-slate-400">{template.description}</p>

                {/* Stack tags */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {template.stack.map((tag) => (
                    <span key={tag} className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-[11px] text-slate-400">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-5 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Star className="h-3.5 w-3.5 text-amber-400" />
                    {formatStars(template.stars)}
                  </span>
                  <a
                    href={`/dsg/app-builder?template=${template.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                  >
                    Use template <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
