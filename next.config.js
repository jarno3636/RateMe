// next.config.js
/** @type {import('next').NextConfig} */
const IS_PROD = process.env.NODE_ENV === "production";

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Smaller Docker image / faster cold starts for Node runtimes
  output: "standalone",
  // Trim client bundles in prod (still get server stack traces)
  productionBrowserSourceMaps: false,
  // Remove the X-Powered-By header
  poweredByHeader: false,

  experimental: {
    // Speeds up startup and trims bundle size for common libs
    optimizePackageImports: [
      "react",
      "react-dom",
      "@tanstack/react-query",
      "lucide-react",
    ],
  },

  /**
   * Images: allow common creator-hosted gateways.
   * You can tighten further once you know exactly where assets come from.
   */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.blob.vercel-storage.com" },
      { protocol: "https", hostname: "ipfs.io" },
      { protocol: "https", hostname: "*.ipfs.io" },
      { protocol: "https", hostname: "nftstorage.link" },
      { protocol: "https", hostname: "*.nftstorage.link" },
      { protocol: "https", hostname: "cloudflare-ipfs.com" },
      { protocol: "https", hostname: "*.cf-ipfs.com" },
      { protocol: "https", hostname: "arweave.net" },
      { protocol: "https", hostname: "**" }, // keep a wide fallback during development
    ],
  },

  /**
   * Edge headers for caching & safety. Most security headers (CSP/frame-ancestors)
   * live in middleware for dynamic control, but we still set some cache policies here.
   */
  async headers() {
    return [
      // Default: avoid accidental caching of API responses
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      // Long cache for Next static assets
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Long cache for public images (og.png, icons, etc.)
      {
        source: "/:all*(png|jpg|jpeg|gif|webp|ico|svg)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  /**
   * Friendly redirects:
   *  - /@handle → /creator/resolve/handle
   *  - /creator/@handle → /creator/resolve/handle
   *  - /c/handle → /creator/resolve/handle
   *  - www → apex (prod only)
   */
  async redirects() {
    const redirects = [
      {
        source: "/@:handle",
        destination: "/creator/resolve/:handle",
        permanent: true,
      },
      {
        source: "/creator/@:handle",
        destination: "/creator/resolve/:handle",
        permanent: true,
      },
      {
        source: "/c/:handle",
        destination: "/creator/resolve/:handle",
        permanent: true,
      },
    ];

    if (IS_PROD) {
      redirects.push({
        // Drop www → apex
        source: "/:path*",
        has: [{ type: "host", value: /^www\.(.*)$/i }],
        destination: "https://:path*",
        permanent: true,
      });
    }

    return redirects;
  },

  /**
   * Webpack tweaks for client builds (silence optional deps).
   */
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        encoding: false,
        "pino-pretty": false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
