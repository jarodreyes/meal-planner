import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * pdf-parse ships as CommonJS; mark as external so it can run in the
     * app router API routes without bundling errors.
     */
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

export default nextConfig;
