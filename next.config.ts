import type {NextConfig} from 'next';

function isTermuxBuildEnvironment() {
  return Boolean(
    process.env.TERMUX_VERSION ||
    process.env.PREFIX?.includes('/com.termux') ||
    process.env.HOME?.includes('/com.termux') ||
    process.env.DSG_DISABLE_WEBPACK_CACHE === 'true'
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // Termux/Android filesystem snapshots can fail inside webpack PackFileCacheStrategy.
    // Disable webpack's persistent filesystem cache there; this keeps builds deterministic
    // and avoids css-loader/postcss-loader failures surfaced from app/globals.css.
    if (isTermuxBuildEnvironment()) {
      config.cache = false;
    }

    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify-file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
