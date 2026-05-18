import Link from 'next/link';
import type { Metadata } from 'next';

type Article = {
  id: string;
  title: string;
  slug: string;
  keyword: string;
  meta_description: string;
  body: string;
  created_at: string;
};

async function getArticle(slug: string): Promise<Article | null> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tdealer01-crypto-dsg-control-plane.vercel.app';
    const res = await fetch(`${base}/api/blog/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json() as Promise<Article>;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: 'Article not found — DSG ONE' };
  return {
    title: `${article.title} | DSG ONE`,
    description: article.meta_description,
    openGraph: { title: article.title, description: article.meta_description },
  };
}

function renderMarkdown(md: string): string {
  return md
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold text-white mt-8 mb-4">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-semibold text-white mt-8 mb-3">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold text-slate-200 mt-6 mb-2">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="text-slate-300 mb-1 ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="text-slate-300 mb-1 ml-4 list-decimal">$2</li>')
    .replace(/\n\n/g, '</p><p class="text-slate-300 leading-relaxed mb-4">')
    .replace(/^(?!<[h|l|p])(.+)$/gm, '<p class="text-slate-300 leading-relaxed mb-4">$1</p>');
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return (
      <main className="min-h-screen bg-slate-950 pt-20 pb-24">
        <div className="mx-auto max-w-3xl px-6 text-center py-24">
          <h1 className="text-2xl font-bold text-white mb-4">Article not found</h1>
          <Link href="/blog" className="text-amber-400 hover:underline">← Back to blog</Link>
        </div>
      </main>
    );
  }

  const htmlBody = renderMarkdown(article.body);

  return (
    <main className="min-h-screen bg-slate-950 pt-20 pb-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-8">
          <Link href="/blog" className="text-sm text-slate-500 hover:text-amber-400 transition-colors">
            ← Blog
          </Link>
        </div>

        <article>
          <header className="mb-10">
            {article.keyword && (
              <p className="text-xs font-semibold tracking-widest text-amber-400 uppercase mb-3">
                {article.keyword}
              </p>
            )}
            <h1 className="text-3xl font-bold text-white leading-tight mb-4">{article.title}</h1>
            {article.meta_description && (
              <p className="text-lg text-slate-400 leading-relaxed mb-4">{article.meta_description}</p>
            )}
            <p className="text-sm text-slate-500">
              {new Date(article.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </header>

          <div
            className="prose-dsg"
            dangerouslySetInnerHTML={{ __html: htmlBody }}
          />
        </article>

        <div className="mt-16 rounded-xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Add governance to your AI agent in minutes</h3>
          <p className="text-slate-400 mb-6">One REST call. No SDK. Cryptographic audit trail included.</p>
          <Link
            href="/quickstart"
            className="inline-block rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-amber-400 transition-colors"
          >
            Try the quickstart →
          </Link>
        </div>
      </div>
    </main>
  );
}
