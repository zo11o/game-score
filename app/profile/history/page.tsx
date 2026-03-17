'use client';

import { useEffect, useState } from 'react';
import { api, getCurrentUser, isUnauthorizedError, setCurrentUser } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import type { ParticipationHistory } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Chip, Spinner } from '@heroui/react';

const GAME_TYPE_LABELS = {
  classic: '经典记分',
  poker_rounds: '扑克轮次',
} as const;

export default function HistoryPage() {
  const [history, setHistory] = useState<ParticipationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }

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
      .finally(() => setLoading(false));
  }, [router]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-white p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="参与历史"
          subtitle={`共 ${history.length} 条记录`}
          showBackButton
        />

        <Card className="bg-white/85 backdrop-blur-sm border border-emerald-200 shadow-[0_20px_50px_rgba(105,145,98,0.1)]">
          <CardBody className="p-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" color="secondary" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-emerald-900/60 text-center py-12">暂无参与记录</p>
            ) : (
              <div className="divide-y divide-emerald-100">
                {history.map((item) => (
                  <div
                    key={item.roomId}
                    onClick={() => router.push(`/room/${item.roomId}`)}
                    className="flex items-center justify-between py-3 px-2 hover:bg-emerald-50/50 transition-colors cursor-pointer -mx-2"
                  >
                    {/* 左侧信息 */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* 得分 */}
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                        item.finalScore > 0
                          ? 'bg-emerald-100 text-emerald-600'
                          : item.finalScore < 0
                            ? 'bg-red-100 text-red-500'
                            : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className="text-lg font-bold">
                          {item.finalScore > 0 ? '+' : ''}{item.finalScore}
                        </span>
                      </div>

                      {/* 房间信息 */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-emerald-800 truncate">
                            {item.roomName}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            item.roomStatus === 'active'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {item.roomStatus === 'active' ? '进行中' : '已结束'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-emerald-600/70">
                          <span>#{item.roomNumber}</span>
                          <span>·</span>
                          <span>{GAME_TYPE_LABELS[item.gameType]}</span>
                          <span>·</span>
                          <span>{formatDate(item.joinedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* 右侧统计 */}
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-xs text-emerald-600/60">
                        给 {item.totalPointsGiven > 0 ? '+' : ''}{item.totalPointsGiven}
                      </div>
                      <div className="text-xs text-emerald-600/60">
                        收 {item.totalPointsReceived > 0 ? '+' : ''}{item.totalPointsReceived}
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
