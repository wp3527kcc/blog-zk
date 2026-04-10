import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 允许 <img> 标签加载火山云 CDN 的图片
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static-prod.ituchong.com',
        pathname: '/**',
      },
    ],
  },

  // 以下包含原生模块或复杂依赖，不由 Next.js 打包，直接从 node_modules 读取
  serverExternalPackages: ['bcryptjs', 'postgres', '@volcengine/tos-sdk'],
};

export default nextConfig;
