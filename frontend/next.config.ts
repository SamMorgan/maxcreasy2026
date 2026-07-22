import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL('https://cdn.sanity.io/**')],
  },
  // Allow LAN IP access in dev (HMR websocket + Sanity cross-origin)
  allowedDevOrigins: [
    'localhost',
    'localhost:3000',
    '10.0.0.23',
    '10.0.0.23:3000',
    '192.168.1.168',
    '192.168.1.168:3000',
  ],
}

export default nextConfig
