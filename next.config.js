/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === "production" ? ".next-prod" : ".next-dev",
  webpack: (config, { dev }) => {
    // Prevent flaky local chunk-cache corruption in dev on Windows.
    if (dev) {
      config.cache = false;
    }
    return config;
  },
}
module.exports = nextConfig
