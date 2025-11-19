import type { NextConfig } from "next";
import webpack from "webpack";
import path from "path";

const nextConfig: NextConfig = {
  // pdf-parse and pdfjs-dist should be bundled, not externalized
  // This ensures it works in serverless environments
  // Note: By not adding pdfjs-dist to serverComponentsExternalPackages,
  // it will be bundled into the serverless function
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Replace worker file imports with mock to prevent module resolution errors
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /pdf\.worker\.(min\.)?(mjs|js)$/,
          path.resolve(__dirname, 'pdf-worker-mock.js')
        )
      );
    }
    return config;
  },
  eslint: {
    // Allow production builds to proceed even with linting errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to proceed even with type errors
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
