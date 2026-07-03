/**
 * app/sitemap.ts — Next.js metadata route serving /sitemap.xml
 *
 * Static entries cover every public marketing/SEO/selling surface.
 * Dynamic entries add published blog articles from `marketing_content`
 * (same query shape as app/api/blog/route.ts). Any Supabase failure
 * falls back to the static list so the build/request never breaks.
 */

import type { MetadataRoute } from 'next';
import { getSupabaseAdmin } from '../lib/supabase-server';

export const dynamic = 'force-dynamic';

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.APP_URL ??
  'https://tdealer01-crypto-dsg-control-plane.vercel.app';

// Public pages that exist as routes in app/ and are worth indexing.
const STATIC_PATHS: Array<{ path: string; priority: number }> = [
  { path: '/', priority: 1.0 },
  { path: '/pricing', priority: 0.9 },
  { path: '/delivery-proof', priority: 0.9 },
  { path: '/finance-governance/pricing', priority: 0.9 },
  { path: '/finance-approval-gate', priority: 0.8 },
  { path: '/marketplace', priority: 0.8 },
  { path: '/marketplace/skills', priority: 0.8 },
  { path: '/blog', priority: 0.8 },
  { path: '/compliance-evidence-pack', priority: 0.7 },
  { path: '/eu-ai-act', priority: 0.7 },
  { path: '/iso-42001', priority: 0.7 },
  { path: '/nist-ai-rmf', priority: 0.7 },
  { path: '/ai-compliance', priority: 0.7 },
  { path: '/enterprise-ready', priority: 0.6 },
  { path: '/playground', priority: 0.6 },
];

async function fetchBlogSlugs(): Promise<Array<{ slug: string; created_at: string | null }>> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await (admin as any)
      .from('marketing_content')
      .select('slug, created_at')
      .eq('type', 'seo_article')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error || !data) return [];
    return data.filter((row: { slug?: string | null }) => typeof row.slug === 'string' && row.slug.length > 0);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority,
  }));

  const blogEntries: MetadataRoute.Sitemap = (await fetchBlogSlugs()).map((row) => ({
    url: `${BASE_URL}/blog/${encodeURIComponent(row.slug)}`,
    lastModified: row.created_at ? new Date(row.created_at) : now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [...staticEntries, ...blogEntries];
}
