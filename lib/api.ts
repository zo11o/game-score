'use client';

import type { User, Room, ScoreRecord } from './types';

const USER_KEY = 'game_score_user';

// 当前用户（从 localStorage 读取，登录/注册后写入）
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export function setCurrentUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data as T;
}

export const api = {
  async register(email: string, password: string, name: string) {
    const data = await handleResponse<{ user: User }>(
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
    );
    return data.user;
  },

  async login(email: string, password: string) {
    const data = await handleResponse<{ user: User }>(
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
    );
    return data.user;
  },

  async getRooms(): Promise<Room[]> {
    return handleResponse(await fetch('/api/rooms'));
  },

  async createRoom(name: string, password: string, userId: string) {
    const data = await handleResponse<{ room: Room }>(
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password, userId }),
      })
    );
    return data.room;
  },

  async getRoom(roomId: string) {
    return handleResponse<{
      room: Room;
      users: User[];
      scores: Record<string, number>;
      records: ScoreRecord[];
    }>(await fetch(`/api/rooms/${roomId}`));
  },

  async joinRoom(roomId: string, userId: string, password: string) {
    return handleResponse(
      await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      })
    );
  },

  async addScore(roomId: string, fromUserId: string, toUserId: string, points: number) {
    return handleResponse(
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, fromUserId, toUserId, points }),
      })
    );
  },
};
