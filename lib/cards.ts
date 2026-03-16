import { randomInt } from 'crypto';
import type { PlayingCard } from '@/lib/types';

const SUITS = [
  { code: 'S', symbol: '♠', suit: 'spades' as const, color: 'black' as const },
  { code: 'H', symbol: '♥', suit: 'hearts' as const, color: 'red' as const },
  { code: 'C', symbol: '♣', suit: 'clubs' as const, color: 'black' as const },
  { code: 'D', symbol: '♦', suit: 'diamonds' as const, color: 'red' as const },
];

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const FULL_DECK_CODES = [
  ...SUITS.flatMap((suit) => RANKS.map((rank) => `${rank}${suit.code}`)),
  'BJ',
  'RJ',
];

export function shuffleDeck(cards: string[] = FULL_DECK_CODES): string[] {
  const deck = [...cards];

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const swapIndex = randomInt(i + 1);
    [deck[i], deck[swapIndex]] = [deck[swapIndex], deck[i]];
  }

  return deck;
}

export function serializeCard(cardCode: string): PlayingCard {
  if (cardCode === 'BJ') {
    return {
      code: cardCode,
      rank: 'JOKER',
      suit: 'joker',
      label: '小王',
      color: 'special',
    };
  }

  if (cardCode === 'RJ') {
    return {
      code: cardCode,
      rank: 'JOKER',
      suit: 'joker',
      label: '大王',
      color: 'special',
    };
  }

  const suitCode = cardCode.slice(-1);
  const rank = cardCode.slice(0, -1);
  const suitMeta = SUITS.find((suit) => suit.code === suitCode);

  if (!suitMeta || !RANKS.includes(rank)) {
    throw new Error(`Unknown card code: ${cardCode}`);
  }

  return {
    code: cardCode,
    rank,
    suit: suitMeta.suit,
    label: `${rank}${suitMeta.symbol}`,
    color: suitMeta.color,
  };
}
