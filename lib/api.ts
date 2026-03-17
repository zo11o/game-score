'use client';

import type {
  DealAllocation,
  DealRoundPayload,
  ParticipationHistory,
  Room,
  RoomDetailsResponse,
  RoundOrderMode,
  ScoreRecord,
  User,
} from './types';

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

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isUnauthorizedError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      setCurrentUser(null);
    }
    throw new ApiError(data.error || '请求失败', res.status);
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

  async createRoom(
    name: string,
    password: string,
    gameType: Room['gameType'],
    roundOrderMode?: RoundOrderMode
  ) {
    const data = await handleResponse<{ room: Room }>(
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password, gameType, roundOrderMode }),
      })
    );
    return data.room;
  },

  async getRoom(roomId: string) {
    return handleResponse<RoomDetailsResponse>(await fetch(`/api/rooms/${roomId}`));
  },

  async joinRoom(roomId: string, password?: string) {
    return handleResponse(
      await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
    );
  },

  async addScore(roomId: string, toUserId: string, points: number) {
    return handleResponse(
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, toUserId, points }),
      })
    );
  },

  async finishRoom(roomId: string) {
    return handleResponse(
      await fetch(`/api/rooms/${roomId}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  },

  async dealRound(roomId: string, payload: DealRoundPayload | DealAllocation[]) {
    const normalizedPayload = Array.isArray(payload)
      ? { allocations: payload }
      : payload;

    return handleResponse(
      await fetch(`/api/rooms/${roomId}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedPayload),
      })
    );
  },

  async drawCard(roomId: string) {
    return handleResponse<{ success: true; drawId: string; roundNumber: number }>(
      await fetch(`/api/rooms/${roomId}/rounds/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  },

  async peekHand(roomId: string) {
    return handleResponse<{ success: true; roundNumber: number }>(
      await fetch(`/api/rooms/${roomId}/rounds/peek`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  },

  async toggleCardVisibility(roomId: string, cardCode: string) {
    return handleResponse<{ success: true; isFaceUp: boolean }>(
      await fetch(`/api/rooms/${roomId}/rounds/cards/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardCode }),
      })
    );
  },

  async getUserHistory(userId: string): Promise<ParticipationHistory[]> {
    return handleResponse(await fetch(`/api/users/${userId}/history`));
  },

  async logout() {
    return handleResponse(
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  },
};
