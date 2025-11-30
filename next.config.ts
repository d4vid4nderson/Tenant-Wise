import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export if needed for certain deployments
  // output: 'export',

  // Mark packages that should not be bundled for server-side code
  // This prevents build-time initialization errors for SDKs that require env vars
  serverExternalPackages: ['@anthropic-ai/sdk'],

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
