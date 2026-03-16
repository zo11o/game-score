import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Login from '@/app/login/page';
import { api, setCurrentUser } from '@/lib/api';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
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

const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'TestUser',
  avatar: 'https://example.com/avatar.png',
};

describe('Login Page', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
  });

  it('should render login form', () => {
    render(<Login />);

    expect(screen.getByText('赛事记分')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入邮箱')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入密码（至少 6 位）')).toBeInTheDocument();
    expect(screen.getByText('登录')).toBeInTheDocument();
  });

  it('should toggle between login and register', () => {
    render(<Login />);

    expect(screen.getByText('登录')).toBeInTheDocument();

    fireEvent.click(screen.getByText('没有账号？去注册'));
    expect(screen.getByText('注册')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入昵称')).toBeInTheDocument();

    fireEvent.click(screen.getByText('已有账号？去登录'));
    expect(screen.getByText('登录')).toBeInTheDocument();
  });

  it('should register new user successfully', async () => {
    vi.mocked(api.register).mockResolvedValue(mockUser);

    render(<Login />);

    fireEvent.click(screen.getByText('没有账号？去注册'));

    const emailInput = screen.getByPlaceholderText('请输入邮箱');
    const passwordInput = screen.getByPlaceholderText('请输入密码（至少 6 位）');
    const nameInput = screen.getByPlaceholderText('请输入昵称');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(nameInput, { target: { value: 'TestUser' } });

    fireEvent.click(screen.getByText('注册'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    expect(api.register).toHaveBeenCalledWith('test@example.com', 'password123', 'TestUser');
    expect(setCurrentUser).toHaveBeenCalledWith(mockUser);
  });

  it('should not register duplicate email', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.mocked(api.register).mockRejectedValue(new Error('该邮箱已被注册，请直接登录'));

    render(<Login />);

    fireEvent.click(screen.getByText('没有账号？去注册'));

    const emailInput = screen.getByPlaceholderText('请输入邮箱');
    const passwordInput = screen.getByPlaceholderText('请输入密码（至少 6 位）');
    const nameInput = screen.getByPlaceholderText('请输入昵称');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(nameInput, { target: { value: 'AnotherName' } });

    fireEvent.click(screen.getByText('注册'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('该邮箱已被注册，请直接登录');
    });

    expect(mockPush).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('should login existing user successfully', async () => {
    vi.mocked(api.login).mockResolvedValue(mockUser);

    render(<Login />);

    const emailInput = screen.getByPlaceholderText('请输入邮箱');
    const passwordInput = screen.getByPlaceholderText('请输入密码（至少 6 位）');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(screen.getByText('登录'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    expect(api.login).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(setCurrentUser).toHaveBeenCalledWith(mockUser);
  });

  it('should not login non-existent email', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.mocked(api.login).mockRejectedValue(new Error('该邮箱未注册，请先注册'));

    render(<Login />);

    const emailInput = screen.getByPlaceholderText('请输入邮箱');
    const passwordInput = screen.getByPlaceholderText('请输入密码（至少 6 位）');

    fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(screen.getByText('登录'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('该邮箱未注册，请先注册');
    });

    expect(mockPush).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('should not login with wrong password', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.mocked(api.login).mockRejectedValue(new Error('密码错误'));

    render(<Login />);

    const emailInput = screen.getByPlaceholderText('请输入邮箱');
    const passwordInput = screen.getByPlaceholderText('请输入密码（至少 6 位）');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    fireEvent.click(screen.getByText('登录'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('密码错误');
    });

    expect(mockPush).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('should require email and password input', () => {
    render(<Login />);

    const emailInput = screen.getByPlaceholderText('请输入邮箱');
    const passwordInput = screen.getByPlaceholderText('请输入密码（至少 6 位）');

    expect(emailInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('required');
  });
});
