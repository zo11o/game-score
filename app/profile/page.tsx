'use client';

import { useEffect, useState } from 'react';
import { api, getCurrentUser, isUnauthorizedError, setCurrentUser } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { ProfileEditor } from '@/components/profile-editor';
import type { User, ParticipationHistory } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Button, Card, CardBody, Avatar } from '@heroui/react';

export default function Profile() {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUserState(user);

    api.getUserHistory(user.id)
      .then((history) => setHistoryCount(history.length))
      .catch((err) => {
        if (isUnauthorizedError(err)) {
          setCurrentUser(null);
          router.push('/login');
          return;
        }
        console.error(err);
      });
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

  const handleProfileSave = (updatedUser: User) => {
    setCurrentUserState(updatedUser);
    setIsEditing(false);
  };

  if (!currentUser) return null;

  // 编辑模式
  if (isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-white p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title="编辑资料"
            subtitle="修改昵称和头像风格"
            showBackButton
            onBack={() => setIsEditing(false)}
          />

          <Card className="bg-white/85 backdrop-blur-sm border border-emerald-200 shadow-[0_20px_50px_rgba(105,145,98,0.1)]">
            <CardBody className="p-6 sm:p-8">
              <ProfileEditor
                user={currentUser}
                onSave={handleProfileSave}
                onCancel={() => setIsEditing(false)}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-white p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="用户中心"
          subtitle="管理个人资料和查看活动记录"
          showBackButton
          showHomeButton
        />

        {/* 用户信息卡片 */}
        <Card className="bg-white/85 backdrop-blur-sm border border-emerald-200 shadow-[0_20px_50px_rgba(105,145,98,0.1)]">
          <CardBody className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
              <Avatar
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-20 h-20 border-4 border-emerald-300"
                imgProps={{
                  referrerPolicy: 'no-referrer',
                }}
              />
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-2xl font-bold text-emerald-800 mb-2">{currentUser.name}</h2>
                <div className="space-y-1">
                  <p className="text-emerald-900/70 text-sm">
                    <span className="text-emerald-700/60">邮箱:</span> {currentUser.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                color="secondary"
                variant="shadow"
                onPress={() => setIsEditing(true)}
                className="flex-1"
              >
                编辑资料
              </Button>
              <Button
                color="danger"
                variant="light"
                onPress={handleLogout}
              >
                退出
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* 功能入口 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          {/* 历史参与 */}
          <Card
            isPressable
            onPress={() => router.push('/profile/history')}
            className="bg-white/85 backdrop-blur-sm border border-emerald-200 shadow-[0_20px_50px_rgba(105,145,98,0.1)] hover:border-emerald-300 transition-all"
          >
            <CardBody className="p-4 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-emerald-800">参与历史</span>
              <span className="text-xs text-emerald-600/60">{historyCount} 条记录</span>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
