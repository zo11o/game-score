import { describe, expect, it } from 'vitest';
import {
  buildOrderedCascade,
  buildTurnOrderPreview,
  getTurnOrderPositions,
  isCompletePermutation,
  rotatePlayerOrder,
} from '@/lib/round-order';

describe('round order helpers', () => {
  it('rotates player order by round number', () => {
    expect(rotatePlayerOrder(['u1', 'u2', 'u3'], 1)).toEqual(['u1', 'u2', 'u3']);
    expect(rotatePlayerOrder(['u1', 'u2', 'u3'], 2)).toEqual(['u2', 'u3', 'u1']);
    expect(rotatePlayerOrder(['u1', 'u2', 'u3'], 4)).toEqual(['u1', 'u2', 'u3']);
  });

  it('builds a cascading order from the chosen first player', () => {
    expect(buildOrderedCascade(['u1', 'u2', 'u3'], 'u2')).toEqual(['u2', 'u3', 'u1']);
  });

  it('validates a complete participant permutation', () => {
    expect(isCompletePermutation(['u1', 'u2'], ['u2', 'u1'])).toBe(true);
    expect(isCompletePermutation(['u1', 'u2'], ['u1'])).toBe(false);
    expect(isCompletePermutation(['u1', 'u2'], ['u1', 'u1'])).toBe(false);
  });

  it('builds previews for manual and rotating order modes', () => {
    expect(buildTurnOrderPreview('rotate_by_player_number', ['u1', 'u2', 'u3'], 3)).toEqual([
      'u3',
      'u1',
      'u2',
    ]);
    expect(
      buildTurnOrderPreview('owner_sets_full_order', ['u1', 'u2'], 2, {
        orderedUserIds: ['u2', 'u1'],
      })
    ).toEqual(['u2', 'u1']);
    expect(
      buildTurnOrderPreview('owner_sets_first_player', ['u1', 'u2', 'u3'], 2, {
        firstUserId: 'u3',
      })
    ).toEqual(['u3', 'u1', 'u2']);
  });

  it('maps turn order positions', () => {
    expect(getTurnOrderPositions(['u3', 'u1']).get('u1')).toBe(2);
  });
});
