import type {NextConfig} from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["lpjkp0xm-3000.euw.devtunnels.ms"]
    }
  }
};

export default withNextIntl(nextConfig);
