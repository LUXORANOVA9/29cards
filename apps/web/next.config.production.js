/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: {
    buildActivity: false,
  },
  // Explicitly disable analytics if this project was cloned from a Vercel template
  analyticsId: '', 
  images: {
    domains: ['localhost', 'vercel.app'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1',
    NEXT_PUBLIC_GAME_SERVICE_URL: process.env.NEXT_PUBLIC_GAME_SERVICE_URL || 'http://localhost:3002'
  },
  experimental: {
    serverComponentsExternalPackages: ['socket.io-client']
  }
};

module.exports = nextConfig;