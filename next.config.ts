import type { NextConfig } from "next";
//import webpack from "webpack";
//import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/convert-to-audio": ["./node_modules/pdfjs-dist/**/*"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
