/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  webpack: (config, { dev }) => {
    // Prevent flaky local chunk-cache corruption in dev on Windows.
    if (dev) {
      config.cache = false;
    }
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    };
    return config;
  },
}
module.exports = nextConfig
