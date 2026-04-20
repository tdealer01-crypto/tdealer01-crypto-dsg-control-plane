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

function resolveRemoteApiOrigin() {
  return parseOrigin(process.env.DSG_REMOTE_API_URL || process.env.NEXT_PUBLIC_DSG_REMOTE_API_URL);
}

function buildConnectSrc() {
  const coreOrigin = parseOrigin(process.env.DSG_CORE_URL);
  const remoteApiOrigin = resolveRemoteApiOrigin();

  return unique(["'self'", 'https://*.supabase.co', 'https://api.stripe.com', coreOrigin, remoteApiOrigin]).join(' ');
}

function buildScriptSrc() {
  const base = ["'self'", "'unsafe-inline'", 'https://js.stripe.com'];
  if (process.env.NODE_ENV !== 'production') {
    base.push("'unsafe-eval'");
  }
  return unique(base).join(' ');
}

const nextConfig = {

  async rewrites() {
    const remoteApiOrigin = resolveRemoteApiOrigin();
    if (!remoteApiOrigin) return [];

    return [
      {
        source: '/api/:path*',
        destination: `${remoteApiOrigin}/api/:path*`,
      },
    ];
  },

  async headers() {
    // API CORS is intentionally handled at route level via lib/security/cors.ts.
    return [
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
  },
};

module.exports = nextConfig;
