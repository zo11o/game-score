import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE_NAME = 'game_score_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

const SESSION_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatar: true,
} as const;

export type AuthenticatedSession = Awaited<ReturnType<typeof getAuthenticatedSession>>;

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function getAuthenticatedSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: SESSION_USER_SELECT,
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({
      where: { token },
    }).catch(() => undefined);
    return null;
  }

  return session;
}

export function applySessionCookie(
  response: NextResponse,
  session: { token: string; expiresAt: Date }
) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: session.token,
    expires: session.expiresAt,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    expires: new Date(0),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export function unauthorizedResponse(message = '登录已失效，请重新登录') {
  const response = NextResponse.json(
    { error: message },
    { status: 401 }
  );
  clearSessionCookie(response);
  return response;
}

export async function destroySession(token: string | undefined) {
  if (!token) return;

  await prisma.session.delete({
    where: { token },
  }).catch(() => undefined);
}
