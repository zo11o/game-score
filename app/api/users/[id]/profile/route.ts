import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedSession } from '@/lib/session';
import { generateAvatarUrl } from '@/lib/avatar-styles';
import type { AvatarStyleId } from '@/lib/types';

// 昵称长度限制
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 20;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // 验证登录状态
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return errorResponse('未登录', 401);
    }

    // 只能修改自己的资料
    if (session.userId !== userId) {
      return errorResponse('无权修改其他用户的资料', 403);
    }

    const body = await request.json();
    const { name, avatarStyle, avatarSeed } = body as {
      name?: string;
      avatarStyle?: AvatarStyleId;
      avatarSeed?: string;
    };

    // 至少要有一个字段需要更新
    if (!name && !avatarStyle && !avatarSeed) {
      return errorResponse('没有需要更新的字段', 400);
    }

    // 构建更新数据
    const updateData: { name?: string; avatar?: string } = {};

    // 更新昵称
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (trimmedName.length < MIN_NAME_LENGTH || trimmedName.length > MAX_NAME_LENGTH) {
        return errorResponse(`昵称长度需要在 ${MIN_NAME_LENGTH}-${MAX_NAME_LENGTH} 个字符之间`, 400);
      }
      updateData.name = trimmedName;
    }

    // 更新头像（需要同时提供 style 和 seed，或者只更新其中之一时保留原有的）
    if (avatarStyle || avatarSeed) {
      // 获取当前用户信息
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatar: true },
      });

      if (!currentUser) {
        return errorResponse('用户不存在', 404);
      }

      // 从当前头像 URL 解析 style（如果未提供新的）
      let finalStyle = avatarStyle;
      let finalSeed = avatarSeed;

      if (!finalSeed) {
        // 使用邮箱作为默认 seed
        const userWithEmail = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });
        finalSeed = userWithEmail?.email || userId;
      }

      // 生成新的头像 URL
      updateData.avatar = generateAvatarUrl(finalSeed, finalStyle || 'identicon');
    }

    // 执行更新
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });

    return successResponse({ user: updatedUser }, '资料更新成功');
  } catch (err) {
    console.error('Update profile error:', err);
    return errorResponse('更新资料失败，请重试', 500);
  }
}
