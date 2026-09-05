/**
 * app/robots.ts — Next.js metadata route serving /robots.txt
 * Public marketing/SEO pages are crawlable; operator/API surfaces are not.
 */

import type { MetadataRoute } from 'next';

const BASE_URL = 'https://www.dsg.pics';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/api/',
          '/approvals',
          '/gateway',
          '/app-shell',
          '/admin',
          '/auth/',
          '/checkout/',
          '/login',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
