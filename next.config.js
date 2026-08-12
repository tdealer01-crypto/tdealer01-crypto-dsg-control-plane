/** @type {import('next').NextConfig} */

function loadMarkdocConfig() {
  try {
    const withMarkdoc = require('@markdoc/next.js');
    return withMarkdoc()({ pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdoc'] });
  } catch {
    return {};
  }
}

const markdocConfig = loadMarkdocConfig();

// Merge markdoc config with our custom config
const { ...markdocRest } = markdocConfig;

function parseOrigin(url) {
  if (!url) return null;

  try {
    const parsed = new URL(String(url).trim());
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.origin;
    }
  } catch {}

  return null;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function resolveRemoteApiOrigin() {
  return parseOrigin(process.env.DSG_REMOTE_API_URL || process.env.NEXT_PUBLIC_DSG_REMOTE_API_URL);
}

function resolveCanonicalResponseOrigin() {
  const appOrigin = parseOrigin(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL);
  const vercelProductionOrigin = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? parseOrigin(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    : null;
  const vercelDeploymentOrigin = process.env.VERCEL_URL
    ? parseOrigin(`https://${process.env.VERCEL_URL}`)
    : null;

  return appOrigin
    || vercelProductionOrigin
    || vercelDeploymentOrigin
    || 'http://localhost:3000'; // Development fallback only
}

function buildConnectSrc() {
  const coreOrigin = parseOrigin(process.env.DSG_CORE_URL);
  const remoteApiOrigin = resolveRemoteApiOrigin();

  return unique([
    "'self'",
    'https://*.supabase.co',
    'https://api.stripe.com',
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
    coreOrigin,
    remoteApiOrigin,
  ]).join(' ');
}

function buildScriptSrc() {
  const base = [
    "'self'",
    "'unsafe-inline'",
    'https://js.stripe.com',
    'https://www.googletagmanager.com',
  ];
  if (process.env.NODE_ENV !== 'production') {
    base.push("'unsafe-eval'");
  }
  return unique(base).join(' ');
}

const nextConfig = {
  // Next.js 16 requires turbopack config when plugins add webpack configuration
  turbopack: {},

  // Playwright's default e2e baseURL is http://127.0.0.1:3000 (see playwright.config.ts).
  // Next dev treats 127.0.0.1 as cross-origin from the "localhost" the dev server binds to,
  // so it silently blocks the Turbopack HMR bootstrap request for that origin. That bootstrap
  // failure prevents client component hydration entirely on any page loaded via 127.0.0.1,
  // which is why client-side useEffect data fetches (and anything gated on their state, like
  // a submit button) never run in e2e runs. This does not affect `next build`/`next start`.
  allowedDevOrigins: ['127.0.0.1'],

  async redirects() {
    return [
      {
        source: '/finance-governance/live/server-store',
        destination: '/finance-governance/live/workspace',
        permanent: true,
      },
      {
        source: '/finance-governance/live/server-store/:path*',
        destination: '/finance-governance/live/workspace/:path*',
        permanent: true,
      },
      {
        source: '/docs/llms.txt',
        destination: '/llms.txt',
        permanent: false,
      },
      {
        source: '/docs/llms-full.txt',
        destination: '/llms-full.txt',
        permanent: false,
      },
    ];
  },

  async rewrites() {
    const remoteApiOrigin = resolveRemoteApiOrigin();
    if (!remoteApiOrigin) return [];

    return [
      {
        source: '/api/dsg/z3/:path*',
        destination: '/api/dsg/z3/:path*',
      },
      {
        source: '/api/:path*',
        destination: `${remoteApiOrigin}/api/:path*`,
      },
    ];
  },

  async headers() {
    // API CORS is intentionally handled at route level via lib/security/cors.ts.
    // Non-API document/static responses should never expose wildcard CORS.
    const canonicalResponseOrigin = resolveCanonicalResponseOrigin();

    return [
      {
        source: '/((?!api/).*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: canonicalResponseOrigin },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src ${buildScriptSrc()}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com",
              `connect-src ${buildConnectSrc()}`,
              'frame-src https://js.stripe.com',
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = { ...markdocRest, ...nextConfig };
