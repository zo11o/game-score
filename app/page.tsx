'use client';

import { useEffect, useState } from 'react';
import { api, getCurrentUser } from '@/lib/api';
import type { Room, User } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
    api.getRooms().then(setRooms).catch(console.error).finally(() => setLoading(false));
  }, [router]);

  const handleCreateRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const password = formData.get('password') as string;

    try {
      const room = await api.createRoom(name, password, currentUser.id);
      setRooms((prev) => [room, ...prev]);
      setShowCreateRoom(false);
      router.push(`/room/${room.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || !selectedRoom) return;

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;

    try {
      await api.joinRoom(selectedRoom.id, currentUser.id, password);
      setShowJoinRoom(false);
      setSelectedRoom(null);
      router.push(`/room/${selectedRoom.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '加入失败');
    }
  };

  if (loading || !currentUser) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <h1 className="text-4xl font-bold neon-glow text-purple-400">游戏大厅</h1>
          <div className="flex gap-4 shrink-0">
            <button
              onClick={() => setShowCreateRoom(true)}
              className="whitespace-nowrap px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:scale-105 transition-transform cursor-pointer"
            >
              创建房间
            </button>
            <button
              onClick={() => router.push('/profile')}
              className="whitespace-nowrap px-6 py-3 bg-slate-800 rounded-lg font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
            >
              用户中心
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="relative bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 hover:border-purple-500 transition-all cursor-pointer scanlines"
              onClick={() => {
                setSelectedRoom(room);
                setShowJoinRoom(true);
              }}
            >
              <h3 className="text-xl font-bold text-purple-300 mb-2">{room.name}</h3>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>👥 {room.users.length} 人</span>
                <span>🔒 需要密码</span>
              </div>
            </div>
          ))}
        </div>

        {showCreateRoom && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full border border-purple-500/50">
              <h2 className="text-2xl font-bold text-purple-400 mb-6">创建房间</h2>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label htmlFor="room-name" className="block text-sm font-medium mb-2">房间名称</label>
                  <input
                    id="room-name"
                    type="text"
                    name="name"
                    required
                    className="w-full px-4 py-2 bg-slate-900 border border-purple-500/30 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="room-password" className="block text-sm font-medium mb-2">房间密码</label>
                  <input
                    id="room-password"
                    type="password"
                    name="password"
                    required
                    className="w-full px-4 py-2 bg-slate-900 border border-purple-500/30 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="whitespace-nowrap flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:scale-105 transition-transform cursor-pointer"
                  >
                    创建
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateRoom(false)}
                    className="whitespace-nowrap flex-1 px-6 py-3 bg-slate-700 rounded-lg font-semibold hover:bg-slate-600 transition-colors cursor-pointer"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showJoinRoom && selectedRoom && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full border border-purple-500/50">
              <h2 className="text-2xl font-bold text-purple-400 mb-6">加入房间</h2>
              <p className="text-slate-300 mb-4">房间: {selectedRoom.name}</p>
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label htmlFor="join-password" className="block text-sm font-medium mb-2">房间密码</label>
                  <input
                    id="join-password"
                    type="password"
                    name="password"
                    required
                    className="w-full px-4 py-2 bg-slate-900 border border-purple-500/30 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="whitespace-nowrap flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:scale-105 transition-transform cursor-pointer"
                  >
                    加入
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowJoinRoom(false);
                      setSelectedRoom(null);
                    }}
                    className="whitespace-nowrap flex-1 px-6 py-3 bg-slate-700 rounded-lg font-semibold hover:bg-slate-600 transition-colors cursor-pointer"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
