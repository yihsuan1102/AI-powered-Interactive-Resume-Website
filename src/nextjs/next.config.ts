import type { NextConfig } from 'next'
import createMDX from '@next/mdx'

const baseConfig: NextConfig = {
  pageExtensions: ['mdx', 'ts', 'tsx'],
  experimental: {
    mdxRs: true,
  },
}

const withMDX = createMDX({})

const nextConfig = withMDX(baseConfig)

export default nextConfig
