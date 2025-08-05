import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["lpjkp0xm-3000.euw.devtunnels.ms"],
    },
  },
};

export default nextConfig;
