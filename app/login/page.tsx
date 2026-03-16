'use client';

import { useState } from 'react';
import { api, setCurrentUser } from '@/lib/api';
import { useRouter } from 'next/navigation';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!EMAIL_REGEX.test(email)) {
      alert('请输入有效的邮箱地址');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      alert('密码至少需要 6 位');
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        if (!name.trim()) {
          alert('请输入昵称');
          setLoading(false);
          return;
        }

        const user = await api.register(email, password, name.trim());
        setCurrentUser(user);
        router.push('/');
      } else {
        const user = await api.login(email, password);
        setCurrentUser(user);
        router.push('/');
      }
    } catch (err) {
      console.error('登录/注册失败:', err);
      alert(err instanceof Error ? err.message : '操作失败，请重试');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/50 rounded-xl p-8 max-w-md w-full scanlines">
        <h1 className="text-4xl font-bold text-center neon-glow text-purple-400 mb-8">赛事记分</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="请输入邮箱"
              className="w-full px-4 py-3 bg-slate-900 border border-purple-500/30 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="请输入密码（至少 6 位）"
              minLength={6}
              className="w-full px-4 py-3 bg-slate-900 border border-purple-500/30 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
            />
          </div>
          {isRegister && (
            <div>
              <label className="block text-sm font-medium mb-2">昵称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isRegister}
                placeholder="请输入昵称"
                className="w-full px-4 py-3 bg-slate-900 border border-purple-500/30 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="whitespace-nowrap w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:scale-105 transition-transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? '处理中...' : (isRegister ? '注册' : '登录')}
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="whitespace-nowrap w-full text-sm text-purple-300 hover:text-purple-200 transition-colors cursor-pointer"
          >
            {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
          </button>
        </form>
      </div>
    </div>
  );
}
