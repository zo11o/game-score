import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    const { id: userId } = await params;

    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: '无权查看其他用户的参与历史' },
        { status: 403 }
      );
    }

    // Get all room memberships for the user
    const memberships = await prisma.roomMember.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            creator: {
              select: { name: true },
            },
            members: true,
            scores: {
              where: {
                OR: [
                  { fromUserId: userId },
                  { toUserId: userId },
                ],
              },
              include: {
                from: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    // Calculate statistics for each room
    const history = memberships.map((membership) => {
      const room = membership.room;

      // Filter scores given by this user
      const scoresGiven = room.scores.filter(s => s.fromUserId === userId);
      const totalPointsGiven = scoresGiven.reduce((sum, s) => sum + s.points, 0);

      // Filter scores received by this user (excluding system scores)
      const scoresReceived = room.scores.filter(
        s => s.toUserId === userId && s.from.email !== SYSTEM_EMAIL
      );
      const totalPointsReceived = scoresReceived.reduce((sum, s) => sum + s.points, 0);

      const finalScore = totalPointsReceived - totalPointsGiven;

      return {
        roomId: room.id,
        roomName: room.name,
        roomNumber: room.roomNumber,
        roomStatus: room.status as 'active' | 'finished',
        creatorName: room.creator.name,
        gameType: room.gameType as 'classic' | 'poker_rounds',
        joinedAt: room.createdAt.getTime(),
        participantCount: room.members.length,
        scoresGiven: scoresGiven.length,
        scoresReceived: scoresReceived.length,
        totalPointsGiven,
        totalPointsReceived,
        finalScore,
      };
    });

    return NextResponse.json(history);
  } catch (err) {
    console.error('Get user history error:', err);
    return NextResponse.json(
      { error: '获取参与历史失败' },
      { status: 500 }
    );
  }
}
