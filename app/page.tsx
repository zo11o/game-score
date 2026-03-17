'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, getCurrentUser, isUnauthorizedError, setCurrentUser as persistCurrentUser } from '@/lib/api';
import { ROUND_ORDER_MODE_LABELS } from '@/lib/round-order';
import { PageHeader } from '@/components/page-header';
import { AuthModal } from '@/components/auth-modal';
import type { Room, RoundOrderMode, User } from '@/lib/types';
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
  Select,
  SelectItem,
} from '@heroui/react';

const GAME_TYPE_LABELS: Record<Room['gameType'], string> = {
  classic: '经典记分',
  poker_rounds: '扑克轮次',
};

const CREATE_ROOM_SELECT_CLASSNAMES = {
  trigger: 'bg-emerald-50/70 border border-emerald-100 data-[hover=true]:border-emerald-200',
  value: 'text-slate-700',
  popoverContent: 'bg-white border border-emerald-200',
  listboxWrapper: 'bg-white',
} as const;

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());
  const [errorMessage, setErrorMessage] = useState('');
  const createRoomModal = useDisclosure();
  const joinRoomModal = useDisclosure();
  const errorModal = useDisclosure();
  const authModal = useDisclosure();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [createGameType, setCreateGameType] = useState<Room['gameType']>('classic');
  const [createRoundOrderMode, setCreateRoundOrderMode] = useState<RoundOrderMode>('rotate_by_player_number');
  const [pendingAction, setPendingAction] = useState<'create' | 'join' | null>(null);
  const [pendingRoom, setPendingRoom] = useState<Room | null>(null);
  const router = useRouter();

  const resetCreateRoomState = () => {
    setCreateGameType('classic');
    setCreateRoundOrderMode('rotate_by_player_number');
  };

  useEffect(() => {
    api.getRooms()
      .then(setRooms)
      .catch((err) => {
        console.error(err);
        setErrorMessage('获取房间列表失败');
        errorModal.onOpen();
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredRooms = useMemo(() => {
    let filtered = rooms;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(room =>
        room.roomNumber.toString().includes(searchQuery) ||
        room.creatorName.toLowerCase().includes(query) ||
        room.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [rooms, searchQuery]);

  const showError = (message: string) => {
    setErrorMessage(message);
    errorModal.onOpen();
  };

  const handleAuthSuccess = (user: User) => {
    persistCurrentUser(user);
    setCurrentUser(user);
    authModal.onClose();

    if (pendingAction === 'create') {
      createRoomModal.onOpen();
    } else if (pendingAction === 'join' && pendingRoom) {
      setSelectedRoom(pendingRoom);
      joinRoomModal.onOpen();
    }

    setPendingAction(null);
    setPendingRoom(null);
  };

  const handleCreateRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) {
      setPendingAction('create');
      authModal.onOpen();
      return;
    }

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const password = formData.get('password') as string;
    const gameType = createGameType;

    try {
      const room = await api.createRoom(
        name,
        password,
        gameType,
        gameType === 'poker_rounds' ? createRoundOrderMode : undefined
      );
      setRooms((prev) => [room, ...prev]);
      createRoomModal.onClose();
      resetCreateRoomState();
      router.push(`/room/${room.id}`);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        setPendingAction('create');
        authModal.onOpen();
        return;
      }
      showError(err instanceof Error ? err.message : '创建失败');
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
        setPendingRoom(selectedRoom);
        setPendingAction('join');
        authModal.onOpen();
        return;
      }
      showError(err instanceof Error ? err.message : '加入失败');
    }
  };

  const handleRoomSelect = (room: Room) => {
    const alreadyJoined = currentUser ? room.users.includes(currentUser.id) : false;

    if (alreadyJoined) {
      router.push(`/room/${room.id}`);
      return;
    }

    if (!currentUser) {
      setPendingRoom(room);
      setPendingAction('join');
      authModal.onOpen();
      return;
    }

    setSelectedRoom(room);
    joinRoomModal.onOpen();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-white flex items-center justify-center">
        <Spinner size="lg" color="secondary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-white pb-24">
      <div className="max-w-6xl mx-auto p-6">
        <PageHeader
          title="游戏大厅"
          actions={(
            <div
              className={`transition-all duration-300 ease-out ${
                isSearchFocused ? 'w-full max-w-md' : 'w-full sm:w-48'
              }`}
            >
              <Input
                placeholder="搜索房间号/创建者/房间名"
                value={searchQuery}
                onValueChange={setSearchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                isClearable
                onClear={() => setSearchQuery('')}
                startContent={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 text-emerald-600"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                }
                classNames={{
                  base: 'max-w-full',
                  inputWrapper: 'bg-white/90 border border-emerald-200 hover:border-emerald-300 focus-within:border-emerald-400 transition-all',
                }}
              />
            </div>
          )}
        />

        {!currentUser && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
            <p className="text-sm text-emerald-700">
              浏览房间无需登录，创建或加入房间需要登录账号
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="relative bg-white/90 backdrop-blur-sm border border-emerald-100 rounded-xl p-3 md:p-6 hover:border-emerald-300 transition-all cursor-pointer shadow-[0_12px_30px_rgba(105,145,98,0.08)] scanlines"
              onClick={() => handleRoomSelect(room)}
            >
              {/* 状态徽章 */}
              <div className={`absolute -top-2 -right-2 md:-top-3 md:-right-3 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold shadow-lg transform rotate-12 ${
                room.status === 'finished'
                  ? 'bg-gradient-to-br from-slate-600 to-slate-700 text-slate-300 border-2 border-slate-500'
                  : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white border-2 border-green-400'
              }`}>
                {room.status === 'finished' ? '已结束' : '进行中'}
              </div>

              <div className="flex items-center gap-1 md:gap-2 mb-2 flex-wrap">
                <span className="px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs font-bold bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                  #{room.roomNumber}
                </span>
                <span className="px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs font-bold bg-amber-50 text-amber-700 rounded border border-amber-200">
                  {GAME_TYPE_LABELS[room.gameType]}
                </span>
              </div>
              <h3 className="text-base md:text-xl font-bold text-emerald-800 mb-1 truncate">{room.name}</h3>
              <p className="text-xs md:text-sm text-emerald-900/65 mb-1 truncate">创建者: {room.creatorName}</p>
              <p className="text-[10px] md:text-xs text-emerald-900/45 mb-2">
                {new Date(room.createdAt).toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 text-xs md:text-sm text-emerald-900/60">
                <span className="whitespace-nowrap">👥 {room.users.length} 人</span>
                <span className="text-[10px] md:text-xs">
                  {currentUser && room.users.includes(currentUser.id) ? '✅ 已加入' : '🔒 需密码'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Modal
          isOpen={createRoomModal.isOpen}
          onOpenChange={() => {
            if (createRoomModal.isOpen) {
              resetCreateRoomState();
            }
            createRoomModal.onOpenChange();
          }}
          placement="center"
          backdrop="opaque"
          classNames={{
            base: '!bg-white border border-emerald-200 shadow-2xl',
            backdrop: 'bg-emerald-950/20',
            header: 'border-b border-default-200',
            body: 'py-6',
            footer: 'border-t border-default-200',
          }}
        >
          <ModalContent className="!bg-white border border-emerald-200">
            <form onSubmit={handleCreateRoom}>
              <ModalHeader className="flex flex-col gap-1 text-emerald-800">创建房间</ModalHeader>
              <ModalBody className="gap-4">
                <Input
                  name="name"
                  isRequired
                  placeholder="请输入房间名称"
                  aria-label="房间名称"
                  classNames={{ inputWrapper: 'bg-emerald-50/70 border border-emerald-100' }}
                  autoComplete="off"
                />
                <Input
                  name="password"
                  type="password"
                  placeholder="留空则默认 123"
                  aria-label="房间密码"
                  classNames={{ inputWrapper: 'bg-emerald-50/70 border border-emerald-100' }}
                />
                <p className="text-xs text-slate-500">
                  不填密码时，系统会自动使用默认房间密码 123。
                </p>
                <Select
                  name="gameType"
                  label="游戏类型"
                  aria-label="游戏类型"
                  selectedKeys={[createGameType]}
                  disallowEmptySelection
                  classNames={CREATE_ROOM_SELECT_CLASSNAMES}
                  onSelectionChange={(keys) => {
                    const nextGameType = Array.from(keys as Set<React.Key>)[0] as Room['gameType'] | undefined;
                    if (!nextGameType) return;
                    setCreateGameType(nextGameType);
                    if (nextGameType === 'classic') {
                      setCreateRoundOrderMode('rotate_by_player_number');
                    }
                  }}
                >
                  <SelectItem key="classic">经典记分</SelectItem>
                  <SelectItem key="poker_rounds">扑克轮次</SelectItem>
                </Select>
                {createGameType === 'poker_rounds' && (
                  <div className="space-y-2">
                    <Select
                      name="roundOrderMode"
                      label="每轮顺序规则"
                      aria-label="每轮顺序规则"
                      selectedKeys={[createRoundOrderMode]}
                      disallowEmptySelection
                      classNames={CREATE_ROOM_SELECT_CLASSNAMES}
                      onSelectionChange={(keys) => {
                        const nextMode = Array.from(keys as Set<React.Key>)[0] as RoundOrderMode | undefined;
                        if (!nextMode) return;
                        setCreateRoundOrderMode(nextMode);
                      }}
                    >
                      {Object.entries(ROUND_ORDER_MODE_LABELS).map(([value, label]) => (
                        <SelectItem key={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </Select>
                    <p className="text-xs text-slate-500">
                      房主可在后续轮次里按该规则确定每位玩家的出场顺序。
                    </p>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  type="button"
                  onPress={() => {
                    resetCreateRoomState();
                    createRoomModal.onClose();
                  }}
                  className="whitespace-nowrap"
                >
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
            base: '!bg-white border border-emerald-200 shadow-2xl',
            backdrop: 'bg-emerald-950/20',
            header: 'border-b border-default-200',
            body: 'py-6',
            footer: 'border-t border-default-200',
          }}
        >
          <ModalContent className="!bg-white border border-emerald-200">
            {selectedRoom && (
              <form onSubmit={handleJoinRoom}>
                <ModalHeader className="flex flex-col gap-1 text-emerald-800">加入房间</ModalHeader>
                <ModalBody className="gap-4">
                  <p className="text-default-600">房间: {selectedRoom.name}</p>
                  <Input
                    name="password"
                    type="password"
                    isRequired
                    placeholder="请输入密码"
                    aria-label="房间密码"
                    classNames={{ inputWrapper: 'bg-emerald-50/70 border border-emerald-100' }}
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
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-emerald-100 shadow-[0_-10px_30px_rgba(105,145,98,0.08)] z-50">
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
                className="w-6 h-6 text-emerald-700"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                />
              </svg>
              <span className="text-xs font-medium text-emerald-700">首页</span>
            </button>

            <button
              aria-label="创建房间"
              onClick={() => {
                if (!currentUser) {
                  setPendingAction('create');
                  authModal.onOpen();
                } else {
                  createRoomModal.onOpen();
                }
              }}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors hover:bg-emerald-50"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-500 to-lime-500 flex items-center justify-center -mt-6 shadow-lg">
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
              <span className="text-xs font-medium text-emerald-700/70 mt-1">创建</span>
            </button>

            <button
              aria-label="用户中心"
              onClick={() => {
                if (!currentUser) {
                  authModal.onOpen();
                } else {
                  router.push('/profile');
                }
              }}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors hover:bg-emerald-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6 text-emerald-700/70"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              <span className="text-xs font-medium text-emerald-700/70">我的</span>
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={errorModal.isOpen}
        onOpenChange={errorModal.onOpenChange}
        placement="center"
        backdrop="opaque"
        classNames={{
          base: '!bg-white border border-red-200',
          backdrop: 'bg-emerald-950/20',
        }}
      >
        <ModalContent className="!bg-white border border-red-200">
          <ModalHeader className="flex flex-col gap-1 text-red-400">提示</ModalHeader>
          <ModalBody>
            <p className="text-slate-700">{errorMessage}</p>
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={errorModal.onClose}>
              确定
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => {
          authModal.onClose();
          setPendingAction(null);
          setPendingRoom(null);
        }}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
