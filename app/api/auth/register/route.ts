import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { applySessionCookie, createSession } from '@/lib/session';
import { generateNickname } from '@/lib/nickname-generator';
import { generateAvatarUrl } from '@/lib/avatar-styles';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return errorResponse('邮箱和密码不能为空', 400);
    }

    if (password.length < 6) {
      return errorResponse('密码至少需要 6 位', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return errorResponse('该邮箱已被注册，请直接登录', 400);
    }

    // 昵称可选，未提供时自动生成
    const finalName = name?.trim() || generateNickname();

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: finalName,
        avatar: generateAvatarUrl(normalizedEmail),
      },
    });

    const response = successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    }, '注册成功');
    applySessionCookie(response, await createSession(user.id));
    return response;
  } catch (err) {
    console.error('Register error:', err);
    return errorResponse('注册失败，请重试', 500);
  }
}
