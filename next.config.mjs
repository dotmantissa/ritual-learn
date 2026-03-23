/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/learn',
        destination: '/learn.html',
      },
    ]
  },
};

export default nextConfig;
