import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';
import { applySessionCookie, createSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return errorResponse('邮箱和密码不能为空', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return errorResponse('该邮箱未注册，请先注册', 400);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return errorResponse('密码错误', 400);
    }

    const response = successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    }, '登录成功');
    applySessionCookie(response, await createSession(user.id));
    return response;
  } catch (err) {
    console.error('Login error:', err);
    return errorResponse('登录失败，请重试', 500);
  }
}
