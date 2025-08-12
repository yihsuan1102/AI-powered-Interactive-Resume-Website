import type { NextConfig } from 'next'
import createMDX from '@next/mdx'

const baseConfig: NextConfig = {
  pageExtensions: ['mdx', 'ts', 'tsx'],
  experimental: {
    mdxRs: true,
  },
  eslint: {
    // Skip ESLint during production builds to avoid requiring ESLint dependency
    ignoreDuringBuilds: true,
  },
}

const withMDX = createMDX({})

const nextConfig = withMDX(baseConfig)

export default nextConfig
