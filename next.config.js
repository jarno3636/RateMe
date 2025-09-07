// next.config.js
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        encoding: false,
        'pino-pretty': false,
      }
    }
    return config
  },
}
module.exports = nextConfig
