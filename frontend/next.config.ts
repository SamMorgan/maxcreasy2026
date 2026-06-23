import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL('https://cdn.sanity.io/**')],
  },
  // Allow LAN IP access in dev (separate origin from localhost — separate cache + Sanity CORS)
  allowedDevOrigins: ['192.168.1.168:3000'],
}

export default nextConfig
