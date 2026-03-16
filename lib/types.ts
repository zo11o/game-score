// 共享类型定义，与 API 响应格式一致
export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

export interface Room {
  id: string;
  name: string;
  password: string;
  createdAt: number;
  users: string[];
}

export interface Score {
  id: string;
  roomId: string;
  fromUserId: string;
  toUserId: string;
  points: number;
  timestamp: number;
}

export interface ScoreRecord {
  id: string;
  fromUserId: string;
  fromName: string;
  fromAvatar: string;
  toUserId: string;
  toName: string;
  toAvatar: string;
  points: number;
  timestamp: number;
}
