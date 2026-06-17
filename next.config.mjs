/** @type {import('next').NextConfig} */
const nextConfig = {
    async redirects() {
        return [
          { source: '/services', destination: '/spa', permanent: true }, // 老 -> 新
        ];
      },
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true,
    },
};
export default nextConfig;
