import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable error overlay in development
  reactStrictMode: false,
  
  // API configuration for larger file uploads
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  
  // Temporarily allow build with ESLint warnings for testing
  // TODO: Set to false once all ESLint errors are fixed
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Temporarily allow build with TypeScript errors for testing
  // TODO: Set to false once all TypeScript errors are fixed
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
};

// Injected content via Sentry wizard below
export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "dtf-editor",
  project: "dtf-editor",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});