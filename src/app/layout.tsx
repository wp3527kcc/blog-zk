import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '博客 · Blog',
  description: '一个简单的博客平台',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gray-50 antialiased">
        <Navbar />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
