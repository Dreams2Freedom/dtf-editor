import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // onnxruntime-web uses Node.js modules that need to be excluded from the browser bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Handle .onnx files as static assets
    config.module.rules.push({
      test: /\.onnx$/,
      type: 'asset/resource',
    });

    return config;
  },
};

export default nextConfig;
