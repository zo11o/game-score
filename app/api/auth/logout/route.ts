import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api-response';
import {
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  destroySession,
} from '@/lib/session';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  await destroySession(token);

  const response = successResponse({ success: true }, '退出成功');
  clearSessionCookie(response);
  return response;
}
