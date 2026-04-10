'use client';

import { deletePost } from '@/lib/actions';

export default function DeleteButton({ postId }: { postId: number }) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm('确定要删除这篇文章吗？')) {
      e.preventDefault();
    }
  };

  return (
    <form onSubmit={handleSubmit} action={deletePost.bind(null, postId)}>
      <button
        type="submit"
        className="text-xs text-gray-300 hover:text-red-400 transition-colors"
      >
        删除
      </button>
    </form>
  );
}
