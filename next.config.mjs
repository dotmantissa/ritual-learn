/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
          {
            source: '/learn',
            destination: '/',
          },
        ]
      },
};

export default nextConfig;
