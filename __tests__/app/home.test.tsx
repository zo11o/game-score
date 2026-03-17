import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Home from '@/app/page';
import { getCurrentUser, isUnauthorizedError, api } from '@/lib/api';
import type { User, Room } from '@/lib/types';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
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

describe('Home Page (Game Lobby)', () => {
  const mockPush = vi.fn();
  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    name: 'TestUser',
    avatar: 'https://example.com/avatar.png',
  };
  const buildRoom = (overrides: Partial<Room> = {}): Room => ({
    id: '1',
    name: 'Test Room',
    password: '123456',
    status: 'active',
    roomNumber: 1001,
    creatorId: '1',
    creatorName: 'TestUser',
    gameType: 'classic',
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    currentRoundNumber: null,
    users: ['1'],
    ...overrides,
  });

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    vi.mocked(getCurrentUser).mockReturnValue(null);
    vi.mocked(isUnauthorizedError).mockReturnValue(false);
    vi.mocked(api.getRooms).mockResolvedValue([]);
  });

  it('should redirect to login if no current user', () => {
    render(<Home />);

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('should render game lobby for logged in user', async () => {
    vi.mocked(getCurrentUser).mockReturnValue(mockUser);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('游戏大厅')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: '创建房间' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '用户中心' })).toBeInTheDocument();
  });

  it('should display existing rooms', async () => {
    vi.mocked(getCurrentUser).mockReturnValue(mockUser);
    const room = buildRoom({ users: ['2'] });
    vi.mocked(api.getRooms).mockResolvedValue([room]);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Test Room')).toBeInTheDocument();
    });

    expect(screen.getByText('👥 1 人')).toBeInTheDocument();
    expect(screen.getByText('🔒 需密码')).toBeInTheDocument();
  });

  it('should let an existing room member enter without password', async () => {
    vi.mocked(getCurrentUser).mockReturnValue(mockUser);
    const room = buildRoom({ users: ['1', '2'] });
    vi.mocked(api.getRooms).mockResolvedValue([room]);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Test Room')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Room'));

    expect(mockPush).toHaveBeenCalledWith('/room/1');
    expect(screen.queryByText('加入房间')).not.toBeInTheDocument();
    expect(api.joinRoom).not.toHaveBeenCalled();
  });

  it('should show direct entry hint for rooms the current user already joined', async () => {
    vi.mocked(getCurrentUser).mockReturnValue(mockUser);
    const room = buildRoom({ users: ['1', '2'] });
    vi.mocked(api.getRooms).mockResolvedValue([room]);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Test Room')).toBeInTheDocument();
    });

    expect(screen.getByText('✅ 已加入')).toBeInTheDocument();
  });

  it('should open create room modal', async () => {
    vi.mocked(getCurrentUser).mockReturnValue(mockUser);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '创建房间' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '创建房间' }));

    expect(screen.getByLabelText('房间名称')).toBeInTheDocument();
    expect(screen.getByLabelText('房间密码')).toBeInTheDocument();
  });

  it('should create new room', async () => {
    vi.mocked(getCurrentUser).mockReturnValue(mockUser);
    const newRoom = buildRoom({
      id: '2',
      name: 'New Room',
      password: 'password123',
    });
    vi.mocked(api.createRoom).mockResolvedValue(newRoom);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '创建房间' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '创建房间' }));

    const nameInput = screen.getByLabelText('房间名称');
    const passwordInput = screen.getByLabelText('房间密码');

    fireEvent.change(nameInput, { target: { value: 'New Room' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const form = nameInput.closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(api.createRoom).toHaveBeenCalledWith('New Room', 'password123', 'classic');
      expect(mockPush).toHaveBeenCalledWith('/room/2');
    });
  });

  it('should create poker rounds room when selected', async () => {
    vi.mocked(getCurrentUser).mockReturnValue(mockUser);
    const newRoom = buildRoom({
      id: '3',
      name: 'Poker Room',
      gameType: 'poker_rounds',
    });
    vi.mocked(api.createRoom).mockResolvedValue(newRoom);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '创建房间' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '创建房间' }));

    fireEvent.change(screen.getByLabelText('房间名称'), { target: { value: 'Poker Room' } });
    fireEvent.change(screen.getByLabelText('房间密码'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('游戏类型'), { target: { value: 'poker_rounds' } });

    fireEvent.submit(screen.getByLabelText('房间名称').closest('form')!);

    await waitFor(() => {
      expect(api.createRoom).toHaveBeenCalledWith('Poker Room', 'password123', 'poker_rounds');
      expect(mockPush).toHaveBeenCalledWith('/room/3');
    });
  });

  it('should open join room modal', async () => {
    vi.mocked(getCurrentUser).mockReturnValue(mockUser);
    const room = buildRoom({ users: ['2'] });
    vi.mocked(api.getRooms).mockResolvedValue([room]);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Test Room')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Room'));

    expect(screen.getByText('加入房间')).toBeInTheDocument();
    expect(screen.getByText('房间: Test Room')).toBeInTheDocument();
  });

  it('should join room with correct password', async () => {
    vi.mocked(getCurrentUser).mockReturnValue(mockUser);
    const room = buildRoom({ users: ['2'] });
    vi.mocked(api.getRooms).mockResolvedValue([room]);
    vi.mocked(api.joinRoom).mockResolvedValue({} as any);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Test Room')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Room'));

    const passwordInput = screen.getByLabelText('房间密码');
    fireEvent.change(passwordInput, { target: { value: '123456' } });

    const joinButton = screen.getAllByText('加入')[0];
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(api.joinRoom).toHaveBeenCalledWith('1', '123456');
      expect(mockPush).toHaveBeenCalledWith('/room/1');
    });
  });

  it('should not join room with incorrect password', async () => {
    vi.mocked(getCurrentUser).mockReturnValue(mockUser);
    const room = buildRoom({ users: ['2'] });
    vi.mocked(api.getRooms).mockResolvedValue([room]);
    vi.mocked(api.joinRoom).mockRejectedValue(new Error('密码错误'));

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Test Room')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Room'));

    const passwordInput = screen.getByLabelText('房间密码');
    fireEvent.change(passwordInput, { target: { value: 'wrong' } });

    const joinButton = screen.getAllByText('加入')[0];
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(screen.getByText('提示')).toBeInTheDocument();
      expect(screen.getByText('密码错误')).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalledWith('/room/1');
  });

  it('should navigate to profile page', async () => {
    vi.mocked(getCurrentUser).mockReturnValue(mockUser);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '用户中心' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '用户中心' }));

    expect(mockPush).toHaveBeenCalledWith('/profile');
  });

  it('should show game type badge for poker rooms', async () => {
    vi.mocked(getCurrentUser).mockReturnValue(mockUser);
    vi.mocked(api.getRooms).mockResolvedValue([
      buildRoom({
        id: 'poker-room',
        name: 'Poker Table',
        creatorName: 'Dealer',
        gameType: 'poker_rounds',
      }),
    ]);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Poker Table')).toBeInTheDocument();
    });

    expect(screen.getByText('扑克轮次')).toBeInTheDocument();
  });
});
