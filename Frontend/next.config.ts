import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    proxyClientMaxBodySize: "50mb",
  },
  serverExternalPackages: ['pdf-parse', 'ws', '@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg'],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@ffmpeg-installer/**/*"],
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
