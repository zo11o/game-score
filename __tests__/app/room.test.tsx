import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import RoomPage from '@/app/room/[id]/page';
import { getCurrentUser, isUnauthorizedError, api } from '@/lib/api';
import type { User } from '@/lib/types';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getCurrentUser: vi.fn(),
  isUnauthorizedError: vi.fn(() => false),
  setCurrentUser: vi.fn(),
  api: {
    register: vi.fn(),
    login: vi.fn(),
    getRooms: vi.fn(),
    createRoom: vi.fn(),
    getRoom: vi.fn(),
    joinRoom: vi.fn(),
    addScore: vi.fn(),
    finishRoom: vi.fn(),
    dealRound: vi.fn(),
    drawCard: vi.fn(),
    toggleCardVisibility: vi.fn(),
    getUserHistory: vi.fn(),
    logout: vi.fn(),
  },
}));

describe('Room Page', () => {
  const mockPush = vi.fn();
  const mockUser1: User = {
    id: '1',
    email: 'user1@example.com',
    name: 'User1',
    avatar: 'https://example.com/avatar1.png',
  };
  const mockUser2: User = {
    id: '2',
    email: 'user2@example.com',
    name: 'User2',
    avatar: 'https://example.com/avatar2.png',
  };
  const buildRoom = (overrides: Record<string, unknown> = {}) => ({
    id: 'room1',
    name: 'Test Room',
    password: '123456',
    status: 'active' as const,
    roomNumber: 1001,
    creatorId: '1',
    creatorName: 'User1',
    gameType: 'classic' as const,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    currentRoundNumber: null,
    users: ['1', '2'],
    ...overrides,
  });

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useParams as any).mockReturnValue({ id: 'room1' });
    vi.mocked(getCurrentUser).mockReturnValue(mockUser1);
    vi.mocked(isUnauthorizedError).mockReturnValue(false);
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom(),
      users: [mockUser1, mockUser2],
      scores: {},
      records: [],
      currentRound: null,
    });
  });

  it('should redirect to login if no current user', () => {
    vi.mocked(getCurrentUser).mockReturnValue(null);

    render(<RoomPage />);

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('should redirect to home if room not found', () => {
    vi.mocked(api.getRoom).mockRejectedValue(new Error('Not found'));

    render(<RoomPage />);

    return waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('should render room with users', async () => {
    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Room')).toBeInTheDocument();
    });

    expect(screen.getByText('User1')).toBeInTheDocument();
    expect(screen.getByText('User2')).toBeInTheDocument();
  });

  it('should display user scores', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom(),
      users: [mockUser1, mockUser2],
      scores: { '2': 10 },
      records: [],
      currentRound: null,
    });

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Room')).toBeInTheDocument();
    });

    const scoreElements = screen.getAllByText('10');
    expect(scoreElements.length).toBeGreaterThan(0);
  });

  it('should mark current user', async () => {
    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByText('你')).toBeInTheDocument();
    });
  });

  it('should open give score modal when clicking other user', async () => {
    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByText('User2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('给 User2 打分'));

    expect(screen.getByText('给 User2 打分')).toBeInTheDocument();
  });

  it('should not open modal when clicking self', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom({ users: ['1'] }),
      users: [mockUser1],
      scores: {},
      records: [],
      currentRound: null,
    });

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByText('User1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('User1'));

    expect(screen.queryByText(/给.*打分/)).not.toBeInTheDocument();
  });

  it('should give score to user', async () => {
    vi.mocked(api.addScore).mockResolvedValue({} as any);

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByText('User2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('给 User2 打分'));

    const pointsInput = screen.getByLabelText('分数');
    fireEvent.change(pointsInput, { target: { value: '5' } });

    fireEvent.click(screen.getByText('确认'));

    await waitFor(() => {
      expect(api.addScore).toHaveBeenCalledWith('room1', '2', 5);
    });
  });

  it('should update score display after giving points', async () => {
    vi.mocked(api.addScore).mockResolvedValue({} as any);

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByText('User2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('给 User2 打分'));

    const pointsInput = screen.getByLabelText('分数');
    fireEvent.change(pointsInput, { target: { value: '15' } });

    fireEvent.click(screen.getByText('确认'));

    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  it('should navigate back to lobby', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom({ users: ['1'] }),
      users: [mockUser1],
      scores: {},
      records: [],
      currentRound: null,
    });

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByText('返回大厅')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('返回大厅'));

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('should show poker round status and hide other players cards', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom({
        gameType: 'poker_rounds',
        currentRoundNumber: 1,
      }),
      users: [mockUser1, mockUser2],
      scores: { '1': 0, '2': 3 },
      records: [],
      currentRound: {
        roundNumber: 1,
        dealtAt: Date.now(),
        remainingCardCount: 53,
        hands: [
          {
            userId: '1',
            visibleCards: [
              {
                code: 'SA',
                rank: 'A',
                suit: 'spades',
                label: 'A♠',
                color: 'black',
                isFaceUp: false,
              },
            ],
            hiddenCount: 0,
            isParticipant: true,
          },
          {
            userId: '2',
            visibleCards: [],
            hiddenCount: 2,
            isParticipant: true,
          },
        ],
      },
    });

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByText('扑克轮次')).toBeInTheDocument();
    });

    expect(screen.getByText('第 1 轮')).toBeInTheDocument();
    expect(screen.getByText('剩余 53 张')).toBeInTheDocument();
    expect(screen.getAllByText('本轮手牌').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('?').length).toBeGreaterThanOrEqual(3);
  });

  it('should allow owner to deal the next poker round', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom({
        gameType: 'poker_rounds',
        creatorId: '1',
        creatorName: 'User1',
      }),
      users: [mockUser1, mockUser2],
      scores: {},
      records: [],
      currentRound: null,
    });
    vi.mocked(api.dealRound).mockResolvedValue({ success: true } as never);

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '开始第一轮' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '开始第一轮' }));

    fireEvent.change(screen.getByLabelText('User1 发牌张数'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('User2 发牌张数'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: '确认发牌' }));

    await waitFor(() => {
      expect(api.dealRound).toHaveBeenCalledWith('room1', [
        { userId: '1', cardCount: 2 },
        { userId: '2', cardCount: 3 },
      ]);
    });
  });

  it('should allow current user to draw one card from the remaining deck', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom({
        gameType: 'poker_rounds',
        currentRoundNumber: 1,
      }),
      users: [mockUser1, mockUser2],
      scores: { '1': 0, '2': 3 },
      records: [],
      currentRound: {
        roundNumber: 1,
        dealtAt: Date.now(),
        remainingCardCount: 12,
        hands: [
          {
            userId: '1',
            visibleCards: [],
            hiddenCount: 0,
            isParticipant: true,
          },
          {
            userId: '2',
            visibleCards: [],
            hiddenCount: 2,
            isParticipant: true,
          },
        ],
      },
    });
    vi.mocked(api.drawCard).mockResolvedValue({
      success: true,
      drawId: 'draw-1',
      roundNumber: 1,
    } as never);

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '抽一张' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '抽一张' }));

    await waitFor(() => {
      expect(api.drawCard).toHaveBeenCalledWith('room1');
    });
  });

  it('should confirm before toggling card visibility and mark face-up cards', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom({
        gameType: 'poker_rounds',
        currentRoundNumber: 1,
      }),
      users: [mockUser1, mockUser2],
      scores: { '1': 0, '2': 3 },
      records: [],
      currentRound: {
        roundNumber: 1,
        dealtAt: Date.now(),
        remainingCardCount: 8,
        hands: [
          {
            userId: '1',
            visibleCards: [
              {
                code: 'SA',
                rank: 'A',
                suit: 'spades',
                label: 'A♠',
                color: 'black',
                isFaceUp: true,
              },
              {
                code: 'KH',
                rank: 'K',
                suit: 'hearts',
                label: 'K♥',
                color: 'red',
                isFaceUp: false,
              },
            ],
            hiddenCount: 0,
            isParticipant: true,
          },
          {
            userId: '2',
            visibleCards: [],
            hiddenCount: 2,
            isParticipant: true,
          },
        ],
      },
    });
    vi.mocked(api.toggleCardVisibility).mockResolvedValue({
      success: true,
      isFaceUp: false,
    } as never);

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByText('已亮')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('A♠ 已亮牌，点击收回'));

    expect(screen.getByText('确认收回亮牌')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '确认扣回' }));

    await waitFor(() => {
      expect(api.toggleCardVisibility).toHaveBeenCalledWith('room1', 'SA');
    });
  });
});
