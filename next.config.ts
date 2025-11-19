import type { NextConfig } from "next";
import webpack from "webpack";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist"],
  },
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
