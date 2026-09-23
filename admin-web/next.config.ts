import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer", "puppeteer-core"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
