import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 以下包含原生模块或复杂依赖，不由 Next.js 打包，直接从 node_modules 读取
  serverExternalPackages: ['bcryptjs', 'postgres', 'nodemailer'],
};

export default nextConfig;
