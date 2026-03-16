'use client';

import { useEffect, useState } from 'react';
import { api, getCurrentUser } from '@/lib/api';
import type { Room, User, ScoreRecord } from '@/lib/types';
import { useRouter, useParams } from 'next/navigation';
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Card,
  CardBody,
  Input,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Chip,
} from '@heroui/react';

function RecordsPanel({
  records,
  formatTime,
}: {
  records: ScoreRecord[];
  formatTime: (ts: number) => string;
}) {
  return (
    <div className="space-y-3 max-h-[60vh] lg:max-h-[calc(100vh-12rem)] overflow-y-auto">
      {records.length === 0 ? (
        <p className="text-default-500 text-sm py-4 text-center">暂无记录</p>
      ) : (
        records.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 py-2 px-3 rounded-lg bg-default-100 border border-default-200"
          >
            <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-default-200">
              <img
                src={r.fromAvatar}
                alt=""
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-default-700 truncate">
                <span className="font-medium text-primary">{r.fromName}</span>
                <span className="text-default-400 mx-1">→</span>
                <span className="font-medium text-secondary">{r.toName}</span>
              </p>
              <p className="text-xs text-default-500 mt-0.5">{formatTime(r.timestamp)}</p>
            </div>
            <span className="text-secondary font-bold shrink-0">+{r.points}</span>
          </div>
        ))
      )}
    </div>
  );
}

export default function RoomPage() {
  const [room, setRoom] = useState<Room | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [records, setRecords] = useState<ScoreRecord[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [points, setPoints] = useState(1);
  const [loading, setLoading] = useState(true);
  const recordsDrawer = useDisclosure();
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);

    api
      .getRoom(roomId)
      .then((data) => {
        setRoom(data.room);
        setUsers(data.users);
        setScores(data.scores);
        setRecords(data.records ?? []);
      })
      .catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, [roomId, router]);

  const handleGiveScore = async () => {
    if (!selectedUser || !currentUser) return;

    try {
      await api.addScore(roomId, currentUser.id, selectedUser.id, points);
      setScores((prev) => ({
        ...prev,
        [selectedUser.id]: (prev[selectedUser.id] || 0) + points,
        [currentUser.id]: (prev[currentUser.id] || 0) - points,
      }));
      setRecords((prev) => [
        {
          id: `temp-${Date.now()}`,
          fromUserId: currentUser.id,
          fromName: currentUser.name,
          fromAvatar: currentUser.avatar,
          toUserId: selectedUser.id,
          toName: selectedUser.name,
          toAvatar: selectedUser.avatar,
          points,
          timestamp: Date.now(),
        },
        ...prev,
      ]);
      setSelectedUser(null);
      setPoints(1);
    } catch (err) {
      alert(err instanceof Error ? err.message : '添加分数失败');
    }
  };

  if (loading || !room || !currentUser) return null;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 max-w-7xl mx-auto">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-purple-400">{room.name}</h1>
              <p className="text-slate-400 mt-1 sm:mt-2 text-sm sm:text-base">房间 ID: {room.id}</p>
            </div>
            <Button
              color="default"
              variant="flat"
              onPress={() => router.push('/')}
              className="whitespace-nowrap w-full sm:w-auto"
            >
              返回大厅
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {users.map((user) => (
              <Card
                key={user.id}
                isPressable
                onPress={() => user.id !== currentUser.id && setSelectedUser(user)}
                className="relative bg-slate-800/50 border border-purple-500/30 hover:border-purple-500"
              >
                <CardBody className="flex flex-col items-center p-4 sm:p-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-4 border-purple-500 mb-3 sm:mb-4 shrink-0">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-purple-300 mb-1 sm:mb-2 truncate max-w-full">
                    {user.name}
                  </h3>
                  <div className="text-2xl sm:text-3xl font-bold text-pink-400">
                    {scores[user.id] || 0}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">分数</p>
                  {user.id === currentUser.id && (
                    <Chip size="sm" color="secondary" className="absolute top-2 right-2">
                      你
                    </Chip>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>

          <Modal
            isOpen={!!selectedUser}
            onOpenChange={(open) => !open && setSelectedUser(null)}
            placement="center"
            size="md"
            scrollBehavior="inside"
            classNames={{
              base: 'bg-slate-800 border border-purple-500/50',
              header: 'border-b border-default-200',
              body: 'py-6',
              footer: 'border-t border-default-200',
            }}
          >
            <ModalContent>
              {selectedUser && (
                <>
                  <ModalHeader className="flex flex-col gap-1 text-purple-400">
                    给 {selectedUser.name} 打分
                  </ModalHeader>
                  <ModalBody>
                    <div className="flex items-center justify-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-purple-500 shrink-0">
                        <img
                          src={selectedUser.avatar}
                          alt={selectedUser.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="text-3xl sm:text-4xl font-bold text-pink-400">
                        {scores[selectedUser.id] || 0}
                      </div>
                    </div>
                    <Input
                      type="number"
                      label="分数"
                      value={String(points)}
                      onValueChange={(v) => setPoints(Number(v) || 0)}
                      min={1}
                      classNames={{
                        input: 'text-center',
                        inputWrapper: 'bg-slate-900',
                      }}
                    />
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      variant="light"
                      onPress={() => {
                        setSelectedUser(null);
                        setPoints(1);
                      }}
                      className="whitespace-nowrap"
                    >
                      取消
                    </Button>
                    <Button
                      color="secondary"
                      onPress={handleGiveScore}
                      className="whitespace-nowrap"
                    >
                      确认
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>
        </div>

        {/* 桌面端侧边栏 */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-6 bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4">
            <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
              <span>支付记录</span>
              <Chip size="sm" variant="flat">{records.length}</Chip>
            </h3>
            <RecordsPanel records={records} formatTime={formatTime} />
          </div>
        </aside>
      </div>

      {/* 移动端：浮动按钮 + Drawer */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <Button
          isIconOnly
          color="secondary"
          size="lg"
          aria-label="支付记录"
          onPress={recordsDrawer.onOpen}
          className="shadow-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </Button>
        {records.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white">
            {records.length}
          </span>
        )}
      </div>

      <Drawer
        isOpen={recordsDrawer.isOpen}
        onOpenChange={recordsDrawer.onOpenChange}
        placement="bottom"
        size="lg"
        classNames={{
          base: 'bg-slate-800 border-t border-purple-500/30',
          header: 'border-b border-default-200',
        }}
      >
        <DrawerContent>
          <DrawerHeader className="flex flex-col gap-1">
            <h3 className="text-lg font-bold text-purple-400">支付记录</h3>
            <p className="text-sm text-default-500">{records.length} 条记录</p>
          </DrawerHeader>
          <DrawerBody>
            <RecordsPanel records={records} formatTime={formatTime} />
          </DrawerBody>
          <DrawerFooter>
            <Button color="default" variant="flat" onPress={recordsDrawer.onClose} className="whitespace-nowrap">
              关闭
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
