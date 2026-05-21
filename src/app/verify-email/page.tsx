import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifyEmail } from '@/lib/actions';

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

async function VerifyEmailResult({ token }: { token: string }) {
  const result = await verifyEmail(token);

  if (result.success) {
    return (
      <>
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">验证成功</h1>
        <p className="text-gray-500 mb-6">{result.success}</p>
        <Link
          href="/login"
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium px-8 py-2.5 rounded-lg transition-colors"
        >
          前往登录
        </Link>
      </>
    );
  }

  const isExpired = result.data?.expired;

  return (
    <>
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">验证失败</h1>
      <p className="text-gray-500 mb-6">{result.error}</p>
      <div className="flex gap-3 justify-center">
        {isExpired ? (
          <Link
            href="/login"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            去登录重新发送
          </Link>
        ) : (
          <Link
            href="/"
            className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            返回首页
          </Link>
        )}
      </div>
    </>
  );
}

function LoadingState() {
  return (
    <>
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
        <div className="w-8 h-8 bg-gray-300 rounded" />
      </div>
      <div className="h-8 bg-gray-200 rounded w-32 mx-auto mb-2 animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-48 mx-auto animate-pulse" />
    </>
  );
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    redirect('/');
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Suspense fallback={<LoadingState />}>
          <VerifyEmailResult token={token} />
        </Suspense>
      </div>
    </div>
  );
}
