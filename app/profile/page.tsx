'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, setCurrentUser } from '@/lib/api';
import type { User } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUserState(user);
  }, [router]);

  const handleLogout = () => {
    setCurrentUser(null);
    router.push('/login');
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold neon-glow text-purple-400">用户中心</h1>
          <button
            onClick={() => router.push('/')}
            className="whitespace-nowrap px-6 py-3 bg-slate-800 rounded-lg font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
          >
            返回大厅
          </button>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/50 rounded-xl p-8 scanlines">
          <div className="flex items-center gap-6 mb-8">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-24 h-24 rounded-full border-4 border-purple-500 object-cover"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="text-2xl font-bold text-purple-300">{currentUser.name}</h2>
              <p className="text-slate-400">邮箱: {currentUser.email}</p>
              <p className="text-slate-400">ID: {currentUser.id}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="whitespace-nowrap w-full px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 rounded-lg font-semibold hover:scale-105 transition-transform cursor-pointer"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
}
