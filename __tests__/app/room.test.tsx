import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import RoomPage from '@/app/room/[id]/page';
import { getCurrentUser, api } from '@/lib/api';
import type { User } from '@/lib/types';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getCurrentUser: vi.fn(),
  setCurrentUser: vi.fn(),
  api: {
    register: vi.fn(),
    login: vi.fn(),
    getRooms: vi.fn(),
    createRoom: vi.fn(),
    getRoom: vi.fn(),
    joinRoom: vi.fn(),
    addScore: vi.fn(),
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

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useParams as any).mockReturnValue({ id: 'room1' });
    vi.mocked(getCurrentUser).mockReturnValue(mockUser1);
    vi.mocked(api.getRoom).mockResolvedValue({
      room: {
        id: 'room1',
        name: 'Test Room',
        password: '123456',
        createdAt: Date.now(),
        users: ['1', '2'],
      },
      users: [mockUser1, mockUser2],
      scores: {},
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
      room: {
        id: 'room1',
        name: 'Test Room',
        password: '123456',
        createdAt: Date.now(),
        users: ['1', '2'],
      },
      users: [mockUser1, mockUser2],
      scores: { '2': 10 },
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

    fireEvent.click(screen.getByText('User2'));

    expect(screen.getByText('给 User2 打分')).toBeInTheDocument();
  });

  it('should not open modal when clicking self', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: {
        id: 'room1',
        name: 'Test Room',
        password: '123456',
        createdAt: Date.now(),
        users: ['1'],
      },
      users: [mockUser1],
      scores: {},
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

    fireEvent.click(screen.getByText('User2'));

    const pointsInput = screen.getByLabelText('分数');
    fireEvent.change(pointsInput, { target: { value: '5' } });

    fireEvent.click(screen.getByText('确认'));

    await waitFor(() => {
      expect(api.addScore).toHaveBeenCalledWith('room1', '1', '2', 5);
    });
  });

  it('should update score display after giving points', async () => {
    vi.mocked(api.addScore).mockResolvedValue({} as any);

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByText('User2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('User2'));

    const pointsInput = screen.getByLabelText('分数');
    fireEvent.change(pointsInput, { target: { value: '15' } });

    fireEvent.click(screen.getByText('确认'));

    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  it('should navigate back to lobby', async () => {
    vi.mocked(api.getRoom).mockResolvedValue({
      room: {
        id: 'room1',
        name: 'Test Room',
        password: '123456',
        createdAt: Date.now(),
        users: ['1'],
      },
      users: [mockUser1],
      scores: {},
    });

    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByText('返回大厅')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('返回大厅'));

    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
