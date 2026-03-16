'use client';

import { useEffect, useState } from 'react';
import { api, getCurrentUser, isUnauthorizedError, setCurrentUser } from '@/lib/api';
import type { User, ParticipationHistory } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Button, Card, CardBody, Avatar, Chip, Spinner } from '@heroui/react';

const GAME_TYPE_LABELS = {
  classic: '经典记分',
  poker_rounds: '扑克轮次',
} as const;

export default function Profile() {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [history, setHistory] = useState<ParticipationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUserState(user);

    api.getUserHistory(user.id)
      .then(setHistory)
      .catch((err) => {
        if (isUnauthorizedError(err)) {
          setCurrentUser(null);
          router.push('/login');
          return;
        }
        console.error(err);
      })
      .finally(() => setLoadingHistory(false));
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      if (!isUnauthorizedError(err)) {
        console.error(err);
      }
    } finally {
      setCurrentUser(null);
      router.push('/login');
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold neon-glow text-purple-400">用户中心</h1>
          <Button
            color="default"
            variant="flat"
            onPress={() => router.push('/')}
            className="whitespace-nowrap w-full sm:w-auto"
          >
            返回大厅
          </Button>
        </div>

        <Card className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/50">
          <CardBody className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
              <Avatar
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-24 h-24 border-4 border-purple-500"
                imgProps={{
                  referrerPolicy: 'no-referrer',
                }}
              />
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold text-purple-300 mb-2">{currentUser.name}</h2>
                <div className="space-y-1">
                  <p className="text-slate-400 text-sm sm:text-base">
                    <span className="text-slate-500">邮箱:</span> {currentUser.email}
                  </p>
                  <p className="text-slate-400 text-sm sm:text-base">
                    <span className="text-slate-500">ID:</span> {currentUser.id}
                  </p>
                </div>
              </div>
            </div>

            <Button
              color="danger"
              variant="shadow"
              onPress={handleLogout}
              className="w-full"
            >
              退出登录
            </Button>
          </CardBody>
        </Card>

        {/* Participation History */}
        <Card className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/50 mt-6">
          <CardBody className="p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">参与历史</h2>

            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" color="secondary" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-slate-400 text-center py-8">暂无参与记录</p>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div
                    key={item.roomId}
                    onClick={() => router.push(`/room/${item.roomId}`)}
                    className="bg-slate-900/50 border border-purple-500/30 rounded-lg p-4 hover:border-purple-500 transition-all cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Chip
                            size="sm"
                            className="bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          >
                            #{item.roomNumber}
                          </Chip>
                          <Chip
                            size="sm"
                            className="bg-slate-900/70 text-pink-300 border border-pink-500/30"
                          >
                            {GAME_TYPE_LABELS[item.gameType]}
                          </Chip>
                          <Chip
                            size="sm"
                            color={item.roomStatus === 'active' ? 'success' : 'default'}
                            variant="flat"
                          >
                            {item.roomStatus === 'active' ? '进行中' : '已结束'}
                          </Chip>
                        </div>
                        <h3 className="text-lg font-bold text-purple-300 mb-1">{item.roomName}</h3>
                        <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                          <span>创建者: {item.creatorName}</span>
                          <span>👥 {item.participantCount} 人</span>
                          <span>📅 {new Date(item.joinedAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="text-3xl font-bold text-pink-400">
                          {item.finalScore > 0 ? '+' : ''}{item.finalScore}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                          <div className="text-right">
                            <div>给出: {item.scoresGiven}次</div>
                            <div>{item.totalPointsGiven}分</div>
                          </div>
                          <div className="text-right">
                            <div>收到: {item.scoresReceived}次</div>
                            <div>{item.totalPointsReceived}分</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
