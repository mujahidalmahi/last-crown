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
};

export default nextConfig;
