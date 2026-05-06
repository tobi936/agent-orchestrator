import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['dockerode', '@prisma/client'],
}

export default nextConfig
