import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't externalize pdf-parse - let it bundle for serverless compatibility
  // serverExternalPackages: ['pdf-parse'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure pdf-parse and pdfjs-dist are properly bundled
      config.resolve.alias = {
        ...config.resolve.alias,
      };
      // Don't externalize - bundle for serverless
      // config.externals = config.externals.filter((external) => {
      //   return external !== 'pdf-parse';
      // });
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
