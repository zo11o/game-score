import type { Room as RoomDto, User as UserDto } from '@/lib/types';

type CreatorLike = {
  id: string;
  name: string;
};

type SerializableRoom = {
  id: string;
  name: string;
  password: string;
  status: string;
  roomNumber: number;
  creatorId: string;
  gameType: string;
  createdAt: Date;
  lastActivityAt: Date;
  currentRoundNumber: number | null;
};

export function serializeRoom(
  room: SerializableRoom,
  creator: CreatorLike,
  users: string[]
): RoomDto {
  return {
    id: room.id,
    name: room.name,
    password: room.password,
    status: room.status as RoomDto['status'],
    roomNumber: room.roomNumber,
    creatorId: room.creatorId,
    creatorName: creator.name,
    gameType: room.gameType as RoomDto['gameType'],
    createdAt: room.createdAt.getTime(),
    lastActivityAt: room.lastActivityAt.getTime(),
    currentRoundNumber: room.currentRoundNumber,
    users,
  };
}

export function serializeUser(user: UserDto): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
  };
}
