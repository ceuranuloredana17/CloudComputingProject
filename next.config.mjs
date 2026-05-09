/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["mongodb"],
  experimental: {
    middlewareClientMaxBodySize: 50 * 1024 * 1024, // 50MB
  },
};

export default nextConfig;
