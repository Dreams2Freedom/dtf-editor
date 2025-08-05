/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable error overlay in development
  reactStrictMode: false,
  
  // Allow builds with ESLint warnings
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Allow builds with TypeScript errors
  typescript: {
    ignoreBuildErrors: true,
  },
  onDemandEntries: {
    // Disable error overlay
    maxInactiveAge: 1000 * 60 * 60
  },
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-toast'
    ],
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'neuroapi-store.s3.eu-central-1.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'deep-image.ai',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
    ],
  },
  
  // Bundle analyzer (for development)
  webpack: (config, { dev, isServer }) => {
    // Disable error overlay completely
    if (dev) {
      // Disable React error overlay
      config.resolve.alias['react-error-overlay'] = require.resolve('./src/lib/noop.js');
      
      // Disable webpack hot dev client overlay
      const ReactRefreshWebpackPlugin = config.plugins.find(
        plugin => plugin.constructor.name === 'ReactRefreshWebpackPlugin'
      );
      if (ReactRefreshWebpackPlugin) {
        ReactRefreshWebpackPlugin.options.overlay = false;
      }
    }
    
    // Optimize bundle in production
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }
    
    return config;
  },
  
  // Compression
  compress: true,
  
  // PoweredBy header removal
  poweredByHeader: false,
  
  // Generate ETags for better caching
  generateEtags: true,
  
  // API configuration
  serverRuntimeConfig: {
    // Will only be available on the server-side
    bodySizeLimit: '50mb',
  },
  
  // Experimental features for API routes
  experimental: {
    // ... existing experimental config ...
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-toast'
    ],
  },
};

module.exports = nextConfig;