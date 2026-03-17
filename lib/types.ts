// 共享类型定义，与 API 响应格式一致
export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export type GameType = 'classic' | 'poker_rounds';
export type RoundOrderMode =
  | 'rotate_by_player_number'
  | 'random_each_round'
  | 'owner_sets_full_order'
  | 'owner_sets_first_player';

export interface Room {
  id: string;
  name: string;
  password: string;
  status: 'active' | 'finished';
  roomNumber: number;
  creatorId: string;
  creatorName: string;
  gameType: GameType;
  roundOrderMode: RoundOrderMode;
  createdAt: number;
  lastActivityAt: number;
  currentRoundNumber: number | null;
  users: string[];
}

export interface RoomUser extends User {
  playerNumber: number;
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

export interface PlayingCard {
  code: string;
  rank: string;
  suit: 'spades' | 'hearts' | 'clubs' | 'diamonds' | 'joker';
  label: string;
  color: 'red' | 'black' | 'special';
  isFaceUp: boolean;
}

export interface RoundHand {
  userId: string;
  visibleCards: PlayingCard[];
  hiddenCount: number;
  isParticipant: boolean;
}

export interface CurrentRound {
  roundNumber: number;
  dealtAt: number;
  remainingCardCount: number;
  turnOrderUserIds: string[];
  hands: RoundHand[];
}

export interface DealAllocation {
  userId: string;
  cardCount: number;
}

export interface DealRoundPayload {
  allocations: DealAllocation[];
  orderedUserIds?: string[];
  firstUserId?: string;
}

export interface RoomDrawEvent {
  drawId: string;
  roomId: string;
  roundNumber: number;
  toUserId: string;
}

export interface ParticipationHistory {
  roomId: string;
  roomName: string;
  roomNumber: number;
  roomStatus: 'active' | 'finished';
  creatorName: string;
  gameType: GameType;
  joinedAt: number;
  participantCount: number;
  scoresGiven: number;
  scoresReceived: number;
  totalPointsGiven: number;
  totalPointsReceived: number;
  finalScore: number;
}

export interface RoomDetailsResponse {
  room: Room;
  users: RoomUser[];
  scores: Record<string, number>;
  records: ScoreRecord[];
  currentRound: CurrentRound | null;
}
