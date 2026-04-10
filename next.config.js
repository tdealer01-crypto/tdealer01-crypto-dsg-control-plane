/** @type {import('next').NextConfig} */

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

function buildAllowedOrigins() {
  const explicitList = String(process.env.DSG_ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => parseOrigin(item))
    .filter(Boolean);

  const appOrigin = parseOrigin(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL);
  const vercelOrigin = parseOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    ? parseOrigin(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    : null;

  return unique([...explicitList, appOrigin, vercelOrigin]);
}

function buildConnectSrc() {
  const coreOrigin = parseOrigin(process.env.DSG_CORE_URL);

  return unique(["'self'", 'https://*.supabase.co', 'https://api.stripe.com', coreOrigin]).join(' ');
}

const allowedOrigins = buildAllowedOrigins();
const primaryCorsOrigin = allowedOrigins[0] || null;

const apiCorsHeaders = primaryCorsOrigin
  ? [
      { key: 'Access-Control-Allow-Origin', value: primaryCorsOrigin },
      { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
      {
        key: 'Access-Control-Allow-Headers',
        value: 'Authorization,Content-Type,X-Requested-With,Idempotency-Key',
      },
      { key: 'Access-Control-Allow-Credentials', value: 'true' },
      { key: 'Access-Control-Max-Age', value: '600' },
      { key: 'Vary', value: 'Origin' },
    ]
  : [];

const nextConfig = {
  async headers() {
    const routes = [
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
              "script-src 'self' 'unsafe-inline' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
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

    if (apiCorsHeaders.length > 0) {
      routes.push({
        source: '/api/:path*',
        headers: apiCorsHeaders,
      });
    }

    return routes;
  },
};

module.exports = nextConfig;
