const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist"],
    outputFileTracingIncludes: {
      "/api/convert-to-audio": ["./node_modules/pdfjs-dist/**/*"],
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};
