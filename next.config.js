/** @type {import('next').NextConfig} */
const configuredAppUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;

function resolveCorsOrigin(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.origin;
    }
  } catch {
    return null;
  }

  return null;
}

const corsOrigin = resolveCorsOrigin(configuredAppUrl);
const apiCorsHeaders = corsOrigin
  ? [
      { key: 'Access-Control-Allow-Origin', value: corsOrigin },
      { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
      { key: 'Access-Control-Allow-Headers', value: 'Authorization,Content-Type,X-Requested-With' },
      { key: 'Access-Control-Allow-Credentials', value: 'true' },
      { key: 'Vary', value: 'Origin' },
    ]
  : [];

const nextConfig = {
  async headers() {
    const defaultHeaders = {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
      ],
    };

    const routes = [defaultHeaders];

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
