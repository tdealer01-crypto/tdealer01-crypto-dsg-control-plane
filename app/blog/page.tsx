import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — AI Governance & EU AI Act | DSG ONE',
  description: 'Practical guides on AI agent governance, EU AI Act compliance, and pre-execution control for fintech and regulated industries.',
};

type Article = {
  id: string;
  title: string;
  slug: string;
  keyword: string;
  meta_description: string;
  created_at: string;
};

async function getArticles(): Promise<Article[]> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tdealer01-crypto-dsg-control-plane.vercel.app';
    const res = await fetch(`${base}/api/blog`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json() as { articles: Article[] };
    return data.articles ?? [];
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const articles = await getArticles();

  return (
    <main className="min-h-screen bg-slate-950 pt-20 pb-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-12">
          <p className="text-sm font-semibold tracking-widest text-amber-400 uppercase mb-3">Blog</p>
          <h1 className="text-4xl font-bold text-white mb-4">AI Governance &amp; EU AI Act</h1>
          <p className="text-slate-400 text-lg">
            Practical guides on pre-execution AI control, audit trails, and compliance for teams building AI agents.
          </p>
        </div>

        {articles.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
            <p className="text-slate-400">Articles are generated weekly. Check back soon.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/blog/${article.slug}`}
                className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-amber-500/40 hover:bg-slate-900 transition-all"
              >
                <p className="text-xs text-slate-500 mb-2">
                  {new Date(article.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  {article.keyword && (
                    <span className="ml-3 text-amber-400/70">{article.keyword}</span>
                  )}
                </p>
                <h2 className="text-xl font-semibold text-white group-hover:text-amber-400 transition-colors mb-2">
                  {article.title}
                </h2>
                {article.meta_description && (
                  <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
                    {article.meta_description}
                  </p>
                )}
                <p className="mt-3 text-sm text-amber-400 font-medium">Read article →</p>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-16 rounded-xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Ready to add governance to your AI agent?</h3>
          <p className="text-slate-400 mb-6">One REST call. No SDK. Works with LangChain, CrewAI, OpenAI Agents, and more.</p>
          <Link
            href="/quickstart"
            className="inline-block rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-amber-400 transition-colors"
          >
            Get started free →
          </Link>
        </div>
      </div>
    </main>
  );
}
