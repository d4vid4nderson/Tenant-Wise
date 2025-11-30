import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export if needed for certain deployments
  // output: 'export',

  // Fix Turbopack workspace root detection
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Move dev indicator to bottom right
  devIndicators: {
    position: 'bottom-right',
  },

  // Image optimization settings
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // Environment variables that should be available client-side
  env: {
    NEXT_PUBLIC_APP_NAME: 'Tenant Wise',
  },
};

export default nextConfig;
