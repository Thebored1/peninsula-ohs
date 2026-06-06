import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@carbon/react', '@carbon/icons-react'],
  experimental: {
    optimizePackageImports: ['@supabase/ssr'],
  },
}

export default nextConfig
