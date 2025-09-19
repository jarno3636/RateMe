// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Speeds up startup and trims bundle size for common libs
    optimizePackageImports: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'lucide-react',
    ],
  },
  // Loosen this or restrict to your known domains as you lock down avatars/assets
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        encoding: false,
        'pino-pretty': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
