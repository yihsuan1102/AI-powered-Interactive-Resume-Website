import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    // Skip ESLint during production builds to avoid requiring ESLint dependency
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
