import { NextRequest, NextResponse } from 'next/server';
import { serializeCard } from '@/lib/cards';
import { prisma } from '@/lib/prisma';
import { parseStringArrayJson } from '@/lib/round-state';
import { serializeRoom } from '@/lib/room-response';
import { getAuthenticatedSession, unauthorizedResponse } from '@/lib/session';
import { SYSTEM_EMAIL } from '@/lib/system-user';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        members: {
          orderBy: { playerNumber: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: '房间不存在' }, { status: 404 });
    }

    const isMember = room.members.some((member) => member.userId === session.user.id);
    if (!isMember) {
      return NextResponse.json(
        { error: '你还不是该房间成员' },
        { status: 403 }
      );
    }

    const scoreRecords = await prisma.score.findMany({
      where: { roomId: id },
      include: {
        from: { select: { id: true, name: true, avatar: true, email: true } },
        to: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { timestamp: 'desc' },
    });

    // 分数 = 收到的 - 给出的（转移制：给出去就扣减自己的）
    const userScores: Record<string, number> = {};
    scoreRecords.forEach((s) => {
      userScores[s.toUserId] = (userScores[s.toUserId] || 0) + s.points;
      userScores[s.fromUserId] = (userScores[s.fromUserId] || 0) - s.points;
    });

    const records = scoreRecords.map((s) => ({
      id: s.id,
      fromUserId: s.fromUserId,
      fromName: s.from.email === SYSTEM_EMAIL ? '系统' : s.from.name,
      fromAvatar: s.from.avatar,
      toUserId: s.toUserId,
      toName: s.to.name,
      toAvatar: s.to.avatar,
      points: s.points,
      timestamp: s.timestamp.getTime(),
    }));

    let currentRound = null;
    if (room.gameType === 'poker_rounds' && room.currentRoundNumber !== null) {
      const round = await prisma.roomRound.findUnique({
        where: {
          roomId_roundNumber: {
            roomId: room.id,
            roundNumber: room.currentRoundNumber,
          },
        },
        include: {
          cards: {
            orderBy: { dealtOrder: 'asc' },
          },
        },
      });

      if (round) {
        const participantIds = new Set(parseStringArrayJson(round.participantUserIdsJson));
        const remainingDeck = parseStringArrayJson(round.remainingDeckJson);
        const turnOrderUserIds = parseStringArrayJson(round.turnOrderUserIdsJson);
        const lookedUserIds = new Set(parseStringArrayJson(round.lookedUserIdsJson));
        const normalizedTurnOrderUserIds =
          turnOrderUserIds.length > 0
            ? turnOrderUserIds
            : room.members.map((member) => member.userId);
        const cardsByUser = new Map<string, typeof round.cards>();
        room.members.forEach((member) => {
          cardsByUser.set(member.userId, []);
        });

        round.cards.forEach((card) => {
          const userCards = cardsByUser.get(card.userId) ?? [];
          userCards.push(card);
          cardsByUser.set(card.userId, userCards);
        });

        currentRound = {
          roundNumber: round.roundNumber,
          dealtAt: round.createdAt.getTime(),
          remainingCardCount: remainingDeck.length,
          turnOrderUserIds: normalizedTurnOrderUserIds,
          hands: room.members.map((member) => {
            const userCards = cardsByUser.get(member.userId) ?? [];
            const hasPeeked = member.userId === session.user.id && lookedUserIds.has(member.userId);
            const visibleCards =
              member.userId === session.user.id
                ? hasPeeked
                  ? userCards.map((card) => ({
                      ...serializeCard(card.cardCode),
                      isFaceUp: card.isFaceUp,
                    }))
                  : []
                : userCards
                    .filter((card) => card.isFaceUp)
                    .map((card) => ({
                      ...serializeCard(card.cardCode),
                      isFaceUp: true,
                    }));

            return {
              userId: member.userId,
              visibleCards,
              hiddenCount:
                member.userId === session.user.id
                  ? hasPeeked
                    ? 0
                    : userCards.length
                  : userCards.length - visibleCards.length,
              isParticipant: participantIds.has(member.userId),
              hasPeeked,
            };
          }),
        };
      }
    }

    return NextResponse.json({
      room: serializeRoom(room, room.creator, room.members.map((member) => member.userId)),
      users: room.members.map((m) => ({
        id: m.user.id,
        email: m.user.email,
        name: m.user.name,
        avatar: m.user.avatar,
        playerNumber: m.playerNumber,
      })),
      scores: userScores,
      records,
      currentRound,
    });
  } catch (err) {
    console.error('Get room error:', err);
    return NextResponse.json(
      { error: '获取房间失败' },
      { status: 500 }
    );
  }
}
