'use client';

import { useEffect, useState } from 'react';
import { api, getCurrentUser, isUnauthorizedError } from '@/lib/api';
import type { Room, User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Button,
  Input,
  Spinner,
} from '@heroui/react';

const GAME_TYPE_LABELS: Record<Room['gameType'], string> = {
  classic: '经典记分',
  poker_rounds: '扑克轮次',
};

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [roomNumberFilter, setRoomNumberFilter] = useState('');
  const [creatorNameFilter, setCreatorNameFilter] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const createRoomModal = useDisclosure();
  const joinRoomModal = useDisclosure();
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
    api.getRooms()
      .then(setRooms)
      .catch((err) => {
        if (isUnauthorizedError(err)) {
          router.push('/login');
          return;
        }
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    let filtered = rooms;

    if (roomNumberFilter) {
      filtered = filtered.filter(room =>
        room.roomNumber.toString().includes(roomNumberFilter)
      );
    }

    if (creatorNameFilter) {
      filtered = filtered.filter(room =>
        room.creatorName.toLowerCase().includes(creatorNameFilter.toLowerCase())
      );
    }

    setFilteredRooms(filtered);
  }, [rooms, roomNumberFilter, creatorNameFilter]);

  const handleCreateRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const password = formData.get('password') as string;
    const gameType = (formData.get('gameType') as Room['gameType']) || 'classic';

    try {
      const room = await api.createRoom(name, password, gameType);
      setRooms((prev) => [room, ...prev]);
      createRoomModal.onClose();
      router.push(`/room/${room.id}`);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        router.push('/login');
        return;
      }
      alert(err instanceof Error ? err.message : '创建失败');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRoom) return;

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;

    try {
      await api.joinRoom(selectedRoom.id, password);
      joinRoomModal.onClose();
      setSelectedRoom(null);
      router.push(`/room/${selectedRoom.id}`);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        router.push('/login');
        return;
      }
      alert(err instanceof Error ? err.message : '加入失败');
    }
  };

  const handleRoomSelect = (room: Room) => {
    const alreadyJoined = !!currentUser && room.users.includes(currentUser.id);

    if (alreadyJoined) {
      router.push(`/room/${room.id}`);
      return;
    }

    setSelectedRoom(room);
    joinRoomModal.onOpen();
  };

  if (!currentUser) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Spinner size="lg" color="secondary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-24">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold neon-glow text-purple-400">游戏大厅</h1>
        </div>

        {/* Filter inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Input
            placeholder="按房间号筛选"
            value={roomNumberFilter}
            onValueChange={setRoomNumberFilter}
            isClearable
            onClear={() => setRoomNumberFilter('')}
            startContent={
              <span className="text-purple-400 text-lg">#</span>
            }
            classNames={{
              base: 'max-w-full',
              inputWrapper: 'bg-slate-800/50 border border-purple-500/30 hover:border-purple-500/50',
            }}
          />
          <Input
            placeholder="按创建者昵称筛选"
            value={creatorNameFilter}
            onValueChange={setCreatorNameFilter}
            isClearable
            onClear={() => setCreatorNameFilter('')}
            startContent={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 text-purple-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            }
            classNames={{
              base: 'max-w-full',
              inputWrapper: 'bg-slate-800/50 border border-purple-500/30 hover:border-purple-500/50',
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="relative bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 hover:border-purple-500 transition-all cursor-pointer scanlines"
              onClick={() => handleRoomSelect(room)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 text-xs font-bold bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                  #{room.roomNumber}
                </span>
                <span className="px-2 py-1 text-xs font-bold bg-slate-900/70 text-pink-300 rounded border border-pink-500/30">
                  {GAME_TYPE_LABELS[room.gameType]}
                </span>
              </div>
              <h3 className="text-xl font-bold text-purple-300 mb-1">{room.name}</h3>
              <p className="text-sm text-slate-400 mb-2">创建者: {room.creatorName}</p>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>👥 {room.users.length} 人</span>
                <span>
                  {currentUser && room.users.includes(currentUser.id) ? '✅ 已加入，可直接进入' : '🔒 需要密码'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Modal
          isOpen={createRoomModal.isOpen}
          onOpenChange={createRoomModal.onOpenChange}
          placement="center"
          backdrop="opaque"
          classNames={{
            base: '!bg-slate-800 border border-purple-500/50',
            backdrop: 'bg-black/70',
            header: 'border-b border-default-200',
            body: 'py-6',
            footer: 'border-t border-default-200',
          }}
        >
          <ModalContent className="!bg-slate-800 border border-purple-500/50">
            <form onSubmit={handleCreateRoom}>
              <ModalHeader className="flex flex-col gap-1 text-purple-400">创建房间</ModalHeader>
              <ModalBody className="gap-4">
                <Input
                  name="name"
                  isRequired
                  placeholder="请输入房间名称"
                  aria-label="房间名称"
                  classNames={{ inputWrapper: 'bg-default-100' }}
                  autoComplete="off"
                />
                <Input
                  name="password"
                  type="password"
                  isRequired
                  placeholder="请输入密码"
                  aria-label="房间密码"
                  classNames={{ inputWrapper: 'bg-default-100' }}
                />
                <label className="space-y-2 text-sm text-slate-200">
                  <span className="block text-sm font-medium text-slate-300">游戏类型</span>
                  <select
                    name="gameType"
                    aria-label="游戏类型"
                    defaultValue="classic"
                    className="w-full rounded-xl border border-purple-500/30 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-purple-400"
                  >
                    <option value="classic">经典记分</option>
                    <option value="poker_rounds">扑克轮次</option>
                  </select>
                </label>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" type="button" onPress={createRoomModal.onClose} className="whitespace-nowrap">
                  取消
                </Button>
                <Button color="secondary" type="submit" className="whitespace-nowrap">
                  创建
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>

        <Modal
          isOpen={joinRoomModal.isOpen}
          onOpenChange={(open) => {
            if (!open) setSelectedRoom(null);
            joinRoomModal.onOpenChange();
          }}
          placement="center"
          backdrop="opaque"
          classNames={{
            base: '!bg-slate-800 border border-purple-500/50',
            backdrop: 'bg-black/70',
            header: 'border-b border-default-200',
            body: 'py-6',
            footer: 'border-t border-default-200',
          }}
        >
          <ModalContent className="!bg-slate-800 border border-purple-500/50">
            {selectedRoom && (
              <form onSubmit={handleJoinRoom}>
                <ModalHeader className="flex flex-col gap-1 text-purple-400">加入房间</ModalHeader>
                <ModalBody className="gap-4">
                  <p className="text-default-600">房间: {selectedRoom.name}</p>
                  <Input
                    name="password"
                    type="password"
                    isRequired
                    placeholder="请输入密码"
                    aria-label="房间密码"
                    classNames={{ inputWrapper: 'bg-default-100' }}
                  />
                </ModalBody>
                <ModalFooter>
                  <Button
                    variant="light"
                    type="button"
                    onPress={() => {
                      setSelectedRoom(null);
                      joinRoomModal.onClose();
                    }}
                    className="whitespace-nowrap"
                  >
                    取消
                  </Button>
                  <Button color="secondary" type="submit" className="whitespace-nowrap">
                    加入
                  </Button>
                </ModalFooter>
              </form>
            )}
          </ModalContent>
        </Modal>
      </div>

      {/* 底部悬浮导航栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-purple-500/30 shadow-lg z-50">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex justify-around items-center">
            <button
              aria-label="首页"
              onClick={() => {}}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6 text-purple-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                />
              </svg>
              <span className="text-xs font-medium text-purple-400">首页</span>
            </button>

            <button
              aria-label="创建房间"
              onClick={createRoomModal.onOpen}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors hover:bg-purple-500/10"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center -mt-6 shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-white"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-xs font-medium text-slate-400 mt-1">创建</span>
            </button>

            <button
              aria-label="用户中心"
              onClick={() => router.push('/profile')}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors hover:bg-purple-500/10"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6 text-slate-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              <span className="text-xs font-medium text-slate-400">我的</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
