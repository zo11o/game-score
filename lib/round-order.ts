import type { RoundOrderMode } from '@/lib/types';

export const ROUND_ORDER_MODE_LABELS: Record<RoundOrderMode, string> = {
  rotate_by_player_number: '玩家号轮换',
  random_each_round: '每轮随机',
  owner_sets_full_order: '房主指定顺序',
  owner_sets_first_player: '指定首位顺延',
};

export function rotatePlayerOrder(userIds: string[], roundNumber: number): string[] {
  if (userIds.length <= 1) {
    return [...userIds];
  }

  const offset = Math.max(roundNumber - 1, 0) % userIds.length;
  return [...userIds.slice(offset), ...userIds.slice(0, offset)];
}

export function buildOrderedCascade(userIds: string[], firstUserId: string): string[] {
  const startIndex = userIds.indexOf(firstUserId);
  if (startIndex === -1) {
    return [...userIds];
  }

  return [...userIds.slice(startIndex), ...userIds.slice(0, startIndex)];
}

export function isCompletePermutation(expectedUserIds: string[], orderedUserIds: string[]): boolean {
  if (expectedUserIds.length !== orderedUserIds.length) {
    return false;
  }

  const expected = [...expectedUserIds].sort();
  const received = [...orderedUserIds].sort();
  return expected.every((value, index) => value === received[index]);
}

export function buildTurnOrderPreview(
  mode: RoundOrderMode,
  participantUserIds: string[],
  roundNumber: number,
  options?: {
    orderedUserIds?: string[];
    firstUserId?: string | null;
  }
): string[] {
  if (roundNumber <= 1) {
    return [...participantUserIds];
  }

  if (mode === 'rotate_by_player_number') {
    return rotatePlayerOrder(participantUserIds, roundNumber);
  }

  if (mode === 'owner_sets_full_order') {
    return options?.orderedUserIds && isCompletePermutation(participantUserIds, options.orderedUserIds)
      ? [...options.orderedUserIds]
      : [...participantUserIds];
  }

  if (mode === 'owner_sets_first_player') {
    return options?.firstUserId
      ? buildOrderedCascade(participantUserIds, options.firstUserId)
      : [...participantUserIds];
  }

  return [...participantUserIds];
}

export function getTurnOrderPositions(turnOrderUserIds: string[]): Map<string, number> {
  return new Map(turnOrderUserIds.map((userId, index) => [userId, index + 1]));
}
