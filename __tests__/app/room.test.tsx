import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import RoomPage from '@/app/room/[id]/page';
import { getCurrentUser, isUnauthorizedError, api } from '@/lib/api';
import type { CurrentRound, RoomUser, User } from '@/lib/types';

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
    peekHand: vi.fn(),
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
  const mockRoomUser1: RoomUser = {
    ...mockUser1,
    playerNumber: 1,
  };
  const mockRoomUser2: RoomUser = {
    ...mockUser2,
    playerNumber: 2,
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
    roundOrderMode: 'rotate_by_player_number' as const,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    currentRoundNumber: null,
    users: ['1', '2'],
    ...overrides,
  });
  const buildRound = (overrides: Partial<CurrentRound> = {}): CurrentRound => ({
    roundNumber: 1,
    dealtAt: Date.now(),
    remainingCardCount: 53,
    turnOrderUserIds: ['1', '2'],
    hands: [
      {
        userId: '1',
        visibleCards: [],
        hiddenCount: 0,
        isParticipant: true,
        hasPeeked: true,
      },
      {
        userId: '2',
        visibleCards: [],
        hiddenCount: 0,
        isParticipant: true,
        hasPeeked: false,
      },
    ],
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
      users: [mockRoomUser1, mockRoomUser2],
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

  it('should render players by player number order', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom({ users: ['2', '1'] }),
      users: [
        { ...mockRoomUser2, playerNumber: 2 },
        { ...mockRoomUser1, playerNumber: 1 },
      ],
      scores: {},
      records: [],
      currentRound: null,
    });

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Room')).toBeInTheDocument();
    });

    const orderedUsers = screen
      .getAllByText(/^User[12]$/)
      .slice(0, 2)
      .map((element) => element.textContent);

    expect(orderedUsers).toEqual(['User1', 'User2']);
    expect(screen.getByText('玩家 1')).toBeInTheDocument();
    expect(screen.getByText('玩家 2')).toBeInTheDocument();
  });

  it('should display user scores', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom(),
      users: [mockRoomUser1, mockRoomUser2],
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
      users: [mockRoomUser1],
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
      users: [mockRoomUser1],
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
      users: [mockRoomUser1, mockRoomUser2],
      scores: { '1': 0, '2': 3 },
      records: [],
      currentRound: buildRound({
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
            hasPeeked: true,
          },
          {
            userId: '2',
            visibleCards: [],
            hiddenCount: 2,
            isParticipant: true,
            hasPeeked: false,
          },
        ],
      }),
    });

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByText('扑克轮次')).toBeInTheDocument();
    });

    expect(screen.getByText('第 1 轮')).toBeInTheDocument();
    expect(screen.getByText('顺序规则：玩家号轮换')).toBeInTheDocument();
    expect(screen.getByText('本轮第 1 位')).toBeInTheDocument();
    expect(screen.getByText('本轮第 2 位')).toBeInTheDocument();
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
      users: [mockRoomUser1, mockRoomUser2],
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
      expect(api.dealRound).toHaveBeenCalledWith('room1', {
        allocations: [
          { userId: '1', cardCount: 2 },
          { userId: '2', cardCount: 3 },
        ],
      });
    });
  });

  it('should submit the full manual order from the second round', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom({
        gameType: 'poker_rounds',
        roundOrderMode: 'owner_sets_full_order',
        creatorId: '1',
        creatorName: 'User1',
        currentRoundNumber: 1,
      }),
      users: [mockRoomUser1, mockRoomUser2],
      scores: {},
      records: [],
      currentRound: buildRound(),
    });
    vi.mocked(api.dealRound).mockResolvedValue({ success: true } as never);

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '发下一轮' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '发下一轮' }));
    fireEvent.click(screen.getByRole('button', { name: /玩家 2 User2/ }));
    fireEvent.click(screen.getByRole('button', { name: /玩家 1 User1/ }));
    fireEvent.click(screen.getByRole('button', { name: '确认发牌' }));

    await waitFor(() => {
      expect(api.dealRound).toHaveBeenCalledWith('room1', {
        allocations: [
          { userId: '1', cardCount: 7 },
          { userId: '2', cardCount: 7 },
        ],
        orderedUserIds: ['2', '1'],
      });
    });
  });

  it('should submit the selected first player for cascading order mode', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom({
        gameType: 'poker_rounds',
        roundOrderMode: 'owner_sets_first_player',
        creatorId: '1',
        creatorName: 'User1',
        currentRoundNumber: 1,
      }),
      users: [mockRoomUser1, mockRoomUser2],
      scores: {},
      records: [],
      currentRound: buildRound(),
    });
    vi.mocked(api.dealRound).mockResolvedValue({ success: true } as never);

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '发下一轮' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '发下一轮' }));
    fireEvent.click(screen.getByRole('button', { name: /玩家 2 User2/ }));
    fireEvent.click(screen.getByRole('button', { name: '确认发牌' }));

    await waitFor(() => {
      expect(api.dealRound).toHaveBeenCalledWith('room1', {
        allocations: [
          { userId: '1', cardCount: 7 },
          { userId: '2', cardCount: 7 },
        ],
        firstUserId: '2',
      });
    });
  });

  it('should default the first round deal modal to 7 cards per player', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom({
        gameType: 'poker_rounds',
        creatorId: '1',
        creatorName: 'User1',
      }),
      users: [mockRoomUser1, mockRoomUser2],
      scores: {},
      records: [],
      currentRound: null,
    });

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '开始第一轮' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '开始第一轮' }));

    expect(screen.getByLabelText('User1 发牌张数')).toHaveValue(7);
    expect(screen.getByLabelText('User2 发牌张数')).toHaveValue(7);
  });

  it('should reuse the last confirmed deal allocations from local cache', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom({
        gameType: 'poker_rounds',
        creatorId: '1',
        creatorName: 'User1',
      }),
      users: [mockRoomUser1, mockRoomUser2],
      scores: {},
      records: [],
      currentRound: null,
    });
    vi.mocked(api.dealRound).mockResolvedValue({ success: true } as never);

    const { unmount } = render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '开始第一轮' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '开始第一轮' }));
    fireEvent.change(screen.getByLabelText('User1 发牌张数'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('User2 发牌张数'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: '确认发牌' }));

    await waitFor(() => {
      expect(api.dealRound).toHaveBeenCalledWith('room1', {
        allocations: [
          { userId: '1', cardCount: 5 },
          { userId: '2', cardCount: 8 },
        ],
      });
    });

    unmount();
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useParams as any).mockReturnValue({ id: 'room1' });
    vi.mocked(getCurrentUser).mockReturnValue(mockUser1);
    vi.mocked(isUnauthorizedError).mockReturnValue(false);
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom({
        gameType: 'poker_rounds',
        creatorId: '1',
        creatorName: 'User1',
      }),
      users: [mockRoomUser1, mockRoomUser2],
      scores: {},
      records: [],
      currentRound: null,
    });

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '开始第一轮' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '开始第一轮' }));

    expect(screen.getByLabelText('User1 发牌张数')).toHaveValue(5);
    expect(screen.getByLabelText('User2 发牌张数')).toHaveValue(8);
  });

  it('should allow current user to draw one card from the remaining deck', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom({
        gameType: 'poker_rounds',
        currentRoundNumber: 1,
      }),
      users: [mockRoomUser1, mockRoomUser2],
      scores: { '1': 0, '2': 3 },
      records: [],
      currentRound: buildRound({
        remainingCardCount: 12,
        hands: [
          {
            userId: '1',
            visibleCards: [],
            hiddenCount: 0,
            isParticipant: true,
            hasPeeked: true,
          },
          {
            userId: '2',
            visibleCards: [],
            hiddenCount: 2,
            isParticipant: true,
            hasPeeked: false,
          },
        ],
      }),
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

  it('should keep self cards covered until peeking and show the peek button', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom({
        gameType: 'poker_rounds',
        currentRoundNumber: 1,
      }),
      users: [mockRoomUser1, mockRoomUser2],
      scores: { '1': 0, '2': 3 },
      records: [],
      currentRound: buildRound({
        remainingCardCount: 10,
        hands: [
          {
            userId: '1',
            visibleCards: [],
            hiddenCount: 2,
            isParticipant: true,
            hasPeeked: false,
          },
          {
            userId: '2',
            visibleCards: [],
            hiddenCount: 2,
            isParticipant: true,
            hasPeeked: false,
          },
        ],
      }),
    });
    vi.mocked(api.peekHand).mockResolvedValue({
      success: true,
      roundNumber: 1,
    } as never);

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '看牌' })).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('A♠ 已亮牌，双击收回')).not.toBeInTheDocument();
    expect(screen.getByText('看牌后可查看未亮牌统计和亮牌操作。')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '看牌' }));

    await waitFor(() => {
      expect(api.peekHand).toHaveBeenCalledWith('room1');
    });
  });

  it('should toggle card visibility on double click and keep the face-up marker visible', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom({
        gameType: 'poker_rounds',
        currentRoundNumber: 1,
      }),
      users: [mockRoomUser1, mockRoomUser2],
      scores: { '1': 0, '2': 3 },
      records: [],
      currentRound: buildRound({
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
            hasPeeked: true,
          },
          {
            userId: '2',
            visibleCards: [],
            hiddenCount: 2,
            isParticipant: true,
            hasPeeked: false,
          },
        ],
      }),
    });
    vi.mocked(api.toggleCardVisibility).mockResolvedValue({
      success: true,
      isFaceUp: false,
    } as never);

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByText('已亮')).toBeInTheDocument();
    });

    const faceUpCard = screen.getByLabelText('A♠ 已亮牌，双击收回');

    fireEvent.click(faceUpCard);
    expect(api.toggleCardVisibility).not.toHaveBeenCalled();

    fireEvent.doubleClick(faceUpCard);

    await waitFor(() => {
      expect(api.toggleCardVisibility).toHaveBeenCalledWith('room1', 'SA');
    });

    expect(screen.getByText('双击卡牌可亮牌或扣回')).toBeInTheDocument();
    expect(screen.queryByText('确认收回亮牌')).not.toBeInTheDocument();
  });

  it('should support double tap on mobile to toggle card visibility', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: buildRoom({
        gameType: 'poker_rounds',
        currentRoundNumber: 1,
      }),
      users: [mockRoomUser1, mockRoomUser2],
      scores: { '1': 0, '2': 3 },
      records: [],
      currentRound: buildRound({
        remainingCardCount: 8,
        hands: [
          {
            userId: '1',
            visibleCards: [
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
            hasPeeked: true,
          },
          {
            userId: '2',
            visibleCards: [],
            hiddenCount: 2,
            isParticipant: true,
            hasPeeked: false,
          },
        ],
      }),
    });
    vi.mocked(api.toggleCardVisibility).mockResolvedValue({
      success: true,
      isFaceUp: true,
    } as never);

    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(1000);
    nowSpy.mockReturnValueOnce(1200);

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('K♥ 未亮牌，双击公开')).toBeInTheDocument();
    });

    const hiddenCard = screen.getByLabelText('K♥ 未亮牌，双击公开');

    fireEvent.touchEnd(hiddenCard);
    fireEvent.touchEnd(hiddenCard);

    await waitFor(() => {
      expect(api.toggleCardVisibility).toHaveBeenCalledWith('room1', 'KH');
    });

    nowSpy.mockRestore();
  });
});
