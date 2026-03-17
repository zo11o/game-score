import { describe, it, expect } from 'vitest';
import type { Room, Score, User } from '@/lib/types';

// 类型定义测试 - 数据持久化已迁移到 Prisma + SQLite
// 实际数据库逻辑由 API 路由和 Prisma 处理
describe('Types', () => {
  it('User type should have required fields', () => {
    const user: User = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      avatar: 'https://example.com/avatar.png',
    };
    expect(user.id).toBe('1');
    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');
  });

  it('Room type should have required fields', () => {
    const room: Room = {
      id: '1',
      name: 'Test Room',
      password: '123456',
      status: 'active',
      roomNumber: 1001,
      creatorId: 'user1',
      creatorName: 'Test User',
      gameType: 'classic',
      roundOrderMode: 'rotate_by_player_number',
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      currentRoundNumber: null,
      users: ['user1'],
    };
    expect(room.id).toBe('1');
    expect(room.users).toContain('user1');
  });

  it('Score type should have required fields', () => {
    const score: Score = {
      id: '1',
      roomId: 'room1',
      fromUserId: 'user1',
      toUserId: 'user2',
      points: 10,
      timestamp: Date.now(),
    };
    expect(score.points).toBe(10);
    expect(score.toUserId).toBe('user2');
  });
});
