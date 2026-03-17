'use client';

import { useState } from 'react';
import { api, setCurrentUser } from '@/lib/api';
import { generateNickname } from '@/lib/nickname-generator';
import { useRouter } from 'next/navigation';
import { Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const errorModal = useDisclosure();
  const router = useRouter();

  const showError = (message: string) => {
    setErrorMessage(message);
    errorModal.onOpen();
    setLoading(false);
  };

  const handleRandomNickname = () => {
    setName(generateNickname());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!EMAIL_REGEX.test(email)) {
      showError('请输入有效的邮箱地址');
      return;
    }

    if (password.length < 6) {
      showError('密码至少需要 6 位');
      return;
    }

    try {
      if (isRegister) {
        // 昵称可选，未填写时由后端自动生成
        const user = await api.register(email, password, name.trim() || undefined);
        setCurrentUser(user);
        router.push('/');
      } else {
        const user = await api.login(email, password);
        setCurrentUser(user);
        router.push('/');
      }
    } catch (err) {
      console.error('登录/注册失败:', err);
      showError(err instanceof Error ? err.message : '操作失败，请重试');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-white flex items-center justify-center p-6">
      <div className="bg-white/85 backdrop-blur-sm border border-emerald-200 rounded-xl p-8 max-w-md w-full shadow-[0_20px_60px_rgba(105,145,98,0.12)] scanlines">
        <h1 className="text-3xl sm:text-4xl font-bold text-center neon-glow text-emerald-800 mb-8">赛事记分</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="email"
            value={email}
            onValueChange={setEmail}
            isRequired
            placeholder="请输入邮箱"
            aria-label="邮箱"
            classNames={{ inputWrapper: 'bg-emerald-50/70 border border-emerald-100' }}
          />
          <Input
            type="password"
            value={password}
            onValueChange={setPassword}
            isRequired
            placeholder="请输入密码（至少 6 位）"
            minLength={6}
            aria-label="密码"
            classNames={{ inputWrapper: 'bg-emerald-50/70 border border-emerald-100' }}
          />
          {isRegister && (
            <div className="flex gap-2">
              <Input
                type="text"
                value={name}
                onValueChange={setName}
                placeholder="请输入昵称（可选，留空自动生成）"
                aria-label="昵称"
                classNames={{ inputWrapper: 'bg-emerald-50/70 border border-emerald-100' }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="flat"
                color="secondary"
                onPress={handleRandomNickname}
                className="shrink-0"
              >
                随机
              </Button>
            </div>
          )}
          <Button
            type="submit"
            color="secondary"
            isLoading={loading}
            className="whitespace-nowrap w-full"
          >
            {loading ? '处理中...' : (isRegister ? '注册' : '登录')}
          </Button>
          <Button
            type="button"
            variant="light"
            onPress={() => setIsRegister(!isRegister)}
            className="whitespace-nowrap w-full text-sm"
          >
            {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
          </Button>
        </form>
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
    </div>
  );
}
