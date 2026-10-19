import type { NextConfig } from 'next';

const apiProxyUrl = (process.env.API_PROXY_URL ?? 'http://localhost:4000').replace(/\/$/, '');

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiProxyUrl}/api/:path*` }];
  },
};

export default nextConfig;
