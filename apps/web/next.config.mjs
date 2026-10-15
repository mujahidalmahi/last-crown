/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@last-crown/shared', '@last-crown/game-config', '@last-crown/game-core'],
  webpack: config => {
    // Avoid bundling server-only or browser-unsafe modules in SSR
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  async rewrites() {
    const serverUrl =
      process.env.SERVER_URL || process.env.NEXT_PUBLIC_SERVER_HTTP_URL || 'http://localhost:2567';
    return [
      {
        source: '/api/:path*',
        destination: `${serverUrl}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${serverUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
