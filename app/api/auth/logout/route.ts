import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  destroySession,
} from '@/lib/session';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  await destroySession(token);

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
