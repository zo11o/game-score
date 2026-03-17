import { NextRequest, NextResponse } from 'next/server';
import { shuffleDeck } from '@/lib/cards';
import { prisma } from '@/lib/prisma';
import { stringifyStringArray } from '@/lib/round-state';
import { buildOrderedCascade, isCompletePermutation, rotatePlayerOrder } from '@/lib/round-order';
import { broadcastRoomUpdate } from '@/lib/room-events';
import { getAuthenticatedSession, unauthorizedResponse } from '@/lib/session';

type AllocationInput = {
  userId: string;
  cardCount: number;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const {
      allocations,
      orderedUserIds,
      firstUserId,
    } = await request.json() as {
      allocations?: AllocationInput[];
      orderedUserIds?: string[];
      firstUserId?: string;
    };

    if (!Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json(
        { error: '请提供本轮发牌配置' },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { playerNumber: 'asc' },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: '房间不存在' }, { status: 404 });
    }

    if (room.status === 'finished') {
      return NextResponse.json({ error: '房间已结束，无法继续发牌' }, { status: 400 });
    }

    if (room.gameType !== 'poker_rounds') {
      return NextResponse.json({ error: '当前房型不支持发牌' }, { status: 400 });
    }

    if (room.creatorId !== session.user.id) {
      return NextResponse.json({ error: '只有房主可以发牌' }, { status: 403 });
    }

    if (allocations.length !== room.members.length) {
      return NextResponse.json(
        { error: '需要为所有玩家配置本轮发牌张数' },
        { status: 400 }
      );
    }

    const memberIds = new Set(room.members.map((member) => member.userId));
    const allocationMap = new Map<string, number>();
    const participantUserIds = room.members.map((member) => member.userId);

    for (const allocation of allocations) {
      if (!allocation?.userId || !memberIds.has(allocation.userId)) {
        return NextResponse.json(
          { error: '发牌对象必须是房间内成员' },
          { status: 400 }
        );
      }

      const cardCount = Number(allocation.cardCount);
      if (!Number.isInteger(cardCount) || cardCount < 0) {
        return NextResponse.json(
          { error: '发牌张数必须是大于等于 0 的整数' },
          { status: 400 }
        );
      }

      if (allocationMap.has(allocation.userId)) {
        return NextResponse.json(
          { error: '同一玩家不能重复配置发牌张数' },
          { status: 400 }
        );
      }

      allocationMap.set(allocation.userId, cardCount);
    }

    const totalCards = [...allocationMap.values()].reduce((sum, count) => sum + count, 0);
    if (totalCards < 1 || totalCards > 54) {
      return NextResponse.json(
        { error: '本轮总发牌数必须在 1 到 54 张之间' },
        { status: 400 }
      );
    }

    const nextRoundNumber = (room.currentRoundNumber ?? 0) + 1;
    const isFirstRound = nextRoundNumber === 1;

    if (room.roundOrderMode === 'rotate_by_player_number' || room.roundOrderMode === 'random_each_round') {
      if ((orderedUserIds && orderedUserIds.length > 0) || firstUserId) {
        return NextResponse.json(
          { error: '当前顺序模式不需要房主手动指定本轮次序' },
          { status: 400 }
        );
      }
    }

    if (room.roundOrderMode === 'owner_sets_full_order' && !isFirstRound) {
      if (!Array.isArray(orderedUserIds) || orderedUserIds.length === 0) {
        return NextResponse.json(
          { error: '请按完整顺序选择本轮所有玩家' },
          { status: 400 }
        );
      }

      if (!isCompletePermutation(participantUserIds, orderedUserIds)) {
        return NextResponse.json(
          { error: '本轮完整顺序必须覆盖且仅覆盖所有玩家一次' },
          { status: 400 }
        );
      }
    }

    if (room.roundOrderMode === 'owner_sets_first_player' && !isFirstRound) {
      if (!firstUserId || !memberIds.has(firstUserId)) {
        return NextResponse.json(
          { error: '请选择本轮的首位玩家' },
          { status: 400 }
        );
      }
    }

    const deck = shuffleDeck();
    const remainingDeck = deck.slice(totalCards);
    const turnOrderUserIds = (() => {
      if (isFirstRound) {
        return participantUserIds;
      }

      if (room.roundOrderMode === 'rotate_by_player_number') {
        return rotatePlayerOrder(participantUserIds, nextRoundNumber);
      }

      if (room.roundOrderMode === 'random_each_round') {
        return shuffleDeck(participantUserIds);
      }

      if (room.roundOrderMode === 'owner_sets_full_order') {
        return orderedUserIds ?? participantUserIds;
      }

      if (room.roundOrderMode === 'owner_sets_first_player' && firstUserId) {
        return buildOrderedCascade(participantUserIds, firstUserId);
      }

      return participantUserIds;
    })();

    let deckIndex = 0;
    const cardsToCreate = turnOrderUserIds.flatMap((userId) => {
      const cardCount = allocationMap.get(userId) ?? 0;
      return Array.from({ length: cardCount }, (_, dealtOrder) => {
        const cardCode = deck[deckIndex];
        deckIndex += 1;

        return {
          userId,
          cardCode,
          dealtOrder,
        };
      });
    });

    await prisma.$transaction([
      prisma.roomRound.create({
        data: {
          roomId: room.id,
          roundNumber: nextRoundNumber,
          startedByUserId: session.user.id,
          remainingDeckJson: stringifyStringArray(remainingDeck),
          participantUserIdsJson: stringifyStringArray(participantUserIds),
          turnOrderUserIdsJson: stringifyStringArray(turnOrderUserIds),
          cards: {
            create: cardsToCreate,
          },
        },
      }),
      prisma.room.update({
        where: { id: room.id },
        data: {
          currentRoundNumber: nextRoundNumber,
          lastActivityAt: new Date(),
        },
      }),
    ]);

    broadcastRoomUpdate(room.id);

    return NextResponse.json({
      success: true,
      roundNumber: nextRoundNumber,
      remainingCardCount: remainingDeck.length,
    });
  } catch (err) {
    console.error('Deal round error:', err);
    return NextResponse.json(
      { error: '发牌失败，请重试' },
      { status: 500 }
    );
  }
}
