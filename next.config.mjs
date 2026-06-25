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
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'images.unsplash.com',
        },
      ],
    },
};
export default nextConfig;
