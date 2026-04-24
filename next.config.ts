import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Fix for Windows/OneDrive symlink issues
  experimental: {
    // Disable problematic features for OneDrive
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Ensure proper file handling on Windows
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Fix for OneDrive path issues
    config.resolve.symlinks = false;
    config.watchOptions = {
      ...config.watchOptions,
      ignored: /node_modules/,
      poll: 1000,
    };
    return config;
  },
  // Ensure proper output directory
  distDir: '.next',
  // Fix for Windows file system - remove standalone output for now
  // output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `http://localhost:${process.env.BACKEND_PORT || 5000}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
