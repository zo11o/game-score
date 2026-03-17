'use client';

import { useState } from 'react';
import { api, setCurrentUser } from '@/lib/api';
import type { User } from '@/lib/types';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from '@heroui/react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
};

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setIsRegister(false);
    setLoading(false);
    setErrorMessage('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    if (!EMAIL_REGEX.test(email)) {
      setErrorMessage('请输入有效的邮箱地址');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMessage('密码至少需要 6 位');
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        if (!name.trim()) {
          setErrorMessage('请输入昵称');
          setLoading(false);
          return;
        }

        const user = await api.register(email, password, name.trim());
        setCurrentUser(user);
        resetForm();
        onSuccess(user);
      } else {
        const user = await api.login(email, password);
        setCurrentUser(user);
        resetForm();
        onSuccess(user);
      }
    } catch (err) {
      console.error('登录/注册失败:', err);
      setErrorMessage(err instanceof Error ? err.message : '操作失败，请重试');
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
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
        <form onSubmit={handleSubmit}>
          <ModalHeader className="flex flex-col gap-1 text-purple-400">
            {isRegister ? '注册账号' : '登录账号'}
          </ModalHeader>
          <ModalBody className="gap-4">
            {errorMessage && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2">
                <p className="text-sm text-red-400">{errorMessage}</p>
              </div>
            )}
            <Input
              type="email"
              value={email}
              onValueChange={setEmail}
              isRequired
              placeholder="请输入邮箱"
              aria-label="邮箱"
              classNames={{ inputWrapper: 'bg-default-100' }}
              autoComplete="email"
            />
            <Input
              type="password"
              value={password}
              onValueChange={setPassword}
              isRequired
              placeholder="请输入密码（至少 6 位）"
              minLength={6}
              aria-label="密码"
              classNames={{ inputWrapper: 'bg-default-100' }}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
            {isRegister && (
              <Input
                type="text"
                value={name}
                onValueChange={setName}
                isRequired={isRegister}
                placeholder="请输入昵称"
                aria-label="昵称"
                classNames={{ inputWrapper: 'bg-default-100' }}
                autoComplete="name"
              />
            )}
          </ModalBody>
          <ModalFooter className="flex-col gap-2">
            <div className="flex gap-2 w-full">
              <Button
                variant="light"
                type="button"
                onPress={handleClose}
                className="whitespace-nowrap flex-1"
              >
                取消
              </Button>
              <Button
                color="secondary"
                type="submit"
                isLoading={loading}
                className="whitespace-nowrap flex-1"
              >
                {loading ? '处理中...' : isRegister ? '注册' : '登录'}
              </Button>
            </div>
            <Button
              type="button"
              variant="light"
              onPress={() => setIsRegister(!isRegister)}
              className="whitespace-nowrap w-full text-sm"
            >
              {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
