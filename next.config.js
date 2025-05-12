/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable static optimization for improved Vercel deployment
  output: 'standalone',
  // Configure env vars we need on the client
  env: {
    // Set a flag for development vs production to customize behavior
    IS_VERCEL_DEPLOYMENT: process.env.VERCEL === '1' ? 'true' : 'false'
  },
  // Don't include the database connection in the client bundle
  experimental: {
    serverExternalPackages: ['pg']
  }
};

module.exports = nextConfig; 