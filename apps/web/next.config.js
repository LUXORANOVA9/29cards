/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: {
    buildActivity: false,
  },
  // Explicitly disable analytics if this project was cloned from a Vercel template
  analyticsId: '', 
  images: {
    domains: ['localhost'],
  },
};

module.exports = nextConfig;
