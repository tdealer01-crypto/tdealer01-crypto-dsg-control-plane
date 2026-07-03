/**
 * app/robots.ts — Next.js metadata route serving /robots.txt
 * Public marketing/SEO pages are crawlable; operator/API surfaces are not.
 */

import type { MetadataRoute } from 'next';

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.APP_URL ??
  'https://tdealer01-crypto-dsg-control-plane.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/api/', '/approvals', '/gateway', '/app-shell', '/admin'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
