import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3001", "lpjkp0xm-3001.euw.devtunnels.ms"],
    },
  },
};

export default nextConfig;
