/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Skip ESLint during production builds to avoid requiring ESLint dependency
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
