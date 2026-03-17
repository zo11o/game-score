'use client';

import { useState, useEffect } from 'react';
import { api, setCurrentUser } from '@/lib/api';
import { generateNickname } from '@/lib/nickname-generator';
import { generateAvatarUrl, AVATAR_STYLE_IDS } from '@/lib/avatar-styles';
import type { User, AvatarStyleId } from '@/lib/types';
import { AvatarStylePicker } from './avatar-style-picker';
import { Button, Input, Avatar, Spinner } from '@heroui/react';

const MAX_NAME_LENGTH = 20;

type ProfileEditorProps = {
  user: User;
  onSave: (updatedUser: User) => void;
  onCancel: () => void;
};

export function ProfileEditor({ user, onSave, onCancel }: ProfileEditorProps) {
  const [name, setName] = useState(user.name);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyleId>('identicon');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 初始化时从当前头像 URL 解析风格
  useEffect(() => {
    const currentAvatar = user.avatar;
    // 尝试从 URL 解析风格
    for (const styleId of AVATAR_STYLE_IDS) {
      if (currentAvatar.includes(`/9.x/${styleId}/`)) {
        setAvatarStyle(styleId);
        break;
      }
    }
  }, [user.avatar]);

  const handleRandomNickname = () => {
    setName(generateNickname());
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        alert('昵称不能为空');
        setSaving(false);
        return;
      }

      const updatedUser = await api.updateProfile(user.id, {
        name: trimmedName,
        avatarStyle,
        avatarSeed: user.email,
      });

      // 更新 localStorage
      setCurrentUser(updatedUser);
      onSave(updatedUser);
    } catch (err) {
      console.error('更新资料失败:', err);
      alert(err instanceof Error ? err.message : '更新失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const nameLength = name.trim().length;
  const isNameValid = nameLength > 0 && nameLength <= MAX_NAME_LENGTH;

  return (
    <div className="space-y-6">
      {/* 大头像预览 */}
      <div className="flex justify-center">
        <Avatar
          src={generateAvatarUrl(user.email, avatarStyle)}
          alt={name}
          className="w-24 h-24 border-4 border-emerald-300"
          imgProps={{
            referrerPolicy: 'no-referrer',
          }}
        />
      </div>

      {/* 昵称输入 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-emerald-700">昵称</label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={name}
            onValueChange={setName}
            placeholder="请输入昵称"
            maxLength={MAX_NAME_LENGTH}
            isInvalid={!isNameValid}
            errorMessage={nameLength > MAX_NAME_LENGTH ? `昵称不能超过 ${MAX_NAME_LENGTH} 个字符` : undefined}
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
        <p className="text-xs text-emerald-600/60 text-right">
          {nameLength}/{MAX_NAME_LENGTH}
        </p>
      </div>

      {/* 头像风格选择 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-emerald-700">头像风格</label>
        <AvatarStylePicker
          seed={user.email}
          selectedStyle={avatarStyle}
          onStyleChange={setAvatarStyle}
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="light"
          onPress={onCancel}
          className="flex-1"
          isDisabled={saving}
        >
          取消
        </Button>
        <Button
          color="secondary"
          onPress={handleSave}
          isLoading={saving}
          isDisabled={!isNameValid || saving}
          className="flex-1"
        >
          保存
        </Button>
      </div>
    </div>
  );
}
