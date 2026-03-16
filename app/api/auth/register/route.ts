import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { applySessionCookie, createSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: '邮箱、密码和昵称不能为空' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码至少需要 6 位' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: '该邮箱已被注册，请直接登录' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name.trim(),
        avatar: `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(normalizedEmail)}`,
      },
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
    applySessionCookie(response, await createSession(user.id));
    return response;
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json(
      { error: '注册失败，请重试' },
      { status: 500 }
    );
  }
}
